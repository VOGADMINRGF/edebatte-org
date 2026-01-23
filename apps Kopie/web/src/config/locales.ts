// apps/web/src/config/locales.ts
import {
  CORE_LOCALES as CORE_LOCALES_BASE,
  EXTENDED_LOCALES as EXTENDED_LOCALES_BASE,
  SUPPORTED_LOCALES as SUPPORTED_LOCALES_BASE,
  DEFAULT_LOCALE as DEFAULT_LOCALE_BASE,
  isSupportedLocale as isCoreSupportedLocale,
} from "@core/locale/locales";

type CoreSupportedLocale = (typeof SUPPORTED_LOCALES_BASE)[number];
export type SupportedLocale = CoreSupportedLocale;

export interface LocaleConfig {
  code: SupportedLocale;
  label: string;
  flagEmoji: string;
  defaultRegion?: string;
}

export const CORE_LOCALES = CORE_LOCALES_BASE;
export const EXTENDED_LOCALES = EXTENDED_LOCALES_BASE;
export const SUPPORTED_LOCALES = SUPPORTED_LOCALES_BASE;
export const DEFAULT_LOCALE = DEFAULT_LOCALE_BASE;
export const isSupportedLocale = isCoreSupportedLocale;

export const LOCALE_CONFIG: LocaleConfig[] = [
  { code: "de", label: "Deutsch", flagEmoji: "🇩🇪", defaultRegion: "DE" },
  { code: "en", label: "English", flagEmoji: "🇺🇳", defaultRegion: "EU" },
  { code: "fr", label: "Français", flagEmoji: "🇫🇷", defaultRegion: "FR" },
  { code: "pl", label: "Polski", flagEmoji: "🇵🇱", defaultRegion: "PL" },
  { code: "es", label: "Español", flagEmoji: "🇪🇸", defaultRegion: "ES" },
  { code: "it", label: "Italiano", flagEmoji: "🇮🇹", defaultRegion: "IT" },
  { code: "tr", label: "Türkçe", flagEmoji: "🇹🇷", defaultRegion: "TR" },
  { code: "ar", label: "العربية", flagEmoji: "🇦🇪", defaultRegion: "MENA" },
  { code: "ru", label: "Русский", flagEmoji: "🇷🇺", defaultRegion: "RU" },
  { code: "zh", label: "中文", flagEmoji: "🇨🇳", defaultRegion: "CN" },
];

export function getLocaleConfig(code: SupportedLocale): LocaleConfig {
  const cfg = LOCALE_CONFIG.find((item) => item.code === code);
  return (
    cfg ?? {
      code,
      label: code,
      flagEmoji: "🏳️",
      defaultRegion: undefined,
    }
  );
}

export function isCoreLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && (CORE_LOCALES as readonly string[]).includes(locale);
}

export function isExtendedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && (EXTENDED_LOCALES as readonly string[]).includes(locale);
}
