import { VOXY_JACKET_BRAND_LAYER_GEOMETRY } from "./jacketCanonGate";
import {
  VOXY_MOUTH_CANON_ANCHOR,
  VOXY_MOUTH_CANON_STATES,
  type VoxyMouthCanonStateId,
} from "./mouthRig";

export const VOXY_MOTION_V4_SCHEMA_VERSION = "voxy-motion-v4-v1" as const;
export const VOXY_MOTION_V4_STATIC_MASTER_HEAD =
  "93217eca79013d13affc7bc9881a9c76f19feab9" as const;

export const VOXY_MOTION_V4_OUTPUT = {
  durationMs: 22_000,
  fps: 24,
  frameCount: 528,
  width: 1920,
  height: 1080,
  layerOutputDirectory: "artifacts/voxy-layer-master",
  motionOutputDirectory: "artifacts/voxy-motion-v4",
  mp4FileName: "voxy-motion-v4-16x9.mp4",
  webmFileName: "voxy-motion-v4-16x9.webm",
  previewFileName: "preview.png",
  contactSheetFileName: "contact-sheet.png",
  captionsVttFileName: "captions.de.vtt",
  captionsSrtFileName: "captions.de.srt",
} as const;

export type VoxyMotionV4LayerKind =
  | "background"
  | "signal"
  | "character"
  | "branding"
  | "expression"
  | "anatomy"
  | "prop"
  | "foreground"
  | "editorial";

export type VoxyMotionV4Layer = Readonly<{
  id: string;
  kind: VoxyMotionV4LayerKind;
  zIndex: number;
  sourcePath: string;
  frozen: boolean;
  motionEligible: boolean;
  region: Readonly<{ x: number; y: number; width: number; height: number }>;
  pivot?: Readonly<{ x: number; y: number }>;
}>;

const layer = (
  id: string,
  kind: VoxyMotionV4LayerKind,
  zIndex: number,
  region: { x: number; y: number; width: number; height: number },
  input: {
    frozen?: boolean;
    motionEligible?: boolean;
    pivot?: { x: number; y: number };
  } = {},
): VoxyMotionV4Layer => ({
  id,
  kind,
  zIndex,
  sourcePath: `apps/web/public/brands/voxy/rig/layers/${id}.svg`,
  frozen: input.frozen ?? false,
  motionEligible: input.motionEligible ?? false,
  region,
  ...(input.pivot ? { pivot: input.pivot } : {}),
});

