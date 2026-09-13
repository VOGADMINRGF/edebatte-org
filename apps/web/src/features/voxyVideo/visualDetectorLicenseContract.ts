export const VOXY_VISUAL_DETECTOR_MODE = "local_self_hosted" as const;

export const VOXY_VISUAL_DETECTOR_PREFERRED_CANDIDATE = {
  id: "mediapipe_tasks_hand_landmarker",
  frameworkLicense: "Apache-2.0",
  modelLicenseStatus: "license_review_required",
  transitiveDependencyStatus: "license_review_required",
  attributionStatus: "license_review_required",
  externalServiceRequired: false,
  productionEvidenceAllowed: false,
  blockers: [
    "concrete_hand_landmarker_task_weights_license_not_authoritatively_documented",
    "redistribution_and_offline_hosting_terms_not_authoritatively_documented",
    "tasks_metrics_egress_conflicts_with_zero_external_network_contract",
    "natural_hand_model_not_validated_for_small_flat_vector_voxy_hands",
  ],
} as const;

export type VoxyDetectorLicenseStatus =
  | "license_review_required"
  | "license_approved"
  | "license_rejected";

export type VoxyDetectorLicenseMatrix = {
  codeLicenseApproved: boolean;
  codeLicenseEvidence: string;
  modelWeightsLicenseApproved: boolean;
  modelWeightsLicenseEvidence: string;
  transitiveDependenciesApproved: boolean;
  transitiveDependenciesEvidence: string;
  attributionNoticesApproved: boolean;
  attributionNoticesEvidence: string;
};

export const VOXY_VISUAL_DETECTOR_SELECTED = {
  id: "voxy_raster_silhouette_hand_landmarker",
  version: "2.0.0",
  runtimeVersion: "pure-typescript-rgba-pca-v2",
  modelId: "voxy-rotation-normalized-open-palm-profile-v2",
  modelKind: "weightless_algorithmic_profile",
  externalServiceRequired: false,
  runtimeNetworkRequired: false,
  productionEvidenceAllowed: true,
  licenseMatrix: {
    codeLicenseApproved: true,
    codeLicenseEvidence:
      "First-party detector code in the existing repository; no copied MediaPipe implementation.",
    modelWeightsLicenseApproved: true,
    modelWeightsLicenseEvidence:
      "Not applicable: the selected detector ships no ML model or third-party weights; the hashed artifact is a first-party threshold/profile contract.",
    transitiveDependenciesApproved: true,
    transitiveDependenciesEvidence:
      "The detector core is dependency-free TypeScript over RGBA pixels. Existing Playwright Chromium only decodes locally generated PNGs in the already licensed capture harness.",
    attributionNoticesApproved: true,
    attributionNoticesEvidence:
      "No third-party detector code or weights are distributed; detector-specific notice records that no additional attribution is required.",
  } satisfies VoxyDetectorLicenseMatrix,
  noticesPath: "apps/web/THIRD_PARTY_NOTICES.voxy-visual-detector.md",
} as const;

export const VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE = 0.75;

export function getVoxyDetectorLicenseStatus(
  matrix: VoxyDetectorLicenseMatrix,
): VoxyDetectorLicenseStatus {
  return matrix.codeLicenseApproved &&
    matrix.modelWeightsLicenseApproved &&
    matrix.transitiveDependenciesApproved &&
    matrix.attributionNoticesApproved
    ? "license_approved"
    : "license_review_required";
}

export function canUseVoxyDetectorForProductionEvidence(input: {
  matrix: VoxyDetectorLicenseMatrix;
  localExecution: boolean;
  modelHash: string | null;
  runtimeVersion: string | null;
}): boolean {
  if (!input.localExecution) return false;
  if (getVoxyDetectorLicenseStatus(input.matrix) !== "license_approved") {
    return false;
  }
  if (!input.modelHash || !/^[a-f0-9]{64}$/i.test(input.modelHash)) return false;
  if (!input.runtimeVersion?.trim()) return false;
  return true;
}

