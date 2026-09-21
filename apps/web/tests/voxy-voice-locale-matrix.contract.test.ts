import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/config/locales";
import {
  VOXY_VIDEO_OUTPUT_LOCALES,
  buildVoxyVoiceLocaleReadiness,
  getVoxyVideoLocaleMatrixDrift,
  isVoxyVideoOutputLocale,
} from "@/features/voxyVideo/voiceLocaleMatrix";

describe("Voxy voice locale matrix", () => {
  it("matches the canonical public locale matrix exactly", () => {
    const drift = getVoxyVideoLocaleMatrixDrift();

    expect(VOXY_VIDEO_OUTPUT_LOCALES).toHaveLength(20);
    expect(drift.matchesCanonicalLocales).toBe(true);
    expect(drift.missingFromVideoMatrix).toEqual([]);
    expect(drift.unexpectedInVideoMatrix).toEqual([]);
    expect(new Set(drift.videoLocales)).toEqual(new Set(SUPPORTED_LOCALES));
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

  it("allows render only when the requested-locale voice is explicitly approved", () => {
    expect(
      buildVoxyVoiceLocaleReadiness({
        locale: "de",
        voiceProfileId: "voxy-de-approved",
        voiceUsageApproved: true,
      }),
    ).toEqual({
      locale: "de",
      status: "voice_available",
      voiceProfileId: "voxy-de-approved",
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
