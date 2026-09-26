import { describe, expect, it, vi } from "vitest";

const mongo = vi.hoisted(() => {
  const updateOne = vi.fn(async () => ({ modifiedCount: 1 }));
  const collection = {
    createIndex: vi.fn(async () => "ok"),
    updateOne,
    findOne: vi.fn(async () => null),
    find: vi.fn(() => ({
      sort: vi.fn(() => ({
        limit: vi.fn(() => ({
          toArray: vi.fn(async () => []),
        })),
      })),
    })),
  };
  return { collection, updateOne };
});

vi.mock("@core/db/triMongo", () => ({
  coreCol: vi.fn(async () => mongo.collection),
  shouldUseInMemoryMongoFallback: () => false,
}));

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
  type VoxyLocalCompositionRuntimeDependencies,
} from "@/features/voxyVideo/localCompositionRuntimeService";
import {
  createInMemoryVoxyLocalCompositionRepository,
  getVoxyLocalCompositionRepository,
} from "@/features/voxyVideo/localCompositionRuntimeStore";

const T0 = "2026-09-26T00:00:00.000Z";
const T1 = "2026-09-26T06:00:00.000Z";
const T2 = "2026-09-26T06:01:00.000Z";

function approval(): VoxyLocalCompositionApprovalSnapshot {
  return {
    approved: true,
    approvalRef: "approval-generation-cas",
    approvedBy: "reviewer-generation-cas",
    approvedAt: T0,
    previewReviewFlowId: "preview-generation-cas",
    decisionGateId: "gate-generation-cas",
    dossierRefId: "dossier-generation-cas",
    approvalSource: "human",
    councilArtifactId: null,
    authority: "trusted_review_authority",
  };
}

