import {
  VOXY_HEAD_RIG_REFERENCE,
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
} from "./mouthRig";
import {
  VOXY_MOUTH_V4_SHAPE_REFERENCE,
  VOXY_MOUTH_V41_PROFILE_VERSION,
  VOXY_MOUTH_V41_SHAPES,
  VOXY_MOUTH_V41_WIDTH_LIMIT,
  type VoxyMouthShapeGeometry,
  validateVoxyMouthV41,
  voxyMouthShapeHeight,
  voxyMouthShapeWidth,
} from "./mouthV41";

export const VOXY_MOUTH_V41_GATE_SCHEMA_VERSION =
  "voxy-mouth-v4-1-gate-v1" as const;
export const VOXY_MOUTH_V41_SOURCE_HEAD =
  "fa45219ea25bbbb4371d311fdc768c175c85f678" as const;

export const VOXY_MOUTH_V41_GATE_OUTPUT = {
  outputDirectory: "artifacts/voxy-mouth-v4-1-gate",
  manifestFileName: "manifest.json",
  stateFiles: {
    neutral: "neutral-400pct.png",
    closed: "closed-400pct.png",
    slightOpen: "slight-open-400pct.png",
    speakingOpen: "speaking-open-400pct.png",
  },
  comparisonFileName: "mouth-v4-vs-v4-1.png",
  overlayFileName: "mouth-state-overlay-v4-1.png",
  sequenceFileName: "speaking-sequence-contact-sheet.png",
} as const;

function metrics(shape: VoxyMouthShapeGeometry) {
  return {
    width: voxyMouthShapeWidth(shape),
    height: voxyMouthShapeHeight(shape),
    widthRatioToNeutral:
      voxyMouthShapeWidth(shape) /
      voxyMouthShapeWidth(VOXY_MOUTH_V41_SHAPES.neutral),
  };
}

export function buildVoxyMouthV41GatePlan(exactHeadSha: string) {
  return {
    schemaVersion: VOXY_MOUTH_V41_GATE_SCHEMA_VERSION,
    profileVersion: VOXY_MOUTH_V41_PROFILE_VERSION,
    exactHeadSha,
    sourceMotionV4HeadSha: VOXY_MOUTH_V41_SOURCE_HEAD,
    headReference: VOXY_HEAD_RIG_REFERENCE,
    mouth: {
      ...VOXY_MOUTH_CANON_ANCHOR,
      architectureChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      headBindingChanged: false,
      neutralStateChanged: false,
      slightOpenPolished: true,
      speakingOpenPolished: true,
      transitionPolished: true,
      sharedAnchor: true,
      sharedPivot: true,
      noXDrift: true,
      noYDrift: true,
      stateCount: VOXY_MOUTH_CANON_STATES.length,
      transitionMethod:
        "single_svg_bezier_geometry_interpolation_closed_slightOpen_speakingOpen_slightOpen_closed",
      widthLimit: VOXY_MOUTH_V41_WIDTH_LIMIT,
      stateMetrics: {
        neutral: metrics(VOXY_MOUTH_V41_SHAPES.neutral),
        closed: metrics(VOXY_MOUTH_V41_SHAPES.closed),
        slightOpen: metrics(VOXY_MOUTH_V41_SHAPES.slightOpen),
        speakingOpen: metrics(VOXY_MOUTH_V41_SHAPES.speakingOpen),
      },
      previousStateMetrics: {
        slightOpen: metrics(VOXY_MOUTH_V4_SHAPE_REFERENCE.slightOpen),
        speakingOpen: metrics(VOXY_MOUTH_V4_SHAPE_REFERENCE.speakingOpen),
      },
    },
    shapes: VOXY_MOUTH_V41_SHAPES,
    frozen: [
      "mouth_anchor",
      "mouth_pivot",
      "head_relative_binding",
      "eyes",
      "brows",
      "head_shape",
      "headphones",
      "forehead_markings",
      "voxy_lapel_pin",
      "edebatte_pocket_mark",
      "jacket",
      "hands",
      "microphone",
      "studio",
      "waveform_position",
      "caption_layout",
      "gesture",
      "camera",
      "motion_rhythm",
    ],
    technicalMouthShapeGate: "pending" as const,
    humanVisualAcceptance: "pending" as const,
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export type VoxyMouthV41GatePlan = ReturnType<
  typeof buildVoxyMouthV41GatePlan
>;

export function validateVoxyMouthV41GatePlan(
  plan: VoxyMouthV41GatePlan,
): string[] {
  const errors = validateVoxyMouthV41();
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (plan.sourceMotionV4HeadSha !== VOXY_MOUTH_V41_SOURCE_HEAD) {
    errors.push("source_motion_v4_head_drift");
  }
  if (
    plan.mouth.architectureChanged ||
    plan.mouth.anchorChanged ||
    plan.mouth.pivotChanged ||
    plan.mouth.headBindingChanged ||
    plan.mouth.neutralStateChanged ||
    !plan.mouth.sharedAnchor ||
    !plan.mouth.sharedPivot ||
    plan.mouth.canvasRelativePositioning
  ) {
    errors.push("frozen_mouth_architecture_invalid");
  }
  if (
    plan.mouth.stateMetrics.speakingOpen.width >
      plan.mouth.widthLimit.speakingOpenMaxWidth ||
    !(
      plan.mouth.stateMetrics.closed.width >=
        plan.mouth.stateMetrics.slightOpen.width &&
      plan.mouth.stateMetrics.slightOpen.width >=
        plan.mouth.stateMetrics.speakingOpen.width
    ) ||
    !(
      plan.mouth.stateMetrics.closed.height <
        plan.mouth.stateMetrics.slightOpen.height &&
      plan.mouth.stateMetrics.slightOpen.height <
        plan.mouth.stateMetrics.speakingOpen.height
    )
  ) {
    errors.push("mouth_shape_relation_invalid");
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