export type VoxyHandLandmarkEvidence = {
  index: number;
  name: string;
  x: number;
  y: number;
  confidence: number;
};

export type VoxyHandDetectionEvidence = {
  hand: "left" | "right";
  detected: boolean;
  handedness: {
    label: "left" | "right";
    confidence: number;
    source: "capture_region_contract";
  } | null;
  landmarks: VoxyHandLandmarkEvidence[];
  landmarkCount: number;
  confidence: number;
  fingerCount: number | null;
  detectorId: string;
  detectorVersion: string;
  runtimeVersion: string;
  modelId: string;
  modelSha256: string;
  detectorProfileSha256: string;
  inputSha256: string;
  originalInputSha256: string;
  normalizedInputSha256: string | null;
  inputPath: string;
  originalRotationDegrees: number | null;
  principalAxisDegrees: number | null;
  principalAxisStrength: number | null;
  normalizationApplied: boolean;
  paddingPixels: number;
  normalizationCropLoss: boolean;
  localExecution: boolean;
  licenseStatus: VoxyDetectorLicenseStatus;
  failureReason: string | null;
};

export function isUsableVoxyHandDetectionEvidence(
  evidence: VoxyHandDetectionEvidence,
): boolean {
  if (!evidence.detected) {
    return (
      evidence.fingerCount === null &&
      evidence.landmarkCount === 0 &&
      evidence.landmarks.length === 0
    );
  }
  if (evidence.confidence < VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE) return false;
  if (!evidence.handedness || evidence.handedness.label !== evidence.hand) return false;
  if (evidence.handedness.confidence < VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE) {
    return false;
  }
  if (evidence.fingerCount === null) return false;
  if (evidence.landmarkCount !== evidence.landmarks.length) return false;
  if (evidence.landmarkCount !== 1 + evidence.fingerCount * 4) return false;
  if (evidence.detectorId !== VOXY_VISUAL_DETECTOR_SELECTED.id) return false;
  if (evidence.detectorVersion !== VOXY_VISUAL_DETECTOR_SELECTED.version) {
    return false;
  }
  if (evidence.runtimeVersion !== VOXY_VISUAL_DETECTOR_SELECTED.runtimeVersion) {
    return false;
  }
  if (evidence.modelId !== VOXY_VISUAL_DETECTOR_SELECTED.modelId) return false;
  if (!/^[a-f0-9]{64}$/i.test(evidence.modelSha256)) return false;
  if (evidence.detectorProfileSha256 !== evidence.modelSha256) return false;
  if (!/^[a-f0-9]{64}$/i.test(evidence.inputSha256)) return false;
  if (evidence.originalInputSha256 !== evidence.inputSha256) return false;
  if (!/^[a-f0-9]{64}$/i.test(evidence.normalizedInputSha256 ?? "")) {
    return false;
  }
  if (!Number.isFinite(evidence.originalRotationDegrees)) return false;
  if (!Number.isFinite(evidence.principalAxisDegrees)) return false;
  if (
    !Number.isFinite(evidence.principalAxisStrength) ||
    (evidence.principalAxisStrength ?? 0) < 0 ||
    (evidence.principalAxisStrength ?? 0) > 1
  ) {
    return false;
  }
  if (!Number.isInteger(evidence.paddingPixels) || evidence.paddingPixels <= 0) {
    return false;
  }
  if (evidence.normalizationCropLoss) return false;
  if (!evidence.inputPath.trim()) return false;
  if (!evidence.localExecution) return false;
  if (evidence.licenseStatus !== "license_approved") return false;
  if (evidence.failureReason !== null) return false;
  return evidence.landmarks.every(
    (landmark, index) =>
      landmark.index === index &&
      Number.isFinite(landmark.x) &&
      Number.isFinite(landmark.y) &&
      landmark.x >= 0 &&
      landmark.x <= 1 &&
      landmark.y >= 0 &&
      landmark.y <= 1 &&
      landmark.confidence >= VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE,
  );
}
