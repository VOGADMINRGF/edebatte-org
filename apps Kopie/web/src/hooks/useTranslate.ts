// apps/web/src/hooks/useTranslate.ts
"use client";
import { useCallback, useState } from "react";

type SingleOut = { to: string; result: string; cached: boolean };
type BatchOut = Record<
  string,
  { text: string; result: string; cached: boolean }[]
>;

export function useTranslate() {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string, to: string | string[], from?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ text, to, from }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || String(j));
        const results: SingleOut[] = j.results;
        // bequem: bei to als string direkt result
        if (!Array.isArray(to)) return results?.[0]?.result as string;
        const map: Record<string, string> = {};
        for (const x of results) map[x.to] = x.result;
        return map;
      } catch (e: any) {
        setErr(e.message || String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { translate, loading, error };
}

export function useBatchTranslate() {
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  const translateMany = useCallback(
    async (texts: string[], to: string | string[], from?: string) => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ texts, to, from }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || String(j));
        return j.results as BatchOut;
      } catch (e: any) {
        setErr(e.message || String(e));
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { translateMany, loading, error };
}
