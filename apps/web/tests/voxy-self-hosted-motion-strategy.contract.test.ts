import { describe, expect, it } from "vitest";
import {
  isVoxySelfHostedDefault,
  VOXY_SELF_HOSTED_MOTION_STRATEGY,
} from "@/features/voxyVideo/selfHostedMotionStrategy";

describe("Voxy self-hosted motion strategy", () => {
  it("keeps the default path local and SaaS-free", () => {
    expect(isVoxySelfHostedDefault()).toBe(true);
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.executionMode).toBe("self_hosted");
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.primaryRigEngine).toBe(
      "stretchy_studio_compatible",
    );
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.externalUploadAllowed).toBe(false);
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.providerCredentialsRequired).toBe(
      false,
    );
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.providerBudgetRequired).toBe(false);
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.autoPublish).toBe(false);
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.localRig).toEqual({
      id: "voxy-stretchy-compatible-svg-rig",
      version: "voxy-local-2d-rig-v1",
      assetPath:
        "apps/web/public/brands/voxy/characters/voxy-sitting-master.svg",
      implementation: "native_svg_layer_pivot_rig",
      modelWeightsRequired: false,
      networkRequired: false,
    });
  });

  it("requires human acceptance and all three publication formats", () => {
    expect(
      VOXY_SELF_HOSTED_MOTION_STRATEGY.humanVisualAcceptanceRequired,
    ).toBe(true);
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.requiredFormats).toEqual([
      "16:9",
      "9:16",
      "1:1",
    ]);
  });

  it("never falls back to a commercial provider automatically", () => {
    expect(
      VOXY_SELF_HOSTED_MOTION_STRATEGY.fallback.automaticFallbackAllowed,
    ).toBe(false);
    expect(
      VOXY_SELF_HOSTED_MOTION_STRATEGY.fallback.requiresExplicitHumanDecision,
    ).toBe(true);
    expect(
      VOXY_SELF_HOSTED_MOTION_STRATEGY.fallback
        .requiresProviderPrivacyRetentionBudgetGates,
    ).toBe(true);
  });

  it("keeps lip-sync optional until the character identity is stable", () => {
    expect(VOXY_SELF_HOSTED_MOTION_STRATEGY.lipSyncRequired).toBe(false);
    expect(
      VOXY_SELF_HOSTED_MOTION_STRATEGY.optionalLayers.lipSync.enabledByDefault,
    ).toBe(false);
  });
});
