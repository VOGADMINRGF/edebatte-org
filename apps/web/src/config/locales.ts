// apps/web/src/config/locales.ts
import {
  CORE_LOCALES as CORE_LOCALES_BASE,
  EXTENDED_LOCALES as EXTENDED_LOCALES_BASE,
  SUPPORTED_LOCALES as SUPPORTED_LOCALES_BASE,
  DEFAULT_LOCALE as DEFAULT_LOCALE_BASE,
  getDir as getCoreLocaleDir,
  isSupportedLocale as isCoreSupportedLocale,
} from "@core/locale/locales";

export type CoreLocale = (typeof CORE_LOCALES_BASE)[number];
export type ExtendedLocale = (typeof EXTENDED_LOCALES_BASE)[number];
export type SupportedLocale = (typeof SUPPORTED_LOCALES_BASE)[number];

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
export const getDir = getCoreLocaleDir;

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
  { code: "nl", label: "Nederlands", flagEmoji: "🇳🇱", defaultRegion: "NL" },
  { code: "pt", label: "Português", flagEmoji: "🇵🇹", defaultRegion: "PT" },
  { code: "fi", label: "Suomi", flagEmoji: "🇫🇮", defaultRegion: "FI" },
  { code: "sv", label: "Svenska", flagEmoji: "🇸🇪", defaultRegion: "SE" },
  { code: "no", label: "Norsk", flagEmoji: "🇳🇴", defaultRegion: "NO" },
  { code: "cs", label: "Čeština", flagEmoji: "🇨🇿", defaultRegion: "CZ" },
  { code: "hi", label: "हिन्दी", flagEmoji: "🇮🇳", defaultRegion: "IN" },
  { code: "ro", label: "Română", flagEmoji: "🇷🇴", defaultRegion: "RO" },
  { code: "el", label: "Ελληνικά", flagEmoji: "🇬🇷", defaultRegion: "GR" },
  { code: "uk", label: "Українська", flagEmoji: "🇺🇦", defaultRegion: "UA" },
  { code: "bg", label: "Български", flagEmoji: "🇧🇬", defaultRegion: "BG" },
  { code: "da", label: "Dansk", flagEmoji: "🇩🇰", defaultRegion: "DK" },
  { code: "et", label: "Eesti", flagEmoji: "🇪🇪", defaultRegion: "EE" },
  { code: "ga", label: "Gaeilge", flagEmoji: "🇮🇪", defaultRegion: "IE" },
  { code: "hr", label: "Hrvatski", flagEmoji: "🇭🇷", defaultRegion: "HR" },
  { code: "hu", label: "Magyar", flagEmoji: "🇭🇺", defaultRegion: "HU" },
  { code: "lv", label: "Latviešu", flagEmoji: "🇱🇻", defaultRegion: "LV" },
  { code: "lt", label: "Lietuvių", flagEmoji: "🇱🇹", defaultRegion: "LT" },
  { code: "mt", label: "Malti", flagEmoji: "🇲🇹", defaultRegion: "MT" },
  { code: "sk", label: "Slovenčina", flagEmoji: "🇸🇰", defaultRegion: "SK" },
  { code: "sl", label: "Slovenščina", flagEmoji: "🇸🇮", defaultRegion: "SI" },
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

export function isCoreLocale(locale: string | null | undefined): locale is CoreLocale {
  return !!locale && (CORE_LOCALES as readonly string[]).includes(locale);
}

export function isExtendedLocale(locale: string | null | undefined): locale is ExtendedLocale {
  return !!locale && (EXTENDED_LOCALES as readonly string[]).includes(locale);
}
