import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildVoxyJacketCanonGatePlan,
  validateVoxyJacketCanonGatePlan,
  VOXY_JACKET_CANON_GATE_CROPS,
  VOXY_JACKET_CANON_GATE_OUTPUT,
  VOXY_JACKET_CANON_MARK_PROVENANCE,
  VOXY_JACKET_HARD_CANON_REGION,
  VOXY_JACKET_NON_BRAND_PIXEL_MATCH_CROP,
} from "@/features/voxyVideo/jacketCanonGate";

const HEAD = "7c6aa18e5618b4ef82760f24e1ecf9b80c04ff70";

describe("Voxy jacket canon gate contract", () => {
  it("keeps jacket geometry hard-Canon while naming the exact reconstructed marks", () => {
    const plan = buildVoxyJacketCanonGatePlan(HEAD);
    expect(plan.schemaVersion).toBe("voxy-jacket-canon-gate-v2");
    expect(plan.hardCanonRegion).toBe(VOXY_JACKET_HARD_CANON_REGION);
    expect(plan.hardCanonRegion).toEqual([
      "jacket_cut",
      "lapel_geometry",
      "fabric_texture",
      "stitching",
      "pocket_geometry",
      "blue_piping",
      "voxy_lapel_pin",
      "edebatte_pocket_mark",
    ]);
    expect(plan.cropContract).toBe(VOXY_JACKET_CANON_GATE_CROPS);
    expect(plan.nonBrandPixelMatchCrop).toBe(
      VOXY_JACKET_NON_BRAND_PIXEL_MATCH_CROP,
    );
    expect(plan.source.canonBoardId).toBe("CANON-04");
    expect(Object.keys(plan.source.allCanonHashes)).toHaveLength(4);
  });

  it("requires human legibility after deterministic vector reconstruction", () => {
    const { brandQa } = buildVoxyJacketCanonGatePlan(HEAD);
    expect(brandQa.evidenceMethod).toBe(
      "vector_source_text_contract_plus_masked_non_brand_pixel_match_and_human_legibility",
    );
    expect(brandQa.lapelPin).toMatchObject({
      expectedText: "VOXY",
      expectedVisibleMarkCount: 1,
      visibleMarkCount: 1,
      humanLegibilityRequired: true,
      humanLegibilityStatus: "pending",
      machineRecognizedText: null,
      technicalStatus: "passed",
    });
    expect(brandQa.pocketMark).toMatchObject({
      expectedText: "eDebatte",
      expectedVisibleMarkCount: 1,
      visibleMarkCount: 1,
      badgePresent: false,
      secondLinePresent: false,
      humanLegibilityRequired: true,
      humanLegibilityStatus: "pending",
      machineRecognizedText: null,
      technicalStatus: "passed",
    });
  });

  it("passes only the technical Jacket gate and keeps downstream gates closed", () => {
    const plan = buildVoxyJacketCanonGatePlan(HEAD);
    expect(plan.jacketCanonGate).toEqual({
      passed: true,
      brandLayerTechnicalContract: "passed",
      nonBrandPixelsPreserved: true,
      texturePreservedOutsideReplacementMasks: true,
      lapelGeometryPreserved: true,
      pocketGeometryPreserved: true,
      bluePipingPreserved: true,
      humanLegibility: "pending",
    });
    expect(plan.humanDecision.status).toBe("rejected");
    expect(plan.layerMasterEligible).toBe(false);
    expect(plan.motionV3Eligible).toBe(false);
    expect(plan.animationEligible).toBe(false);
    expect(plan.humanVisualAcceptance).toBe("pending");
    expect(plan.productionEligible).toBe(false);
    expect(plan.autoPublish).toBe(false);
    expect(validateVoxyJacketCanonGatePlan(plan)).toEqual([]);
  });

  it("rejects mark-contract drift and any silent downstream release", () => {
    const drift = structuredClone(buildVoxyJacketCanonGatePlan(HEAD));
    drift.brandQa.pocketMark.visibleMarkCount = 2 as 1;
    drift.jacketCanonGate.nonBrandPixelsPreserved = false as true;
    drift.motionV3Eligible = true as false;
    expect(validateVoxyJacketCanonGatePlan(drift)).toEqual(
      expect.arrayContaining([
        "brand_legibility_contract_invalid",
        "technical_jacket_gate_contract_invalid",
        "human_and_downstream_gates_must_remain_closed",
      ]),
    );
  });

  it("records source, geometry and legibility provenance for both marks", () => {
    const plan = buildVoxyJacketCanonGatePlan(HEAD);
    expect(plan.markProvenance).toBe(VOXY_JACKET_CANON_MARK_PROVENANCE);
    expect(plan.markProvenance.lapelPin.text).toBe("VOXY");
    expect(plan.markProvenance.pocketMark.text).toBe("eDebatte");
    for (const mark of Object.values(plan.markProvenance)) {
      expect(mark.geometryReferenceCanonFile).toContain(
        "CANON-04-broadcast-layout-blue.png",
      );
      expect(mark.geometryDerivedFromCanon).toBe(true);
      expect(mark.wordmarkReconstructedForLegibility).toBe(true);
      expect(mark.compositingMethod).toBeTruthy();
    }
  });

  it("binds the six mandatory visual evidence PNGs", () => {
    expect(VOXY_JACKET_CANON_GATE_OUTPUT).toMatchObject({
      outputDirectory: "artifacts/voxy-jacket-canon-gate",
      jacketFullFileName: "jacket-full.png",
      jacket200PctFileName: "jacket-200pct.png",
      lapelPin400PctFileName: "lapel-pin-400pct.png",
      pocketMark400PctFileName: "pocket-mark-400pct.png",
      comparisonFileName: "jacket-canon-comparison.png",
      legibilityComparisonFileName: "jacket-brand-legibility-comparison.png",
      manifestFileName: "manifest.json",
    });
  });

  it("keeps the renderer local and explicitly excludes downstream artifacts", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/render-voxy-jacket-canon-gate.ts"),
      "utf8",
    );
    for (const file of [
      "jacketFullFileName",
      "jacket200PctFileName",
      "lapelPin400PctFileName",
      "pocketMark400PctFileName",
      "comparisonFileName",
      "legibilityComparisonFileName",
      "manifestFileName",
    ]) {
      expect(source).toContain(file);
    }
    expect(source).toContain("external_requests_detected");
    expect(source).toContain("jacket_canon_non_brand_pixel_match_failed");
    expect(source).toContain("No layer master or Motion v3 render is authorized");
    expect(source).not.toContain("artifacts/voxy-layer-master");
    expect(source).not.toContain("artifacts/voxy-motion-v3");
  });
});