export const VOXY_MOTION_V4_LAYERS = [
  layer("studio-background", "background", 0, { x: 0, y: 0, width: 1920, height: 1080 }, { frozen: true }),
  layer("waveform", "signal", 10, { x: 900, y: 70, width: 470, height: 470 }, { frozen: true }),
  layer("torso-jacket-base", "character", 20, { x: 405, y: 350, width: 650, height: 420 }, { frozen: true }),
  layer("voxy-lapel-pin", "branding", 30, { x: 625, y: 465, width: 90, height: 65 }, { frozen: true }),
  layer("edebatte-pocket-mark", "branding", 31, { x: 835, y: 550, width: 125, height: 85 }, { frozen: true }),
  layer("neck-turtleneck", "character", 40, { x: 635, y: 350, width: 260, height: 230 }, { motionEligible: true, pivot: { x: 765, y: 500 } }),
  layer("head-base", "character", 50, { x: 495, y: 55, width: 500, height: 400 }, { motionEligible: true, pivot: { x: 755, y: 375 } }),
  layer("left-eye", "expression", 60, { x: 710, y: 225, width: 65, height: 85 }, { motionEligible: true, pivot: { x: 742, y: 267 } }),
  layer("right-eye", "expression", 61, { x: 812, y: 225, width: 65, height: 85 }, { motionEligible: true, pivot: { x: 844, y: 267 } }),
  layer("left-eyelid", "expression", 70, { x: 710, y: 225, width: 65, height: 85 }, { motionEligible: true }),
  layer("right-eyelid", "expression", 71, { x: 812, y: 225, width: 65, height: 85 }, { motionEligible: true }),
  layer("left-eyebrow", "expression", 72, { x: 705, y: 198, width: 70, height: 38 }, { motionEligible: true }),
  layer("right-eyebrow", "expression", 73, { x: 807, y: 198, width: 70, height: 38 }, { motionEligible: true }),
  layer("mouth-neutral", "expression", 80, { x: 735, y: 298, width: 105, height: 65 }),
  layer("mouth-closed", "expression", 81, { x: 735, y: 298, width: 105, height: 65 }),
  layer("mouth-slight-open", "expression", 82, { x: 735, y: 298, width: 105, height: 65 }),
  layer("mouth-speaking-open", "expression", 83, { x: 735, y: 298, width: 105, height: 65 }),
  layer("left-upper-arm", "character", 90, { x: 410, y: 420, width: 230, height: 280 }, { frozen: true }),
  layer("left-forearm", "character", 91, { x: 500, y: 560, width: 220, height: 205 }, { frozen: true }),
  layer("left-hand", "anatomy", 92, { x: 625, y: 645, width: 170, height: 125 }, { motionEligible: true, pivot: { x: 690, y: 700 } }),
  layer("right-upper-arm", "character", 93, { x: 850, y: 420, width: 220, height: 280 }, { frozen: true }),
  layer("right-forearm", "character", 94, { x: 780, y: 560, width: 220, height: 205 }, { frozen: true }),
  layer("right-hand", "anatomy", 95, { x: 735, y: 645, width: 180, height: 125 }, { motionEligible: true, pivot: { x: 845, y: 700 } }),
  layer("microphone", "prop", 100, { x: 930, y: 335, width: 285, height: 435 }, { frozen: true }),
  layer("desk-foreground", "foreground", 110, { x: 0, y: 700, width: 1920, height: 380 }, { frozen: true }),
  layer("editorial-overlays", "editorial", 120, { x: 0, y: 0, width: 1920, height: 1080 }, { motionEligible: true }),
] as const satisfies readonly VoxyMotionV4Layer[];

export type VoxyMotionV4MouthState = VoxyMouthCanonStateId;

export const VOXY_MOTION_V4_TIMELINE = [
  { id: "start", startMs: 0, endMs: 2_000, brand: "Voxy", kicker: "VOXY · MODERATION", title: "Ich bin Voxy.", caption: "Ich bin Voxy." },
  { id: "levels", startMs: 2_000, endMs: 4_000, brand: "Voxy", kicker: "DREI EBENEN", title: "Drei Ebenen verbinden", caption: "Ich verbinde drei Ebenen." },
  { id: "vote4gov", startMs: 4_000, endMs: 8_000, brand: "Vote4Gov", kicker: "VOTE4GOV · FRAGEN", title: "Politische Entscheidungen", caption: "Vote4Gov stellt die Fragen hinter politischen Entscheidungen." },
  { id: "voiceopengov", startMs: 8_000, endMs: 12_500, brand: "VoiceOpenGov", kicker: "VOICEOPENGOV · BETEILIGUNG", title: "Menschen verbinden", caption: "VoiceOpenGov verbindet Menschen, die daraus Beteiligung machen wollen." },
  { id: "edebatte", startMs: 12_500, endMs: 18_500, brand: "eDebatte", kicker: "eDEBATTE · NACHVOLLZIEHBARKEIT", title: "Quellen und Argumente", caption: "Und eDebatte macht Quellen, Argumente, Fragen und Abstimmungen nachvollziehbar." },
  { id: "end", startMs: 18_500, endMs: 22_000, brand: "Voxy", kicker: "VOXY · ÜBERBLICK", title: "Den Überblick behalten", caption: "Ich helfe dabei, den Überblick zu behalten." },
] as const;

export const VOXY_MOTION_V4_STANDFRAMES = [
  { id: "start", atMs: 1_000 },
  { id: "vote4gov", atMs: 6_000 },
  { id: "voiceopengov", atMs: 10_250 },
  { id: "edebatte", atMs: 15_500 },
  { id: "end", atMs: 20_500 },
] as const;

export const VOXY_MOTION_V4_BLINK_CENTERS_MS = [
  1_150, 4_150, 7_350, 10_650, 14_050, 17_650, 20_550,
] as const;

