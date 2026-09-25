import {
  VOXY_STATIC_CANON_PIXEL_SOURCE,
  VOXY_STATIC_CANON_WAVEFORM,
} from "./staticCanonRecovery";

export const VOXY_FIRST_EXPLAINER_SCHEMA_VERSION =
  "voxy-first-explainer-video-v2" as const;
export const VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD =
  "ecba53e4167a6382d16dc2dda25c2f162dab8162" as const;
export const VOXY_FIRST_EXPLAINER_DETECTOR_HEAD =
  "0756ad48bfd61cf88696f91bc41da87e988020c0" as const;
export const VOXY_FIRST_EXPLAINER_VOICE_FIXTURE_HEAD =
  "6f2929ca7ad9267b47f7f2a8952dc8f3c95e0f48" as const;
export const VOXY_FIRST_EXPLAINER_STUDIO_LOCKUP_PATH =
  "apps/web/public/brands/voxy/overlays/voiceopengov-edebatte-lockup.svg" as const;

export const VOXY_FIRST_EXPLAINER_OUTPUT = {
  durationMs: 17_000,
  fps: 24,
  frameCount: 408,
  width: 1920,
  height: 1080,
  outputDirectory: "artifacts/voxy-first-explainer-video-v2",
  mp4FileName: "voxy-first-explainer-v2-16x9.mp4",
  webmFileName: "voxy-first-explainer-v2-16x9.webm",
  previewFileName: "preview.png",
  captionsVttFileName: "captions.de.vtt",
  captionsSrtFileName: "captions.de.srt",
} as const;

export type VoxyFirstExplainerSegment = Readonly<{
  id:
    | "voxy_intro"
    | "vote4gov_why"
    | "edebatte_what"
    | "voiceopengov_how"
    | "voxy_connects";
  startMs: number;
  endMs: number;
  motionState:
    | "hook"
    | "explaining"
    | "showing_instrument"
    | "inviting_participation"
    | "returning_to_neutral";
  eyebrowMotion: "none";
  handGesture: "none_flattened_master_identity_lock";
  gazeCueX: -1.5 | 0 | 1.5 | 2;
  gazeCueY: -0.5 | 0 | 0.5;
  editorialKicker: string;
  editorialTitle: string;
  editorialRole: string;
  caption: string;
}>;

export const VOXY_FIRST_EXPLAINER_TIMELINE = [
  {
    id: "voxy_intro",
    startMs: 0,
    endMs: 3_000,
    motionState: "hook",
    eyebrowMotion: "none",
    handGesture: "none_flattened_master_identity_lock",
    gazeCueX: 0,
    gazeCueY: 0,
    editorialKicker: "VOXY · MODERATION",
    editorialTitle: "Voxy",
    editorialRole: "Digitaler Moderator",
    caption: "Ich bin Voxy – dein digitaler Moderator.",
  },
  {
    id: "vote4gov_why",
    startMs: 3_000,
    endMs: 6_000,
    motionState: "explaining",
    eyebrowMotion: "none",
    handGesture: "none_flattened_master_identity_lock",
    gazeCueX: 2,
    gazeCueY: -0.5,
    editorialKicker: "VOTE4GOV · WARUM",
    editorialTitle: "Fragen stellen",
    editorialRole: "Denk- und Reflexionsebene",
    caption: "Vote4Gov stellt die Fragen hinter unserer Demokratie.",
  },
  {
    id: "edebatte_what",
    startMs: 6_000,
    endMs: 10_000,
    motionState: "showing_instrument",
    eyebrowMotion: "none",
    handGesture: "none_flattened_master_identity_lock",
    gazeCueX: -1.5,
    gazeCueY: 0,
    editorialKicker: "eDEBATTE · WAS",
    editorialTitle: "Nachvollziehbar beteiligen",
    editorialRole: "Instrument und Infrastruktur",
    caption: "eDebatte macht Argumente, Quellen und Beteiligung nachvollziehbar.",
  },
  {
    id: "voiceopengov_how",
    startMs: 10_000,
    endMs: 14_000,
    motionState: "inviting_participation",
    eyebrowMotion: "none",
    handGesture: "none_flattened_master_identity_lock",
    gazeCueX: 1.5,
    gazeCueY: 0.5,
    editorialKicker: "VOICEOPENGOV · WIE",
    editorialTitle: "Menschen verbinden",
    editorialRole: "Bewegung und Community",
    caption: "VoiceOpenGov verbindet Menschen, die daraus echte Beteiligung machen wollen.",
  },
  {
    id: "voxy_connects",
    startMs: 14_000,
    endMs: 17_000,
    motionState: "returning_to_neutral",
    eyebrowMotion: "none",
    handGesture: "none_flattened_master_identity_lock",
    gazeCueX: 0,
    gazeCueY: 0,
    editorialKicker: "VOXY · ÜBERBLICK",
    editorialTitle: "Zusammenhänge im Blick",
    editorialRole: "Ruhige Rückkehr zur Moderation",
    caption: "Und ich? Ich helfe euch, den Überblick zu behalten.",
  },
] as const satisfies readonly VoxyFirstExplainerSegment[];

