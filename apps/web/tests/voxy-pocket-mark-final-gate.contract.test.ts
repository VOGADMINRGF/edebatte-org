import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildVoxyPocketMarkFinalGatePlan,
  validateVoxyPocketMarkFinalGatePlan,
  VOXY_POCKET_MARK_COMPOSITION_SOURCE,
  VOXY_POCKET_MARK_FINAL_GATE_OUTPUT,
  VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256,
  VOXY_POCKET_MARK_PREVIOUS_PASS_HEAD,
  VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION,
} from "@/features/voxyVideo/pocketMarkFinalGate";

const HEAD = "7c6aa18e5618b4ef82760f24e1ecf9b80c04ff70";

describe("Voxy pocket mark final gate contract", () => {
  it("binds one clean vector eDebatte mark and no automated visual claim", () => {
    const plan = buildVoxyPocketMarkFinalGatePlan(HEAD);
    expect(plan.schemaVersion).toBe("voxy-pocket-mark-final-gate-v2");
    expect(plan.brandQa).toEqual({
      expectedText: "eDebatte",
      visibleMarkCount: 1,
      badgePresent: false,
      secondLinePresent: false,
      vectorSource: true,
      rasterUpscaleUsed: false,
      strokePresent: false,
      glowPresent: false,
      boxPresent: false,
      humanLegibilityRequired: true,
      humanVisualAcceptance: "pending",
      machineOcrClaimed: false,
      technicalStatus: "passed",
    });
    expect(plan.presentation).toMatchObject({
      rotationDegrees: -2.5,
      perspectiveTransform: "none",
    });
    expect(VOXY_POCKET_MARK_PREVIOUS_PASS_HEAD).toBe(
      "f948e1e6ce09fd9c62e8621b490eb8f0994c60ab",
    );
    expect(VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION).toMatchObject({
      left: plan.presentation.left,
      top: plan.presentation.top,
      width: plan.presentation.width,
      height: plan.presentation.height,
      rotationDegrees: -4,
      surfaceOpacity: 1,
    });
    expect(validateVoxyPocketMarkFinalGatePlan(plan)).toEqual([]);
  });

  it("keeps the lapel pin and every downstream gate unchanged", () => {
    const plan = buildVoxyPocketMarkFinalGatePlan(HEAD);
    expect(plan.unchangedLapelPinSha256).toBe(
      VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256,
    );
    expect(plan.lapelPinChanged).toBe(false);
    expect(plan.animationEligible).toBe(false);
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
  });

  it("rejects a second mark, stroke, OCR claim, pin drift, or release", () => {
    const drift = structuredClone(buildVoxyPocketMarkFinalGatePlan(HEAD));
    drift.brandQa.visibleMarkCount = 2 as 1;
    drift.brandQa.strokePresent = true as false;
    drift.brandQa.machineOcrClaimed = true as false;
    drift.lapelPinChanged = true as false;
    drift.productionEligible = true as false;
    expect(validateVoxyPocketMarkFinalGatePlan(drift)).toEqual(
      expect.arrayContaining([
        "pocket_brand_qa_invalid",
        "lapel_pin_must_remain_unchanged",
        "downstream_gates_must_remain_closed",
      ]),
    );
  });

  it("binds the five required Pocket Gate evidence images", () => {
    expect(VOXY_POCKET_MARK_FINAL_GATE_OUTPUT).toMatchObject({
      outputDirectory: "artifacts/voxy-pocket-mark-final-gate",
      fullContextFileName: "jacket-final-context.png",
      mark100PctFileName: "pocket-mark-final-100pct.png",
      mark200PctFileName: "pocket-mark-final-200pct.png",
      mark400PctFileName: "pocket-mark-final-400pct.png",
      beforeAfterFileName: "pocket-micro-pass-comparison.png",
      manifestFileName: "manifest.json",
    });
  });

  it("uses one SVG text element and no stroke, filter, rectangle, or raster source", () => {
    const svg = readFileSync(
      resolve(
        process.cwd(),
        "public/brands/voxy/overlays/edebatte-pocket-mark.svg",
      ),
      "utf8",
    );
    expect(svg.match(/<text\b/g)).toHaveLength(1);
    expect(svg).toContain('data-vector-source="true"');
    expect(svg).toContain('data-exact-text="eDebatte"');
    expect(svg).toContain(
      'data-surface-integration="substrate-alpha-0.94"',
    );
    expect(svg.match(/fill-opacity="0\.94"/g)).toHaveLength(1);
    expect(svg).toContain(">eDebatte</text>");
    expect(svg).not.toMatch(/<rect\b|<filter\b|\sstroke=|drop-shadow|box-shadow/i);
    expect(svg).not.toMatch(/\.png|\.jpe?g|data:image\/(png|jpe?g)/i);
  });

  it("keeps the renderer exact-head, local, and fail-closed", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-pocket-mark-final-gate.ts"),
      "utf8",
    );
    expect(source).toContain("VOXY_POCKET_GATE_COMMIT_SHA");
    expect(source).toContain("outside_pocket_pixels_changed");
    expect(source).toContain("external_requests_detected");
    expect(source).toContain("machineOcrClaimed");
    expect(source).toContain('microPassDecision: "adopted"');
    expect(source).toContain("VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION");
    expect(source).not.toContain("artifacts/voxy-layer-master");
    expect(source).not.toContain("artifacts/voxy-motion-v3");

    const retiredExplainerWorkflow = resolve(
      process.cwd(),
      "../..",
      ".github/workflows/voxy-first-explainer-video.yml",
    );
    expect(existsSync(retiredExplainerWorkflow)).toBe(false);
  });

  it("uses the native-resolution cleaned Canon source without a cleanup box", () => {
    const sourcePath = resolve(
      process.cwd(),
      "../..",
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.repositoryPath,
    );
    const bytes = readFileSync(sourcePath);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      VOXY_POCKET_MARK_COMPOSITION_SOURCE.sha256,
    );
    expect(VOXY_POCKET_MARK_COMPOSITION_SOURCE).toMatchObject({
      cleanupRegion: { x: 768, y: 497, width: 52, height: 22 },
      cleanupMethod:
        "ffmpeg_delogo_region_spliced_into_original_raw_rgba_no_scale",
      width: 1672,
      height: 941,
    });
    for (const file of [
      "src/features/voxyVideo/firstExplainerVideoHtml.ts",
      "src/features/voxyVideo/staticCanonRecoveryHtml.ts",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).not.toContain("pocket-mark-cleanup");
      expect(source.match(/class="reconstructed-character-mark reconstructed-pocket-mark"/g)).toHaveLength(1);
    }
  });
});