export const VOXY_MOTION_V4_AUDIO_PROVENANCE = {
  status: "captions_and_mouth_timing_only_no_license_clean_local_tts_available",
  audioIncluded: false,
  provider: null,
  model: null,
  externalProviderUsed: false,
  externalUploadUsed: false,
} as const;

export type VoxyMotionV4Plan = ReturnType<typeof buildVoxyMotionV4Plan>;

export function buildVoxyMotionV4Plan(exactHeadSha: string) {
  return {
    schemaVersion: VOXY_MOTION_V4_SCHEMA_VERSION,
    exactHeadSha,
    staticMasterHeadSha: VOXY_MOTION_V4_STATIC_MASTER_HEAD,
    output: VOXY_MOTION_V4_OUTPUT,
    layers: VOXY_MOTION_V4_LAYERS,
    timeline: VOXY_MOTION_V4_TIMELINE,
    standframes: VOXY_MOTION_V4_STANDFRAMES,
    audioProvenance: VOXY_MOTION_V4_AUDIO_PROVENANCE,
    brand: {
      lapelPin: "VOXY",
      pocketMark: "eDebatte",
      pocketRotation: VOXY_JACKET_BRAND_LAYER_GEOMETRY.pocketMark.rotationDegrees,
      pocketOpacity: 0.94,
      studioPrimary: "VoiceOpenGov",
      studioSecondary: "eDebatte",
      vote4GovPlacement: "contextual_only",
    },
    waveform: { count: 1, placement: "behind_voxy", animated: false },
    mouth: {
      ...VOXY_MOUTH_CANON_ANCHOR,
      sharedAnchor: true,
      sharedPivot: true,
      stateCount: VOXY_MOUTH_CANON_STATES.length,
      stateTransitionMethod:
        "single_svg_bezier_geometry_interpolation_closed_slightOpen_speakingOpen_slightOpen_closed",
      headTransformInheritance: true,
    },
    motion: {
      blinkCount: VOXY_MOTION_V4_BLINK_CENTERS_MS.length,
      headMotion: "head_rig_micro_tilt_max_0_595deg_all_face_children_inherit",
      eyeMotion: "head_inherited_micro_gaze_glints_max_0_65px",
      mouthStates: VOXY_MOUTH_CANON_STATES.map((state) => state.id),
      mouthTransitions:
        "single_svg_bezier_geometry_interpolation_caption_envelope_quantized_eighths",
      armGestureCount: 1,
      gestureBounds: { translationPx: 2.4, rotationDeg: 0.6 },
    },
    characterLock: {
      sourceMode: "accepted_static_master_additive_pixel_motion_plates",
      identityInvariant: true,
      frozen: [
        "head_silhouette",
        "upper_right_black_zone",
        "forehead_markings",
        "headphones",
        "jacket_geometry",
        "jacket_texture",
        "blue_piping",
        "voxy_lapel_pin",
        "edebatte_pocket_mark",
        "microphone",
        "studio_composition",
      ],
      neutralPosePixelSourceUnchanged: true,
    },
    handQa: {
      pose: "clasped_hands_not_open_palm",
      detector588Applicable: false,
      detector588Status: "not_run_not_applicable",
      expectedFingerCountPerHand: 5,
      thresholdChanged: false,
      generativeReconstructionUsed: false,
    },
    noGenerativeReplacement: true,
    externalProviderUsed: false,
    externalVisualUploadUsed: false,
    generativeCharacterAssetsUsed: false,
    humanVisualAcceptance: "pending" as const,
    productionEligible: false,
    autoPublish: false,
  } as const;
}

export function findVoxyMotionV4Segment(atMs: number) {
  return (
    VOXY_MOTION_V4_TIMELINE.find(
      (segment) => atMs >= segment.startMs && atMs < segment.endMs,
    ) ?? VOXY_MOTION_V4_TIMELINE.at(-1)!
  );
}

