import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildVoxyMotionV4Plan } from "@/features/voxyVideo/motionV4";
import { buildVoxyMotionV4FrameState } from "@/features/voxyVideo/motionV4Html";
import {
  buildVoxyMotionV41Plan,
  validateVoxyMotionV41Plan,
  VOXY_MOTION_V41_TIMELINE,
} from "@/features/voxyVideo/motionV41";
import {
  buildVoxyMotionV41FrameState,
  renderVoxyMotionV41FrameHtml,
} from "@/features/voxyVideo/motionV41Html";
import {
  VOXY_MOUTH_V41_SHAPES,
  voxyMouthShapeHeight,
  voxyMouthShapeWidth,
} from "@/features/voxyVideo/mouthV41";
import { VOXY_MOUTH_V41_SOURCE_HEAD } from "@/features/voxyVideo/mouthV41Gate";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const ASSETS = {
  canonStageDataUrl: "data:image/png;base64,canon",
  canonicalCleanStudioBackgroundDataUrl: "data:image/svg+xml;base64,background",
  studioLockupDataUrl: "data:image/svg+xml;base64,lockup",
  lapelPinDataUrl: "data:image/svg+xml;base64,lapel",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket",
};

describe("Voxy Motion v4.1 mouth-only polish contract", () => {
  it("reuses the exact v4 timing, gestures, camera, captions, and frozen layers", () => {
    const previous = buildVoxyMotionV4Plan(HEAD);
    const plan = buildVoxyMotionV41Plan(HEAD);

    expect(plan.sourceMotionV4HeadSha).toBe(VOXY_MOUTH_V41_SOURCE_HEAD);
    expect(plan.output).toMatchObject({
      durationMs: 22_000,
      fps: 24,
      frameCount: 528,
      width: 1920,
      height: 1080,
    });
    expect(plan.timeline).toBe(previous.timeline);
    expect(plan.standframes).toBe(previous.standframes);
    expect(plan.layers).toBe(previous.layers);
    expect(plan.brand).toEqual(previous.brand);
    expect(plan.waveform).toEqual(previous.waveform);
    expect(plan.characterLock).toEqual(previous.characterLock);
    expect(plan.motion.blinkCount).toBe(previous.motion.blinkCount);
    expect(plan.motion.armGestureCount).toBe(previous.motion.armGestureCount);
    expect(VOXY_MOTION_V41_TIMELINE[0].caption).toBe("Ich bin Voxy.");
    expect(JSON.stringify(VOXY_MOTION_V41_TIMELINE)).not.toContain("Hallo Nachbar");
    expect(validateVoxyMotionV41Plan(plan)).toEqual([]);
  });

  it("changes only the slight-open, speaking-open, and transition shape profile", () => {
    const plan = buildVoxyMotionV41Plan(HEAD);
    expect(plan.mouth).toMatchObject({
      architectureChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      headBindingChanged: false,
      neutralStateChanged: false,
      slightOpenPolished: true,
      speakingOpenPolished: true,
      transitionPolished: true,
      anchorType: "head_relative",
      x: 328,
      y: 280,
      pivotX: 48,
      pivotY: 27,
      canvasRelativePositioning: false,
      headTransformInheritance: true,
    });
    expect(voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.closed)).toBeGreaterThanOrEqual(
      voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.slightOpen),
    );
    expect(voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.slightOpen)).toBeGreaterThanOrEqual(
      voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.speakingOpen),
    );
    expect(voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.closed)).toBeLessThan(
      voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.slightOpen),
    );
    expect(voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.slightOpen)).toBeLessThan(
      voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.speakingOpen),
    );
  });

  it("keeps all 528 v4 frame-state decisions exactly unchanged", () => {
    const previous = buildVoxyMotionV4Plan(HEAD);
    const plan = buildVoxyMotionV41Plan(HEAD);
    for (let frameIndex = 0; frameIndex < plan.output.frameCount; frameIndex += 1) {
      expect(buildVoxyMotionV41FrameState({ plan, frameIndex })).toEqual(
        buildVoxyMotionV4FrameState({ plan: previous, frameIndex }),
      );
    }
  });

  it("renders the polished mouth inside the unchanged head-relative DOM", () => {
    const plan = buildVoxyMotionV41Plan(HEAD);
    const html = renderVoxyMotionV41FrameHtml({
      plan,
      assets: ASSETS,
      frameIndex: 372,
    });
    expect(html).toContain('data-mouth-profile="v4.1"');
    expect(html).toContain('<section class="head-rig"');
    expect(html).toContain('data-head-child="mouth"');
    expect(html).toContain('data-anchor-x="328"');
    expect(html).toContain('data-anchor-y="280"');
    expect(html).toContain('data-pivot-x="48"');
    expect(html).toContain('data-pivot-y="27"');
    expect(html).toContain('data-canvas-relative-positioning="false"');
    expect(html).not.toContain('<div class="mouth-patch');
    expect(html).not.toContain("@keyframes");
    expect(html).not.toContain("camera-zoom");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("keeps all release and publishing gates closed", () => {
    const plan = buildVoxyMotionV41Plan(HEAD);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.externalVisualUploadUsed).toBe(false);
    expect(plan.generativeCharacterAssetsUsed).toBe(false);
  });

  it("keeps the exact-head renderer local and blocks motion before the v4.1 gate", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-motion-v4-1.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_MOTION_V41_COMMIT_SHA");
    expect(source).toContain("exact_head_motion_v4_1_inputs_dirty");
    expect(source).toContain("motion_v4_1_blocked_by_mouth_shape_gate");
    expect(source).toContain("ffprobe_contract_invalid");
    expect(source).not.toMatch(/fetch\(|axios|openai|replicate|fal\.ai/i);
    expect(source).not.toMatch(/publish|deploy|readyForReview/);
  });
});
