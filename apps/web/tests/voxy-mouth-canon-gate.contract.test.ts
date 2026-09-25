import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildVoxyMouthCanonGatePlan,
  validateVoxyMouthCanonGatePlan,
  VOXY_MOUTH_CANON_GATE_OUTPUT,
  VOXY_MOUTH_CANON_GATE_SOURCE_MOTION_HEAD,
} from "@/features/voxyVideo/mouthCanonGate";
import { renderVoxyMouthCanonGateFrameHtml } from "@/features/voxyVideo/mouthCanonGateHtml";
import {
  VOXY_HEAD_RIG_REFERENCE,
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  VOXY_MOUTH_CANON_TRANSITION_SEQUENCE,
  validateVoxyMouthCanon,
} from "@/features/voxyVideo/mouthRig";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const ASSETS = { canonStageDataUrl: "data:image/png;base64,canon" };

describe("Voxy Mouth Canon hard gate", () => {
  it("uses one head-relative anchor and rejects canvas positioning", () => {
    expect(VOXY_MOUTH_CANON_ANCHOR).toEqual({
      anchorType: "head_relative",
      x: 328,
      y: 280,
      pivotX: 48,
      pivotY: 27,
      referenceHeadWidth: 500,
      referenceHeadHeight: 400,
      stateWidth: 96,
      stateHeight: 54,
      canvasRelativePositioning: false,
    });
    expect(VOXY_HEAD_RIG_REFERENCE).toMatchObject({ width: 500, height: 400 });
    expect(validateVoxyMouthCanon()).toEqual([]);
  });

  it("binds every state to an identical anchor, pivot and extent", () => {
    expect(VOXY_MOUTH_CANON_STATES.map((state) => state.id)).toEqual([
      "neutral",
      "closed",
      "slightOpen",
      "speakingOpen",
    ]);
    for (const state of VOXY_MOUTH_CANON_STATES) {
      expect(state).toMatchObject({
        anchorX: VOXY_MOUTH_CANON_ANCHOR.x,
        anchorY: VOXY_MOUTH_CANON_ANCHOR.y,
        pivotX: VOXY_MOUTH_CANON_ANCHOR.pivotX,
        pivotY: VOXY_MOUTH_CANON_ANCHOR.pivotY,
        width: VOXY_MOUTH_CANON_ANCHOR.stateWidth,
        height: VOXY_MOUTH_CANON_ANCHOR.stateHeight,
      });
    }
    expect(VOXY_MOUTH_CANON_TRANSITION_SEQUENCE).toEqual([
      "closed",
      "slightOpen",
      "speakingOpen",
      "slightOpen",
      "closed",
    ]);
  });

  it("nests mouth, eyes, eyelids and brows inside the head transform", () => {
    for (const state of VOXY_MOUTH_CANON_STATES) {
      const html = renderVoxyMouthCanonGateFrameHtml({
        assets: ASSETS,
        stateId: state.id,
        headRotationDegrees: 0.55,
        headTranslateY: 0.75,
      });
      const headStart = html.indexOf('<section class="head-rig"');
      const headEnd = html.indexOf("</section>", headStart);
      const mouth = html.indexOf('<div class="mouth-rig"', headStart);
      expect(headStart).toBeGreaterThan(-1);
      expect(mouth).toBeGreaterThan(headStart);
      expect(mouth).toBeLessThan(headEnd);
      expect(html).toContain('data-anchor-type="head_relative"');
      expect(html).toContain('data-canvas-relative-positioning="false"');
      expect(html).toContain('data-head-child="left-eye"');
      expect(html).toContain('data-head-child="right-eye"');
      expect(html).toContain('data-head-child="brows"');
      expect(html).not.toContain("canvas-mouth");
      expect(html).not.toMatch(/https?:\/\//);
    }
  });

  it("keeps source and release contracts fail-closed", () => {
    const plan = buildVoxyMouthCanonGatePlan(HEAD);
    expect(plan.sourceMotionV3HeadSha).toBe(
      "f7b621de20b34084423fd303728d2dd014817a48",
    );
    expect(plan.sourceMotionV3HeadSha).toBe(
      VOXY_MOUTH_CANON_GATE_SOURCE_MOTION_HEAD,
    );
    expect(plan.mouth).toMatchObject({
      anchorType: "head_relative",
      sharedAnchor: true,
      sharedPivot: true,
      canvasRelativePositioning: false,
      headTransformInheritance: true,
      stateCount: 4,
    });
    expect(plan.noGenerativeReplacement).toBe(true);
    expect(plan.externalProviderUsed).toBe(false);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(validateVoxyMouthCanonGatePlan(plan)).toEqual([]);
  });

  it("defines all seven required pre-motion evidence files", () => {
    expect(Object.values(VOXY_MOUTH_CANON_GATE_OUTPUT.stateFiles)).toEqual([
      "mouth-neutral-400pct.png",
      "mouth-closed-400pct.png",
      "mouth-slight-open-400pct.png",
      "mouth-speaking-open-400pct.png",
    ]);
    expect(VOXY_MOUTH_CANON_GATE_OUTPUT).toMatchObject({
      overlayComparisonFileName: "mouth-state-overlay-comparison.png",
      headNeutralFileName: "head-with-mouth-neutral.png",
      headSpeakingFileName: "head-with-mouth-speaking.png",
      manifestFileName: "manifest.json",
    });
  });

  it("keeps the exact-head renderer local and measures actual DOM inheritance", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-mouth-canon-gate.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_MOUTH_CANON_COMMIT_SHA");
    expect(source).toContain("mouth.parentElement !== head");
    expect(source).toContain("mouth_head_binding_measurement_failed");
    expect(source).toContain("noXDrift: true");
    expect(source).toContain("noYDrift: true");
    expect(source).not.toMatch(/openai|replicate|fal\.ai|axios|fetch\(/i);
  });
});
