export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import { getVoxyLocalCompositionAudioInputRepository } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  queueVoxyLocalComposition,
  type VoxyLocalCompositionRuntimeDependencies,
} from "@/features/voxyVideo/localCompositionRuntimeService";
import { getVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { buildVoxyStudioEvidenceBoundRenderReviewGateId } from "@/features/voxyVideo/studioDraftService";
import { buildVoxyStudioEditorialCompositionHandoff } from "@/features/voxyVideo/studioRenderHandoff";

const BodySchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    audioAssetId: z.string().trim().min(1).max(160),
  })
  .strict();

const RUNTIME_STATUSES = [
  "queued",
  "rendering",
  "rendered",
  "failed",
  "review_ready",
] as const;

function safeAudioSummary(record: {
  assetId: string;
  locale: string;
  voiceProfileId: string;
  sha256: string;
  durationMs: number;
  timelineVersion: string;
  storyPlanRevision: number;
  approvedByUserId: string;
  approvedAt: string;
  chapterTimings: unknown[];
  captionCues: unknown[];
}) {
  return {
    assetId: record.assetId,
    locale: record.locale,
    voiceProfileId: record.voiceProfileId,
    sha256: record.sha256,
    durationMs: record.durationMs,
    timelineVersion: record.timelineVersion,
    storyPlanRevision: record.storyPlanRevision,
    approvedByUserId: record.approvedByUserId,
    approvedAt: record.approvedAt,
    chapterCount: record.chapterTimings.length,
    captionCueCount: record.captionCues.length,
    absolutePathExposed: false,
    storageKeyExposed: false,
  };
}

