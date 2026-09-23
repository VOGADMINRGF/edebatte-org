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
export const SUPPORTED_LOCALES = [...CORE_LOCALES, ...EXTENDED_LOCALES] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = CORE_LOCALES[0];

const RTL_LOCALES = new Set<SupportedLocale>(["ar"]);

export function isSupportedLocale(v: string | null | undefined): v is SupportedLocale {
  return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

export function getDir(locale: SupportedLocale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}
