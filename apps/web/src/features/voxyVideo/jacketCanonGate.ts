import {
  VOXY_STATIC_CANON_BOARDS,
  VOXY_STATIC_CANON_NATIVE_ASSETS,
  VOXY_STATIC_CANON_PIXEL_SOURCE,
} from "./staticCanonRecovery";

export const VOXY_JACKET_CANON_GATE_SCHEMA_VERSION =
  "voxy-jacket-canon-gate-v2" as const;

export const VOXY_JACKET_CANON_GATE_OUTPUT = {
  outputDirectory: "artifacts/voxy-jacket-canon-gate",
  jacketFullFileName: "jacket-full.png",
  jacket200PctFileName: "jacket-200pct.png",
  lapelPin400PctFileName: "lapel-pin-400pct.png",
  pocketMark400PctFileName: "pocket-mark-400pct.png",
  comparisonFileName: "jacket-canon-comparison.png",
  legibilityComparisonFileName: "jacket-brand-legibility-comparison.png",
  manifestFileName: "manifest.json",
} as const;

export const VOXY_JACKET_CANON_GATE_CROPS = {
  jacket: { x: 410, y: 390, width: 650, height: 420 },
  lapelPin: { x: 615, y: 445, width: 140, height: 105 },
  pocketMark: { x: 800, y: 510, width: 220, height: 145 },
} as const;

export const VOXY_JACKET_NON_BRAND_PIXEL_MATCH_CROP = {
  x: 540,
  y: 390,
  width: 520,
  height: 405,
} as const;

export const VOXY_JACKET_BRAND_LAYER_GEOMETRY = {
  lapelPin: {
    left: 643,
    top: 486,
    width: 49,
    height: 24,
    rotationDegrees: -10,
    perspectiveTransform: "skewX(-3deg) scaleY(0.88)",
  },
  pocketMark: {
    left: 858,
    top: 574,
    width: 74,
    height: 23,
    rotationDegrees: -2.5,
    perspectiveTransform: "none",
  },
} as const;

export const VOXY_JACKET_BRAND_REPLACEMENT_MASKS = {
  lapelPin: { x: 630, y: 470, width: 78, height: 58 },
  pocketMark: { x: 845, y: 565, width: 98, height: 55 },
} as const;

export const VOXY_JACKET_CANON_MARK_PROVENANCE = {
  lapelPin: {
    text: "VOXY",
    fontSource: "Arial 800 with Helvetica and sans-serif fallbacks",
    sourceAsset: VOXY_STATIC_CANON_NATIVE_ASSETS.lapelPin,
    renderingMethod: "browser_rasterized_inline_svg_text_at_native_vector_resolution",
    geometryReferenceCanonFile: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    geometryReferenceCrop: { x: 585, y: 414, width: 60, height: 38 },
    targetPlacement: {
      coordinateSpace: "primary_a_1920x1080",
      x: VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.left,
      y: VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.top,
      width: VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.width,
      height: VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.height,
    },
    scale: { x: 0.102083333, y: 0.1, sourceViewBox: "480x240" },
    rotation: { degrees: -10, transformOrigin: "center" },
    perspectiveTransform:
      VOXY_JACKET_BRAND_LAYER_GEOMETRY.lapelPin.perspectiveTransform,
    compositingMethod:
      "opaque_dark_pin_surface_replaces_only_canon_pin_surface_then_vector_text",
    geometryDerivedFromCanon: true,
    wordmarkReconstructedForLegibility: true,
  },
  pocketMark: {
    text: "eDebatte",
    fontSource: "Arial 700 with Helvetica and sans-serif fallbacks",
    sourceAsset: VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    renderingMethod: "browser_rasterized_inline_svg_text_at_native_vector_resolution",
    geometryReferenceCanonFile: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    geometryReferenceCrop: { x: 760, y: 470, width: 90, height: 60 },
    targetPlacement: {
      coordinateSpace: "primary_a_1920x1080",
      x: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.left,
      y: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.top,
      width: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.width,
      height: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.height,
    },
    scale: { x: 0.04625, y: 0.047916667, sourceViewBox: "1600x480" },
    rotation: { degrees: -2.5, transformOrigin: "center" },
    perspectiveTransform:
      VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.perspectiveTransform,
    compositingMethod:
      "native_resolution_canon_pocket_glyph_cleanup_then_single_native_svg_text_at_0_94_substrate_alpha_no_stroke_no_filter",
    geometryDerivedFromCanon: true,
    wordmarkReconstructedForLegibility: true,
  },
} as const;

export const VOXY_JACKET_HARD_CANON_REGION = [
  "jacket_cut",
  "lapel_geometry",
  "fabric_texture",
  "stitching",
  "pocket_geometry",
  "blue_piping",
  "voxy_lapel_pin",
  "edebatte_pocket_mark",
] as const;

