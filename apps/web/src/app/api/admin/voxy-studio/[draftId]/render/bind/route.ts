export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  bindVoxyStudioVerifiedRender,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  createDefaultVoxyStudioServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { getVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import { assertVoxyStudioImmutableEditorialBinding } from "@/features/voxyVideo/studioRenderBindingGuard";

const BodySchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    jobId: z.string().trim().min(1).max(240),
    outputId: z.string().trim().min(1).max(240),
  })
  .strict();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const userId = gate?._id?.toHexString?.() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_voxy_studio_render_bind_command" },
      { status: 400 },
    );
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const studioRepository = getVoxyStudioDraftRepository();
    const currentDraft = await studioRepository.getDraft(draftId);
    if (!currentDraft) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }
    if (currentDraft.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }
    if (currentDraft.status !== "approved_for_render" || !currentDraft.renderApproval) {
      return NextResponse.json(
        { ok: false, error: `voxy_studio_render_binding_not_allowed:${currentDraft.status}` },
        { status: 409 },
      );
    }

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
    const evidence = await evidenceAuthority.resolveEvidenceContext(currentDraft);
    const validation = validateVoxyEditorialStoryPlan(currentDraft.storyPlan, evidence);
    if (!validation.renderEligible) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_binding_evidence_not_eligible",
          validation,
          sourcePackReviewState: evidence.sourcePack.reviewState,
        },
        { status: 409 },
      );
    }
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
      currentDraft,
      evidence.sourcePack.sourcePackId,
    );
    if (currentDraft.renderApproval.decisionGateId !== currentDecisionGateId) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_binding_evidence_stale",
          currentDecisionGateId,
          approvedDecisionGateId: currentDraft.renderApproval.decisionGateId,
          outputBound: false,
          previewReviewPassed: false,
          publishApproved: false,
        },
        { status: 409 },
      );
    }

    const runtimeRepository = getVoxyLocalCompositionRepository();
    const persistence = runtimeRepository.getPersistenceState();
    if (
      persistence.mode !== "persistent_primary" ||
      persistence.productionTruth !== true ||
      persistence.restartReconstructable !== true
    ) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_render_binding_persistent_primary_required" },
        { status: 503 },
      );
    }

    const [job, output, requestSnapshot] = await Promise.all([
      runtimeRepository.getJob(parsed.data.jobId),
      runtimeRepository.getOutput(parsed.data.outputId),
      runtimeRepository.getRequestSnapshot(parsed.data.jobId),
    ]);
    if (!job || !output) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_composition_missing" },
        { status: 404 },
      );
    }
    assertVoxyStudioImmutableEditorialBinding({
      draft: currentDraft,
      evidenceSourcePackId: evidence.sourcePack.sourcePackId,
      currentDecisionGateId,
      request: requestSnapshot,
      job,
      output,
    });
    const editorialBinding = requestSnapshot?.editorialBinding;
    if (!requestSnapshot || !editorialBinding) {
      throw new Error("voxy_studio_render_binding_request_snapshot_missing");
    }

    const deps = createDefaultVoxyStudioServiceDependencies({ evidenceAuthority });
    const draft = await bindVoxyStudioVerifiedRender(
      {
        draftId,
        expectedRevision: parsed.data.expectedRevision,
        jobId: parsed.data.jobId,
        outputId: parsed.data.outputId,
        boundByUserId: userId,
      },
      deps,
    );
    if (!draft.renderBinding) {
      throw new Error("voxy_studio_render_binding_postcondition_failed");
    }

    return NextResponse.json({
      ok: true,
      draft: {
        draftId: draft.draftId,
        revision: draft.revision,
        status: draft.status,
        storyPlanRevision: draft.storyPlan.revision,
        renderBinding: draft.renderBinding,
      },
      render: {
        jobId: job.jobId,
        outputId: output.outputId,
        status: job.status,
        renderProfile: job.renderProfile,
        format: output.format,
        locale: output.locale,
        masterSha256: output.masterMp4.sha256,
        previewSha256: output.previewWebm.sha256,
        previewDurationMs: output.previewWebm.durationMs,
        previewWidth: output.previewWebm.width,
        previewHeight: output.previewWebm.height,
        previewReviewFlowId: job.previewReviewFlowId,
        decisionGateId: job.decisionGateId,
        reviewRequired: output.reviewRequired,
        reviewStatus: output.reviewStatus,
        publicAsset: output.publicAsset,
        uploaded: output.uploaded,
        scheduled: output.scheduled,
        socialPosted: output.socialPosted,
        published: output.published,
        storageKeyExposed: false,
        absolutePathExposed: false,
      },
      immutableBinding: {
        inputFingerprint: job.inputFingerprint,
        evidenceSourcePackId: editorialBinding.evidenceSourcePackId,
        finalCanonId: editorialBinding.finalCanonId,
      },
      nextStep: "human_preview_review_required",
      previewReviewPassed: false,
      publishApproved: false,
      uploadTriggered: false,
      publishTriggered: false,
      autoPublish: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_render_binding_failed";
    const status = message.includes("missing") ? 404 : message.includes("revision") || message.includes("stale") || message.includes("mismatch") || message.includes("invalid") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
