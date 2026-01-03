"use client";

import * as React from "react";
import type { LanguageCode } from "@features/i18n/languages";
import { FALLBACK_LANG } from "@features/i18n/languages";

const KEY = "vog_content_lang";

export function getStoredContentLang(): LanguageCode {
  if (typeof window === "undefined") return "de";
  const v = window.localStorage.getItem(KEY);
  if (v === "de" || v === "en" || v === "es" || v === "it" || v === "pl" || v === "fr" || v === "tr") return v;
  const nav = (navigator.language || "").slice(0, 2);
  if (nav === "de" || nav === "en" || nav === "es" || nav === "it" || nav === "pl" || nav === "fr" || nav === "tr") {
    return nav as LanguageCode;
  }
  return FALLBACK_LANG;
}

let currentLang: LanguageCode | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): LanguageCode {
  if (!currentLang) currentLang = getStoredContentLang();
  return currentLang;
}

function setContentLang(next: LanguageCode) {
  currentLang = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // ignore
    }
  }
  listeners.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useContentLang() {
  const lang = React.useSyncExternalStore<LanguageCode>(subscribe, getSnapshot, () => "de");
  return { lang, setLang: setContentLang };
}
