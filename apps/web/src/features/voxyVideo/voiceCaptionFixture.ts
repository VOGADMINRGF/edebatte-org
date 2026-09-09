import type { VoxyVideoFormat } from "./modernCharacterContracts";
import type { VoxyCharacterMotionFixturePlan } from "./characterMotionFixture";

export const VOXY_VOICE_CAPTION_FIXTURE_VERSION =
  "voxy-voice-caption-fixture-v1" as const;

export const VOXY_VOICE_REVIEW_STATUSES = [
  "pending",
  "approved",
  "needs_changes",
  "rejected",
] as const;

export type VoxyVoiceReviewStatus =
  (typeof VOXY_VOICE_REVIEW_STATUSES)[number];

export type VoxyVoiceAudioSource =
  | {
      kind: "local_file";
      path: string;
      usageApproved: true;
    }
  | {
      kind: "provider_result";
      providerId: string;
      assetId: string;
      usageApproved: boolean;
    };

export type VoxyVoiceAudioMetadata = {
  source: VoxyVoiceAudioSource;
  durationMs: number;
  integratedLufs: number;
  truePeakDbtp: number;
  sampleRateHz: number;
  channels: 1 | 2;
};

export type VoxyCaptionSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  sourceSceneId: string;
};

export type VoxyCaptionSafeArea = {
  format: VoxyVideoFormat;
  leftPercent: number;
  rightPercent: number;
  topPercent: number;
  bottomPercent: number;
  maxLines: number;
  maxCharactersPerLine: number;
};

export type VoxyVoiceCaptionFixturePlan = {
  id: string;
  version: typeof VOXY_VOICE_CAPTION_FIXTURE_VERSION;
  briefingId: string;
  scriptVersion: string;
  format: VoxyVideoFormat;
  locale: string;
  originalLanguage: string;
  outputLanguage: string;
  translationReviewed: boolean;
  audio: VoxyVoiceAudioMetadata;
  segments: VoxyCaptionSegment[];
  safeArea: VoxyCaptionSafeArea;
  pronunciationDictionary: Readonly<Record<string, string>>;
  review: {
    required: true;
    status: VoxyVoiceReviewStatus;
    reviewerId: string | null;
    reviewedAt: string | null;
  };
  lipSync: false;
  visemeGeneration: false;
  autoPublish: false;
};

export type VoxyVoiceCaptionFixtureArtifacts = {
  webVtt: string;
  srt: string;
  timeline: VoxyCaptionSegment[];
};

export type VoxyVoiceCaptionFixtureValidation = {
  ok: boolean;
  renderEligible: boolean;
  errors: string[];
};

const SAFE_AREAS: Readonly<Record<VoxyVideoFormat, VoxyCaptionSafeArea>> = {
  "16:9": {
    format: "16:9",
    leftPercent: 8,
    rightPercent: 8,
    topPercent: 8,
    bottomPercent: 10,
    maxLines: 2,
    maxCharactersPerLine: 42,
  },
  "9:16": {
    format: "9:16",
    leftPercent: 10,
    rightPercent: 10,
    topPercent: 12,
    bottomPercent: 18,
    maxLines: 3,
    maxCharactersPerLine: 28,
  },
  "1:1": {
    format: "1:1",
    leftPercent: 9,
    rightPercent: 9,
    topPercent: 9,
    bottomPercent: 14,
    maxLines: 3,
    maxCharactersPerLine: 34,
  },
};

export const VOXY_PRONUNCIATION_DICTIONARY = Object.freeze({
  eDebatte: "e Debatte",
  VoiceOpenGov: "Voice Open Government",
  Vote4Gov: "Vote for Government",
  Voxy: "Wok-si",
});

