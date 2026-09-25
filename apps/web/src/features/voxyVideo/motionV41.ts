import {
  buildVoxyMotionV4Plan,
  buildVoxyMotionV4Srt,
  buildVoxyMotionV4Vtt,
  validateVoxyMotionV4Plan,
  VOXY_MOTION_V4_BLINK_CENTERS_MS,
  VOXY_MOTION_V4_LAYERS,
  VOXY_MOTION_V4_STANDFRAMES,
  VOXY_MOTION_V4_TIMELINE,
} from "./motionV4";
import { VOXY_MOUTH_V41_SHAPES } from "./mouthV41";
import { VOXY_MOUTH_V41_SOURCE_HEAD } from "./mouthV41Gate";

export const VOXY_MOTION_V41_SCHEMA_VERSION = "voxy-motion-v4-1-v1" as const;

export const VOXY_MOTION_V41_OUTPUT = {
  durationMs: 22_000,
  fps: 24,
  frameCount: 528,
  width: 1920,
  height: 1080,
  layerOutputDirectory: "artifacts/voxy-layer-master",
  motionOutputDirectory: "artifacts/voxy-motion-v4-1",
  mp4FileName: "voxy-motion-v4-1-16x9.mp4",
  webmFileName: "voxy-motion-v4-1-16x9.webm",
  previewFileName: "preview.png",
  contactSheetFileName: "contact-sheet.png",
  captionsVttFileName: "captions.de.vtt",
  captionsSrtFileName: "captions.de.srt",
} as const;

export {
  VOXY_MOTION_V4_BLINK_CENTERS_MS as VOXY_MOTION_V41_BLINK_CENTERS_MS,
  VOXY_MOTION_V4_LAYERS as VOXY_MOTION_V41_LAYERS,
  VOXY_MOTION_V4_STANDFRAMES as VOXY_MOTION_V41_STANDFRAMES,
  VOXY_MOTION_V4_TIMELINE as VOXY_MOTION_V41_TIMELINE,
};

export function buildVoxyMotionV41Plan(exactHeadSha: string) {
  const baseMotionPlan = buildVoxyMotionV4Plan(exactHeadSha);
  return {
    ...baseMotionPlan,
    schemaVersion: VOXY_MOTION_V41_SCHEMA_VERSION,
    sourceMotionV4HeadSha: VOXY_MOUTH_V41_SOURCE_HEAD,
    output: VOXY_MOTION_V41_OUTPUT,
    mouth: {
      ...baseMotionPlan.mouth,
      architectureChanged: false,
      anchorChanged: false,
      pivotChanged: false,
      headBindingChanged: false,
      neutralStateChanged: false,
      slightOpenPolished: true,
      speakingOpenPolished: true,
      transitionPolished: true,
      shapeProfile: VOXY_MOUTH_V41_SHAPES,
    },
    motion: {
      ...baseMotionPlan.motion,
      mouthTransitions:
        "v4_1_single_svg_shape_polish_same_caption_envelope_quantized_eighths",
    },
    baseMotionPlan,
  } as const;
}

export type VoxyMotionV41Plan = ReturnType<typeof buildVoxyMotionV41Plan>;

export function validateVoxyMotionV41Plan(plan: VoxyMotionV41Plan): string[] {
  const errors = validateVoxyMotionV4Plan(plan.baseMotionPlan);
  if (plan.sourceMotionV4HeadSha !== VOXY_MOUTH_V41_SOURCE_HEAD) {
    errors.push("source_motion_v4_head_drift");
  }
  if (
    plan.output.durationMs !== 22_000 ||
    plan.output.fps !== 24 ||
    plan.output.frameCount !== 528 ||
    plan.output.width !== 1920 ||
    plan.output.height !== 1080
  ) {
    errors.push("motion_v4_1_media_contract_invalid");
  }
  if (
    JSON.stringify(plan.timeline) !== JSON.stringify(VOXY_MOTION_V4_TIMELINE) ||
    JSON.stringify(plan.standframes) !== JSON.stringify(VOXY_MOTION_V4_STANDFRAMES) ||
    plan.motion.blinkCount !== VOXY_MOTION_V4_BLINK_CENTERS_MS.length ||
    plan.motion.armGestureCount !== 1
  ) {
    errors.push("motion_v4_rhythm_changed");
  }
  if (
    plan.layers !== VOXY_MOTION_V4_LAYERS ||
    plan.brand.lapelPin !== "VOXY" ||
    plan.brand.pocketMark !== "eDebatte" ||
    plan.brand.pocketRotation !== -2.5 ||
    plan.brand.pocketOpacity !== 0.94 ||
    plan.waveform.count !== 1 ||
    plan.waveform.placement !== "behind_voxy"
  ) {
    errors.push("frozen_character_or_brand_changed");
  }
  if (
    plan.mouth.architectureChanged ||
    plan.mouth.anchorChanged ||
    plan.mouth.pivotChanged ||
    plan.mouth.headBindingChanged ||
    plan.mouth.neutralStateChanged ||
    !plan.mouth.slightOpenPolished ||
    !plan.mouth.speakingOpenPolished ||
    !plan.mouth.transitionPolished
  ) {
    errors.push("mouth_v4_1_polish_contract_invalid");
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

export const buildVoxyMotionV41Vtt = buildVoxyMotionV4Vtt;
export const buildVoxyMotionV41Srt = buildVoxyMotionV4Srt;
