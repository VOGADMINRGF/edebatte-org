// apps/web/src/context/LocaleContext.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  type SupportedLocale,
  isSupportedLocale,
} from "@/config/locales";

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

type ProviderProps = {
  initialLocale?: SupportedLocale;
  children: React.ReactNode;
};

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: ProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale);

  // Hydrate from localStorage/query once on mount
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const urlLocale = url.searchParams.get("lang");
      if (isSupportedLocale(urlLocale)) {
        setLocaleState(urlLocale);
        persistLocale(urlLocale);
        updateHtmlAttrs(urlLocale);
        return;
      }
    } catch {
      /* ignore */
    }

    try {
      const stored = window.localStorage.getItem("vog:locale");
      if (isSupportedLocale(stored)) {
        setLocaleState(stored);
        updateHtmlAttrs(stored);
      } else {
        updateHtmlAttrs(initialLocale);
      }
    } catch {
      updateHtmlAttrs(initialLocale);
    }
  }, [initialLocale]);

  useEffect(() => {
    updateHtmlAttrs(locale);
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    persistLocale(next);
    syncUrl(next);
    updateHtmlAttrs(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <LocaleProvider>");
  }
  return ctx;
}

function persistLocale(locale: SupportedLocale) {
  try {
    window.localStorage.setItem("vog:locale", locale);
  } catch {
    /* ignore */
  }

  try {
    document.cookie = `lang=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function syncUrl(locale: SupportedLocale) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("lang");
    if (current !== locale) {
      url.searchParams.set("lang", locale);
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    /* ignore */
  }
}

function updateHtmlAttrs(locale: SupportedLocale) {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  } catch {
    /* ignore */
  }
}