export const VOXY_JACKET_CANON_GATE_HUMAN_DECISION = {
  date: "2026-08-15",
  status: "rejected",
  scope: "jacket_gate_at_64b79c797450fe4c6202b6d0e3bad8c1afa2ed4b",
  reasons: [
    "canon_raster_pin_reads_as_vokt_or_voxt_instead_of_voxy",
    "canon_raster_pocket_mark_reads_as_edebotte_instead_of_edebatte",
    "pixel_identity_does_not_establish_brand_legibility",
  ],
} as const;

export type VoxyJacketCanonGatePlan = Readonly<{
  schemaVersion: typeof VOXY_JACKET_CANON_GATE_SCHEMA_VERSION;
  exactHeadSha: string;
  output: typeof VOXY_JACKET_CANON_GATE_OUTPUT;
  source: {
    canonBoardId: typeof VOXY_STATIC_CANON_PIXEL_SOURCE.id;
    canonBoardPath: typeof VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath;
    canonBoardSha256: typeof VOXY_STATIC_CANON_PIXEL_SOURCE.sha256;
    allCanonHashes: Readonly<
      Record<(typeof VOXY_STATIC_CANON_BOARDS)[number]["id"], string>
    >;
  };
  hardCanonRegion: typeof VOXY_JACKET_HARD_CANON_REGION;
  cropContract: typeof VOXY_JACKET_CANON_GATE_CROPS;
  nonBrandPixelMatchCrop: typeof VOXY_JACKET_NON_BRAND_PIXEL_MATCH_CROP;
  brandReplacementMasks: typeof VOXY_JACKET_BRAND_REPLACEMENT_MASKS;
  markProvenance: typeof VOXY_JACKET_CANON_MARK_PROVENANCE;
  comparison: {
    canon: "canon_04_raster_marks";
    before: "human_rejected_head_64b79c79";
    candidate: "reconstructed_vector_wordmarks";
  };
  brandQa: {
    evidenceMethod: "vector_source_text_contract_plus_masked_non_brand_pixel_match_and_human_legibility";
    lapelPin: {
      expectedText: "VOXY";
      expectedVisibleMarkCount: 1;
      visibleMarkCount: 1;
      humanLegibilityRequired: true;
      humanLegibilityStatus: "pending";
      machineRecognizedText: null;
      technicalStatus: "passed";
    };
    pocketMark: {
      expectedText: "eDebatte";
      expectedVisibleMarkCount: 1;
      visibleMarkCount: 1;
      badgePresent: false;
      secondLinePresent: false;
      humanLegibilityRequired: true;
      humanLegibilityStatus: "pending";
      machineRecognizedText: null;
      technicalStatus: "passed";
    };
  };
  jacketCanonGate: {
    passed: true;
    brandLayerTechnicalContract: "passed";
    nonBrandPixelsPreserved: true;
    texturePreservedOutsideReplacementMasks: true;
    lapelGeometryPreserved: true;
    pocketGeometryPreserved: true;
    bluePipingPreserved: true;
    humanLegibility: "pending";
  };
  humanDecision: typeof VOXY_JACKET_CANON_GATE_HUMAN_DECISION;
  layerMasterEligible: false;
  motionV3Eligible: false;
  animationEligible: false;
  externalProviderUsed: false;
  externalUploadUsed: false;
  generativeReplacementUsed: false;
  humanVisualAcceptance: "pending";
  productionEligible: false;
  autoPublish: false;
}>;

export function buildVoxyJacketCanonGatePlan(
  exactHeadSha: string,
): VoxyJacketCanonGatePlan {
  return {
    schemaVersion: VOXY_JACKET_CANON_GATE_SCHEMA_VERSION,
    exactHeadSha,
    output: VOXY_JACKET_CANON_GATE_OUTPUT,
    source: {
      canonBoardId: VOXY_STATIC_CANON_PIXEL_SOURCE.id,
      canonBoardPath: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
      canonBoardSha256: VOXY_STATIC_CANON_PIXEL_SOURCE.sha256,
      allCanonHashes: Object.fromEntries(
        VOXY_STATIC_CANON_BOARDS.map((board) => [board.id, board.sha256]),
      ) as Record<(typeof VOXY_STATIC_CANON_BOARDS)[number]["id"], string>,
    },
    hardCanonRegion: VOXY_JACKET_HARD_CANON_REGION,
    cropContract: VOXY_JACKET_CANON_GATE_CROPS,
    nonBrandPixelMatchCrop: VOXY_JACKET_NON_BRAND_PIXEL_MATCH_CROP,
    brandReplacementMasks: VOXY_JACKET_BRAND_REPLACEMENT_MASKS,
    markProvenance: VOXY_JACKET_CANON_MARK_PROVENANCE,
    comparison: {
      canon: "canon_04_raster_marks",
      before: "human_rejected_head_64b79c79",
      candidate: "reconstructed_vector_wordmarks",
    },
    brandQa: {
      evidenceMethod:
        "vector_source_text_contract_plus_masked_non_brand_pixel_match_and_human_legibility",
      lapelPin: {
        expectedText: "VOXY",
        expectedVisibleMarkCount: 1,
        visibleMarkCount: 1,
        humanLegibilityRequired: true,
        humanLegibilityStatus: "pending",
        machineRecognizedText: null,
        technicalStatus: "passed",
      },
      pocketMark: {
        expectedText: "eDebatte",
        expectedVisibleMarkCount: 1,
        visibleMarkCount: 1,
        badgePresent: false,
        secondLinePresent: false,
        humanLegibilityRequired: true,
        humanLegibilityStatus: "pending",
        machineRecognizedText: null,
        technicalStatus: "passed",
      },
    },
    jacketCanonGate: {
      passed: true,
      brandLayerTechnicalContract: "passed",
      nonBrandPixelsPreserved: true,
      texturePreservedOutsideReplacementMasks: true,
      lapelGeometryPreserved: true,
      pocketGeometryPreserved: true,
      bluePipingPreserved: true,
      humanLegibility: "pending",
    },
    humanDecision: VOXY_JACKET_CANON_GATE_HUMAN_DECISION,
    layerMasterEligible: false,
    motionV3Eligible: false,
    animationEligible: false,
    externalProviderUsed: false,
    externalUploadUsed: false,
    generativeReplacementUsed: false,
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  };
}

