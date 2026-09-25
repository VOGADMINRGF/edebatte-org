import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildVoxyMotionV3Plan,
  buildVoxyMotionV3Srt,
  buildVoxyMotionV3Vtt,
  validateVoxyMotionV3Plan,
  VOXY_MOTION_V3_LAYERS,
  VOXY_MOTION_V3_STATIC_MASTER_HEAD,
  VOXY_MOTION_V3_TIMELINE,
} from "@/features/voxyVideo/motionV3";
import {
  buildVoxyMotionV3FrameState,
  renderVoxyMotionV3FrameHtml,
} from "@/features/voxyVideo/motionV3Html";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const ASSETS = {
  canonStageDataUrl: "data:image/png;base64,canon",
  studioLockupDataUrl: "data:image/svg+xml;base64,lockup",
  lapelPinDataUrl: "data:image/svg+xml;base64,lapel",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,pocket",
};

describe("Voxy local layer master and Motion v3 contract", () => {
  it("binds the human-accepted static head and keeps release gates closed", () => {
    const plan = buildVoxyMotionV3Plan(HEAD);
    expect(plan.staticMasterHeadSha).toBe(
      "93217eca79013d13affc7bc9881a9c76f19feab9",
    );
    expect(plan.staticMasterHeadSha).toBe(VOXY_MOTION_V3_STATIC_MASTER_HEAD);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.externalVisualUploadUsed).toBe(false);
    expect(plan.generativeCharacterAssetsUsed).toBe(false);
    expect(validateVoxyMotionV3Plan(plan)).toEqual([]);
  });

  it("defines 26 real local SVG layers with unique ids and transparent roots", () => {
    expect(VOXY_MOTION_V3_LAYERS).toHaveLength(26);
    expect(new Set(VOXY_MOTION_V3_LAYERS.map((layer) => layer.id)).size).toBe(
      26,
    );
    for (const layer of VOXY_MOTION_V3_LAYERS) {
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
    const plan = buildVoxyMotionV3Plan(HEAD);
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

  it("renders deterministic 25-second motion with blink, gaze, mouth and bounded clasped-hand cues", () => {
    const plan = buildVoxyMotionV3Plan(HEAD);
    expect(plan.output).toMatchObject({
      durationMs: 25_000,
      fps: 24,
      frameCount: 600,
      width: 1920,
      height: 1080,
    });
    const states = Array.from({ length: plan.output.frameCount }, (_, frameIndex) =>
      buildVoxyMotionV3FrameState({ plan, frameIndex }),
    );
    expect(new Set(states.map((state) => state.mouthState))).toEqual(
      new Set(["neutral", "closed", "slight-open", "speaking-open"]),
    );
    expect(Math.max(...states.map((state) => state.blink))).toBe(1);
    expect(Math.max(...states.map((state) => Math.abs(state.headRotation)))).toBeLessThanOrEqual(0.35);
    expect(Math.max(...states.map((state) => Math.abs(state.leftHandY)))).toBeLessThanOrEqual(2.4);
    expect(Math.max(...states.map((state) => Math.abs(state.rightHandY)))).toBeLessThanOrEqual(2.4);
    expect(new Set(states.map((state) => state.gesture))).toEqual(
      new Set(["neutral_folded", "explain_micro", "invitation_micro"]),
    );
    expect(plan.handQa).toMatchObject({
      pose: "clasped_hands_not_open_palm",
      detector588Applicable: false,
      detector588Status: "not_run_not_applicable",
      thresholdChanged: false,
      generativeReconstructionUsed: false,
    });
  });

  it("uses the canonical greeting and source-safe participation language", () => {
    expect(VOXY_MOTION_V3_TIMELINE[0].caption).toBe(
      "Hallo Nachbar, ich bin Voxy.",
    );
    expect(VOXY_MOTION_V3_TIMELINE[4].caption).toContain(
      "über Positionen und Lösungen abstimmen",
    );
    expect(JSON.stringify(VOXY_MOTION_V3_TIMELINE)).not.toMatch(
      /über (Fakten|Wahrheit) abstimmen/i,
    );
    const vtt = buildVoxyMotionV3Vtt();
    const srt = buildVoxyMotionV3Srt();
    expect(vtt).toContain("00:00:16.500 --> 00:00:22.500");
    expect(srt).toContain("00:00:16,500 --> 00:00:22,500");
  });

  it("renders all formats locally without camera animation or a white mouth patch", () => {
    const plan = buildVoxyMotionV3Plan(HEAD);
    for (const format of ["16:9", "9:16", "1:1"] as const) {
      const html = renderVoxyMotionV3FrameHtml({
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
      expect(html).toContain(".mouth-patch:before{display:none}");
      expect(html).not.toMatch(/https?:\/\//);
      expect(html).not.toContain("@keyframes");
      expect(html).not.toContain("camera-zoom");
    }
  });

  it("keeps the renderer exact-head, local, and explicit about limitations", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-motion-v3.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_MOTION_V3_COMMIT_SHA");
    expect(source).toContain("exact_head_motion_inputs_dirty");
    expect(source).toContain("layerMasterSha");
    expect(source).toContain("ffprobe_contract_invalid");
    expect(source).toContain("not_run_not_applicable");
    expect(source).toContain("accepted_static_master_is_flattened");
    expect(source).not.toMatch(/fetch\(|axios|openai|replicate|fal\.ai/i);
    expect(source).not.toMatch(/publish|deploy|readyForReview/);
  });
});
