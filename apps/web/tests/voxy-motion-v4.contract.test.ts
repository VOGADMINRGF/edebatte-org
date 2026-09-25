import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildVoxyMotionV4Plan,
  buildVoxyMotionV4Srt,
  buildVoxyMotionV4Vtt,
  validateVoxyMotionV4Plan,
  VOXY_MOTION_V4_LAYERS,
  VOXY_MOTION_V4_STATIC_MASTER_HEAD,
  VOXY_MOTION_V4_TIMELINE,
} from "@/features/voxyVideo/motionV4";
import {
  buildVoxyMotionV4FrameState,
  renderVoxyMotionV4FrameHtml,
} from "@/features/voxyVideo/motionV4Html";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const ASSETS = {
  canonStageDataUrl: "data:image/png;base64,canon",
  canonicalCleanStudioBackgroundDataUrl: "data:image/svg+xml;base64,background",
  studioLockupDataUrl: "data:image/svg+xml;base64,lockup",
  lapelPinDataUrl: "data:image/svg+xml;base64,lapel",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket",
};

describe("Voxy local layer master and Motion v4 contract", () => {
  it("binds the human-accepted static head and keeps release gates closed", () => {
    const plan = buildVoxyMotionV4Plan(HEAD);
    expect(plan.staticMasterHeadSha).toBe(
      "93217eca79013d13affc7bc9881a9c76f19feab9",
    );
    expect(plan.staticMasterHeadSha).toBe(VOXY_MOTION_V4_STATIC_MASTER_HEAD);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.externalVisualUploadUsed).toBe(false);
    expect(plan.generativeCharacterAssetsUsed).toBe(false);
    expect(validateVoxyMotionV4Plan(plan)).toEqual([]);
  });

  it("defines 26 real local SVG layers with unique ids and transparent roots", () => {
    expect(VOXY_MOTION_V4_LAYERS).toHaveLength(26);
    expect(new Set(VOXY_MOTION_V4_LAYERS.map((layer) => layer.id)).size).toBe(
      26,
    );
    for (const layer of VOXY_MOTION_V4_LAYERS) {
      const svg = readFileSync(
        resolve(process.cwd(), layer.sourcePath.replace("apps/web/", "")),
        "utf8",
      );
      expect(svg).toContain(`data-layer-id="${layer.id}"`);
      expect(svg).toContain('data-no-generative-replacement="true"');
      expect(svg.match(/<svg\b/g)).toHaveLength(1);
      expect(svg.replace("http://www.w3.org/2000/svg", "")).not.toMatch(
        /https?:\/\//,
      );
      expect(svg).not.toMatch(/<rect[^>]+fill="(?:white|#fff(?:fff)?)"/i);
    }
  });

  it("freezes jacket branding and keeps exactly one waveform behind Voxy", () => {
    const plan = buildVoxyMotionV4Plan(HEAD);
    expect(plan.brand).toMatchObject({
      lapelPin: "VOXY",
      pocketMark: "eDebatte",
      pocketRotation: -2.5,
      pocketOpacity: 0.94,
      studioPrimary: "VoiceOpenGov",
      studioSecondary: "eDebatte",
      vote4GovPlacement: "contextual_only",
    });
    expect(plan.waveform).toEqual({
      count: 1,
      placement: "behind_voxy",
      animated: false,
    });
    expect(
      plan.layers.find((layer) => layer.id === "voxy-lapel-pin"),
    ).toMatchObject({ frozen: true, motionEligible: false });
    expect(
      plan.layers.find((layer) => layer.id === "edebatte-pocket-mark"),
    ).toMatchObject({ frozen: true, motionEligible: false });
    expect(
      readFileSync(
        resolve(process.cwd(), "public/brands/voxy/rig/layers/edebatte-pocket-mark.svg"),
        "utf8",
      ),
    ).toMatch(/edebatte-pocket-mark\.svg[^>]+opacity="0\.94"[^>]+rotate\(-2\.5/);
  });

  it("renders deterministic 22-second motion with coupled face motion and one bounded gesture", () => {
    const plan = buildVoxyMotionV4Plan(HEAD);
    expect(plan.output).toMatchObject({
      durationMs: 22_000,
      fps: 24,
      frameCount: 528,
      width: 1920,
      height: 1080,
    });
    const states = Array.from({ length: plan.output.frameCount }, (_, frameIndex) =>
      buildVoxyMotionV4FrameState({ plan, frameIndex }),
    );
    expect(new Set(states.flatMap((state) => [state.mouthState, state.mouthNextState]))).toEqual(
      new Set(["neutral", "closed", "slightOpen", "speakingOpen"]),
    );
    expect(new Set(states.map((state) => state.mouthMix)).size).toBeGreaterThan(4);
    expect(Math.max(...states.map((state) => state.blink))).toBe(1);
    expect(Math.max(...states.map((state) => Math.abs(state.headRotation)))).toBeLessThanOrEqual(0.596);
    expect(Math.max(...states.map((state) => Math.abs(state.headRotation)))).toBeGreaterThan(0.35);
    expect(Math.max(...states.map((state) => Math.abs(state.leftHandY)))).toBeLessThanOrEqual(2.4);
    expect(Math.max(...states.map((state) => Math.abs(state.rightHandY)))).toBeLessThanOrEqual(2.4);
    expect(new Set(states.map((state) => state.gesture))).toEqual(
      new Set(["neutral_folded", "explain_micro"]),
    );
    expect(plan.mouth).toMatchObject({
      anchorType: "head_relative",
      sharedAnchor: true,
      sharedPivot: true,
      canvasRelativePositioning: false,
      headTransformInheritance: true,
      stateCount: 4,
    });
    expect(plan.handQa).toMatchObject({
      pose: "clasped_hands_not_open_palm",
      detector588Applicable: false,
      detector588Status: "not_run_not_applicable",
      thresholdChanged: false,
      generativeReconstructionUsed: false,
    });
  });

  it("uses the required v4 narration and source-safe participation language", () => {
    expect(VOXY_MOTION_V4_TIMELINE[0].caption).toBe("Ich bin Voxy.");
    expect(VOXY_MOTION_V4_TIMELINE[4].caption).toBe(
      "Und eDebatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar.",
    );
    expect(JSON.stringify(VOXY_MOTION_V4_TIMELINE)).not.toMatch(
      /über (Fakten|Wahrheit) abstimmen/i,
    );
    const vtt = buildVoxyMotionV4Vtt();
    const srt = buildVoxyMotionV4Srt();
    expect(vtt).toContain("00:00:12.500 --> 00:00:18.500");
    expect(srt).toContain("00:00:12,500 --> 00:00:18,500");
  });

  it("renders all formats locally without camera animation or a white mouth patch", () => {
    const plan = buildVoxyMotionV4Plan(HEAD);
    for (const format of ["16:9", "9:16", "1:1"] as const) {
      const html = renderVoxyMotionV4FrameHtml({
        plan,
        assets: ASSETS,
        frameIndex: 456,
        format,
      });
      expect(html).toContain(`data-format="${format}"`);
      expect(html).toContain('data-waveform-count="1"');
      expect(html).toContain('data-waveform-placement="behind_voxy"');
      expect(html).toContain('alt="VOXY"');
      expect(html).toContain('alt="eDebatte"');
      expect(html).toContain('<section class="head-rig"');
      expect(html).toContain('data-head-child="mouth"');
      expect(html).toContain('data-anchor-type="head_relative"');
      expect(html).toContain('data-canvas-relative-positioning="false"');
      expect(html).toContain('data-head-child="left-eye"');
      expect(html).toContain('data-head-child="right-eye"');
      expect(html).toContain('data-head-child="brows"');
      expect(html).not.toContain('<div class="motion-plate head-plate"');
      expect(html).not.toContain('<div class="mouth-patch');
      expect(html).not.toMatch(/https?:\/\//);
      expect(html).not.toContain("@keyframes");
      expect(html).not.toContain("camera-zoom");
    }
  });

  it("keeps the historical voiced-explainer visual path frozen unless canonical alpha mode is explicit", () => {
    const plan = buildVoxyMotionV4Plan(HEAD);
    const { canonicalCleanStudioBackgroundDataUrl: _background, ...legacyAssets } =
      ASSETS;
    const legacyHtml = renderVoxyMotionV4FrameHtml({
      plan,
      assets: legacyAssets,
      frameIndex: 49,
      format: "16:9",
    });
    expect(legacyHtml).toContain('data-head-layer="head-base"');
    expect(legacyHtml).toContain('<div class="motion-plate neck-plate">');
    expect(legacyHtml).toContain(
      'data-character-lock="accepted_static_master_additive_motion_plates"',
    );
    expect(legacyHtml).not.toContain('data-head-alpha-schema=');

    const canonicalHtml = renderVoxyMotionV4FrameHtml({
      plan,
      assets: ASSETS,
      frameIndex: 49,
      format: "16:9",
    });
    expect(canonicalHtml).toContain(
      'data-head-alpha-schema="voxy-canonical-head-alpha-v1"',
    );
    expect(canonicalHtml).not.toContain(
      '<div class="motion-plate neck-plate">',
    );
  });

  it("keeps the renderer exact-head, local, and explicit about limitations", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-motion-v4.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_MOTION_V4_COMMIT_SHA");
    expect(source).toContain("exact_head_motion_inputs_dirty");
    expect(source).toContain("layerMasterSha");
    expect(source).toContain("ffprobe_contract_invalid");
    expect(source).toContain("motion_v4_blocked_by_mouth_canon_gate");
    expect(source).toContain("not_run_not_applicable");
    expect(source).toContain("accepted_static_master_is_flattened");
    expect(source).not.toMatch(/fetch\(|axios|openai|replicate|fal\.ai/i);
    expect(source).not.toMatch(/publish|deploy|readyForReview/);
  });
});
