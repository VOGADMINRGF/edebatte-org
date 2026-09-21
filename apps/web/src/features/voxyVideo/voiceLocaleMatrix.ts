import {
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/config/locales";

export const VOXY_VIDEO_OUTPUT_LOCALES = [
  "de",
  "en",
  "fr",
  "pl",
  "es",
  "it",
  "tr",
  "ar",
  "ru",
  "zh",
  "nl",
  "pt",
  "fi",
  "sv",
  "no",
  "cs",
  "hi",
  "ro",
  "el",
  "uk",
] as const satisfies readonly SupportedLocale[];

export type VoxyVideoOutputLocale =
  (typeof VOXY_VIDEO_OUTPUT_LOCALES)[number];

export const VOXY_VOICE_OUTPUT_STATUSES = [
  "voice_available",
  "voice_unavailable",
] as const;

export type VoxyVoiceOutputStatus =
  (typeof VOXY_VOICE_OUTPUT_STATUSES)[number];

export type VoxyVoiceLocaleReadiness = {
  locale: VoxyVideoOutputLocale;
  status: VoxyVoiceOutputStatus;
  voiceProfileId: string | null;
  fallbackLocale: null;
  captionPreparationAllowed: true;
  renderAllowed: boolean;
  reviewRequired: true;
  reason: "approved_voice_unavailable_for_locale" | null;
};

export type VoxyVideoLocaleMatrixDrift = {
  canonicalLocales: SupportedLocale[];
  videoLocales: VoxyVideoOutputLocale[];
  missingFromVideoMatrix: SupportedLocale[];
  unexpectedInVideoMatrix: VoxyVideoOutputLocale[];
  matchesCanonicalLocales: boolean;
};

export function isVoxyVideoOutputLocale(
  value: string | null | undefined,
): value is VoxyVideoOutputLocale {
  return Boolean(
    value &&
      (VOXY_VIDEO_OUTPUT_LOCALES as readonly string[]).includes(value),
  );
}

export function getVoxyVideoLocaleMatrixDrift(): VoxyVideoLocaleMatrixDrift {
  const canonicalLocales = [...SUPPORTED_LOCALES];
  const videoLocales = [...VOXY_VIDEO_OUTPUT_LOCALES];
  const canonicalSet = new Set<string>(canonicalLocales);
  const videoSet = new Set<string>(videoLocales);
  const missingFromVideoMatrix = canonicalLocales.filter(
    (locale) => !videoSet.has(locale),
  );
  const unexpectedInVideoMatrix = videoLocales.filter(
    (locale) => !canonicalSet.has(locale),
  );

  return {
    canonicalLocales,
    videoLocales,
    missingFromVideoMatrix,
    unexpectedInVideoMatrix,
    matchesCanonicalLocales:
      missingFromVideoMatrix.length === 0 &&
      unexpectedInVideoMatrix.length === 0 &&
      canonicalLocales.length === videoLocales.length,
  };
}

export function buildVoxyVoiceLocaleReadiness(input: {
  locale: string;
  voiceProfileId?: string | null;
  voiceUsageApproved?: boolean;
}): VoxyVoiceLocaleReadiness {
  const locale = input.locale.trim().toLowerCase();
  if (!isVoxyVideoOutputLocale(locale)) {
    throw new Error(`unsupported_voxy_video_output_locale:${locale || "missing"}`);
  }

  const voiceProfileId = input.voiceProfileId?.trim() || null;
  const voiceAvailable =
    Boolean(voiceProfileId) && input.voiceUsageApproved === true;

  return {
    locale,
    status: voiceAvailable ? "voice_available" : "voice_unavailable",
    voiceProfileId: voiceAvailable ? voiceProfileId : null,
    fallbackLocale: null,
    captionPreparationAllowed: true,
    renderAllowed: voiceAvailable,
    reviewRequired: true,
    reason: voiceAvailable ? null : "approved_voice_unavailable_for_locale",
  };
}
