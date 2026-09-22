export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  VOXY_EDITORIAL_AUTONOMY_MODES,
  VOXY_EDITORIAL_COUNCIL_ROLES,
  VOXY_EDITORIAL_CRITICAL_RISK_FLAGS,
  VOXY_EDITORIAL_QUALITY_LEVELS,
} from "@/features/voxyVideo/editorialAgentCouncil";
import {
  getEffectiveVoxyEditorialAutonomyPolicy,
  getVoxyEditorialAutonomyRepository,
  updateVoxyEditorialAutonomyPolicy,
} from "@/features/voxyVideo/editorialAutonomyStore";

const ModeSchema = z.enum(VOXY_EDITORIAL_AUTONOMY_MODES);
const PatchSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    reason: z.string().trim().min(3).max(1_000),
    qualityLevel: z.enum(VOXY_EDITORIAL_QUALITY_LEVELS).optional(),
    modes: z
      .object({
        dossier: ModeSchema.optional(),
        editorial: ModeSchema.optional(),
        translation: ModeSchema.optional(),
        voiceAv: ModeSchema.optional(),
        distributionQa: ModeSchema.optional(),
      })
      .strict()
      .optional(),
    minIndependentReviewRuns: z.number().int().min(3).max(32).optional(),
    requiredDistinctModelFamilies: z.number().int().min(1).max(4).optional(),
    maxUnresolvedWarningsForAutonomy: z.number().int().min(0).max(20).optional(),
  })
  .strict();

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const repository = getVoxyEditorialAutonomyRepository();
  const [{ record, configured }, audit] = await Promise.all([
    getEffectiveVoxyEditorialAutonomyPolicy(repository),
    repository.listAudit(25),
  ]);
  return NextResponse.json({
    ok: true,
    configured,
    record,
    persistence: repository.getPersistenceState(),
    councilRoles: VOXY_EDITORIAL_COUNCIL_ROLES,
    criticalRiskFlags: VOXY_EDITORIAL_CRITICAL_RISK_FLAGS,
    hardInvariants: {
      exactRevisionFingerprintRequired: true,
      creatorReviewerSeparationRequired: true,
      objectionDefenseRequired: true,
      criticalHumanEscalationRequired: true,
      learningCannotSelfPromote: true,
      hiddenChainOfThoughtNotStored: true,
      transparentDecisionBasisStored: true,
    },
    audit,
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_voxy_autonomy_command" }, { status: 400 });
  }
  const userId = gate?._id?.toHexString?.() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }
  try {
    const { expectedRevision, reason, ...patch } = parsed.data;
    const result = await updateVoxyEditorialAutonomyPolicy({
      expectedRevision,
      patch,
      changedByUserId: userId,
      reason,
    });
    return NextResponse.json({
      ok: true,
      ...result,
      persistence: getVoxyEditorialAutonomyRepository().getPersistenceState(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_autonomy_update_failed";
    const status = message === "voxy_autonomy_revision_conflict" ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