export const VOXY_FIRST_EXPLAINER_STANDFRAMES = [
  { id: "start", atMs: 1_500 },
  { id: "vote4gov", atMs: 4_500 },
  { id: "edebatte", atMs: 8_000 },
  { id: "voiceopengov", atMs: 12_000 },
  { id: "end", atMs: 15_500 },
] as const;

export const VOXY_FIRST_EXPLAINER_BRAND = {
  lapelPin: "VOXY",
  pocketMark: "eDebatte",
  pocketMarkStyle: "wordmark_no_badge",
  studioPrimary: "VoiceOpenGov",
  studioSecondary: "eDebatte",
  vote4GovPlacement: "contextual_only",
  voxyRole: "digital_moderator",
} as const;

export const VOXY_FIRST_EXPLAINER_AUDIO_PROVENANCE = {
  status: "not_included_license_clean_local_voice_unavailable",
  audioIncluded: false,
  audioTrackExpected: false,
  voiceFixturePr: 590,
  voiceFixtureHeadSha: VOXY_FIRST_EXPLAINER_VOICE_FIXTURE_HEAD,
  reason: "PR #590 remains a separate draft and provides no license-clean local TTS audio result that can be reused without changing its scope.",
  provider: null,
  model: null,
  externalUploadUsed: false,
} as const;

export type VoxyFirstExplainerPlan = Readonly<{
  schemaVersion: typeof VOXY_FIRST_EXPLAINER_SCHEMA_VERSION;
  exactHeadSha: string;
  staticMaster: {
    exactHeadSha: typeof VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD;
    primaryMaster: "A";
    editorialVariant: "C";
    rejectedVariant: "B";
    humanVisualAcceptance: "accepted";
  };
  characterPixelSource: typeof VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath;
  output: typeof VOXY_FIRST_EXPLAINER_OUTPUT;
  timeline: typeof VOXY_FIRST_EXPLAINER_TIMELINE;
  waveform: typeof VOXY_STATIC_CANON_WAVEFORM;
  audioProvenance: typeof VOXY_FIRST_EXPLAINER_AUDIO_PROVENANCE;
  brand: typeof VOXY_FIRST_EXPLAINER_BRAND;
  motionBoundary: {
    flattenedMaster: true;
    allowed: readonly ["blink_overlay", "micro_gaze_highlight_overlay", "editorial_easing"];
    independentHeadMotionAvailable: false;
    independentBodyMotionAvailable: false;
    independentHandMotionAvailable: false;
    reason: "accepted_master_is_flattened_raster";
  };
  externalProviderUsed: false;
  externalUploadUsed: false;
  generativeRedrawUsed: false;
  humanVisualAcceptance: "pending";
  productionEligible: false;
  autoPublish: false;
}>;

export function buildVoxyFirstExplainerPlan(exactHeadSha: string): VoxyFirstExplainerPlan {
  return {
    schemaVersion: VOXY_FIRST_EXPLAINER_SCHEMA_VERSION,
    exactHeadSha,
    staticMaster: {
      exactHeadSha: VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD,
      primaryMaster: "A",
      editorialVariant: "C",
      rejectedVariant: "B",
      humanVisualAcceptance: "accepted",
    },
    characterPixelSource: VOXY_STATIC_CANON_PIXEL_SOURCE.repositoryPath,
    output: VOXY_FIRST_EXPLAINER_OUTPUT,
    timeline: VOXY_FIRST_EXPLAINER_TIMELINE,
    waveform: VOXY_STATIC_CANON_WAVEFORM,
    audioProvenance: VOXY_FIRST_EXPLAINER_AUDIO_PROVENANCE,
    brand: VOXY_FIRST_EXPLAINER_BRAND,
    motionBoundary: {
      flattenedMaster: true,
      allowed: ["blink_overlay", "micro_gaze_highlight_overlay", "editorial_easing"],
      independentHeadMotionAvailable: false,
      independentBodyMotionAvailable: false,
      independentHandMotionAvailable: false,
      reason: "accepted_master_is_flattened_raster",
    },
    externalProviderUsed: false,
    externalUploadUsed: false,
    generativeRedrawUsed: false,
    humanVisualAcceptance: "pending",
    productionEligible: false,
    autoPublish: false,
  };
}

