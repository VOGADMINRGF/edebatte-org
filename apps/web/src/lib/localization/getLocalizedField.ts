// apps/web/src/lib/localization/getLocalizedField.ts
import {
  CORE_LOCALES,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
  isSupportedLocale,
} from "@/config/locales";

export type ResolveLocalizedFieldOptions = {
  sourceLocale?: string | null;
};

type AnyRecord = Record<string, unknown>;

export function resolveLocalizedField(
  entity: AnyRecord,
  baseKey: string,
  locale: SupportedLocale,
  fallbackLocale: SupportedLocale = DEFAULT_LOCALE,
  options?: ResolveLocalizedFieldOptions,
): string {
  const tried = new Set<string>();

  const attempt = (candidate?: string | null): string | null => {
    if (!candidate || tried.has(candidate)) return null;
    tried.add(candidate);
    if (!isSupportedLocale(candidate)) return null;
    const value = read(entity, baseKey, candidate);
    return value ?? null;
  };

  const direct = attempt(locale);
  if (direct) return direct;

  const fallback = attempt(fallbackLocale);
  if (fallback) return fallback;

  for (const core of CORE_LOCALES) {
    const coreValue = attempt(core);
    if (coreValue) return coreValue;
  }

  for (const supported of SUPPORTED_LOCALES) {
    const supportedValue = attempt(supported);
    if (supportedValue) return supportedValue;
  }

  const sourceLocale = options?.sourceLocale;
  if (sourceLocale && typeof sourceLocale === "string") {
    const normalized = sourceLocale.slice(0, 2).toLowerCase();
    if (isSupportedLocale(normalized)) {
      const sourceValue = read(entity, baseKey, normalized);
      if (sourceValue) return sourceValue;
    }
  }

  const plain = entity?.[baseKey];
  if (typeof plain === "string" && plain.trim()) return plain.trim();

  return "";
}

function read(entity: AnyRecord, baseKey: string, locale: SupportedLocale): string | undefined {
  const key = `${baseKey}_${locale}`;
  const value = entity?.[key];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length) return trimmed;
  }
  return undefined;
}
