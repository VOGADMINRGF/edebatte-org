import type { VoxyVideoFormat } from "./modernCharacterContracts";
import {
  isUsableVoxyHandDetectionEvidence,
  type VoxyHandDetectionEvidence,
} from "./visualDetectorLicenseContract";

export const VOXY_VISUAL_QA_CHECKPOINT_VERSION =
  "voxy-visual-qa-checkpoint-v4" as const;

export const VOXY_VISUAL_QA_REGIONS = [
  "face_eyes",
  "left_hand",
  "right_hand",
  "vog_pin",
  "edebatte_pocket_mark",
  "logo_zone",
  "microphone_edge",
  "waveform",
  "lower_third",
  "caption_safe_zone",
] as const;

export type VoxyVisualQaRegion = (typeof VOXY_VISUAL_QA_REGIONS)[number];
export type VoxyVisualQaReviewStatus =
  | "pending"
  | "approved"
  | "needs_changes"
  | "rejected";

export type VoxyVisualQaRegionResult = {
  region: VoxyVisualQaRegion;
  capturePath: string;
  captureSha256: string;
  sharpnessScore: number;
  haloDetected: boolean;
  cropped: boolean;
  typographyOverflow: boolean;
  notes: string[];
};

export type VoxyVisualQaPoseResult = {
  poseId: string;
  leftHandVisible: boolean;
  rightHandVisible: boolean;
  leftFingerCount: number | null;
  rightFingerCount: number | null;
  leftHandDetection: VoxyHandDetectionEvidence | null;
  rightHandDetection: VoxyHandDetectionEvidence | null;
};

export type VoxyVisualQaSnapshot = {
  format: VoxyVideoFormat;
  width: number;
  height: number;
  zoomPercent: 200;
  assetPath: string;
  assetVersion: string;
  commitSha: string;
  fullCapturePath: string;
  fullCaptureSha256: string;
  regions: VoxyVisualQaRegionResult[];
  poses: VoxyVisualQaPoseResult[];
  waveformBehindCharacter: boolean;
  waveformOverlapsLogo: boolean;
};

export type VoxyVisualQaPersistedReviewDecision = {
  decisionRecordId: string;
  decisionGateId: string;
  decisionType: "mark_review_ready" | "request_revision" | "reject_preview";
  persistedAt: string;
  persistedBy: string;
  persistenceMode: "persistent_primary";
};

export type VoxyVisualQaCheckpoint = {
  id: string;
  version: typeof VOXY_VISUAL_QA_CHECKPOINT_VERSION;
  snapshots: VoxyVisualQaSnapshot[];
  humanReview: {
    required: true;
    status: VoxyVisualQaReviewStatus;
    reviewerId: string | null;
    reviewedAt: string | null;
    revision: number;
    approvedCommitSha: string | null;
    approvedEvidenceKey: string | null;
    decisionRecordId: string | null;
    decisionGateId: string | null;
    persistenceMode: "persistent_primary" | null;
  };
  tolerancePolicy: {
    minimumSharpnessScore: number;
    silentToleranceIncreaseAllowed: false;
  };
  autoApprove: false;
  autoPublish: false;
};

export type VoxyVisualQaEvidence = {
  checkpointId: string;
  evidenceKey: string;
  evidenceCommitSha: string | null;
  automatedPassed: boolean;
  productionEligible: boolean;
  errors: string[];
  reviewedRevision: number | null;
  reviewedCommitSha: string | null;
  requiredDecisionGateId: string | null;
};

const FORMAT_DIMENSIONS: Readonly<
  Record<VoxyVideoFormat, { width: number; height: number }>
