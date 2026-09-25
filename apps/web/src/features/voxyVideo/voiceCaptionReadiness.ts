import type { VoxyEditorialStoryPlan } from "./editorialStoryPlan";
import {
  buildVoxyEditorialScriptVersion,
  getVoxyEditorialLanguageVariantBinding,
  validateVoxyEditorialLanguageVariantBinding,
} from "./editorialLanguageVariant";
import type { VoxyLocalCompositionAudioInputRecord } from "./localCompositionAudioAssetStore";
import type { VoxyVideoFormat } from "./modernCharacterContracts";
import { evaluateVoxyStudioCaptionLayoutSafety } from "./studioLayoutSafety";
import {
  buildVoxyVoiceLocaleReadiness,
  isVoxyVideoOutputLocale,
  type VoxyVoiceOutputStatus,
} from "./voiceLocaleMatrix";

const TARGET_FORMATS = ["16:9", "9:16", "1:1"] as const satisfies readonly VoxyVideoFormat[];

export type VoxyVoiceCaptionReadiness = {
  locale: string;
  storyPlanId: string;
  storyPlanRevision: number;
  scriptVersion: string;
  translationRevision: number | null;
  voiceStatus: VoxyVoiceOutputStatus;
  voiceProfileId: string | null;
  fallbackLocale: null;
  captionStatus: "preparation_pending" | "ready";
  captionPreparationAllowed: true;
  formatSafety: Record<VoxyVideoFormat, boolean>;
  bindingCurrent: boolean;
  renderAllowed: boolean;
  blockers: string[];
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function validateCaptionTimeline(
  audio: VoxyLocalCompositionAudioInputRecord,
): string[] {
  const blockers: string[] = [];
  if (audio.captionCues.length === 0) {
    blockers.push("caption_cues_missing");
    return blockers;
  }

  const ids = new Set<string>();
  let cursor = 0;
  for (const cue of audio.captionCues) {
    if (!normalized(cue.id) || ids.has(cue.id)) {
      pushUnique(blockers, `caption_id_invalid_or_duplicate:${cue.id}`);
    }
    ids.add(cue.id);
    if (!normalized(cue.text)) {
      pushUnique(blockers, `caption_text_missing:${cue.id}`);
    }
    if (
      !Number.isInteger(cue.startMs) ||
      !Number.isInteger(cue.endMs) ||
      cue.startMs !== cursor ||
      cue.endMs <= cue.startMs
    ) {
      pushUnique(blockers, `caption_timeline_invalid:${cue.id}`);
    }
    cursor = cue.endMs;
  }
  if (cursor !== audio.durationMs) blockers.push("caption_duration_mismatch");
  return blockers;
}

export function evaluateVoxyVoiceCaptionReadiness(input: {
  storyPlan: VoxyEditorialStoryPlan;
  audioInput?: VoxyLocalCompositionAudioInputRecord | null;
}): VoxyVoiceCaptionReadiness {
  const blockers: string[] = [];
  const locale = normalized(input.storyPlan.outputLanguage).toLowerCase();
  const storyLocale = normalized(input.storyPlan.locale).toLowerCase();
  const scriptVersion = buildVoxyEditorialScriptVersion(input.storyPlan);
  const languageVariant = getVoxyEditorialLanguageVariantBinding(input.storyPlan);

  if (!isVoxyVideoOutputLocale(locale)) {
    blockers.push(`unsupported_output_locale:${locale || "missing"}`);
  }
  if (storyLocale !== locale) blockers.push("story_plan_locale_binding_mismatch");

  for (const error of validateVoxyEditorialLanguageVariantBinding(input.storyPlan)) {
    pushUnique(blockers, `language_variant:${error}`);
  }
  if (
    normalized(input.storyPlan.originalLanguage).toLowerCase() !== locale &&
    !languageVariant
  ) {
    blockers.push("language_variant_binding_missing");
  }
  if (languageVariant && languageVariant.translationStatus !== "approved") {
    blockers.push(`language_variant_translation_not_approved:${languageVariant.translationStatus}`);
  }

  const emptyFormatSafety = {
    "16:9": false,
    "9:16": false,
    "1:1": false,
  } satisfies Record<VoxyVideoFormat, boolean>;

  if (!input.audioInput || !isVoxyVideoOutputLocale(locale)) {
    if (!input.audioInput) {
      blockers.push("voice_unavailable");
      blockers.push("caption_preparation_pending");
    }
    return {
      locale,
      storyPlanId: input.storyPlan.storyPlanId,
      storyPlanRevision: input.storyPlan.revision,
      scriptVersion,
      translationRevision: languageVariant?.translationRevision ?? null,
      voiceStatus: "voice_unavailable",
      voiceProfileId: null,
      fallbackLocale: null,
      captionStatus: "preparation_pending",
      captionPreparationAllowed: true,
      formatSafety: emptyFormatSafety,
      bindingCurrent: false,
      renderAllowed: false,
      blockers,
    };
  }

  const audio = input.audioInput;
  const voiceReadiness = buildVoxyVoiceLocaleReadiness({
    locale,
    voiceProfileId: audio.voiceProfileId,
    voiceUsageApproved: audio.voiceUsageApproved,
  });
  if (!voiceReadiness.renderAllowed) blockers.push("voice_unavailable");
  if (audio.fallbackLocale !== null) blockers.push("voice_fallback_forbidden");
  if (normalized(audio.locale).toLowerCase() !== locale) {
    blockers.push("audio_locale_binding_mismatch");
  }
  if (audio.storyPlanId !== input.storyPlan.storyPlanId) {
    blockers.push("audio_story_plan_binding_mismatch");
  }
  if (audio.storyPlanRevision !== input.storyPlan.revision) {
    blockers.push("audio_story_revision_stale");
  }
  if (audio.scriptVersion !== scriptVersion) {
    blockers.push("audio_script_revision_stale");
  }

  const captionBlockers = validateCaptionTimeline(audio);
  for (const blocker of captionBlockers) pushUnique(blockers, blocker);

  const formatSafety = Object.fromEntries(
    TARGET_FORMATS.map((format) => {
      const result = evaluateVoxyStudioCaptionLayoutSafety({
        format,
        captionCues: audio.captionCues,
      });
      for (const blocker of result.blockers) {
        pushUnique(blockers, `caption_layout:${format}:${blocker.code}`);
      }
      return [format, result.renderEligible];
    }),
  ) as Record<VoxyVideoFormat, boolean>;

  const captionStatus = captionBlockers.length === 0 ? "ready" : "preparation_pending";
  const bindingCurrent = !blockers.some((blocker) =>
    blocker.startsWith("audio_") ||
    blocker.startsWith("language_variant:") ||
    blocker === "story_plan_locale_binding_mismatch" ||
    blocker === "language_variant_binding_missing" ||
    blocker.startsWith("language_variant_translation_not_approved:"),
  );
  const renderAllowed =
    blockers.length === 0 &&
    voiceReadiness.renderAllowed &&
    captionStatus === "ready" &&
    TARGET_FORMATS.every((format) => formatSafety[format]);

  return {
    locale,
    storyPlanId: input.storyPlan.storyPlanId,
    storyPlanRevision: input.storyPlan.revision,
    scriptVersion,
    translationRevision: languageVariant?.translationRevision ?? null,
    voiceStatus: voiceReadiness.status,
    voiceProfileId: voiceReadiness.voiceProfileId,
    fallbackLocale: null,
    captionStatus,
    captionPreparationAllowed: true,
    formatSafety,
    bindingCurrent,
    renderAllowed,
    blockers,
  };
}
