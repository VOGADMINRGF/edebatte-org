export const LANGUAGE_CODES = ["de", "en", "es", "it", "pl", "fr", "tr"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const FALLBACK_LANG: LanguageCode = "en";
export const DEFAULT_BASE_LANG: LanguageCode = "de";

export const UI_LANGS: Array<{ code: LanguageCode; label: string }> = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Espanol" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "fr", label: "Francais" },
  { code: "tr", label: "Turkce" },
];