export function findVoxyFirstExplainerSegment(atMs: number): (typeof VOXY_FIRST_EXPLAINER_TIMELINE)[number] {
  return VOXY_FIRST_EXPLAINER_TIMELINE.find((segment) => atMs >= segment.startMs && atMs < segment.endMs) ?? VOXY_FIRST_EXPLAINER_TIMELINE.at(-1)!;
}

export function validateVoxyFirstExplainerPlan(plan: VoxyFirstExplainerPlan): string[] {
  const errors: string[] = [];
  if (!/^[0-9a-f]{40}$/.test(plan.exactHeadSha)) errors.push("exact_head_sha_invalid");
  if (plan.staticMaster.exactHeadSha !== VOXY_FIRST_EXPLAINER_STATIC_MASTER_HEAD || plan.staticMaster.primaryMaster !== "A" || plan.staticMaster.editorialVariant !== "C" || plan.staticMaster.rejectedVariant !== "B" || plan.staticMaster.humanVisualAcceptance !== "accepted") errors.push("accepted_static_master_contract_invalid");
  if (plan.output.durationMs !== 17_000 || plan.output.fps !== 24 || plan.output.frameCount !== 408 || plan.output.width !== 1920 || plan.output.height !== 1080) errors.push("primary_media_contract_invalid");
  if (plan.timeline.length !== 5 || plan.timeline[0].startMs !== 0 || plan.timeline.at(-1)?.endMs !== plan.output.durationMs || plan.timeline.some((segment, index) => segment.startMs >= segment.endMs || (index > 0 && segment.startMs !== plan.timeline[index - 1].endMs))) errors.push("timeline_contract_invalid");
  if (plan.timeline[1].editorialKicker !== "VOTE4GOV · WARUM" || plan.timeline[2].editorialKicker !== "eDEBATTE · WAS" || plan.timeline[3].editorialKicker !== "VOICEOPENGOV · WIE") errors.push("brand_architecture_contract_invalid");
  if (plan.brand.lapelPin !== "VOXY" || plan.brand.pocketMark !== "eDebatte" || plan.brand.pocketMarkStyle !== "wordmark_no_badge" || plan.brand.studioPrimary !== "VoiceOpenGov" || plan.brand.studioSecondary !== "eDebatte" || plan.brand.vote4GovPlacement !== "contextual_only" || plan.brand.voxyRole !== "digital_moderator") errors.push("brand_surface_contract_invalid");
  if (plan.waveform.count !== 1 || plan.waveform.placement !== "behind_voxy" || plan.waveform.currentlyAudioReactive !== false) errors.push("single_static_waveform_contract_invalid");
  if (plan.audioProvenance.audioIncluded !== false || plan.audioProvenance.audioTrackExpected !== false || plan.audioProvenance.externalUploadUsed !== false) errors.push("audio_provenance_must_fail_closed");
  if (plan.motionBoundary.flattenedMaster !== true || plan.motionBoundary.independentHeadMotionAvailable !== false || plan.motionBoundary.independentBodyMotionAvailable !== false || plan.motionBoundary.independentHandMotionAvailable !== false || plan.timeline.some((segment) => segment.handGesture !== "none_flattened_master_identity_lock")) errors.push("flattened_identity_lock_broken");
  if (plan.externalProviderUsed !== false || plan.externalUploadUsed !== false || plan.generativeRedrawUsed !== false || plan.humanVisualAcceptance !== "pending" || plan.productionEligible !== false || plan.autoPublish !== false) errors.push("human_and_production_gates_must_fail_closed");
  return errors;
}

function captionTime(ms: number, separator: "." | ","): string {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const milliseconds = ms % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${separator}${String(milliseconds).padStart(3, "0")}`;
}

export function buildVoxyFirstExplainerVtt(): string {
  return `WEBVTT\n\n${VOXY_FIRST_EXPLAINER_TIMELINE.map((segment) => `${captionTime(segment.startMs, ".")} --> ${captionTime(segment.endMs, ".")}\n${segment.caption}`).join("\n\n")}\n`;
}

export function buildVoxyFirstExplainerSrt(): string {
  return `${VOXY_FIRST_EXPLAINER_TIMELINE.map((segment, index) => `${index + 1}\n${captionTime(segment.startMs, ",")} --> ${captionTime(segment.endMs, ",")}\n${segment.caption}`).join("\n\n")}\n`;
}
