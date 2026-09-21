import { describe, expect, it } from "vitest";
import {
  applyPersistedVoxyVisualQaReviewDecision,
  buildVoxyVisualQaCheckpoint,
  buildVoxyVisualQaSnapshot,
  getVoxyVisualQaEvidenceKey,
  getVoxyVisualQaReviewDecisionGateId,
  validateVoxyVisualQaCheckpoint,
  VOXY_VISUAL_QA_REGIONS,
} from "@/features/voxyVideo/visualQaCheckpoint";
import { VoxyVisualHandDetector } from "@/features/voxyVideo/voxyVisualHandDetector";
import { VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE } from "@/features/voxyVideo/visualDetectorLicenseContract";

const HASH = "a".repeat(64);
const HEAD = "307a2b7e7cdb15e62eefb4e9b5348817cb83a201";

function rasterHand(input: {
  hand: "left" | "right";
  uprightFingerCount: number;
  includeThumb: boolean;
  offsetX?: number;
}) {
  const width = 180;
  const height = 180;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    rgba[offset] = 2;
    rgba[offset + 1] = 7;
    rgba[offset + 2] = 24;
    rgba[offset + 3] = 255;
  }
  const drawRect = (x: number, y: number, rectWidth: number, rectHeight: number) => {
    for (let pixelY = y; pixelY < y + rectHeight; pixelY += 1) {
      for (let pixelX = x; pixelX < x + rectWidth; pixelX += 1) {
        if (pixelX < 0 || pixelY < 0 || pixelX >= width || pixelY >= height) {
          continue;
        }
        const offset = (pixelY * width + pixelX) * 4;
        rgba[offset] = 244;
        rgba[offset + 1] = 245;
        rgba[offset + 2] = 248;
        rgba[offset + 3] = 255;
      }
    }
  };
  const offsetX = input.offsetX ?? 0;
  for (let index = 0; index < input.uprightFingerCount; index += 1) {
    drawRect(62 + index * 17 + offsetX, 42, 13, 58);
  }
  if (input.includeThumb) {
    drawRect(
      (input.hand === "left" ? 27 : 138) + offsetX,
      98,
      37,
      14,
    );
  }
  if (input.uprightFingerCount > 0) drawRect(48 + offsetX, 88, 100, 60);
  return {
    width,
    height,
    rgba,
    inputPath: `fixture://${input.hand}-hand.png`,
    inputSha256: HASH,
  };
}

const detector = new VoxyVisualHandDetector({
  modelSha256: HASH,
  hashBytes: () => HASH,
});

function handDetection(
  hand: "left" | "right",
  fingerCount = 5,
  options: { cropped?: boolean; missing?: boolean } = {},
) {
  return detector.detect({
    hand,
    image: rasterHand({
      hand,
      uprightFingerCount: options.missing ? 0 : Math.max(0, fingerCount - 1),
      includeThumb: !options.missing,
      offsetX: options.cropped ? -55 : 0,
    }),
  });
}

function regions() {
  return VOXY_VISUAL_QA_REGIONS.map((region) => ({
    region,
    capturePath: `artifacts/${region}.png`,
    captureSha256: HASH,
    sharpnessScore: 0.5,
    haloDetected: false,
    cropped: false,
    typographyOverflow: false,
    notes: [],
  }));
}

function snapshot(format: "16:9" | "9:16" | "1:1", commitSha = HEAD) {
  const leftHandDetection = handDetection("left");
  const rightHandDetection = handDetection("right");
  return buildVoxyVisualQaSnapshot({
    format,
    assetPath: `/brands/voxy/templates/voxy-broadcast-template-${format.replace(":", "x")}.svg`,
    assetVersion: "test-v1",
    commitSha,
    fullCapturePath: `artifacts/${format}-surface.png`,
    fullCaptureSha256: HASH,
    regions: regions(),
    poses: [{
      poseId: "standing_master",
      leftHandVisible: true,
      rightHandVisible: true,
      leftFingerCount: leftHandDetection.fingerCount,
      rightFingerCount: rightHandDetection.fingerCount,
      leftHandDetection,
      rightHandDetection,
    }],
  });
}

