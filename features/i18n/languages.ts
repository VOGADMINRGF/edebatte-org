export const LANGUAGE_CODES = [
  "de",
  "en",
  "es",
  "it",
  "pl",
  "fr",
  "tr",
  "ru",
  "zh",
  "ar",
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
] as const;
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
  { code: "ru", label: "Русский" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
  { code: "nl", label: "Nederlands" },
  { code: "pt", label: "Portugues" },
  { code: "fi", label: "Suomi" },
  { code: "sv", label: "Svenska" },
  { code: "no", label: "Norsk" },
  { code: "cs", label: "Cesky" },
  { code: "hi", label: "हिन्दी" },
  { code: "ro", label: "Romana" },
  { code: "el", label: "Ελληνικα" },
  { code: "uk", label: "Українська" },
];