> = {
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "1:1": { width: 1080, height: 1080 },
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildVoxyVisualQaSnapshot(input: {
  format: VoxyVideoFormat;
  assetPath: string;
  assetVersion: string;
  commitSha: string;
  fullCapturePath: string;
  fullCaptureSha256: string;
  regions: VoxyVisualQaRegionResult[];
  poses: VoxyVisualQaPoseResult[];
  waveformBehindCharacter?: boolean;
  waveformOverlapsLogo?: boolean;
}): VoxyVisualQaSnapshot {
  const dimensions = FORMAT_DIMENSIONS[input.format];
  return {
    format: input.format,
    width: dimensions.width,
    height: dimensions.height,
    zoomPercent: 200,
    assetPath: input.assetPath,
    assetVersion: input.assetVersion,
    commitSha: input.commitSha,
    fullCapturePath: input.fullCapturePath,
    fullCaptureSha256: input.fullCaptureSha256,
    regions: input.regions,
    poses: input.poses,
    waveformBehindCharacter: input.waveformBehindCharacter ?? true,
    waveformOverlapsLogo: input.waveformOverlapsLogo ?? false,
  };
}

export function buildVoxyVisualQaCheckpoint(input: {
  snapshots: VoxyVisualQaSnapshot[];
  revision?: number;
  minimumSharpnessScore?: number;
}): VoxyVisualQaCheckpoint {
  const revision = input.revision ?? 1;
  return {
    id: `voxy-visual-qa-r${revision}`,
    version: VOXY_VISUAL_QA_CHECKPOINT_VERSION,
    snapshots: input.snapshots,
    humanReview: {
      required: true,
      status: "pending",
      reviewerId: null,
      reviewedAt: null,
      revision,
      approvedCommitSha: null,
      approvedEvidenceKey: null,
      decisionRecordId: null,
      decisionGateId: null,
      persistenceMode: null,
    },
    tolerancePolicy: {
      minimumSharpnessScore: input.minimumSharpnessScore ?? 0.08,
      silentToleranceIncreaseAllowed: false,
    },
    autoApprove: false,
    autoPublish: false,
  };
}

function evidenceSeed(checkpoint: VoxyVisualQaCheckpoint): string {
  const captures = checkpoint.snapshots
    .map((snapshot) =>
      [
        snapshot.format,
        snapshot.assetPath,
        snapshot.assetVersion,
        snapshot.commitSha,
        snapshot.fullCaptureSha256,
        snapshot.waveformBehindCharacter,
        snapshot.waveformOverlapsLogo,
        ...snapshot.regions
          .map(
            (region) =>
              `${region.region}:${region.captureSha256}:${region.sharpnessScore}:${region.haloDetected}:${region.cropped}:${region.typographyOverflow}`,
          )
          .sort(),
        ...snapshot.poses
          .map(
            (pose) =>
              `${pose.poseId}:${pose.leftHandVisible}:${pose.rightHandVisible}:${pose.leftFingerCount}:${pose.rightFingerCount}:${JSON.stringify(pose.leftHandDetection)}:${JSON.stringify(pose.rightHandDetection)}`,
          )
          .sort(),
      ].join(":"),
    )
    .sort()
    .join("|");
  return `review-revision:${checkpoint.humanReview.revision}|${captures}`;
}

export function getVoxyVisualQaEvidenceKey(
  checkpoint: VoxyVisualQaCheckpoint,
): string {
  return `${checkpoint.version}:r${checkpoint.humanReview.revision}:${stableHash(evidenceSeed(checkpoint))}`;
}

export function getVoxyVisualQaReviewDecisionGateId(input: {
  commitSha: string;
  evidenceKey: string;
  revision: number;
}): string {
  return `voxy-visual-qa:${input.commitSha}:r${input.revision}:${input.evidenceKey}`;
}

export function applyPersistedVoxyVisualQaReviewDecision(
  checkpoint: VoxyVisualQaCheckpoint,
  decision: VoxyVisualQaPersistedReviewDecision,
): VoxyVisualQaCheckpoint {
  const next: VoxyVisualQaCheckpoint = JSON.parse(JSON.stringify(checkpoint));
  const commitShas = new Set(next.snapshots.map((snapshot) => snapshot.commitSha));
  const commitSha = commitShas.size === 1 ? [...commitShas][0] : "";
  const evidenceKey = getVoxyVisualQaEvidenceKey(next);
  const expectedGateId = getVoxyVisualQaReviewDecisionGateId({
    commitSha,
    evidenceKey,
    revision: next.humanReview.revision,
  });

  next.humanReview.decisionRecordId = decision.decisionRecordId;
  next.humanReview.decisionGateId = decision.decisionGateId;
  next.humanReview.persistenceMode = decision.persistenceMode;
  next.humanReview.reviewerId = decision.persistedBy;
  next.humanReview.reviewedAt = decision.persistedAt;

  if (decision.decisionGateId !== expectedGateId) {
    next.humanReview.status = "pending";
    return next;
  }

  if (decision.decisionType === "mark_review_ready") {
    next.humanReview.status = "approved";
    next.humanReview.approvedCommitSha = commitSha;
    next.humanReview.approvedEvidenceKey = evidenceKey;
  } else if (decision.decisionType === "request_revision") {
    next.humanReview.status = "needs_changes";
  } else {
    next.humanReview.status = "rejected";
  }

  return next;
}

export function validateVoxyVisualQaCheckpoint(
  checkpoint: VoxyVisualQaCheckpoint,
): VoxyVisualQaEvidence {
  const errors: string[] = [];
  const evidenceKey = getVoxyVisualQaEvidenceKey(checkpoint);

  if (checkpoint.version !== VOXY_VISUAL_QA_CHECKPOINT_VERSION) {
    errors.push("unsupported_visual_qa_checkpoint_version");
  }
  if (
    checkpoint.humanReview.required !== true ||
    checkpoint.autoApprove !== false ||
    checkpoint.autoPublish !== false
  ) {
    errors.push("human_review_contract_broken");
  }
  if (checkpoint.tolerancePolicy.silentToleranceIncreaseAllowed !== false) {
    errors.push("silent_tolerance_increase_forbidden");
  }

  const expectedFormats: VoxyVideoFormat[] = ["16:9", "9:16", "1:1"];
  for (const format of expectedFormats) {
    const matching = checkpoint.snapshots.filter(
      (snapshot) => snapshot.format === format,
    );
    if (matching.length !== 1) {
      errors.push(`snapshot_format_missing_or_duplicate:${format}`);
    }
  }

  const commitShas = new Set(checkpoint.snapshots.map((snapshot) => snapshot.commitSha));
  const evidenceCommitSha = commitShas.size === 1 ? [...commitShas][0] : null;
  if (!evidenceCommitSha) errors.push("snapshot_revision_mismatch");

  for (const snapshot of checkpoint.snapshots) {
    if (snapshot.zoomPercent !== 200) {
      errors.push(`snapshot_zoom_must_be_200:${snapshot.format}`);
    }
    if (!snapshot.assetPath.startsWith("/brands/voxy/")) {
      errors.push(`snapshot_asset_path_not_canonical:${snapshot.format}`);
    }
    if (!snapshot.assetVersion.trim() || !snapshot.commitSha.trim()) {
      errors.push(`snapshot_provenance_missing:${snapshot.format}`);
    }
    if (!snapshot.fullCapturePath.trim() || !SHA256_PATTERN.test(snapshot.fullCaptureSha256)) {
      errors.push(`full_capture_missing_or_unhashed:${snapshot.format}`);
    }

    const regions = new Map(snapshot.regions.map((result) => [result.region, result]));
    for (const requiredRegion of VOXY_VISUAL_QA_REGIONS) {
      const result = regions.get(requiredRegion);
      if (!result) {
        errors.push(`visual_region_missing:${snapshot.format}:${requiredRegion}`);
        continue;
      }
      if (!result.capturePath.trim() || !SHA256_PATTERN.test(result.captureSha256)) {
        errors.push(`visual_region_capture_missing_or_unhashed:${snapshot.format}:${requiredRegion}`);
      }
      if (result.sharpnessScore < checkpoint.tolerancePolicy.minimumSharpnessScore) {
        errors.push(`visual_region_blurry:${snapshot.format}:${requiredRegion}`);
      }
      if (result.haloDetected) {
        errors.push(`visual_region_halo:${snapshot.format}:${requiredRegion}`);
      }
      if (result.cropped) {
        errors.push(`visual_region_cropped:${snapshot.format}:${requiredRegion}`);
      }
      if (result.typographyOverflow) {
        errors.push(`visual_region_typography_overflow:${snapshot.format}:${requiredRegion}`);
      }
    }

    if (!snapshot.waveformBehindCharacter || snapshot.waveformOverlapsLogo) {
      errors.push(`waveform_layout_invalid:${snapshot.format}`);
    }

    for (const pose of snapshot.poses) {
      if (pose.leftHandVisible) {
        if (!pose.leftHandDetection?.detected) {
          errors.push(
            `left_hand_detection_missing:${snapshot.format}:${pose.poseId}`,
          );
        } else if (!isUsableVoxyHandDetectionEvidence(pose.leftHandDetection)) {
          errors.push(
            `left_hand_detection_unusable:${snapshot.format}:${pose.poseId}`,
          );
        }
        if (pose.leftFingerCount !== pose.leftHandDetection?.fingerCount) {
          errors.push(
            `left_hand_detection_count_mismatch:${snapshot.format}:${pose.poseId}`,
          );
        }
      } else if (pose.leftFingerCount !== null) {
        errors.push(
          `left_hand_hidden_but_count_present:${snapshot.format}:${pose.poseId}`,
        );
      }
      if (pose.rightHandVisible) {
        if (!pose.rightHandDetection?.detected) {
          errors.push(
            `right_hand_detection_missing:${snapshot.format}:${pose.poseId}`,
          );
        } else if (!isUsableVoxyHandDetectionEvidence(pose.rightHandDetection)) {
          errors.push(
            `right_hand_detection_unusable:${snapshot.format}:${pose.poseId}`,
          );
        }
        if (pose.rightFingerCount !== pose.rightHandDetection?.fingerCount) {
          errors.push(
            `right_hand_detection_count_mismatch:${snapshot.format}:${pose.poseId}`,
          );
        }
      } else if (pose.rightFingerCount !== null) {
        errors.push(
          `right_hand_hidden_but_count_present:${snapshot.format}:${pose.poseId}`,
        );
      }
      if (pose.leftHandVisible && pose.leftFingerCount !== 5) {
        errors.push(`left_hand_finger_count_invalid:${snapshot.format}:${pose.poseId}`);
      }
      if (pose.rightHandVisible && pose.rightFingerCount !== 5) {
        errors.push(`right_hand_finger_count_invalid:${snapshot.format}:${pose.poseId}`);
      }
    }
  }

  const requiredDecisionGateId = evidenceCommitSha
    ? getVoxyVisualQaReviewDecisionGateId({
        commitSha: evidenceCommitSha,
        evidenceKey,
        revision: checkpoint.humanReview.revision,
      })
    : null;

  const humanApproved =
    checkpoint.humanReview.status === "approved" &&
    checkpoint.humanReview.persistenceMode === "persistent_primary" &&
    Boolean(checkpoint.humanReview.decisionRecordId?.trim()) &&
    checkpoint.humanReview.decisionGateId === requiredDecisionGateId &&
    Boolean(checkpoint.humanReview.reviewerId?.trim()) &&
    Boolean(checkpoint.humanReview.reviewedAt?.trim()) &&
    checkpoint.humanReview.approvedCommitSha === evidenceCommitSha &&
    checkpoint.humanReview.approvedEvidenceKey === evidenceKey;

  if (checkpoint.humanReview.status === "approved" && !humanApproved) {
    errors.push("human_review_persistence_revision_or_evidence_mismatch");
  }

  return {
    checkpointId: checkpoint.id,
    evidenceKey,
    evidenceCommitSha,
    automatedPassed: errors.length === 0,
    productionEligible: errors.length === 0 && humanApproved,
    errors,
    reviewedRevision: humanApproved ? checkpoint.humanReview.revision : null,
    reviewedCommitSha: humanApproved ? evidenceCommitSha : null,
    requiredDecisionGateId,
  };
}