function pendingCheckpoint() {
  return buildVoxyVisualQaCheckpoint({
    snapshots: [snapshot("16:9"), snapshot("9:16"), snapshot("1:1")],
    revision: 4,
  });
}

describe("Voxy 200 percent visual QA checkpoint", () => {
  it("requires one real hashed capture set for all three 200-percent formats", () => {
    const checkpoint = pendingCheckpoint();
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.automatedPassed).toBe(true);
    expect(evidence.productionEligible).toBe(false);
    expect(evidence.evidenceCommitSha).toBe(HEAD);
    expect(checkpoint.snapshots.map((item) => item.zoomPercent)).toEqual([200, 200, 200]);
  });

  it("creates deterministic evidence for identical capture revisions", () => {
    expect(getVoxyVisualQaEvidenceKey(pendingCheckpoint())).toBe(getVoxyVisualQaEvidenceKey(pendingCheckpoint()));
  });

  it("accepts approval only from a persistent decision bound to exact head, revision and evidence", () => {
    const pending = pendingCheckpoint();
    const evidenceKey = getVoxyVisualQaEvidenceKey(pending);
    const decisionGateId = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey,
      revision: pending.humanReview.revision,
    });
    const approved = applyPersistedVoxyVisualQaReviewDecision(pending, {
      decisionRecordId: "voxy-render-preview-review-decision:abc123",
      decisionGateId,
      decisionType: "mark_review_ready",
      persistedAt: "2026-08-07T18:00:00.000Z",
      persistedBy: "human-reviewer",
      persistenceMode: "persistent_primary",
    });
    const result = validateVoxyVisualQaCheckpoint(approved);
    expect(result.automatedPassed).toBe(true);
    expect(result.productionEligible).toBe(true);
    expect(result.reviewedCommitSha).toBe(HEAD);
    expect(result.requiredDecisionGateId).toBe(decisionGateId);
  });

  it("rejects a stale persisted decision gate", () => {
    const checkpoint = applyPersistedVoxyVisualQaReviewDecision(pendingCheckpoint(), {
      decisionRecordId: "voxy-render-preview-review-decision:stale",
      decisionGateId: "voxy-visual-qa:stale:r4:stale-evidence",
      decisionType: "mark_review_ready",
      persistedAt: "2026-08-07T18:00:00.000Z",
      persistedBy: "human-reviewer",
      persistenceMode: "persistent_primary",
    });
    const result = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(result.productionEligible).toBe(false);
    expect(checkpoint.humanReview.status).toBe("pending");
  });

  it("cannot become production eligible from metadata-only approval fields", () => {
    const checkpoint = pendingCheckpoint();
    checkpoint.humanReview.status = "approved";
    checkpoint.humanReview.reviewerId = "human-reviewer";
    checkpoint.humanReview.reviewedAt = "2026-08-07T18:00:00.000Z";
    checkpoint.humanReview.approvedCommitSha = HEAD;
    checkpoint.humanReview.approvedEvidenceKey = getVoxyVisualQaEvidenceKey(checkpoint);
    const result = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(result.productionEligible).toBe(false);
    expect(result.errors).toContain("human_review_persistence_revision_or_evidence_mismatch");
  });

  it("maps persisted revision requests and rejects without approving", () => {
    const pending = pendingCheckpoint();
    const gate = getVoxyVisualQaReviewDecisionGateId({
      commitSha: HEAD,
      evidenceKey: getVoxyVisualQaEvidenceKey(pending),
      revision: 4,
    });
    const needsChanges = applyPersistedVoxyVisualQaReviewDecision(pending, {
      decisionRecordId: "voxy-render-preview-review-decision:revision",
      decisionGateId: gate,
      decisionType: "request_revision",
      persistedAt: "2026-08-07T18:00:00.000Z",
      persistedBy: "human-reviewer",
      persistenceMode: "persistent_primary",
    });
    expect(needsChanges.humanReview.status).toBe("needs_changes");
    expect(validateVoxyVisualQaCheckpoint(needsChanges).productionEligible).toBe(false);
  });

  it("fails closed for four- or six-finger image evidence", () => {
    const checkpoint = pendingCheckpoint();
    const leftHandDetection = handDetection("left", 4);
    const rightHandDetection = handDetection("right", 6);
    checkpoint.snapshots[0].poses[0] = {
      ...checkpoint.snapshots[0].poses[0],
      leftFingerCount: leftHandDetection.fingerCount,
      rightFingerCount: rightHandDetection.fingerCount,
      leftHandDetection,
      rightHandDetection,
    };
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.errors).toContain("left_hand_finger_count_invalid:16:9:standing_master");
    expect(evidence.errors).toContain("right_hand_finger_count_invalid:16:9:standing_master");
  });

  it("fails closed when a visible hand is not detected from the image", () => {
    const checkpoint = pendingCheckpoint();
    const missing = handDetection("left", 5, { missing: true });
    checkpoint.snapshots[0].poses[0] = {
      ...checkpoint.snapshots[0].poses[0],
      leftFingerCount: missing.fingerCount,
      leftHandDetection: missing,
    };
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.errors).toContain(
      "left_hand_detection_missing:16:9:standing_master",
    );
    expect(evidence.errors).toContain(
      "left_hand_finger_count_invalid:16:9:standing_master",
    );
  });

  it("fails closed for insufficient detector confidence", () => {
    const checkpoint = pendingCheckpoint();
    const cropped = handDetection("left", 5, { cropped: true });
    expect(cropped.confidence).toBeLessThan(VOXY_VISUAL_HAND_MINIMUM_CONFIDENCE);
    checkpoint.snapshots[0].poses[0] = {
      ...checkpoint.snapshots[0].poses[0],
      leftFingerCount: cropped.fingerCount,
      leftHandDetection: cropped,
    };
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.errors).toContain(
      "left_hand_detection_unusable:16:9:standing_master",
    );
  });

  it("fails closed for damaged detector or model provenance", () => {
    const checkpoint = pendingCheckpoint();
    const detection = checkpoint.snapshots[0].poses[0].leftHandDetection;
    if (!detection) throw new Error("left hand detection missing");
    checkpoint.snapshots[0].poses[0].leftHandDetection = {
      ...detection,
      modelSha256: "missing-model-provenance",
    };
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.errors).toContain(
      "left_hand_detection_unusable:16:9:standing_master",
    );
  });

  it("fails for blur, halo, crop and typography overflow signals", () => {
    const checkpoint = pendingCheckpoint();
    const face = checkpoint.snapshots[1].regions.find((region) => region.region === "face_eyes");
    if (!face) throw new Error("face_eyes region missing");
    face.sharpnessScore = 0;
    face.haloDetected = true;
    face.cropped = true;
    face.typographyOverflow = true;
    const evidence = validateVoxyVisualQaCheckpoint(checkpoint);
    expect(evidence.errors).toContain("visual_region_blurry:9:16:face_eyes");
    expect(evidence.errors).toContain("visual_region_halo:9:16:face_eyes");
    expect(evidence.errors).toContain("visual_region_cropped:9:16:face_eyes");
    expect(evidence.errors).toContain("visual_region_typography_overflow:9:16:face_eyes");
  });

  it("rejects mixed commit revisions", () => {
    const checkpoint = buildVoxyVisualQaCheckpoint({
      snapshots: [snapshot("16:9"), snapshot("9:16", "different-head"), snapshot("1:1")],
    });
    expect(validateVoxyVisualQaCheckpoint(checkpoint).errors).toContain("snapshot_revision_mismatch");
  });
});