export function getVoxyCaptionSafeArea(
  format: VoxyVideoFormat,
): VoxyCaptionSafeArea {
  return { ...SAFE_AREAS[format] };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function splitTime(ms: number): {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
} {
  const safeMs = Math.max(0, Math.floor(ms));
  return {
    hours: Math.floor(safeMs / 3_600_000),
    minutes: Math.floor((safeMs % 3_600_000) / 60_000),
    seconds: Math.floor((safeMs % 60_000) / 1_000),
    milliseconds: safeMs % 1_000,
  };
}

function splitCaptionText(text: string, maxCharacters: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= maxCharacters) return [normalized];

  const chunks: string[] = [];
  let current = "";
  for (const word of normalized.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    current = word;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function formatVoxyWebVttTimestamp(ms: number): string {
  const time = splitTime(ms);
  return `${pad(time.hours, 2)}:${pad(time.minutes, 2)}:${pad(time.seconds, 2)}.${pad(time.milliseconds, 3)}`;
}

export function formatVoxySrtTimestamp(ms: number): string {
  const time = splitTime(ms);
  return `${pad(time.hours, 2)}:${pad(time.minutes, 2)}:${pad(time.seconds, 2)},${pad(time.milliseconds, 3)}`;
}

export function buildVoxyVoiceCaptionFixturePlan(input: {
  characterPlan: VoxyCharacterMotionFixturePlan;
  briefingId: string;
  scriptVersion: string;
  audio: VoxyVoiceAudioMetadata;
  reviewStatus?: VoxyVoiceReviewStatus;
  reviewerId?: string | null;
  reviewedAt?: string | null;
  translationReviewed?: boolean;
}): VoxyVoiceCaptionFixturePlan {
  const safeArea = getVoxyCaptionSafeArea(input.characterPlan.format);
  const maxCharacters = safeArea.maxCharactersPerLine * safeArea.maxLines;
  const segments = input.characterPlan.scenes.flatMap((scene) => {
    const text = [scene.headline, scene.detail].filter(Boolean).join(" — ");
    const chunks = splitCaptionText(text, maxCharacters);
    const durationMs = scene.endMs - scene.startMs;

    return chunks.map((chunk, index) => ({
      id: `caption-${scene.id}${chunks.length > 1 ? `-${index + 1}` : ""}`,
      startMs:
        index === 0
          ? scene.startMs
          : scene.startMs + Math.round((durationMs * index) / chunks.length),
      endMs:
        index === chunks.length - 1
          ? scene.endMs
          : scene.startMs + Math.round((durationMs * (index + 1)) / chunks.length),
      text: chunk,
      sourceSceneId: scene.id,
    }));
  });

  return {
    id: `voxy-voice-caption-${input.briefingId}-${input.characterPlan.format}`,
    version: VOXY_VOICE_CAPTION_FIXTURE_VERSION,
    briefingId: input.briefingId,
    scriptVersion: input.scriptVersion,
    format: input.characterPlan.format,
    locale: input.characterPlan.locale,
    originalLanguage: input.characterPlan.originalLanguage,
    outputLanguage: input.characterPlan.outputLanguage,
    translationReviewed: input.translationReviewed ?? false,
    audio: input.audio,
    segments,
    safeArea,
    pronunciationDictionary: VOXY_PRONUNCIATION_DICTIONARY,
    review: {
      required: true,
      status: input.reviewStatus ?? "pending",
      reviewerId: input.reviewerId ?? null,
      reviewedAt: input.reviewedAt ?? null,
    },
    lipSync: false,
    visemeGeneration: false,
    autoPublish: false,
  };
}

export function renderVoxyVoiceCaptionArtifacts(
  plan: VoxyVoiceCaptionFixturePlan,
): VoxyVoiceCaptionFixtureArtifacts {
  const webVttEntries = plan.segments.map(
    (segment) =>
      `${segment.id}\n${formatVoxyWebVttTimestamp(segment.startMs)} --> ${formatVoxyWebVttTimestamp(segment.endMs)}\n${segment.text}`,
  );

  const srtEntries = plan.segments.map(
    (segment, index) =>
      `${index + 1}\n${formatVoxySrtTimestamp(segment.startMs)} --> ${formatVoxySrtTimestamp(segment.endMs)}\n${segment.text}`,
  );

  return {
    webVtt: `WEBVTT\n\n${webVttEntries.join("\n\n")}\n`,
    srt: `${srtEntries.join("\n\n")}\n`,
    timeline: plan.segments.map((segment) => ({ ...segment })),
  };
}

export function validateVoxyVoiceCaptionFixturePlan(
  plan: VoxyVoiceCaptionFixturePlan,
): VoxyVoiceCaptionFixtureValidation {
  const errors: string[] = [];

  if (plan.version !== VOXY_VOICE_CAPTION_FIXTURE_VERSION) {
    errors.push("unsupported_voice_caption_fixture_version");
  }
  if (!plan.briefingId.trim() || !plan.scriptVersion.trim()) {
    errors.push("briefing_or_script_version_missing");
  }
  if (plan.review.required !== true || plan.autoPublish !== false) {
    errors.push("review_first_contract_broken");
  }
  if (plan.lipSync !== false || plan.visemeGeneration !== false) {
    errors.push("lip_sync_or_viseme_generation_must_remain_disabled");
  }
  if (plan.audio.durationMs <= 0) errors.push("audio_duration_invalid");
  if (plan.audio.sampleRateHz < 16_000) errors.push("audio_sample_rate_too_low");
  if (plan.audio.integratedLufs < -24 || plan.audio.integratedLufs > -12) {
    errors.push("audio_loudness_out_of_review_range");
  }
  if (plan.audio.truePeakDbtp > -1) errors.push("audio_true_peak_too_high");
  if (plan.audio.source.kind === "local_file" && !plan.audio.source.path.trim()) {
    errors.push("local_audio_path_missing");
  }
  if (
    plan.audio.source.kind === "provider_result" &&
    (!plan.audio.source.providerId.trim() ||
      !plan.audio.source.assetId.trim() ||
      plan.audio.source.usageApproved !== true)
  ) {
    errors.push("provider_audio_usage_not_approved");
  }
  if (
    plan.originalLanguage !== plan.outputLanguage &&
    plan.translationReviewed !== true
  ) {
    errors.push("translated_caption_requires_review");
  }
  if (plan.segments.length === 0) errors.push("caption_segments_missing");

  const segmentIds = new Set<string>();
  let expectedStart = 0;
  for (const segment of plan.segments) {
    if (!segment.id.trim() || segmentIds.has(segment.id)) {
      errors.push("caption_segment_id_invalid_or_duplicate");
    }
    segmentIds.add(segment.id);
    if (segment.startMs !== expectedStart) {
      errors.push(`caption_timeline_gap_or_overlap:${segment.id}`);
    }
    if (segment.endMs <= segment.startMs) {
      errors.push(`caption_segment_duration_invalid:${segment.id}`);
    }
    if (!segment.text.trim()) errors.push(`caption_text_missing:${segment.id}`);
    if (segment.text.length > plan.safeArea.maxCharactersPerLine * plan.safeArea.maxLines) {
      errors.push(`caption_text_exceeds_safe_area:${segment.id}`);
    }
    expectedStart = segment.endMs;
  }

  if (Math.abs(expectedStart - plan.audio.durationMs) > 250) {
    errors.push("audio_and_caption_duration_mismatch");
  }

  const reviewApproved =
    plan.review.status === "approved" &&
    Boolean(plan.review.reviewerId?.trim()) &&
    Boolean(plan.review.reviewedAt?.trim());

  return {
    ok: errors.length === 0,
    renderEligible: errors.length === 0 && reviewApproved,
    errors,
  };
}
