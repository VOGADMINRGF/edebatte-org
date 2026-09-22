export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  bindVoxyStudioVerifiedRender,
  createDefaultVoxyStudioServiceDependencies,
} from "@/features/voxyVideo/studioDraftService";
import { getVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";

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

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
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
    const [job, output] = await Promise.all([
      runtimeRepository.getJob(parsed.data.jobId),
      runtimeRepository.getOutput(parsed.data.outputId),
    ]);
    if (!job || !output || !draft.renderBinding) {
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
      nextStep: "human_preview_review_required",
      previewReviewPassed: false,
      publishApproved: false,
      uploadTriggered: false,
      publishTriggered: false,
      autoPublish: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_render_binding_failed";
    const status = message.includes("missing") ? 404 : message.includes("revision") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
