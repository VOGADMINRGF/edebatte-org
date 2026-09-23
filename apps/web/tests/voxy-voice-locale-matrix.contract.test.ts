import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/config/locales";
import {
  VOXY_VIDEO_OUTPUT_LOCALES,
  buildVoxyVoiceLocaleReadiness,
  getVoxyVideoLocaleMatrixDrift,
  isVoxyVideoOutputLocale,
} from "@/features/voxyVideo/voiceLocaleMatrix";

const EU_OFFICIAL_LOCALES = [
  "bg",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "hu",
  "ga",
  "it",
  "lv",
  "lt",
  "mt",
  "pl",
  "pt",
  "ro",
  "sk",
  "sl",
  "es",
  "sv",
] as const;

const ADDED_EU_LOCALES = [
  "bg",
  "da",
  "et",
  "ga",
  "hr",
  "hu",
  "lv",
  "lt",
  "mt",
  "sk",
  "sl",
] as const;

describe("Voxy voice locale matrix", () => {
  it("matches the canonical public locale matrix exactly and covers all EU official languages", () => {
    const drift = getVoxyVideoLocaleMatrixDrift();

    expect(VOXY_VIDEO_OUTPUT_LOCALES).toHaveLength(31);
    expect(drift.matchesCanonicalLocales).toBe(true);
    expect(drift.missingFromVideoMatrix).toEqual([]);
    expect(drift.unexpectedInVideoMatrix).toEqual([]);
    expect(new Set(drift.videoLocales)).toEqual(new Set(SUPPORTED_LOCALES));

    for (const locale of EU_OFFICIAL_LOCALES) {
      expect(VOXY_VIDEO_OUTPUT_LOCALES).toContain(locale);
    }

    expect(VOXY_VIDEO_OUTPUT_LOCALES).toEqual(
      expect.arrayContaining(["tr", "ar", "ru", "zh", "no", "hi", "uk"]),
    );
  });

  it.each([...SUPPORTED_LOCALES])(
    "keeps %s as the requested output locale without fallback",
    (locale) => {
      expect(isVoxyVideoOutputLocale(locale)).toBe(true);
      const readiness = buildVoxyVoiceLocaleReadiness({ locale });

      expect(readiness).toMatchObject({
        locale,
        status: "voice_unavailable",
        voiceProfileId: null,
        fallbackLocale: null,
        captionPreparationAllowed: true,
        renderAllowed: false,
        reviewRequired: true,
        reason: "approved_voice_unavailable_for_locale",
      });
    },
  );

  it.each(ADDED_EU_LOCALES)(
    "keeps newly added EU locale %s render-blocked without an approved voice",
    (locale) => {
      expect(buildVoxyVoiceLocaleReadiness({ locale })).toMatchObject({
        locale,
        status: "voice_unavailable",
        voiceProfileId: null,
        fallbackLocale: null,
        renderAllowed: false,
        reason: "approved_voice_unavailable_for_locale",
      });
    },
  );

  it("allows render only when the requested-locale voice is explicitly approved", () => {
    expect(
      buildVoxyVoiceLocaleReadiness({
        locale: "ga",
        voiceProfileId: "voxy-ga-approved",
        voiceUsageApproved: true,
      }),
    ).toEqual({
      locale: "ga",
      status: "voice_available",
      voiceProfileId: "voxy-ga-approved",
      fallbackLocale: null,
      captionPreparationAllowed: true,
      renderAllowed: true,
      reviewRequired: true,
      reason: null,
    });
  });

  it("does not treat an unapproved voice as available", () => {
    expect(
      buildVoxyVoiceLocaleReadiness({
        locale: "fr",
        voiceProfileId: "unapproved-fr-voice",
        voiceUsageApproved: false,
      }),
    ).toMatchObject({
      locale: "fr",
      status: "voice_unavailable",
      voiceProfileId: null,
      fallbackLocale: null,
      renderAllowed: false,
    });
  });

  it("fails closed for locales outside the canonical application matrix", () => {
    expect(() =>
      buildVoxyVoiceLocaleReadiness({
        locale: "ja",
        voiceProfileId: "some-voice",
        voiceUsageApproved: true,
      }),
    ).toThrow("unsupported_voxy_video_output_locale:ja");
  });
});
