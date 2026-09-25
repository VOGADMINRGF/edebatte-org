import {
  VOXY_STATIC_CANON_NATIVE_ASSETS,
  VOXY_STATIC_CANON_PIXEL_SOURCE,
} from "./staticCanonRecovery";
import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";

export const VOXY_POCKET_MARK_FINAL_GATE_SCHEMA_VERSION =
  "voxy-pocket-mark-final-gate-v2" as const;

export const VOXY_POCKET_MARK_PREVIOUS_PASS_HEAD =
  "f948e1e6ce09fd9c62e8621b490eb8f0994c60ab" as const;

export const VOXY_POCKET_MARK_FINAL_GATE_REJECTED_HEAD =
  "02a83e832890f12fe9843d2dc1cb8e543ddef07b" as const;

export const VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256 =
  "f5d60d98f561959e5a9b7b93899e1b566c91799cea1f83338a8756f9cfdab446" as const;

export const VOXY_POCKET_MARK_COMPOSITION_SOURCE = {
  repositoryPath:
    "apps/web/public/brands/voxy/references/derived/CANON-04-pocket-clean.png",
  sha256: "5176f19d3de18a34c32c908d93a3277a2715959d491620d21c7129f9d305f5ca",
  width: 1672,
  height: 941,
  derivedFrom: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
  cleanupRegion: { x: 768, y: 497, width: 52, height: 22 },
  cleanupMethod:
    "ffmpeg_delogo_region_spliced_into_original_raw_rgba_no_scale",
} as const;

export const VOXY_POCKET_MARK_FINAL_GATE_OUTPUT = {
  outputDirectory: "artifacts/voxy-pocket-mark-final-gate",
  fullContextFileName: "jacket-final-context.png",
  mark100PctFileName: "pocket-mark-final-100pct.png",
  mark200PctFileName: "pocket-mark-final-200pct.png",
  mark400PctFileName: "pocket-mark-final-400pct.png",
  beforeAfterFileName: "pocket-micro-pass-comparison.png",
  manifestFileName: "manifest.json",
} as const;

export const VOXY_POCKET_MARK_FINAL_GATE_CROPS = {
  fullContext: { x: 730, y: 455, width: 340, height: 250 },
  mark: { x: 800, y: 510, width: 220, height: 145 },
} as const;

export const VOXY_POCKET_MARK_FINAL_REJECTED_PRESENTATION = {
  left: 858,
  top: 579,
  width: 70,
  height: 22,
  rotationDegrees: -7,
  perspectiveTransform: "skewX(-3deg) scaleY(0.92)",
} as const;

export const VOXY_POCKET_MARK_PREVIOUS_PASS_PRESENTATION = {
  left: 858,
  top: 574,
  width: 74,
  height: 23,
  rotationDegrees: -4,
  perspectiveTransform: "none",
  surfaceOpacity: 1,
} as const;

export type VoxyPocketMarkFinalGatePlan = Readonly<{
  schemaVersion: typeof VOXY_POCKET_MARK_FINAL_GATE_SCHEMA_VERSION;
  exactHeadSha: string;
  rejectedHeadSha: typeof VOXY_POCKET_MARK_FINAL_GATE_REJECTED_HEAD;
  output: typeof VOXY_POCKET_MARK_FINAL_GATE_OUTPUT;
  crops: typeof VOXY_POCKET_MARK_FINAL_GATE_CROPS;
  sourceAsset: typeof VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark;
  presentation: typeof VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark;
  unchangedLapelPinSha256: typeof VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256;
  brandQa: {
    expectedText: "eDebatte";
    visibleMarkCount: 1;
    badgePresent: false;
    secondLinePresent: false;
    vectorSource: true;
    rasterUpscaleUsed: false;
    strokePresent: false;
    glowPresent: false;
    boxPresent: false;
    humanLegibilityRequired: true;
    humanVisualAcceptance: "pending";
    machineOcrClaimed: false;
    technicalStatus: "passed";
  };
  lapelPinChanged: false;
  animationEligible: false;
  productionEligible: false;
  autoPublish: false;
}>;

export function buildVoxyPocketMarkFinalGatePlan(
  exactHeadSha: string,
): VoxyPocketMarkFinalGatePlan {
  return {
    schemaVersion: VOXY_POCKET_MARK_FINAL_GATE_SCHEMA_VERSION,
    exactHeadSha,
    rejectedHeadSha: VOXY_POCKET_MARK_FINAL_GATE_REJECTED_HEAD,
    output: VOXY_POCKET_MARK_FINAL_GATE_OUTPUT,
    crops: VOXY_POCKET_MARK_FINAL_GATE_CROPS,
    sourceAsset: VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark,
    presentation: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark,
    unchangedLapelPinSha256:
      VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256,
    brandQa: {
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
    },
    lapelPinChanged: false,
    animationEligible: false,
    productionEligible: false,
    autoPublish: false,
  };
}

export function validateVoxyPocketMarkFinalGatePlan(
  plan: VoxyPocketMarkFinalGatePlan,
): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) {
    errors.push("exact_head_sha_invalid");
  }
  if (
    plan.sourceAsset !== VOXY_STATIC_CANON_NATIVE_ASSETS.edebattePocketMark ||
    plan.presentation !== VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark ||
    plan.presentation.perspectiveTransform !== "none" ||
    plan.presentation.rotationDegrees !== -2.5
  ) {
    errors.push("pocket_vector_presentation_invalid");
  }
  if (
    plan.brandQa.expectedText !== "eDebatte" ||
    plan.brandQa.visibleMarkCount !== 1 ||
    plan.brandQa.badgePresent !== false ||
    plan.brandQa.secondLinePresent !== false ||
    plan.brandQa.vectorSource !== true ||
    plan.brandQa.rasterUpscaleUsed !== false ||
    plan.brandQa.strokePresent !== false ||
    plan.brandQa.glowPresent !== false ||
    plan.brandQa.boxPresent !== false ||
    plan.brandQa.humanLegibilityRequired !== true ||
    plan.brandQa.humanVisualAcceptance !== "pending" ||
    plan.brandQa.machineOcrClaimed !== false ||
    plan.brandQa.technicalStatus !== "passed"
  ) {
    errors.push("pocket_brand_qa_invalid");
  }
  if (
    plan.unchangedLapelPinSha256 !==
      VOXY_POCKET_MARK_FINAL_GATE_UNCHANGED_LAPEL_PIN_SHA256 ||
    plan.lapelPinChanged !== false
  ) {
    errors.push("lapel_pin_must_remain_unchanged");
  }
  if (
    plan.animationEligible !== false ||
    plan.productionEligible !== false ||
    plan.autoPublish !== false
  ) {
    errors.push("downstream_gates_must_remain_closed");
  }
  return errors;
}
