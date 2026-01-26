// core/locale/locales.ts
export const CORE_LOCALES = ["de", "en"] as const;
export const EXTENDED_LOCALES = [
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
] as const;
export const SUPPORTED_LOCALES = [...CORE_LOCALES, ...EXTENDED_LOCALES] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = CORE_LOCALES[0];

export function isSupportedLocale(v: string | null | undefined): v is SupportedLocale {
  return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

// Für spätere RTL-Sprachen erweiterbar
export function getDir(locale: SupportedLocale): "ltr" | "rtl" {
  // if (locale === "ar" || locale === "he") return "rtl";
  return "ltr";
}
