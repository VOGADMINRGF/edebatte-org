import "server-only";

import type {
  VoxyRenderPreviewReviewDecisionPersistenceMode,
  VoxyRenderPreviewReviewDecisionRecord,
  VoxyRenderPreviewReviewDecisionType,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";
import {
  getLatestVoxyRenderPreviewReviewDecisionRecord,
  getVoxyRenderPreviewReviewDecisionPersistenceState,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceStore";
import {
  validateVoxyLocalCompositionOutput,
  type VoxyLocalCompositionJob,
  type VoxyLocalCompositionOutput,
} from "@/features/voxyVideo/localCompositionRuntime";

export const VOXY_LOCAL_COMPOSITION_REVIEW_STATUSES = [
  "needs_review",
  "review_ready",
  "needs_changes",
  "rejected",
  "blocked",
  "script_only",
] as const;

export type VoxyLocalCompositionReviewStatus =
  (typeof VOXY_LOCAL_COMPOSITION_REVIEW_STATUSES)[number];

export type VoxyLocalCompositionReviewBinding = {
  jobId: string;
  outputId: string;
  previewReviewFlowId: string;
  decisionGateId: string;
  dossierRefId: string | null;
  reviewBindingHash: string;
  previewStorageKey: string;
  previewSha256: string;
  previewDurationMs: number;
  previewWidth: number;
  previewHeight: number;
  reviewStatus: VoxyLocalCompositionReviewStatus;
  decisionRecordId: string | null;
  decisionType: VoxyRenderPreviewReviewDecisionType | null;
  decidedAt: string | null;
  decidedBy: string | null;
  persistenceMode: VoxyRenderPreviewReviewDecisionPersistenceMode;
  existingReviewStoreOnly: true;
  createsSecondReviewQueue: false;
  marksApproved: false;
  uploadAllowed: false;
  publishAllowed: false;
  schedulingAllowed: false;
  socialPostAllowed: false;
  reason:
    | "awaiting_human_review"
    | "persistent_primary_required"
    | "decision_missing"
    | "decision_binding_mismatch"
    | "decision_applied";
};

type ReviewDecisionSnapshot = Pick<
  VoxyRenderPreviewReviewDecisionRecord,
  | "decisionRecordId"
  | "previewReviewFlowId"
  | "decisionGateId"
  | "decisionType"
  | "persistedAt"
  | "persistedBy"
>;

function mapDecisionType(
  decisionType: VoxyRenderPreviewReviewDecisionType,
): VoxyLocalCompositionReviewStatus {
  if (decisionType === "mark_review_ready") return "review_ready";
  if (decisionType === "request_revision") return "needs_changes";
  if (decisionType === "reject_preview") return "rejected";
  if (decisionType === "keep_as_script_only") return "script_only";
  if (decisionType === "blocked") return "blocked";
  return "needs_review";
}

export function buildVoxyLocalCompositionReviewBinding(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
  persistenceMode?: VoxyRenderPreviewReviewDecisionPersistenceMode;
}): VoxyLocalCompositionReviewBinding {
  const errors = validateVoxyLocalCompositionOutput(input);
  if (errors.length > 0) {
    throw new Error(`voxy_local_composition_review_binding_invalid:${errors.join(",")}`);
  }
  if (
    input.output.previewWebm.durationMs === null ||
    input.output.previewWebm.width === null ||
    input.output.previewWebm.height === null
  ) {
    throw new Error("voxy_local_composition_review_preview_metadata_missing");
  }

  return {
    jobId: input.job.jobId,
    outputId: input.output.outputId,
    previewReviewFlowId: input.job.previewReviewFlowId,
    decisionGateId: input.job.decisionGateId,
    dossierRefId: input.job.dossierRefId,
    reviewBindingHash: input.job.reviewBindingHash,
    previewStorageKey: input.output.previewWebm.storageKey,
    previewSha256: input.output.previewWebm.sha256,
    previewDurationMs: input.output.previewWebm.durationMs,
    previewWidth: input.output.previewWebm.width,
    previewHeight: input.output.previewWebm.height,
    reviewStatus: "needs_review",
    decisionRecordId: null,
    decisionType: null,
    decidedAt: null,
    decidedBy: null,
    persistenceMode: input.persistenceMode ?? "unavailable",
    existingReviewStoreOnly: true,
    createsSecondReviewQueue: false,
    marksApproved: false,
    uploadAllowed: false,
    publishAllowed: false,
    schedulingAllowed: false,
    socialPostAllowed: false,
    reason: "awaiting_human_review",
  };
}

export function applyVoxyLocalCompositionReviewDecision(input: {
  binding: VoxyLocalCompositionReviewBinding;
  record: ReviewDecisionSnapshot | null;
  persistenceMode: VoxyRenderPreviewReviewDecisionPersistenceMode;
  productionTruth: boolean;
  restartReconstructable: boolean;
  deploymentReconstructable: boolean;
}): VoxyLocalCompositionReviewBinding {
  const base = {
    ...input.binding,
    persistenceMode: input.persistenceMode,
    decisionRecordId: null,
    decisionType: null,
    decidedAt: null,
    decidedBy: null,
    reviewStatus: "needs_review" as const,
  };

  if (
    input.persistenceMode !== "persistent_primary" ||
    input.productionTruth !== true ||
    input.restartReconstructable !== true ||
    input.deploymentReconstructable !== true
  ) {
    return { ...base, reason: "persistent_primary_required" };
  }
  if (!input.record?.decisionRecordId) {
    return { ...base, reason: "decision_missing" };
  }
  if (
    input.record.previewReviewFlowId !== input.binding.previewReviewFlowId ||
    input.record.decisionGateId !== input.binding.decisionGateId
  ) {
    return {
      ...base,
      decisionRecordId: input.record.decisionRecordId,
      reason: "decision_binding_mismatch",
    };
  }

  return {
    ...base,
    reviewStatus: mapDecisionType(input.record.decisionType),
    decisionRecordId: input.record.decisionRecordId,
    decisionType: input.record.decisionType,
    decidedAt: input.record.persistedAt,
    decidedBy: input.record.persistedBy,
    persistenceMode: "persistent_primary",
    reason: "decision_applied",
  };
}

export async function hydrateVoxyLocalCompositionReviewFromPersistentDecision(input: {
  job: VoxyLocalCompositionJob;
  output: VoxyLocalCompositionOutput;
}): Promise<VoxyLocalCompositionReviewBinding> {
  const persistence = getVoxyRenderPreviewReviewDecisionPersistenceState();
  const binding = buildVoxyLocalCompositionReviewBinding({
    ...input,
    persistenceMode: persistence.mode,
  });

  if (
    persistence.mode !== "persistent_primary" ||
    persistence.productionTruth !== true ||
    persistence.restartReconstructable !== true ||
    persistence.deploymentReconstructable !== true
  ) {
    return applyVoxyLocalCompositionReviewDecision({
      binding,
      record: null,
      persistenceMode: persistence.mode,
      productionTruth: persistence.productionTruth,
      restartReconstructable: persistence.restartReconstructable,
      deploymentReconstructable: persistence.deploymentReconstructable,
    });
  }

  const record = await getLatestVoxyRenderPreviewReviewDecisionRecord({
    previewReviewFlowId: binding.previewReviewFlowId,
    decisionGateId: binding.decisionGateId,
  });

  return applyVoxyLocalCompositionReviewDecision({
    binding,
    record,
    persistenceMode: persistence.mode,
    productionTruth: persistence.productionTruth,
    restartReconstructable: persistence.restartReconstructable,
    deploymentReconstructable: persistence.deploymentReconstructable,
  });
}