async function loadDraft(rawDraftId: string) {
  const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
  const repository = getVoxyStudioDraftRepository();
  const draft = await repository.getDraft(draftId);
  return { draftId, draft };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const { draftId: rawDraftId } = await context.params;
  const { draft } = await loadDraft(rawDraftId);
  if (!draft) {
    return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
  }

  const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
  const evidence = await evidenceAuthority.resolveEvidenceContext(draft);
  const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);
  const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
    draft,
    evidence.sourcePack.sourcePackId,
  );
  const approvalEvidenceCurrent =
    draft.status === "approved_for_render" &&
    Boolean(draft.renderApproval) &&
    draft.renderApproval?.decisionGateId === currentDecisionGateId &&
    validation.renderEligible;

  const audioRepository = getVoxyLocalCompositionAudioInputRepository();
  const runtimeRepository = getVoxyLocalCompositionRepository();
  const scriptVersion = `story-r${draft.storyPlan.revision}`;
  const audioInputs = await audioRepository.listForBinding({
    artifactId: draft.draftId,
    briefingId: draft.briefingId,
    scriptVersion,
    locale: draft.storyPlan.outputLanguage,
    limit: 20,
  });
  const jobGroups = await Promise.all(
    RUNTIME_STATUSES.map((status) => runtimeRepository.listJobsByStatus(status, 50)),
  );
  const jobs = Array.from(
    new Map(
      jobGroups
        .flat()
        .filter((job) => job.artifactId === draft.draftId)
        .map((job) => [job.jobId, job] as const),
    ).values(),
  ).sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) || right.jobId.localeCompare(left.jobId),
  );
  const renderJobs = await Promise.all(
    jobs.map(async (job) => {
      const output = await runtimeRepository.getOutput(job.outputId);
      const jobEvidenceCurrent =
        approvalEvidenceCurrent &&
        job.decisionGateId === currentDecisionGateId &&
        output?.decisionGateId === currentDecisionGateId;
      return {
        jobId: job.jobId,
        outputId: job.outputId,
        status: job.status,
        renderProfile: job.renderProfile,
        format: job.format,
        locale: job.locale,
        scriptVersion: job.scriptVersion,
        audioAssetId: job.audioAssetId,
        durationMs: job.durationMs ?? null,
        attempt: job.attempt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        safeErrorCode: job.safeErrorCode,
        safeErrorMessage: job.safeErrorMessage,
        previewReviewFlowId: job.previewReviewFlowId,
        decisionGateId: job.decisionGateId,
        reviewRequired: job.reviewRequired,
        output: output
          ? {
              masterSha256: output.masterMp4.sha256,
              previewSha256: output.previewWebm.sha256,
              durationMs: output.previewWebm.durationMs,
              width: output.previewWebm.width,
              height: output.previewWebm.height,
              createdAt: output.createdAt,
              publicAsset: output.publicAsset,
              uploaded: output.uploaded,
              published: output.published,
            }
          : null,
        bindAllowed:
          jobEvidenceCurrent && job.status === "review_ready" && Boolean(output),
        evidenceCurrent: jobEvidenceCurrent,
        storageKeyExposed: false,
        absolutePathExposed: false,
      };
    }),
  );

  const audioPersistence = audioRepository.getPersistenceState();
  const runtimePersistence = runtimeRepository.getPersistenceState();
  return NextResponse.json({
    ok: true,
    draftId: draft.draftId,
    revision: draft.revision,
    status: draft.status,
    scriptVersion,
    locale: draft.storyPlan.outputLanguage,
    renderProfile: "editorial_v1",
    evidenceSourcePackId: evidence.sourcePack.sourcePackId,
    currentDecisionGateId,
    approvalEvidenceCurrent,
    evidenceValidation: validation,
    audioInputs: audioInputs.map(safeAudioSummary),
    renderJobs,
    audioPersistence,
    runtimePersistence,
    manualQueueAllowed:
      approvalEvidenceCurrent &&
      audioPersistence.mode === "persistent_primary" &&
      runtimePersistence.mode === "persistent_primary" &&
      runtimePersistence.restartReconstructable === true &&
      audioInputs.length > 0,
    renderExecutedByHttp: false,
    autoRender: false,
    uploadAllowed: false,
    publishAllowed: false,
  });
}

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
      { ok: false, error: "invalid_voxy_studio_render_queue_command" },
      { status: 400 },
    );
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const { draft } = await loadDraft(rawDraftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }
    if (draft.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }
    if (draft.status !== "approved_for_render" || !draft.renderApproval) {
      return NextResponse.json(
        { ok: false, error: `voxy_studio_render_queue_not_allowed:${draft.status}` },
        { status: 409 },
      );
    }

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
    const evidence = await evidenceAuthority.resolveEvidenceContext(draft);
    const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);
    if (!validation.renderEligible) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_evidence_not_eligible",
          validation,
          sourcePackReviewState: evidence.sourcePack.reviewState,
        },
        { status: 409 },
      );
    }
    const currentDecisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
      draft,
      evidence.sourcePack.sourcePackId,
    );
    if (draft.renderApproval.decisionGateId !== currentDecisionGateId) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_render_approval_evidence_stale",
          currentDecisionGateId,
          approvedDecisionGateId: draft.renderApproval.decisionGateId,
          renderTriggered: false,
          uploadTriggered: false,
          publishTriggered: false,
        },
        { status: 409 },
      );
    }

    const audioRepository = getVoxyLocalCompositionAudioInputRepository();
    const runtimeRepository = getVoxyLocalCompositionRepository();
    const audioPersistence = audioRepository.getPersistenceState();
    const runtimePersistence = runtimeRepository.getPersistenceState();
    if (
      audioPersistence.mode !== "persistent_primary" ||
      audioPersistence.productionTruth !== true ||
      runtimePersistence.mode !== "persistent_primary" ||
      runtimePersistence.productionTruth !== true ||
      runtimePersistence.restartReconstructable !== true
    ) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_render_queue_persistent_primary_required" },
        { status: 503 },
      );
    }

    const audioInput = await audioRepository.getByAssetId(parsed.data.audioAssetId);
    if (!audioInput) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_audio_input_missing" },
        { status: 404 },
      );
    }
    const handoff = buildVoxyStudioEditorialCompositionHandoff({
      draft,
      audioInput,
      requestedByUserId: userId,
      evidenceSourcePackId: evidence.sourcePack.sourcePackId,
    });

    const deps: VoxyLocalCompositionRuntimeDependencies = {
      repository: runtimeRepository,
      approvalAuthority: {
        async resolveApproval(binding) {
          if (
            binding.requestedByUserId !== handoff.request.requestedByUserId ||
            binding.artifactId !== handoff.request.artifactId ||
            binding.briefingId !== handoff.request.briefingId ||
            binding.scriptVersion !== handoff.request.scriptVersion
          ) {
            throw new Error("voxy_studio_render_queue_approval_binding_mismatch");
          }
          return handoff.approval;
        },
      },
      audioResolver: {
        async resolveAudioAsset() {
          throw new Error("voxy_studio_http_queue_must_not_resolve_audio");
        },
      },
      executor: {
        async execute() {
          throw new Error("voxy_studio_http_queue_must_not_execute_render");
        },
      },
    };
    const queued = await queueVoxyLocalComposition(handoff.request, deps);
    if (queued.ok === false) {
      return NextResponse.json(
        { ok: false, error: queued.status, errors: queued.errors },
        { status: queued.status === "invalid_request" ? 400 : 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      queueStatus: queued.status,
      job: {
        jobId: queued.job.jobId,
        outputId: queued.job.outputId,
        status: queued.job.status,
        artifactId: queued.job.artifactId,
        briefingId: queued.job.briefingId,
        scriptVersion: queued.job.scriptVersion,
        renderProfile: queued.job.renderProfile,
        format: queued.job.format,
        locale: queued.job.locale,
        durationMs: queued.job.durationMs ?? handoff.timeline.durationMs,
        timelineHash: queued.job.timelineHash,
        audioAssetId: queued.job.audioAssetId,
        previewReviewFlowId: queued.job.previewReviewFlowId,
        decisionGateId: queued.job.decisionGateId,
      },
      binding: handoff.binding,
      audioInput: safeAudioSummary(audioInput),
      renderExecutedByHttp: false,
      workerRequired: true,
      reviewRequiredAfterRender: true,
      uploadTriggered: false,
      publishTriggered: false,
      autoRender: false,
      autoPublish: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_render_queue_failed";
    const status = message.includes("revision") || message.includes("binding") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
