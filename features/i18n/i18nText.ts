import { z } from "zod";
import type { LanguageCode } from "./languages";

export const I18nStringSchema = z
  .object({
    de: z.string().optional(),
    en: z.string().optional(),
    es: z.string().optional(),
    it: z.string().optional(),
    pl: z.string().optional(),
    fr: z.string().optional(),
    tr: z.string().optional(),
  })
  .strict();

export type I18nString = z.infer<typeof I18nStringSchema>;

export function pickI18n(
  i18n: I18nString | undefined,
  lang: LanguageCode,
  fallback: LanguageCode = "en",
) {
  if (!i18n) return undefined;
  const direct = (i18n as any)[lang] as string | undefined;
  if (direct && direct.trim()) return direct;
  const fb = (i18n as any)[fallback] as string | undefined;
  if (fb && fb.trim()) return fb;
  for (const v of Object.values(i18n)) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export function bilingual(baseLang: LanguageCode, baseText: string, enText: string): I18nString {
  const out: I18nString = {};
  (out as any)[baseLang] = baseText;
  out.en = enText;
  return out;
}

export function withEn(baseLang: LanguageCode, baseText: string, enText?: string) {
  return {
    text: baseText,
    i18n: enText ? bilingual(baseLang, baseText, enText) : undefined,
  };
}
