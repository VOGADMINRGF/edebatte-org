import {
  VOXY_HEAD_RIG_REFERENCE,
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  validateVoxyMouthCanon,
} from "./mouthRig";

export const VOXY_MOUTH_CANON_GATE_SCHEMA_VERSION =
  "voxy-mouth-canon-gate-v1" as const;

export const VOXY_MOUTH_CANON_GATE_SOURCE_STATIC_HEAD =
  "93217eca79013d13affc7bc9881a9c76f19feab9" as const;

export const VOXY_MOUTH_CANON_GATE_SOURCE_MOTION_HEAD =
  "f7b621de20b34084423fd303728d2dd014817a48" as const;

export const VOXY_MOUTH_CANON_GATE_OUTPUT = {
  outputDirectory: "artifacts/voxy-mouth-canon-gate",
  manifestFileName: "manifest.json",
  overlayComparisonFileName: "mouth-state-overlay-comparison.png",
  headNeutralFileName: "head-with-mouth-neutral.png",
  headSpeakingFileName: "head-with-mouth-speaking.png",
  stateFiles: {
    neutral: "mouth-neutral-400pct.png",
    closed: "mouth-closed-400pct.png",
    slightOpen: "mouth-slight-open-400pct.png",
    speakingOpen: "mouth-speaking-open-400pct.png",
  },
} as const;

export function buildVoxyMouthCanonGatePlan(exactHeadSha: string) {
  return {
    schemaVersion: VOXY_MOUTH_CANON_GATE_SCHEMA_VERSION,
    exactHeadSha,
    sourceStaticHeadSha: VOXY_MOUTH_CANON_GATE_SOURCE_STATIC_HEAD,
    sourceMotionV3HeadSha: VOXY_MOUTH_CANON_GATE_SOURCE_MOTION_HEAD,
    output: VOXY_MOUTH_CANON_GATE_OUTPUT,
    headReference: VOXY_HEAD_RIG_REFERENCE,
    mouth: {
      ...VOXY_MOUTH_CANON_ANCHOR,
      sharedAnchor: true,
      sharedPivot: true,
      stateCount: VOXY_MOUTH_CANON_STATES.length,
      stateTransitionMethod:
        "continuous_interpolation_through_closed_slightOpen_speakingOpen_slightOpen_closed",
      headTransformInheritance: true,
      neutralAlignedToAcceptedStatic: true,
    },
    states: VOXY_MOUTH_CANON_STATES,
    frozen: [
      "head_contour",
      "face_base",
      "eye_position",
      "headphones",
      "forehead_markings",
      "voxy_lapel_pin",
      "edebatte_pocket_mark",
      "jacket",
      "studio",
      "microphone",
      "single_waveform",
    ],
    noGenerativeReplacement: true,
    externalProviderUsed: false,
    externalVisualUploadUsed: false,
    technicalMouthCanonGate: "pending" as const,
    humanVisualAcceptance: "pending" as const,
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyMouthCanonGatePlan = ReturnType<
  typeof buildVoxyMouthCanonGatePlan
>;

export function validateVoxyMouthCanonGatePlan(
  plan: VoxyMouthCanonGatePlan,
): string[] {
  const errors = validateVoxyMouthCanon();
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) {
    errors.push("exact_head_invalid");
  }
  if (
    plan.sourceStaticHeadSha !== VOXY_MOUTH_CANON_GATE_SOURCE_STATIC_HEAD ||
    plan.sourceMotionV3HeadSha !== VOXY_MOUTH_CANON_GATE_SOURCE_MOTION_HEAD
  ) {
    errors.push("mouth_source_head_drift");
  }
  if (
    plan.mouth.anchorType !== "head_relative" ||
    !plan.mouth.sharedAnchor ||
    !plan.mouth.sharedPivot ||
    plan.mouth.canvasRelativePositioning ||
    !plan.mouth.headTransformInheritance
  ) {
    errors.push("mouth_binding_contract_invalid");
  }
  if (
    !plan.noGenerativeReplacement ||
    plan.externalProviderUsed ||
    plan.externalVisualUploadUsed
  ) {
    errors.push("local_non_generative_contract_invalid");
  }
  if (
    plan.humanVisualAcceptance !== "pending" ||
    plan.productionEligible ||
    plan.autoPublish
  ) {
    errors.push("release_gate_invalid");
  }
  return errors;
}
