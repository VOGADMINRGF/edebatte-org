import { describe, expect, it } from "vitest";

import {
  LOCALE_CONFIG,
  SUPPORTED_LOCALES,
  getLocaleConfig,
} from "@/config/locales";
import { LANGUAGE_CODES, UI_LANGS } from "@features/i18n/languages";

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

const PRESERVED_ADDITIONAL_LOCALES = [
  "tr",
  "ar",
  "ru",
  "zh",
  "no",
  "hi",
  "uk",
] as const;

const ADDED_EU_LOCALE_CONFIG = {
  bg: { label: "Български", defaultRegion: "BG" },
  da: { label: "Dansk", defaultRegion: "DK" },
  et: { label: "Eesti", defaultRegion: "EE" },
  ga: { label: "Gaeilge", defaultRegion: "IE" },
  hr: { label: "Hrvatski", defaultRegion: "HR" },
  hu: { label: "Magyar", defaultRegion: "HU" },
  lv: { label: "Latviešu", defaultRegion: "LV" },
  lt: { label: "Lietuvių", defaultRegion: "LT" },
  mt: { label: "Malti", defaultRegion: "MT" },
  sk: { label: "Slovenčina", defaultRegion: "SK" },
  sl: { label: "Slovenščina", defaultRegion: "SI" },
} as const;

describe("EU-24 locale coverage contract", () => {
  it("keeps one canonical 31-locale matrix with all EU official languages and preserved additions", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(31);
    expect(new Set(SUPPORTED_LOCALES).size).toBe(SUPPORTED_LOCALES.length);

    for (const locale of EU_OFFICIAL_LOCALES) {
      expect(SUPPORTED_LOCALES).toContain(locale);
    }

    for (const locale of PRESERVED_ADDITIONAL_LOCALES) {
      expect(SUPPORTED_LOCALES).toContain(locale);
    }
  });

  it("keeps UI and content-language projections in exact set parity with the canonical locale SSOT", () => {
    const canonicalSet = new Set(SUPPORTED_LOCALES);
    const configCodes = LOCALE_CONFIG.map((entry) => entry.code);
    const uiLanguageCodes = UI_LANGS.map((entry) => entry.code);

    expect(LOCALE_CONFIG).toHaveLength(SUPPORTED_LOCALES.length);
    expect(new Set(configCodes).size).toBe(configCodes.length);
    expect(new Set(configCodes)).toEqual(canonicalSet);

    expect(LANGUAGE_CODES).toHaveLength(SUPPORTED_LOCALES.length);
    expect(new Set(LANGUAGE_CODES).size).toBe(LANGUAGE_CODES.length);
    expect(new Set(LANGUAGE_CODES)).toEqual(canonicalSet);

    expect(UI_LANGS).toHaveLength(SUPPORTED_LOCALES.length);
    expect(new Set(uiLanguageCodes).size).toBe(uiLanguageCodes.length);
    expect(new Set(uiLanguageCodes)).toEqual(canonicalSet);
  });

  it("preserves labels, default regions, Unicode and diacritics for the eleven added EU locales", () => {
    for (const [locale, expected] of Object.entries(ADDED_EU_LOCALE_CONFIG)) {
      expect(getLocaleConfig(locale as keyof typeof ADDED_EU_LOCALE_CONFIG)).toMatchObject(expected);
    }
  });
});
