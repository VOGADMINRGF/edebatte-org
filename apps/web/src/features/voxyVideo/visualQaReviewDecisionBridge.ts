import "server-only";

import {
  getLatestVoxyRenderPreviewReviewDecisionRecord,
  getVoxyRenderPreviewReviewDecisionPersistenceState,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceStore";
import {
  applyPersistedVoxyVisualQaReviewDecision,
  validateVoxyVisualQaCheckpoint,
  type VoxyVisualQaCheckpoint,
  type VoxyVisualQaPersistedReviewDecision,
} from "@/features/voxyVideo/visualQaCheckpoint";

const VISUAL_QA_DECISION_TYPES = new Set<
  VoxyVisualQaPersistedReviewDecision["decisionType"]
>(["mark_review_ready", "request_revision", "reject_preview"]);

export type VoxyVisualQaReviewDecisionBridgeResult = {
  checkpoint: VoxyVisualQaCheckpoint;
  requiredDecisionGateId: string | null;
  decisionRecordId: string | null;
  persistenceMode: "persistent_primary" | "in_memory_fallback" | "unavailable";
  applied: boolean;
  reason:
    | "applied"
    | "decision_gate_unavailable"
    | "persistent_primary_required"
    | "decision_missing"
    | "unsupported_decision_type"
    | "human_actor_missing"
    | "persisted_at_missing";
};

export async function hydrateVoxyVisualQaCheckpointFromPersistentReview(
  checkpoint: VoxyVisualQaCheckpoint,
): Promise<VoxyVisualQaReviewDecisionBridgeResult> {
  const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
  const requiredDecisionGateId = evidence.requiredDecisionGateId;
  const persistence = getVoxyRenderPreviewReviewDecisionPersistenceState();

  if (!requiredDecisionGateId) {
    return {
      checkpoint,
      requiredDecisionGateId: null,
      decisionRecordId: null,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "decision_gate_unavailable",
    };
  }

  if (
    persistence.mode !== "persistent_primary" ||
    persistence.productionTruth !== true ||
    persistence.restartReconstructable !== true ||
    persistence.deploymentReconstructable !== true
  ) {
    return {
      checkpoint,
      requiredDecisionGateId,
      decisionRecordId: null,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "persistent_primary_required",
    };
  }

  const record = await getLatestVoxyRenderPreviewReviewDecisionRecord({
    decisionGateId: requiredDecisionGateId,
  });

  if (!record?.decisionRecordId) {
    return {
      checkpoint,
      requiredDecisionGateId,
      decisionRecordId: null,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "decision_missing",
    };
  }

  if (!VISUAL_QA_DECISION_TYPES.has(record.decisionType as VoxyVisualQaPersistedReviewDecision["decisionType"])) {
    return {
      checkpoint,
      requiredDecisionGateId,
      decisionRecordId: record.decisionRecordId,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "unsupported_decision_type",
    };
  }

  if (!record.persistedBy?.trim()) {
    return {
      checkpoint,
      requiredDecisionGateId,
      decisionRecordId: record.decisionRecordId,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "human_actor_missing",
    };
  }

  if (!record.persistedAt?.trim()) {
    return {
      checkpoint,
      requiredDecisionGateId,
      decisionRecordId: record.decisionRecordId,
      persistenceMode: persistence.mode,
      applied: false,
      reason: "persisted_at_missing",
    };
  }

  const hydrated = applyPersistedVoxyVisualQaReviewDecision(checkpoint, {
    decisionRecordId: record.decisionRecordId,
    decisionGateId: requiredDecisionGateId,
    decisionType: record.decisionType as VoxyVisualQaPersistedReviewDecision["decisionType"],
    persistedAt: record.persistedAt,
    persistedBy: record.persistedBy,
    persistenceMode: "persistent_primary",
  });

  return {
    checkpoint: hydrated,
    requiredDecisionGateId,
    decisionRecordId: record.decisionRecordId,
    persistenceMode: "persistent_primary",
    applied: true,
    reason: "applied",
  };
}