export function validateVoxyMotionV4Plan(
  plan: VoxyMotionV4Plan,
): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_invalid");
  if (plan.staticMasterHeadSha !== VOXY_MOTION_V4_STATIC_MASTER_HEAD) errors.push("static_master_head_drift");
  if (plan.output.durationMs < 18_000 || plan.output.durationMs > 24_000 || plan.output.fps !== 24 || plan.output.frameCount !== 528 || plan.output.width !== 1920 || plan.output.height !== 1080) errors.push("media_contract_invalid");
  const ids = new Set(plan.layers.map((entry) => entry.id));
  if (ids.size !== plan.layers.length || plan.layers.length < 25) errors.push("layer_completeness_invalid");
  for (const required of ["voxy-lapel-pin", "edebatte-pocket-mark", "mouth-neutral", "mouth-closed", "mouth-slight-open", "mouth-speaking-open", "left-hand", "right-hand", "waveform"]) {
    if (!ids.has(required)) errors.push(`required_layer_missing:${required}`);
  }
  if (!plan.layers.find((entry) => entry.id === "voxy-lapel-pin")?.frozen || !plan.layers.find((entry) => entry.id === "edebatte-pocket-mark")?.frozen) errors.push("frozen_brand_layers_invalid");
  if (plan.brand.lapelPin !== "VOXY" || plan.brand.pocketMark !== "eDebatte" || plan.brand.pocketRotation !== -2.5 || plan.brand.pocketOpacity !== 0.94 || plan.brand.studioPrimary !== "VoiceOpenGov" || plan.brand.studioSecondary !== "eDebatte") errors.push("brand_lock_invalid");
  if (plan.waveform.count !== 1 || plan.waveform.placement !== "behind_voxy") errors.push("waveform_contract_invalid");
  if (plan.mouth.anchorType !== "head_relative" || !plan.mouth.sharedAnchor || !plan.mouth.sharedPivot || plan.mouth.canvasRelativePositioning || !plan.mouth.headTransformInheritance || plan.mouth.stateCount < 4) errors.push("mouth_binding_contract_invalid");
  if (plan.motion.blinkCount < 5 || plan.motion.mouthStates.length !== 4 || plan.motion.armGestureCount < 1 || plan.motion.gestureBounds.translationPx > 3 || plan.motion.gestureBounds.rotationDeg > 1) errors.push("motion_bounds_invalid");
  if (!plan.characterLock.identityInvariant || !plan.characterLock.frozen.includes("voxy_lapel_pin") || !plan.characterLock.frozen.includes("edebatte_pocket_mark") || !plan.characterLock.neutralPosePixelSourceUnchanged) errors.push("character_lock_invalid");
  if (plan.handQa.detector588Applicable || plan.handQa.detector588Status !== "not_run_not_applicable" || plan.handQa.thresholdChanged || plan.handQa.generativeReconstructionUsed) errors.push("hand_qa_boundary_invalid");
  if (plan.timeline[0].caption !== "Ich bin Voxy.") errors.push("required_opening_missing");
  if (plan.timeline[2].brand !== "Vote4Gov" || plan.timeline[3].brand !== "VoiceOpenGov" || plan.timeline[4].brand !== "eDebatte") errors.push("brand_sequence_invalid");
  if (plan.audioProvenance.audioIncluded !== false || plan.externalProviderUsed !== false || plan.externalVisualUploadUsed !== false || plan.generativeCharacterAssetsUsed !== false || plan.noGenerativeReplacement !== true) errors.push("local_non_generative_contract_invalid");
  if (plan.humanVisualAcceptance !== "pending" || plan.productionEligible !== false || plan.autoPublish !== false) errors.push("review_gate_invalid");
  return errors;
}

function captionTime(ms: number, separator: "." | ","): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const milliseconds = ms % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`;
}

export function buildVoxyMotionV4Vtt(): string {
  return `WEBVTT\n\n${VOXY_MOTION_V4_TIMELINE.map((segment) => `${captionTime(segment.startMs, ".")} --> ${captionTime(segment.endMs, ".")}\n${segment.caption}`).join("\n\n")}\n`;
}

export function buildVoxyMotionV4Srt(): string {
  return `${VOXY_MOTION_V4_TIMELINE.map((segment, index) => `${index + 1}\n${captionTime(segment.startMs, ",")} --> ${captionTime(segment.endMs, ",")}\n${segment.caption}`).join("\n\n")}\n`;
}