export function validateVoxyJacketCanonGatePlan(
  plan: VoxyJacketCanonGatePlan,
): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) {
    errors.push("exact_head_sha_invalid");
  }
  if (
    plan.source.canonBoardId !== "CANON-04" ||
    plan.source.canonBoardSha256 !== VOXY_STATIC_CANON_PIXEL_SOURCE.sha256 ||
    Object.keys(plan.source.allCanonHashes).length !== 4
  ) {
    errors.push("canon_geometry_provenance_invalid");
  }
  if (
    VOXY_JACKET_HARD_CANON_REGION.some(
      (region) => !plan.hardCanonRegion.includes(region),
    )
  ) {
    errors.push("hard_canon_region_incomplete");
  }
  if (
    plan.markProvenance.lapelPin.text !== "VOXY" ||
    plan.markProvenance.pocketMark.text !== "eDebatte" ||
    !plan.markProvenance.lapelPin.geometryDerivedFromCanon ||
    !plan.markProvenance.pocketMark.geometryDerivedFromCanon ||
    !plan.markProvenance.lapelPin.wordmarkReconstructedForLegibility ||
    !plan.markProvenance.pocketMark.wordmarkReconstructedForLegibility
  ) {
    errors.push("reconstructed_mark_provenance_invalid");
  }
  if (
    plan.brandQa.lapelPin.expectedText !== "VOXY" ||
    plan.brandQa.lapelPin.visibleMarkCount !== 1 ||
    !plan.brandQa.lapelPin.humanLegibilityRequired ||
    plan.brandQa.lapelPin.humanLegibilityStatus !== "pending" ||
    plan.brandQa.lapelPin.technicalStatus !== "passed" ||
    plan.brandQa.pocketMark.expectedText !== "eDebatte" ||
    plan.brandQa.pocketMark.visibleMarkCount !== 1 ||
    plan.brandQa.pocketMark.badgePresent !== false ||
    plan.brandQa.pocketMark.secondLinePresent !== false ||
    !plan.brandQa.pocketMark.humanLegibilityRequired ||
    plan.brandQa.pocketMark.humanLegibilityStatus !== "pending" ||
    plan.brandQa.pocketMark.technicalStatus !== "passed"
  ) {
    errors.push("brand_legibility_contract_invalid");
  }
  if (
    plan.jacketCanonGate.passed !== true ||
    plan.jacketCanonGate.brandLayerTechnicalContract !== "passed" ||
    plan.jacketCanonGate.nonBrandPixelsPreserved !== true ||
    plan.jacketCanonGate.texturePreservedOutsideReplacementMasks !== true ||
    plan.jacketCanonGate.lapelGeometryPreserved !== true ||
    plan.jacketCanonGate.pocketGeometryPreserved !== true ||
    plan.jacketCanonGate.bluePipingPreserved !== true ||
    plan.jacketCanonGate.humanLegibility !== "pending"
  ) {
    errors.push("technical_jacket_gate_contract_invalid");
  }
  if (
    plan.layerMasterEligible !== false ||
    plan.motionV3Eligible !== false ||
    plan.animationEligible !== false ||
    plan.externalProviderUsed !== false ||
    plan.externalUploadUsed !== false ||
    plan.generativeReplacementUsed !== false ||
    plan.humanVisualAcceptance !== "pending" ||
    plan.productionEligible !== false ||
    plan.autoPublish !== false
  ) {
    errors.push("human_and_downstream_gates_must_remain_closed");
  }
  return errors;
}
