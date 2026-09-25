import { describe, expect, it } from "vitest";
import {
  buildVoxyRigFrame,
  canInvokeVoxyMotionProvider,
  canPublishVoxyMotionArtifact,
  EMPTY_VOXY_MOTION_PROVIDER_APPROVAL,
  getMissingVoxyMotionPreflightGates,
  VOXY_CANONICAL_VISUAL_SOURCE,
  VOXY_LOCAL_RIG,
  VOXY_RIG_FIXTURE_TIMELINE,
  VOXY_RIG_MOTION_PROFILE,
  VOXY_RIG_MOTION_STATES,
  VOXY_MOTION_PROVIDER_STATUS,
  getVoxyRigMotionTarget,
  validateVoxyLocalRigFrame,
  type VoxyMotionProviderApproval,
} from "@/features/voxyVideo/animatableMasterAsset";

const approvedPreflightFixture: VoxyMotionProviderApproval = {
  providerId: "test-provider",
  providerSelectionApproved: true,
  accountApproved: true,
  credentialsConfigured: true,
  externalDataTransferApproved: true,
  privacyRetentionApproved: true,
  budgetSpendApproved: true,
};

describe("Voxy motion provider gate contract", () => {
  it("defines a local native SVG rig with every required independent control", () => {
    expect(VOXY_LOCAL_RIG.implementation).toBe("native_svg_layer_pivot_rig");
    expect(VOXY_LOCAL_RIG.externalNetworkRequired).toBe(false);
    expect(VOXY_LOCAL_RIG.externalProviderRequired).toBe(false);
    expect(VOXY_LOCAL_RIG.generativeFrameAnatomy).toBe(false);
    expect(VOXY_LOCAL_RIG.controls.map((control) => control.id)).toEqual([
      "upper-body",
      "head",
      "eyes",
      "blink",
      "brows",
      "left-arm",
      "right-arm",
      "left-hand",
      "right-hand",
    ]);
    expect(VOXY_LOCAL_RIG.hands.left.digitIds).toHaveLength(5);
    expect(VOXY_LOCAL_RIG.hands.right.digitIds).toHaveLength(5);
    expect(VOXY_LOCAL_RIG.immutableBrandOverlays).toEqual([
      "vog-pin",
      "edebatte-pocket",
    ]);
  });

  it("implements all seven motion states inside conservative rig limits", () => {
    expect(VOXY_RIG_MOTION_STATES).toHaveLength(7);
    for (const state of VOXY_RIG_MOTION_STATES) {
      expect(getVoxyRigMotionTarget(state)).toEqual(
        expect.objectContaining({
          headRotationDeg: expect.any(Number),
          leftArmRotationDeg: expect.any(Number),
          rightArmRotationDeg: expect.any(Number),
        }),
      );
    }
    for (let timeMs = 0; timeMs < 8_000; timeMs += 41) {
      expect(validateVoxyLocalRigFrame(buildVoxyRigFrame(timeMs))).toEqual([]);
    }
  });

  it("uses the polished motion profile without changing rig identity or anatomy", () => {
    expect(VOXY_LOCAL_RIG.version).toBe("voxy-local-2d-rig-v1");
    expect(VOXY_RIG_MOTION_PROFILE).toMatchObject({
      version: "voxy-motion-polish-v2",
      gestureDelayMs: 120,
      gestureTransitionMs: 720,
    });
    expect(VOXY_LOCAL_RIG.handPresentation).toEqual({
      left: {
        baseRotationDeg: -58,
        wristInset: { x: -12, y: -5 },
      },
      right: {
        baseRotationDeg: 58,
        wristInset: { x: 12, y: -5 },
      },
      scale: 0.78,
    });
    expect(VOXY_LOCAL_RIG.hands.left.digitIds).toHaveLength(5);
    expect(VOXY_LOCAL_RIG.hands.right.digitIds).toHaveLength(5);
  });

  it("keeps one dominant gesture per statement and lets gaze lead the arm", () => {
    const explaining = getVoxyRigMotionTarget("explaining");
    const contrast = getVoxyRigMotionTarget("showing_contrast");
    const invitation = getVoxyRigMotionTarget("inviting_participation");
    expect(explaining.rightArmRotationDeg).toBe(-9.5);
    expect(Math.abs(explaining.leftArmRotationDeg)).toBeLessThan(1);
    expect(Math.abs(contrast.leftArmRotationDeg)).toBeGreaterThan(
      Math.abs(contrast.rightArmRotationDeg),
    );
    expect(Math.abs(invitation.leftArmRotationDeg)).toBeGreaterThan(
      Math.abs(invitation.rightArmRotationDeg),
    );
    expect(invitation.rightArmRotationDeg).toBe(0);
    expect(invitation.rightHandRotationDeg).toBe(0);

    const transitionStart = buildVoxyRigFrame(2_000);
    const gazeLead = buildVoxyRigFrame(2_200);
    expect(Math.abs(gazeLead.eyeLookX - transitionStart.eyeLookX)).toBeGreaterThan(
      Math.abs(
        gazeLead.rightArmRotationDeg - transitionStart.rightArmRotationDeg,
      ),
    );
  });

  it("eases across state boundaries without pose snapping", () => {
    for (const boundary of [2_000, 4_000, 6_000]) {
      const before = buildVoxyRigFrame(boundary - 1);
      const after = buildVoxyRigFrame(boundary);
      expect(Math.abs(after.leftArmRotationDeg - before.leftArmRotationDeg)).toBeLessThan(0.02);
      expect(Math.abs(after.rightArmRotationDeg - before.rightArmRotationDeg)).toBeLessThan(0.02);
      expect(Math.abs(after.headRotationDeg - before.headRotationDeg)).toBeLessThan(0.02);
      expect(Math.abs(after.eyeLookX - before.eyeLookX)).toBeLessThan(0.02);
    }
  });

  it("locks the eight-second fixture to four deterministic states", () => {
    expect(VOXY_RIG_FIXTURE_TIMELINE).toEqual([
      { state: "neutral_idle", startMs: 0, endMs: 2_000 },
      { state: "explaining", startMs: 2_000, endMs: 4_000 },
      { state: "showing_contrast", startMs: 4_000, endMs: 6_000 },
      { state: "inviting_participation", startMs: 6_000, endMs: 8_000 },
    ]);
    const finalFrame = buildVoxyRigFrame(7_999);
    expect(finalFrame.state).toBe("inviting_participation");
    expect(Math.abs(finalFrame.leftArmRotationDeg)).toBeLessThan(0.1);
    expect(Math.abs(finalFrame.rightArmRotationDeg)).toBeLessThan(0.1);
  });

  it("keeps the approved Voxy visual source canonical", () => {
    expect(VOXY_CANONICAL_VISUAL_SOURCE).toEqual({
      repositoryPath: "apps/web/public/brand/voxy/voxy-podcast-stage.png",
      publicPath: "/brand/voxy/voxy-podcast-stage.png",
      status: "human_approved_reference",
    });
    expect(VOXY_MOTION_PROVIDER_STATUS).toBe("manual_gate");
  });

  it("fails closed while human provider preflight gates are unresolved", () => {
    expect(
      getMissingVoxyMotionPreflightGates(
        EMPTY_VOXY_MOTION_PROVIDER_APPROVAL,
      ),
    ).toEqual([
      "provider_selection",
      "account_credentials",
      "external_data_transfer",
      "privacy_retention",
      "budget_spend",
    ]);
    expect(
      canInvokeVoxyMotionProvider(EMPTY_VOXY_MOTION_PROVIDER_APPROVAL),
    ).toBe(false);
  });

  it("requires an explicit human provider-selection approval", () => {
    expect(
      canInvokeVoxyMotionProvider({
        ...approvedPreflightFixture,
        providerSelectionApproved: false,
      }),
    ).toBe(false);
  });

  it("does not publish a generated artifact before human visual acceptance", () => {
    const review = {
      providerId: "test-provider",
      exactHeadSha: "0123456789abcdef",
      canonicalVisualSource: VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath,
      humanVisualAcceptance: "pending" as const,
    };

    expect(
      canPublishVoxyMotionArtifact({
        approval: approvedPreflightFixture,
        review,
      }),
    ).toBe(false);
    expect(
      canPublishVoxyMotionArtifact({
        approval: approvedPreflightFixture,
        review: { ...review, humanVisualAcceptance: "approved" },
      }),
    ).toBe(true);
  });

  it("rejects publication when provider provenance does not match", () => {
    expect(
      canPublishVoxyMotionArtifact({
        approval: approvedPreflightFixture,
        review: {
          providerId: "different-test-provider",
          exactHeadSha: "0123456789abcdef",
          canonicalVisualSource: VOXY_CANONICAL_VISUAL_SOURCE.repositoryPath,
          humanVisualAcceptance: "approved",
        },
      }),
    ).toBe(false);
  });
});
