export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SUPPORTED_LOCALES } from "@/config/locales";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";
import {
  createFailClosedDossierStudioEvidenceAuthority,
  loadFailClosedDossierStudioEvidenceContext,
} from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  buildVoxyStudioEditorialReviewItemId,
  createDefaultVoxyStudioServiceDependencies,
  createVoxyStudioDraft,
} from "@/features/voxyVideo/studioDraftService";
import {
  VOXY_STUDIO_SAFE_ZONE_PROFILES,
  buildVoxyStudioRenderReviewGateId,
} from "@/features/voxyVideo/studioDraft";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { buildVoxyStudioStoryPlanFromDossier } from "@/features/voxyVideo/studioStoryPlanBuilder";
import { getReviewQueueOperationsRepository } from "@features/reviewQueueOperations";

const CreateSchema = z
  .object({
    clientRequestId: z.string().trim().min(1).max(160),
    dossierId: z.string().trim().min(1).max(160),
    briefingId: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(240),
    locale: z.enum(SUPPORTED_LOCALES),
    selectedFormat: z.enum(VOXY_VIDEO_FORMATS),
    safeZoneProfile: z.enum(VOXY_STUDIO_SAFE_ZONE_PROFILES),
  })
  .strict();

function parseLimit(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "30");
  return Number.isFinite(raw) ? Math.max(1, Math.min(100, Math.trunc(raw))) : 30;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const repository = getVoxyStudioDraftRepository();
  const reviewRepository = getReviewQueueOperationsRepository();
  const dossierId = req.nextUrl.searchParams.get("dossierId")?.trim() || null;
  const drafts = await repository.listDrafts({ dossierId, limit: parseLimit(req) });

  const items = await Promise.all(
    drafts.map(async (draft) => {
      const evidence = await loadFailClosedDossierStudioEvidenceContext(draft.dossierId);
      const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);
      const reviewItemId = buildVoxyStudioEditorialReviewItemId(draft);
      const [reviewRecord, reviewAuditEvents] = await Promise.all([
        reviewRepository.getRecord(reviewItemId),
        reviewRepository.listAuditEvents(reviewItemId),
      ]);
      return {
        draft,
        validation,
        reviewItemId,
        decisionGateId: buildVoxyStudioRenderReviewGateId(draft),
        reviewRecord,
        reviewAuditEvents: reviewAuditEvents.slice(0, 10),
      };
    }),
  );

  return NextResponse.json({
    ok: true,
    items,
    persistence: {
      drafts: repository.getPersistenceState(),
      editorialReview: reviewRepository.getPersistenceState(),
    },
    runtime: {
      editorialLongformRenderEnabled: false,
      reason: "studio_render_handoff_not_enabled",
      autoRender: false,
      autoPublish: false,
    },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_voxy_studio_create_command" },
      { status: 400 },
    );
  }

  const userId = gate?._id?.toHexString?.() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }

  try {
    const evidence = await loadFailClosedDossierStudioEvidenceContext(parsed.data.dossierId);
    const storyPlan = buildVoxyStudioStoryPlanFromDossier({
      dossierId: parsed.data.dossierId,
      briefingId: parsed.data.briefingId,
      title: parsed.data.title,
      locale: parsed.data.locale,
      evidence,
    });
    const deps = createDefaultVoxyStudioServiceDependencies({
      evidenceAuthority: createFailClosedDossierStudioEvidenceAuthority(),
    });
    const draft = await createVoxyStudioDraft(
      {
        clientRequestId: parsed.data.clientRequestId,
        sourceKind: "dossier",
        dossierId: parsed.data.dossierId,
        briefingId: parsed.data.briefingId,
        title: parsed.data.title,
        storyPlan,
        selectedFormat: parsed.data.selectedFormat,
        safeZoneProfile: parsed.data.safeZoneProfile,
        createdByUserId: userId,
      },
      deps,
    );
    const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);

    return NextResponse.json(
      {
        ok: true,
        draft,
        validation,
        reviewItemId: buildVoxyStudioEditorialReviewItemId(draft),
        decisionGateId: buildVoxyStudioRenderReviewGateId(draft),
        renderApprovalBlocked: !validation.renderEligible,
        runtime: {
          editorialLongformRenderEnabled: false,
          reason: "studio_render_handoff_not_enabled",
          autoRender: false,
          autoPublish: false,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_create_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
