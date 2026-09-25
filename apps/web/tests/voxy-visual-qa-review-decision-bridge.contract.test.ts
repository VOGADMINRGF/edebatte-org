import { afterEach, describe, expect, it } from "vitest";

import {
  createInMemoryVoxyRenderPreviewReviewDecisionRepository,
  setVoxyRenderPreviewReviewDecisionRepositoryForTests,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceStore";
import {
  buildVoxyVisualQaCheckpoint,
  buildVoxyVisualQaSnapshot,
  getVoxyVisualQaEvidenceKey,
  getVoxyVisualQaReviewDecisionGateId,
  validateVoxyVisualQaCheckpoint,
  VOXY_VISUAL_QA_REGIONS,
} from "@/features/voxyVideo/visualQaCheckpoint";
import { hydrateVoxyVisualQaCheckpointFromPersistentReview } from "@/features/voxyVideo/visualQaReviewDecisionBridge";

const HASH = "b".repeat(64);
const HEAD = "ef9727ebe669e62439c2e6214d20d6cf8e1b86fb";

function checkpoint() {
  const snapshots = (["16:9", "9:16", "1:1"] as const).map((format) =>
    buildVoxyVisualQaSnapshot({
      format,
      assetPath: `/brands/voxy/templates/${format.replace(":", "x")}.svg`,
      assetVersion: "VOXY-V3.10.5-HUMAN-FINAL",
      commitSha: HEAD,
      fullCapturePath: `artifacts/${format}.png`,
      fullCaptureSha256: HASH,
      regions: VOXY_VISUAL_QA_REGIONS.map((region) => ({
        region,
        capturePath: `artifacts/${format}-${region}.png`,
        captureSha256: HASH,
        sharpnessScore: 0.5,
        haloDetected: false,
        cropped: false,
        typographyOverflow: false,
        notes: [],
      })),
      poses: [],
      waveformBehindCharacter: true,
      waveformOverlapsLogo: false,
    }),
  );
  return buildVoxyVisualQaCheckpoint({ snapshots, revision: 1 });
}

function persistentState() {
  return {
    mode: "persistent_primary" as const,
    label: "Persistenter Preview-Review-Decision-Store",
    summary: "test",
    repositoryInterface: "VoxyRenderPreviewReviewDecisionRepository" as const,
    storeKind: "mongo_collection" as const,
    productionTruth: true,
    restartReconstructable: true,
    deploymentReconstructable: true,
    adminWritePath: "admin_api_available" as const,
  };
}

function seedDecision(input: {
  decisionGateId: string;
  decisionType?: "mark_review_ready" | "request_revision" | "reject_preview" | "comment_only";
  persistedBy?: string | null;
  persistedAt?: string | null;
  persistent?: boolean;
}) {
  const repository = createInMemoryVoxyRenderPreviewReviewDecisionRepository({
    records: [
      {
        decisionRecordId: "voxy-render-preview-review-decision:visual-qa-test",
        previewReviewFlowId: "voxy-render-preview-review-flow:visual-qa-test",
        decisionGateId: input.decisionGateId,
        decisionType: input.decisionType ?? "mark_review_ready",
        decisionStatus: "persisted_audit_only",
        persistedAt: input.persistedAt === undefined ? "2026-09-21T09:20:00.000Z" : input.persistedAt,
        persistedBy: input.persistedBy === undefined ? "human-reviewer" : input.persistedBy,
        decisionVersion: 1,
      } as any,
    ],
  });
  setVoxyRenderPreviewReviewDecisionRepositoryForTests(
    input.persistent === false
      ? repository
      : {
          ...repository,
          getPersistenceState: persistentState,
        },
  );
}

afterEach(() => {
  setVoxyRenderPreviewReviewDecisionRepositoryForTests(
    createInMemoryVoxyRenderPreviewReviewDecisionRepository(),
  );
});

describe("Voxy visual QA persisted review decision bridge", () => {
  it("hydrates an exact revision-bound human approval from the persistent primary store", async () => {
    const pending = checkpoint();
    const decisionGateId = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey: getVoxyVisualQaEvidenceKey(pending),
      revision: pending.humanReview.revision,
    });
    seedDecision({ decisionGateId });

    const bridged = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);
    const validation = validateVoxyVisualQaCheckpoint(bridged.checkpoint);

    expect(bridged.applied).toBe(true);
    expect(bridged.reason).toBe("applied");
    expect(bridged.persistenceMode).toBe("persistent_primary");
    expect(bridged.requiredDecisionGateId).toBe(decisionGateId);
    expect(validation.productionEligible).toBe(true);
    expect(validation.reviewedCommitSha).toBe(HEAD);
  });

  it("does not consume a decision from an in-memory fallback", async () => {
    const pending = checkpoint();
    const decisionGateId = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey: getVoxyVisualQaEvidenceKey(pending),
      revision: pending.humanReview.revision,
    });
    seedDecision({ decisionGateId, persistent: false });

    const bridged = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);

    expect(bridged.applied).toBe(false);
    expect(bridged.reason).toBe("persistent_primary_required");
    expect(validateVoxyVisualQaCheckpoint(bridged.checkpoint).productionEligible).toBe(false);
  });

  it("ignores records for another evidence gate and unsupported audit-only comments", async () => {
    const pending = checkpoint();
    const decisionGateId = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey: getVoxyVisualQaEvidenceKey(pending),
      revision: pending.humanReview.revision,
    });

    seedDecision({ decisionGateId: `${decisionGateId}:stale` });
    const stale = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);
    expect(stale.applied).toBe(false);
    expect(stale.reason).toBe("decision_missing");

    seedDecision({ decisionGateId, decisionType: "comment_only" });
    const commentOnly = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);
    expect(commentOnly.applied).toBe(false);
    expect(commentOnly.reason).toBe("unsupported_decision_type");
  });

  it("requires a human actor and persisted timestamp", async () => {
    const pending = checkpoint();
    const decisionGateId = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey: getVoxyVisualQaEvidenceKey(pending),
      revision: pending.humanReview.revision,
    });

    seedDecision({ decisionGateId, persistedBy: null });
    const missingActor = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);
    expect(missingActor.reason).toBe("human_actor_missing");

    seedDecision({ decisionGateId, persistedAt: null });
    const missingTimestamp = await hydrateVoxyVisualQaCheckpointFromPersistentReview(pending);
    expect(missingTimestamp.reason).toBe("persisted_at_missing");
  });
});
