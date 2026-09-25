import { describe, expect, it } from "vitest";

import {
  buildQueuedVoxyLocalCompositionJob,
  getVoxyLocalCompositionDimensions,
  type VoxyLocalCompositionApprovalSnapshot,
  type VoxyLocalCompositionExecutionResult,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  executeVoxyLocalComposition,
  queueVoxyLocalComposition,
  recoverInterruptedVoxyLocalComposition,
  VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
  type VoxyLocalCompositionRuntimeDependencies,
} from "@/features/voxyVideo/localCompositionRuntimeService";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
  type VoxyEditorialTimeline,
} from "@/features/voxyVideo/editorialStoryPlan";

const QUEUED_AT = "2026-09-25T00:00:00.000Z";
const RECOVERY_AT = "2026-09-25T06:00:00.000Z";

function approval(): VoxyLocalCompositionApprovalSnapshot {
  return {
    approved: true,
    approvalRef: "approval-1",
    approvedBy: "reviewer-1",
    approvedAt: QUEUED_AT,
    previewReviewFlowId: "preview-review-flow-1",
    decisionGateId: "decision-gate-1",
    dossierRefId: "dossier-1",
    approvalSource: "human",
    councilArtifactId: null,
    authority: "trusted_review_authority",
  };
}

function localRequest(): VoxyLocalCompositionRequest {
  return {
    requestedByUserId: "user-1",
    artifactId: "artifact-1",
    briefingId: "briefing-1",
    scriptVersion: "v1",
    locale: "de-DE",
    format: "16:9",
    renderProfile: "local_review_v1",
    timelineVersion: "fixture-v3",
    audioAssetId: "audio-1",
    sceneContent: [
      { id: "opening", kicker: "UPDATE", headline: "Was ist neu?", detail: "Ein geprüfter Einstieg.", sourceIds: [] },
      { id: "explanation", kicker: "QUELLE", headline: "Was ist belegt?", detail: "Eine Quelle trägt die Aussage.", sourceIds: ["source-1"] },
      { id: "contrast", kicker: "GEGENPOSITION", headline: "Was widerspricht?", detail: "Die Gegenposition bleibt sichtbar.", sourceIds: ["source-2"] },
      { id: "invitation", kicker: "OFFEN", headline: "Was fehlt?", detail: "Menschliches Review bleibt erforderlich.", sourceIds: [] },
    ],
    captionCues: [
      { id: "cue-1", startMs: 0, endMs: 2_000, text: "Was ist neu?" },
      { id: "cue-2", startMs: 2_000, endMs: 4_000, text: "Was ist belegt?" },
      { id: "cue-3", startMs: 4_000, endMs: 6_000, text: "Was widerspricht?" },
      { id: "cue-4", startMs: 6_000, endMs: 8_000, text: "Was fehlt?" },
    ],
  };
}

function editorialPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 3,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Editorial Longform",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der belegte Ausgangspunkt wird erklärt.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "chapter-2",
        role: "source_evidence",
        headline: "Was ist belegt?",
        narration: "Die Evidenz bleibt sichtbar und nachvollziehbar.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function editorialTimeline(): VoxyEditorialTimeline {
  return {
    storyPlanId: "story-plan-1",
    storyPlanRevision: 3,
    durationClass: "explainer",
    durationMs: 120_000,
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        startMs: 0,
        endMs: 60_000,
        motion: "highlighting_source",
      },
      {
        chapterId: "chapter-2",
        role: "source_evidence",
        startMs: 60_000,
        endMs: 120_000,
        motion: "explaining",
      },
    ],
  };
}

function editorialRequest(): VoxyLocalCompositionRequest {
  return {
    ...localRequest(),
    scriptVersion: "story-r3",
    locale: "de",
    renderProfile: "editorial_v1",
    timelineVersion: "editorial-v1-story-r3",
    sceneContent: [],
    captionCues: [
      { id: "chapter-1", startMs: 0, endMs: 60_000, text: "Der belegte Ausgangspunkt wird erklärt." },
      { id: "chapter-2", startMs: 60_000, endMs: 120_000, text: "Die Evidenz bleibt sichtbar und nachvollziehbar." },
    ],
    editorialStoryPlan: editorialPlan(),
    editorialTimeline: editorialTimeline(),
    editorialBinding: {
      studioDraftId: "artifact-1",
      studioDraftRevision: 1,
      storyPlanId: "story-plan-1",
      storyPlanRevision: 3,
      evidenceSourcePackId: "source-pack-1",
      evidenceDecisionGateId: "decision-gate-1",
      approvalSource: "human",
      councilArtifactId: null,
      finalCanonId: "VOXY-V3.10.5-HUMAN-FINAL",
    },
  };
}

