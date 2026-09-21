import { describe, expect, it } from "vitest";

import {
  applyVoxyLocalCompositionReviewDecision,
  buildVoxyLocalCompositionReviewBinding,
} from "@/features/voxyVideo/localCompositionReviewBridge";
import {
  buildQueuedVoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
  type VoxyLocalCompositionRequest,
} from "@/features/voxyVideo/localCompositionRuntime";

function fixture() {
  const request: VoxyLocalCompositionRequest = {
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
      { id: "opening", kicker: "UPDATE", headline: "Was ist neu?", detail: "Geprüfter Einstieg.", sourceIds: [] },
      { id: "explanation", kicker: "QUELLE", headline: "Was ist belegt?", detail: "Quelle sichtbar.", sourceIds: ["source-1"] },
      { id: "contrast", kicker: "GEGENPOSITION", headline: "Was widerspricht?", detail: "Gegenposition sichtbar.", sourceIds: ["source-2"] },
      { id: "invitation", kicker: "OFFEN", headline: "Was fehlt?", detail: "Review bleibt nötig.", sourceIds: [] },
    ],
    captionCues: [
      { id: "cue-1", startMs: 0, endMs: 2_000, text: "Was ist neu?" },
      { id: "cue-2", startMs: 2_000, endMs: 4_000, text: "Was ist belegt?" },
      { id: "cue-3", startMs: 4_000, endMs: 6_000, text: "Was widerspricht?" },
      { id: "cue-4", startMs: 6_000, endMs: 8_000, text: "Was fehlt?" },
    ],
  };
  const job = buildQueuedVoxyLocalCompositionJob({
    request,
    approval: {
      approved: true,
      approvalRef: "approval-1",
      approvedBy: "reviewer-1",
      approvedAt: "2026-09-21T15:59:00.000Z",
      previewReviewFlowId: "preview-flow-1",
      decisionGateId: "decision-gate-1",
      dossierRefId: "dossier-1",
      authority: "trusted_review_authority",
    },
    now: "2026-09-21T16:00:00.000Z",
  });
  const media = (storageKey: string, mimeType: string, video: boolean) => ({
    storageKey,
    sha256: "a".repeat(64),
    sizeBytes: video ? 1000 : 100,
    durationMs: video ? 8_000 : null,
    width: video ? 1280 : null,
    height: video ? 720 : null,
    mimeType,
  });
  const output: VoxyLocalCompositionOutput = {
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
    masterMp4: media("job/master.mp4", "video/mp4", true),
    previewWebm: media("job/preview.webm", "video/webm", true),
    captionsVtt: media("job/captions.vtt", "text/vtt", false),
    captionsSrt: media("job/captions.srt", "application/x-subrip", false),
    createdAt: "2026-09-21T16:00:01.000Z",
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
  return { job, output };
}

function persistentInput() {
  return {
    persistenceMode: "persistent_primary" as const,
    productionTruth: true,
    restartReconstructable: true,
    deploymentReconstructable: true,
  };
}

describe("VOXY local composition review bridge", () => {
  it("binds the real preview to the existing review flow without creating another queue", () => {
    const { job, output } = fixture();
    const binding = buildVoxyLocalCompositionReviewBinding({ job, output });
    expect(binding).toMatchObject({
      previewReviewFlowId: "preview-flow-1",
      decisionGateId: "decision-gate-1",
      reviewStatus: "needs_review",
      existingReviewStoreOnly: true,
      createsSecondReviewQueue: false,
      marksApproved: false,
      publishAllowed: false,
    });
  });

  it("maps a persisted mark_review_ready decision but never turns it into approval or publish", () => {
    const { job, output } = fixture();
    const binding = buildVoxyLocalCompositionReviewBinding({ job, output });
    const hydrated = applyVoxyLocalCompositionReviewDecision({
      binding,
      ...persistentInput(),
      record: {
        decisionRecordId: "decision-record-1",
        previewReviewFlowId: "preview-flow-1",
        decisionGateId: "decision-gate-1",
        decisionType: "mark_review_ready",
        persistedAt: "2026-09-21T16:05:00.000Z",
        persistedBy: "human-reviewer",
      },
    });
    expect(hydrated.reviewStatus).toBe("review_ready");
    expect(hydrated.reason).toBe("decision_applied");
    expect(hydrated.marksApproved).toBe(false);
    expect(hydrated.uploadAllowed).toBe(false);
    expect(hydrated.publishAllowed).toBe(false);
  });

  it("maps revision and reject decisions into review-only states", () => {
    const { job, output } = fixture();
    const binding = buildVoxyLocalCompositionReviewBinding({ job, output });
    for (const [decisionType, expected] of [
      ["request_revision", "needs_changes"],
      ["reject_preview", "rejected"],
    ] as const) {
      const hydrated = applyVoxyLocalCompositionReviewDecision({
        binding,
        ...persistentInput(),
        record: {
          decisionRecordId: `decision-${decisionType}`,
          previewReviewFlowId: "preview-flow-1",
          decisionGateId: "decision-gate-1",
          decisionType,
          persistedAt: "2026-09-21T16:05:00.000Z",
          persistedBy: "human-reviewer",
        },
      });
      expect(hydrated.reviewStatus).toBe(expected);
      expect(hydrated.publishAllowed).toBe(false);
    }
  });

  it("fails closed when a persisted decision belongs to another review binding", () => {
    const { job, output } = fixture();
    const binding = buildVoxyLocalCompositionReviewBinding({ job, output });
    const hydrated = applyVoxyLocalCompositionReviewDecision({
      binding,
      ...persistentInput(),
      record: {
        decisionRecordId: "decision-record-other",
        previewReviewFlowId: "preview-flow-other",
        decisionGateId: "decision-gate-other",
        decisionType: "mark_review_ready",
        persistedAt: "2026-09-21T16:05:00.000Z",
        persistedBy: "human-reviewer",
      },
    });
    expect(hydrated.reviewStatus).toBe("needs_review");
    expect(hydrated.reason).toBe("decision_binding_mismatch");
  });

  it("does not treat the in-memory review store as production review truth", () => {
    const { job, output } = fixture();
    const binding = buildVoxyLocalCompositionReviewBinding({ job, output });
    const hydrated = applyVoxyLocalCompositionReviewDecision({
      binding,
      persistenceMode: "in_memory_fallback",
      productionTruth: false,
      restartReconstructable: false,
      deploymentReconstructable: false,
      record: null,
    });
    expect(hydrated.reviewStatus).toBe("needs_review");
    expect(hydrated.reason).toBe("persistent_primary_required");
  });
});
