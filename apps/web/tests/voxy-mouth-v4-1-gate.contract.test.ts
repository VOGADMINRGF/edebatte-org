import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildVoxyMouthV41GatePlan,
  validateVoxyMouthV41GatePlan,
  VOXY_MOUTH_V41_GATE_OUTPUT,
  VOXY_MOUTH_V41_SOURCE_HEAD,
} from "@/features/voxyVideo/mouthV41Gate";
import { renderVoxyMouthV41GateFrameHtml } from "@/features/voxyVideo/mouthV41GateHtml";
import {
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
} from "@/features/voxyVideo/mouthRig";
import {
  VOXY_MOUTH_V4_SHAPE_REFERENCE,
  VOXY_MOUTH_V41_SHAPES,
  VOXY_MOUTH_V41_WIDTH_LIMIT,
  validateVoxyMouthV41,
  voxyMouthShapeHeight,
  voxyMouthShapeWidth,
} from "@/features/voxyVideo/mouthV41";

const HEAD = "0123456789abcdef0123456789abcdef01234567";
const ASSETS = { canonStageDataUrl: "data:image/png;base64,canon" };

describe("Voxy Mouth v4.1 visual shape gate", () => {
  it("keeps the accepted anchor, pivot, head reference and neutral state unchanged", () => {
    expect(VOXY_MOUTH_CANON_ANCHOR).toMatchObject({
      x: 328,
      y: 280,
      pivotX: 48,
      pivotY: 27,
      referenceHeadWidth: 500,
      referenceHeadHeight: 400,
      canvasRelativePositioning: false,
    });
    expect(VOXY_MOUTH_V41_SHAPES.neutral).toBe(
      VOXY_MOUTH_V4_SHAPE_REFERENCE.neutral,
    );
    expect(validateVoxyMouthV41()).toEqual([]);
  });

  it("narrows speakingOpen and keeps slightOpen between closed and speakingOpen", () => {
    const neutralWidth = voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.neutral);
    const closedWidth = voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.closed);
    const slightWidth = voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.slightOpen);
    const speakingWidth = voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.speakingOpen);
    expect(speakingWidth / neutralWidth).toBeLessThanOrEqual(
      VOXY_MOUTH_V41_WIDTH_LIMIT.speakingOpenMaxRatioToNeutral,
    );
    expect(speakingWidth).toBeLessThan(
      voxyMouthShapeWidth(VOXY_MOUTH_V4_SHAPE_REFERENCE.speakingOpen),
    );
    expect(closedWidth).toBeGreaterThanOrEqual(slightWidth);
    expect(slightWidth).toBeGreaterThanOrEqual(speakingWidth);
    expect(voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.closed)).toBeLessThan(
      voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.slightOpen),
    );
    expect(voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.slightOpen)).toBeLessThan(
      voxyMouthShapeHeight(VOXY_MOUTH_V41_SHAPES.speakingOpen),
    );
  });

  it("preserves head parenting and shared X/Y registration for every state", () => {
    for (const state of VOXY_MOUTH_CANON_STATES) {
      const html = renderVoxyMouthV41GateFrameHtml({
        assets: ASSETS,
        stateId: state.id,
      });
      const headStart = html.indexOf('<section class="head-rig"');
      const headEnd = html.indexOf("</section>", headStart);
      const mouth = html.indexOf('<div class="mouth-rig"', headStart);
      expect(mouth).toBeGreaterThan(headStart);
      expect(mouth).toBeLessThan(headEnd);
      expect(html).toContain('data-mouth-profile="v4.1"');
      expect(html).toContain('data-anchor-x="328"');
      expect(html).toContain('data-anchor-y="280"');
      expect(html).toContain('data-pivot-x="48"');
      expect(html).toContain('data-pivot-y="27"');
      expect(html).toContain('data-canvas-relative-positioning="false"');
    }
  });

  it("keeps architecture and release gates fail-closed", () => {
    const plan = buildVoxyMouthV41GatePlan(HEAD);
    expect(plan.sourceMotionV4HeadSha).toBe(VOXY_MOUTH_V41_SOURCE_HEAD);
    expect(plan.mouth).toMatchObject({
      architectureChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      headBindingChanged: false,
      neutralStateChanged: false,
      slightOpenPolished: true,
      speakingOpenPolished: true,
      transitionPolished: true,
      noXDrift: true,
      noYDrift: true,
    });
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(validateVoxyMouthV41GatePlan(plan)).toEqual([]);
  });

  it("defines all seven required shape evidence images", () => {
    expect(Object.values(VOXY_MOUTH_V41_GATE_OUTPUT.stateFiles)).toEqual([
      "neutral-400pct.png",
      "closed-400pct.png",
      "slight-open-400pct.png",
      "speaking-open-400pct.png",
    ]);
    expect(VOXY_MOUTH_V41_GATE_OUTPUT).toMatchObject({
      comparisonFileName: "mouth-v4-vs-v4-1.png",
      overlayFileName: "mouth-state-overlay-v4-1.png",
      sequenceFileName: "speaking-sequence-contact-sheet.png",
    });
  });

  it("keeps the exact-head renderer local and measures real DOM binding", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-mouth-v4-1-gate.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_MOUTH_V41_COMMIT_SHA");
    expect(source).toContain("mouth.parentElement !== head");
    expect(source).toContain("mouth_v4_1_binding_measurement_failed");
    expect(source).not.toMatch(/openai|replicate|fal\.ai|axios|fetch\(/i);
  });
});