function request(): VoxyLocalCompositionRequest {
  return {
    requestedByUserId: "user-generation-cas",
    artifactId: "artifact-generation-cas",
    briefingId: "briefing-generation-cas",
    scriptVersion: "v1",
    locale: "de-DE",
    format: "16:9",
    renderProfile: "local_review_v1",
    timelineVersion: "fixture-v3",
    audioAssetId: "audio-generation-cas",
    sceneContent: [
      {
        id: "opening",
        kicker: "UPDATE",
        headline: "Was ist neu?",
        detail: "Generation-bound recovery.",
        sourceIds: [],
      },
      {
        id: "explanation",
        kicker: "QUELLE",
        headline: "Was ist belegt?",
        detail: "CAS bindet Status und Versuch.",
        sourceIds: ["source-1"],
      },
      {
        id: "contrast",
        kicker: "GEGENPOSITION",
        headline: "Was widerspricht?",
        detail: "Stale Worker verlieren Ownership.",
        sourceIds: ["source-2"],
      },
      {
        id: "invitation",
        kicker: "OFFEN",
        headline: "Was bleibt offen?",
        detail: "Review bleibt erforderlich.",
        sourceIds: [],
      },
    ],
    captionCues: [
      { id: "cue-1", startMs: 0, endMs: 2_000, text: "Was ist neu?" },
      { id: "cue-2", startMs: 2_000, endMs: 4_000, text: "Was ist belegt?" },
      { id: "cue-3", startMs: 4_000, endMs: 6_000, text: "Was widerspricht?" },
      { id: "cue-4", startMs: 6_000, endMs: 8_000, text: "Was bleibt offen?" },
    ],
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
    createdAt: T1,
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
}

function generationTwo(rendering: VoxyLocalCompositionJob) {
  const queued: VoxyLocalCompositionJob = {
    ...rendering,
    status: "queued",
    attempt: rendering.attempt + 1,
    updatedAt: T1,
    startedAt: null,
    completedAt: null,
    safeErrorCode: null,
    safeErrorMessage: null,
  };
  const reacquired: VoxyLocalCompositionJob = {
    ...queued,
    status: "rendering",
    startedAt: T2,
    updatedAt: T2,
  };
  return { queued, reacquired };
}

describe("VOXY-LOCAL-COMPOSITION-RECOVERY-01 generation ownership", () => {
  it("rejects delayed recovery and stale success/failure after a newer generation reacquires", async () => {
    const repository = createInMemoryVoxyLocalCompositionRepository();
    const queued = buildQueuedVoxyLocalCompositionJob({ request: request(), approval: approval(), now: T0 });
    await repository.createOrGetJob(queued);
    const rendering: VoxyLocalCompositionJob = {
      ...queued,
      status: "rendering",
      startedAt: T0,
      updatedAt: T0,
    };
    expect(
      await repository.transitionJob({ jobId: queued.jobId, expectedStatus: "queued", next: rendering }),
    ).toBe(true);

    const generation = generationTwo(rendering);
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: generation.queued,
      }),
    ).toBe(true);
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "queued",
        next: generation.reacquired,
      }),
    ).toBe(true);

    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: generation.queued,
      }),
    ).toBe(false);
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: { ...rendering, status: "rendered", completedAt: T1, updatedAt: T1 },
      }),
    ).toBe(false);
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: {
          ...rendering,
          status: "failed",
          completedAt: T1,
          updatedAt: T1,
          safeErrorCode: "stale_worker",
          safeErrorMessage: "stale worker must not win",
        },
      }),
    ).toBe(false);

    const currentRendered: VoxyLocalCompositionJob = {
      ...generation.reacquired,
      status: "rendered",
      completedAt: T2,
      updatedAt: T2,
    };
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: currentRendered,
      }),
    ).toBe(true);
    expect(
      await repository.transitionJob({
        jobId: rendering.jobId,
        expectedStatus: "rendering",
        next: currentRendered,
      }),
    ).toBe(false);
    expect(await repository.getJob(rendering.jobId)).toMatchObject({ status: "rendered", attempt: 2 });
  });

  it("puts attempt ownership into the Mongo transition CAS filter", async () => {
    mongo.updateOne.mockClear();
    const repository = getVoxyLocalCompositionRepository();
    const queued = buildQueuedVoxyLocalCompositionJob({ request: request(), approval: approval(), now: T0 });
    const rendering: VoxyLocalCompositionJob = {
      ...queued,
      status: "rendering",
      startedAt: T0,
      updatedAt: T0,
    };
    await repository.transitionJob({
      jobId: rendering.jobId,
      expectedStatus: "rendering",
      next: { ...rendering, status: "rendered", completedAt: T1, updatedAt: T1 },
    });
    expect(mongo.updateOne).toHaveBeenCalledWith(
      {
        _id: rendering.jobId,
        "record.status": "rendering",
        "record.attempt": rendering.attempt,
      },
      expect.any(Object),
    );
  });

  it.each(["success", "failure"] as const)(
    "stale worker %s completion cannot poison the newer rendering generation",
    async (mode) => {
      const repository = createInMemoryVoxyLocalCompositionRepository();
      let release: ((value: VoxyLocalCompositionExecutionResult) => void) | null = null;
      let reject: ((reason?: unknown) => void) | null = null;
      let started: ((job: VoxyLocalCompositionJob) => void) | null = null;
      const startedPromise = new Promise<VoxyLocalCompositionJob>((resolve) => {
        started = resolve;
      });
      const executionPromise = new Promise<VoxyLocalCompositionExecutionResult>((resolve, rejectPromise) => {
        release = resolve;
        reject = rejectPromise;
      });
      const deps: VoxyLocalCompositionRuntimeDependencies = {
        repository,
        approvalAuthority: { async resolveApproval() { return approval(); } },
        audioResolver: {
          async resolveAudioAsset(assetId) {
            return {
              assetId,
              absolutePath: "/tmp/voxy/audio.wav",
              allowedRoot: "/tmp/voxy",
              sha256: "c".repeat(64),
              durationMs: 8_000,
            };
          },
        },
        executor: {
          async execute({ job }) {
            started?.(job);
            return executionPromise;
          },
        },
        now: () => T1,
      };
      const queued = await queueVoxyLocalComposition(request(), deps);
      expect(queued.ok).toBe(true);
      if (!queued.ok) throw new Error("queue_failed");

      const staleWorker = executeVoxyLocalComposition({
        jobId: queued.job.jobId,
        request: request(),
        deps,
      });
      const rendering = await startedPromise;
      const generation = generationTwo(rendering);
      expect(
        await repository.transitionJob({
          jobId: rendering.jobId,
          expectedStatus: "rendering",
          next: generation.queued,
        }),
      ).toBe(true);
      expect(
        await repository.transitionJob({
          jobId: rendering.jobId,
          expectedStatus: "queued",
          next: generation.reacquired,
        }),
      ).toBe(true);

      if (mode === "success") {
        release?.({
          output: outputFor(rendering),
          externalRequestCount: 0,
          ffmpegShellInterpolationUsed: false,
          lipSyncUsed: false,
          externalAvatarProviderUsed: false,
        });
      } else {
        reject?.(new Error("stale_worker_failure"));
      }

      const result = await staleWorker;
      expect(result.status).toBe("rendering");
      expect(result.attempt).toBe(2);
      expect(await repository.getJob(rendering.jobId)).toMatchObject({
        status: "rendering",
        attempt: 2,
      });
    },
  );
});
