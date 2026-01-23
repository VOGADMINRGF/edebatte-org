"use client";
import { useEffect, useRef, useState } from "react";

type Params = { topic?: string; region?: string; keywords?: string[]; limit?: number };

export function useCivicSearch(p: Params, enabled = true) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const timer = useRef<any>(null);
  const ctrl = useRef<AbortController | null>(null);
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;
    const key = JSON.stringify(p || {});
    if (key === lastKey.current) return; // dedupe
    lastKey.current = key;

    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      setErr(undefined);
      try {
        const res = await fetch("/api/search/civic", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(p || {}),
          signal: ctrl.current.signal,
        });
        const j = await res.json();
        setData(Array.isArray(j.items) ? j.items : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }, 800); // debounce

    return () => {
      clearTimeout(timer.current);
      ctrl.current?.abort();
    };
  }, [p?.topic, p?.region, JSON.stringify(p?.keywords || []), p?.limit, enabled]);

  return { data, loading, err };
}