function outputFor(job: VoxyLocalCompositionJob): VoxyLocalCompositionOutput {
  const dimensions = getVoxyLocalCompositionDimensions(job.format, job.renderProfile);
  const durationMs = job.durationMs ?? 8_000;
  const video = (name: string, mimeType: string) => ({
    storageKey: `${job.jobId}/${name}`,
    sha256: "a".repeat(64),
    sizeBytes: 10_000,
    durationMs,
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
  });
  const caption = (name: string, mimeType: string) => ({
    storageKey: `${job.jobId}/${name}`,
    sha256: "b".repeat(64),
    sizeBytes: 100,
    durationMs: null,
    width: null,
    height: null,
    mimeType,
  });
  return {
    outputId: job.outputId,
    jobId: job.jobId,
    identityKey: job.identityKey,
    inputFingerprint: job.inputFingerprint,
    reviewBindingHash: job.reviewBindingHash,
    timelineHash: job.timelineHash,
    format: job.format,
    renderProfile: job.renderProfile,
    locale: job.locale,
    previewReviewFlowId: job.previewReviewFlowId,
    decisionGateId: job.decisionGateId,
    dossierRefId: job.dossierRefId,
    masterMp4: video("master.mp4", "video/mp4"),
    previewWebm: video("preview.webm", "video/webm"),
    captionsVtt: caption("captions.vtt", "text/vtt"),
    captionsSrt: caption("captions.srt", "application/x-subrip"),
    createdAt: RECOVERY_AT,
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
}

function runtime(options?: { staleFreshness?: boolean; editorial?: boolean }) {
  const repository = createInMemoryVoxyLocalCompositionRepository();
  let executorCalls = 0;
  const deps: VoxyLocalCompositionRuntimeDependencies = {
    repository,
    approvalAuthority: {
      async resolveApproval() {
        return approval();
      },
    },
    freshnessAuthority: {
      async assertCurrent() {
        if (options?.staleFreshness) {
          throw new Error("voxy_local_composition_freshness_stale:recovery_test");
        }
      },
    },
    audioResolver: {
      async resolveAudioAsset(audioAssetId) {
        return {
          assetId: audioAssetId,
          absolutePath: "/tmp/voxy/audio.wav",
          allowedRoot: "/tmp/voxy",
          sha256: "c".repeat(64),
          durationMs: options?.editorial ? 120_000 : 8_000,
        };
      },
    },
    executor: {
      async execute({ job }): Promise<VoxyLocalCompositionExecutionResult> {
        executorCalls += 1;
        return {
          output: outputFor(job),
          externalRequestCount: 0,
          ffmpegShellInterpolationUsed: false,
          lipSyncUsed: false,
          externalAvatarProviderUsed: false,
        };
      },
    },
    now: () => RECOVERY_AT,
  };
  return { deps, repository, executorCalls: () => executorCalls };
}

async function queueAndMarkRendering(input: {
  request: VoxyLocalCompositionRequest;
  deps: VoxyLocalCompositionRuntimeDependencies;
  updatedAt?: string;
}) {
  const queued = await queueVoxyLocalComposition(input.request, input.deps);
  expect(queued.ok).toBe(true);
  if (!queued.ok) throw new Error("queue_failed");
  const rendering: VoxyLocalCompositionJob = {
    ...queued.job,
    status: "rendering",
    startedAt: input.updatedAt ?? QUEUED_AT,
    updatedAt: input.updatedAt ?? QUEUED_AT,
  };
  expect(
    await input.deps.repository.transitionJob({
      jobId: queued.job.jobId,
      expectedStatus: "queued",
      next: rendering,
    }),
  ).toBe(true);
  return rendering;
}

describe("VOXY-LOCAL-COMPOSITION-RECOVERY-01", () => {
  it("does not reclaim an active rendering lease", async () => {
    const state = runtime();
    const rendering = await queueAndMarkRendering({
      request: localRequest(),
      deps: state.deps,
      updatedAt: "2026-09-25T05:30:00.000Z",
    });

    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: rendering.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
      orphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    });

    expect(recovered.status).toBe("rendering");
    expect(recovered.attempt).toBe(1);
    expect(state.executorCalls()).toBe(0);
  });

  it("reclaims one orphaned rendering job exactly once with attempt+1", async () => {
    const state = runtime();
    const rendering = await queueAndMarkRendering({
      request: localRequest(),
      deps: state.deps,
    });

    const [left, right] = await Promise.all([
      recoverInterruptedVoxyLocalComposition({
        jobId: rendering.jobId,
        repository: state.repository,
        now: RECOVERY_AT,
        orphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
      }),
      recoverInterruptedVoxyLocalComposition({
        jobId: rendering.jobId,
        repository: state.repository,
        now: RECOVERY_AT,
        orphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
      }),
    ]);

    expect(left.status).toBe("queued");
    expect(right.status).toBe("queued");
    expect(left.attempt).toBe(2);
    expect(right.attempt).toBe(2);
    expect((await state.repository.getJob(rendering.jobId))?.attempt).toBe(2);
  });

  it("recovers a crash after queued-to-rendering and still executes only once", async () => {
    const state = runtime();
    const input = localRequest();
    const rendering = await queueAndMarkRendering({ request: input, deps: state.deps });
    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: rendering.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
      orphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    });
    expect(recovered.status).toBe("queued");

    const [left, right] = await Promise.all([
      executeVoxyLocalComposition({ jobId: recovered.jobId, request: input, deps: state.deps }),
      executeVoxyLocalComposition({ jobId: recovered.jobId, request: input, deps: state.deps }),
    ]);

    expect(state.executorCalls()).toBe(1);
    expect([left.status, right.status]).toContain("review_ready");
    expect((await state.repository.getJob(recovered.jobId))?.status).toBe("review_ready");
  });

  it("finalizes a persisted rendered output without duplicate executor work", async () => {
    const state = runtime();
    const input = localRequest();
    const rendering = await queueAndMarkRendering({ request: input, deps: state.deps });
    const rendered: VoxyLocalCompositionJob = {
      ...rendering,
      status: "rendered",
      completedAt: "2026-09-25T01:00:00.000Z",
      updatedAt: "2026-09-25T01:00:00.000Z",
    };
    await state.repository.saveOutput(outputFor(rendered));
    expect(
      await state.repository.transitionJob({
        jobId: rendered.jobId,
        expectedStatus: "rendering",
        next: rendered,
      }),
    ).toBe(true);

    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: rendered.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
    });

    expect(recovered.status).toBe("review_ready");
    expect(recovered.outputId).toBe(rendered.outputId);
    expect(recovered.reviewBindingHash).toBe(rendered.reviewBindingHash);
    expect(recovered.attempt).toBe(rendered.attempt);
    expect(state.executorCalls()).toBe(0);
  });

  it("fails closed when a rendered job has no valid persisted output", async () => {
    const state = runtime();
    const rendering = await queueAndMarkRendering({ request: localRequest(), deps: state.deps });
    const rendered: VoxyLocalCompositionJob = {
      ...rendering,
      status: "rendered",
      completedAt: "2026-09-25T01:00:00.000Z",
      updatedAt: "2026-09-25T01:00:00.000Z",
    };
    expect(
      await state.repository.transitionJob({
        jobId: rendered.jobId,
        expectedStatus: "rendering",
        next: rendered,
      }),
    ).toBe(true);

    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: rendered.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
    });

    expect(recovered.status).toBe("failed");
    expect(recovered.safeErrorCode).toBe("voxy_local_composition_recovery_output_invalid");
    expect(state.executorCalls()).toBe(0);
  });

  it("re-applies #976 freshness before any recovered editorial re-execution", async () => {
    const state = runtime({ staleFreshness: true, editorial: true });
    const input = editorialRequest();
    const rendering = await queueAndMarkRendering({ request: input, deps: state.deps });
    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: rendering.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
      orphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    });
    expect(recovered.status).toBe("queued");

    const result = await executeVoxyLocalComposition({
      jobId: recovered.jobId,
      request: input,
      deps: state.deps,
    });

    expect(result.status).toBe("failed");
    expect(result.safeErrorCode).toBe("voxy_local_composition_freshness_stale");
    expect(state.executorCalls()).toBe(0);
  });

  it("keeps deterministic job/output identity when recovering the same request", async () => {
    const input = localRequest();
    const first = buildQueuedVoxyLocalCompositionJob({ request: input, approval: approval(), now: QUEUED_AT });
    const state = runtime();
    await state.repository.createOrGetJob(first, input);
    const rendering: VoxyLocalCompositionJob = {
      ...first,
      status: "rendering",
      startedAt: QUEUED_AT,
      updatedAt: QUEUED_AT,
    };
    expect(
      await state.repository.transitionJob({
        jobId: first.jobId,
        expectedStatus: "queued",
        next: rendering,
      }),
    ).toBe(true);

    const recovered = await recoverInterruptedVoxyLocalComposition({
      jobId: first.jobId,
      repository: state.repository,
      now: RECOVERY_AT,
    });

    expect(recovered.jobId).toBe(first.jobId);
    expect(recovered.outputId).toBe(first.outputId);
    expect(recovered.identityKey).toBe(first.identityKey);
    expect(recovered.reviewBindingHash).toBe(first.reviewBindingHash);
  });
});
