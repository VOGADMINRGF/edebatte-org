// apps/web/src/utils/useTranslation.ts
"use client";

import { useMemo } from "react";

type Dict = Record<string, string>;

export function useTranslation(lang: string = "de") {
  const dict = useMemo(() => dictionaries[lang] ?? {}, [lang]);

  function t(key: string, fallback?: string) {
    return dict[key] ?? fallback ?? key;
  }

  return { t, lang };
}
