import { describe, expect, it } from "vitest";

import {
  buildVoxyLocalCompositionInputFingerprint,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";
import {
  queueVoxyLocalComposition,
  type VoxyLocalCompositionRuntimeDependencies,
} from "@/features/voxyVideo/localCompositionRuntimeService";
import { createInMemoryVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";

function request(): VoxyLocalCompositionRequest {
  return {
    requestedByUserId: "reviewer-1",
    artifactId: "artifact-1",
    briefingId: "briefing-1",
    scriptVersion: "v1",
    locale: "de-DE",
    format: "16:9",
    renderProfile: "local_review_v1",
    timelineVersion: "fixture-v3",
    audioAssetId: "audio-1",
    sceneContent: [
      {
        id: "opening",
        kicker: "UPDATE",
        headline: "Was ist neu?",
        detail: "Ein geprüfter Einstieg.",
        sourceIds: [],
      },
      {
        id: "explanation",
        kicker: "QUELLE",
        headline: "Was ist belegt?",
        detail: "Eine Quelle trägt die Aussage.",
        sourceIds: ["source-1"],
      },
      {
        id: "contrast",
        kicker: "GEGENPOSITION",
        headline: "Was widerspricht?",
        detail: "Die Gegenposition bleibt sichtbar.",
        sourceIds: ["source-2"],
      },
      {
        id: "invitation",
        kicker: "OFFEN",
        headline: "Was fehlt?",
        detail: "Menschliches Review bleibt erforderlich.",
        sourceIds: [],
      },
    ],
    captionCues: [
      { id: "cue-1", startMs: 0, endMs: 2_000, text: "Was ist neu?" },
      { id: "cue-2", startMs: 2_000, endMs: 4_000, text: "Was ist belegt?" },
      { id: "cue-3", startMs: 4_000, endMs: 6_000, text: "Was widerspricht?" },
      { id: "cue-4", startMs: 6_000, endMs: 8_000, text: "Was fehlt?" },
    ],
  };
}

function dependencies() {
  const repository = createInMemoryVoxyLocalCompositionRepository();
  const deps: VoxyLocalCompositionRuntimeDependencies = {
    repository,
    approvalAuthority: {
      async resolveApproval() {
        return {
          approved: true,
          approvalRef: "approval-1",
          approvedBy: "reviewer-1",
          approvedAt: "2026-09-22T04:00:00.000Z",
          previewReviewFlowId: "preview-flow-1",
          decisionGateId: "decision-gate-1",
          dossierRefId: "dossier-1",
          authority: "trusted_review_authority",
        };
      },
    },
    audioResolver: {
      async resolveAudioAsset(audioAssetId) {
        return {
          assetId: audioAssetId,
          absolutePath: "/tmp/voxy/audio.wav",
          allowedRoot: "/tmp/voxy",
          sha256: "a".repeat(64),
          durationMs: 8_000,
        };
      },
    },
    executor: {
      async execute() {
        throw new Error("not_used_by_queue_contract");
      },
    },
    now: () => "2026-09-22T04:01:00.000Z",
  };
  return { repository, deps };
}

describe("Voxy local composition reconstructable queue", () => {
  it("persists the exact request snapshot together with a queued job", async () => {
    const { repository, deps } = dependencies();
    const queued = await queueVoxyLocalComposition(request(), deps);
    expect(queued.ok).toBe(true);
    if (!queued.ok) throw new Error("queue unexpectedly blocked");

    const snapshot = await repository.getRequestSnapshot(queued.job.jobId);
    expect(snapshot).toEqual(request());
    expect(buildVoxyLocalCompositionInputFingerprint(snapshot!)).toBe(
      queued.job.inputFingerprint,
    );
    const queuedJobs = await repository.listJobsByStatus("queued");
    expect(queuedJobs.map((job) => job.jobId)).toEqual([queued.job.jobId]);
  });

  it("rejects a request snapshot that does not match the immutable job fingerprint", async () => {
    const { repository, deps } = dependencies();
    const queued = await queueVoxyLocalComposition(request(), deps);
    if (!queued.ok) throw new Error("queue unexpectedly blocked");
    const changed = {
      ...request(),
      captionCues: request().captionCues.map((cue, index) =>
        index === 0 ? { ...cue, text: "Geänderter Inhalt" } : cue,
      ),
    };
    await expect(
      repository.saveRequestSnapshot({
        jobId: queued.job.jobId,
        request: changed,
        inputFingerprint: queued.job.inputFingerprint,
      }),
    ).rejects.toThrow("voxy_local_composition_request_snapshot_binding_mismatch");
  });

  it("marks the in-memory repository as non-production truth", () => {
    const { repository } = dependencies();
    expect(repository.getPersistenceState()).toEqual({
      mode: "in_memory_fallback",
      productionTruth: false,
      restartReconstructable: false,
      deploymentReconstructable: false,
    });
  });
});
