"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { SupportedLocale } from "@/config/locales";

type TranslateItem = { key: string; text: string };

export const AUTO_TRANSLATE_LOCALES: SupportedLocale[] = ["it", "ru", "zh", "fr", "es", "pl"];

const PRIVATE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/account",
  "/settings",
  "/auth",
  "/login",
  "/register",
  "/reset",
  "/verify",
];

const PRIVATE_EXACT = new Set<string>(["/logout"]);

const DEFAULT_SKIP_KEYS = new Set([
  "id",
  "key",
  "href",
  "variant",
  "code",
  "tag",
  "kind",
  "scope",
  "status",
  "locale",
  "lang",
  "flagEmoji",
]);

const URL_LIKE = /^(https?:\/\/|\/|#)/i;

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(namespace: string, locale: SupportedLocale) {
  return `vog:i18n:${namespace}:${locale}`;
}

function readCache(namespace: string, locale: SupportedLocale) {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    const raw = window.localStorage.getItem(cacheKey(namespace, locale));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeCache(namespace: string, locale: SupportedLocale, data: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cacheKey(namespace, locale), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function shouldTranslateValue(value: string, key?: string) {
  if (!value) return false;
  if (key && DEFAULT_SKIP_KEYS.has(key)) return false;
  if (URL_LIKE.test(value)) return false;
  return true;
}

export function isPublicPathname(pathname?: string | null) {
  if (!pathname) return true;
  if (PRIVATE_EXACT.has(pathname)) return false;
  return !PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function chunkItems(items: TranslateItem[]) {
  const batches: TranslateItem[][] = [];
  let current: TranslateItem[] = [];
  let size = 0;
  for (const item of items) {
    const nextSize = size + item.text.length;
    if (current.length >= 40 || nextSize > 16000) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateBatch(
  sourceLocale: SupportedLocale,
  targetLocale: SupportedLocale,
  items: TranslateItem[],
) {
  const batches = chunkItems(items);
  const results: Record<string, string> = {};

  for (const batch of batches) {
    const res = await fetch("/api/i18n/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        srcLang: sourceLocale,
        tgtLang: targetLocale,
        items: batch,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !Array.isArray(data.translations)) continue;
    for (const entry of data.translations) {
      if (entry?.key && typeof entry.translation === "string") {
        results[entry.key] = entry.translation;
      }
    }
  }

  return results;
}

type AutoTranslateOptions = {
  locale: SupportedLocale;
  namespace: string;
  sourceLocale?: SupportedLocale;
  translateLocales?: SupportedLocale[];
  publicOnly?: boolean;
};

export function useAutoTranslateText({
  locale,
  namespace,
  sourceLocale = "de",
  translateLocales = AUTO_TRANSLATE_LOCALES,
  publicOnly = true,
}: AutoTranslateOptions) {
  const pathname = usePathname();
  const isPublic = !publicOnly || isPublicPathname(pathname);
  const canTranslate = isPublic && translateLocales.includes(locale);
  const cacheRef = useRef<Record<string, string>>(readCache(namespace, locale));
  const inflightRef = useRef<Set<string>>(new Set());
  const usedRef = useRef<Map<string, string>>(new Map());
  const [, forceRender] = useState(0);

  useEffect(() => {
    cacheRef.current = readCache(namespace, locale);
    inflightRef.current = new Set();
    usedRef.current = new Map();
  }, [locale, namespace]);

  useEffect(() => {
    if (!canTranslate || locale === sourceLocale) return;

    const pending: TranslateItem[] = [];
    for (const [key, text] of usedRef.current.entries()) {
      if (cacheRef.current[key] || inflightRef.current.has(key)) continue;
      inflightRef.current.add(key);
      pending.push({ key, text });
    }

    if (!pending.length) return;
    let cancelled = false;

    (async () => {
      const translated = await translateBatch(sourceLocale, locale, pending);
      if (cancelled) return;
      let updated = false;
      for (const [key, text] of Object.entries(translated)) {
        if (!cacheRef.current[key]) {
          cacheRef.current[key] = text;
          updated = true;
        }
      }
      if (updated) {
        writeCache(namespace, locale, cacheRef.current);
        forceRender((v) => v + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, namespace, canTranslate, sourceLocale]);

  const t = useCallback(
    (value: string, keyHint?: string) => {
      if (!value) return value;
      if (!canTranslate || locale === sourceLocale) return value;
      const key = keyHint ? `${keyHint}:${hashString(value)}` : hashString(value);
      usedRef.current.set(key, value);
      return cacheRef.current[key] ?? value;
    },
    [canTranslate, locale, sourceLocale],
  );

  return t;
}

type MapOptions = {
  namespace?: string;
};

export function mapTranslatableStrings<T>(
  input: T,
  t: (value: string, keyHint?: string) => string,
  options: MapOptions = {},
): T {
  const rootKey = options.namespace ?? "copy";

  const walk = (value: any, path: string[]): any => {
    if (typeof value === "string") {
      const keyHint = `${rootKey}.${path.join(".")}`;
      const key = path[path.length - 1];
      return shouldTranslateValue(value, key) ? t(value, keyHint) : value;
    }
    if (Array.isArray(value)) {
      return value.map((item, idx) => walk(item, [...path, String(idx)]));
    }
    if (value && typeof value === "object") {
      const out: Record<string, any> = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === "string" && !shouldTranslateValue(v, k)) {
          out[k] = v;
          continue;
        }
        out[k] = walk(v, [...path, k]);
      }
      return out as typeof value;
    }
    return value;
  };

  return walk(input, []) as T;
}
