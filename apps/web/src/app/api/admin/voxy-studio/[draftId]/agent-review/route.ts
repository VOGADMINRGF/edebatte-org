export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { evaluateVoxyStudioLayoutSafety } from "@/features/voxyVideo/studioLayoutSafety";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  createDefaultVoxyStudioServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import {
  getEffectiveVoxyEditorialAutonomyPolicy,
  getVoxyEditorialAutonomyRepository,
} from "@/features/voxyVideo/editorialAutonomyStore";
import { runVoxyEditorialAgentCouncil } from "@/features/voxyVideo/editorialAgentCouncilRuntime";
import { approveVoxyStudioDraftFromAgentCouncil } from "@/features/voxyVideo/editorialAgentCouncilApproval";
import { getVoxyEditorialCouncilArtifactRepository } from "@/features/voxyVideo/editorialAgentCouncilStore";
import {
  applyReviewQueueOperation,
  getReviewQueueOperationsRepository,
} from "@features/reviewQueueOperations";

const BodySchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    creatorRunId: z.string().trim().min(1).max(160).nullable().optional(),
    creatorActorId: z.string().trim().min(1).max(160).nullable().optional(),
  })
  .strict();

function councilActor(decisionId: string) {
  return `agent:voxy-council:${decisionId.slice(-32)}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { draftId: rawDraftId } = await context.params;
  const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
  const repository = getVoxyEditorialCouncilArtifactRepository();
  const latest = await repository.getLatestForDraft(draftId);
  return NextResponse.json({
    ok: true,
    latest,
    persistence: repository.getPersistenceState(),
    hiddenChainOfThoughtStored: false,
    transparentAuditFields: [
      "role",
      "checksPerformed",
      "publicReasonSummary",
      "evidenceRefs",
      "objections",
      "defenseSummary",
      "resolutionSummary",
      "verdict",
      "reasonCodes",
      "policyRevision",
      "instructionVersion",
      "providerId",
      "modelId",
      "inputFingerprint",
    ],
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_voxy_agent_review_command" }, { status: 400 });
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const draftRepository = getVoxyStudioDraftRepository();
    const draft = await draftRepository.getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }
    if (draft.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }
    if (draft.status !== "needs_review") {
      return NextResponse.json(
        { ok: false, error: `voxy_agent_review_not_allowed:${draft.status}` },
        { status: 409 },
      );
    }

    const autonomyRepository = getVoxyEditorialAutonomyRepository();
    if (autonomyRepository.getPersistenceState().mode !== "persistent_primary") {
      return NextResponse.json({ ok: false, error: "voxy_autonomy_policy_not_persistent" }, { status: 409 });
    }
    const { record: policyRecord, configured } =
      await getEffectiveVoxyEditorialAutonomyPolicy(autonomyRepository);
    if (!configured) {
      return NextResponse.json(
        { ok: false, error: "voxy_autonomy_policy_not_configured" },
        { status: 409 },
      );
    }

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
    const evidence = await evidenceAuthority.resolveEvidenceContext(draft);
    const reviewItemId = buildVoxyStudioEditorialReviewItemId(
      draft,
      evidence.sourcePack.sourcePackId,
    );
    const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
      draft,
      evidence.sourcePack.sourcePackId,
    );
    const layoutSafety = evaluateVoxyStudioLayoutSafety({
      draft,
      format: draft.selectedFormat,
    });
    if (!layoutSafety.approvalEligible) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_layout_approval_blocked",
          layoutSafety,
          reviewItemId,
          decisionGateId,
        },
        { status: 409 },
      );
    }

    const artifact = await runVoxyEditorialAgentCouncil({
      stage: "editorial",
      draft,
      evidence,
      policy: policyRecord.policy,
      reviewQueueItemId: reviewItemId,
      decisionGateId,
      creatorRunId: parsed.data.creatorRunId ?? null,
      creatorActorId: parsed.data.creatorActorId ?? null,
    });

    const reviewRepository = getReviewQueueOperationsRepository();
    if (reviewRepository.getPersistenceState().mode !== "persistent_primary") {
      throw new Error("voxy_studio_editorial_review_not_persistent");
    }

    if (artifact.decision.outcome === "agent_approved") {
      const deps = createDefaultVoxyStudioServiceDependencies({ evidenceAuthority });
      const approved = await approveVoxyStudioDraftFromAgentCouncil({
        draft,
        evidence,
        artifact,
        deps,
      });
      return NextResponse.json({
        ok: true,
        outcome: "agent_approved",
        artifact,
        layoutSafety,
        ...approved,
      });
    }

    const actor = councilActor(artifact.decision.decisionId);
    const note = [
      artifact.decision.publicDecisionSummary,
      `reasonCodes=${artifact.decision.reasonCodes.join(",") || "none"}`,
      `critical=${artifact.decision.criticalRiskFlags.join(",") || "none"}`,
      `artifact=${artifact.artifactId}`,
    ].join(" ");

    const review = await applyReviewQueueOperation({
      itemId: reviewItemId,
      action:
        artifact.decision.outcome === "blocked" ? "block" : "mark_in_review",
      requestedByUserId: actor,
      note,
    });

    return NextResponse.json({
      ok: true,
      outcome: artifact.decision.outcome,
      artifact,
      layoutSafety,
      review,
      draft,
      renderTriggered: false,
      uploadTriggered: false,
      publishTriggered: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_agent_review_failed";
    const status = message.includes("revision") || message.includes("stale") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
