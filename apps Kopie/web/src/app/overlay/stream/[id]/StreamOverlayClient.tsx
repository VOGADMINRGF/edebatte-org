"use client";

import { useEffect, useState } from "react";
import type { StreamAgendaKind, StreamAttributionMode, StreamSessionStatus } from "@features/stream/types";

type OverlayItem = {
  id: string;
  kind: StreamAgendaKind;
  title: string;
  body?: string | null;
  pollOptions?: string[];
  pollTotals?: Record<string, number>;
  allowAnonymousVoting: boolean;
  publicAttribution: StreamAttributionMode;
};

type OverlayResponse = {
  ok: boolean;
  session?: { title: string; description?: string | null; status?: StreamSessionStatus };
  items?: OverlayItem[];
  error?: string;
};

export function StreamOverlayClient({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<OverlayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/streams/sessions/${sessionId}/overlay-feed`, { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as OverlayResponse | null;
        if (!ignore) {
          setData(body);
          setError(body?.ok === false ? body?.error ?? "unexpected_error" : null);
        }
      } catch (err) {
        if (!ignore) setError((err as Error)?.message ?? "overlay_fetch_failed");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  const item = data?.items?.[0];

  return (
    <div className="flex h-screen flex-col justify-between bg-transparent text-white">
      <header className="p-6 text-left text-3xl font-bold drop-shadow-lg">
        {data?.session?.title ?? "Live Session"}
        {data?.session?.status && (
          <span className="ml-3 align-middle text-sm font-semibold uppercase tracking-wide text-white/80">
            {data.session.status}
          </span>
        )}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-10 text-center">
        {loading && <p className="text-xl text-white/80">Stream wird geladen…</p>}
        {!loading && error && <p className="text-xl text-red-100">{error}</p>}
        {!loading && !error && !item && (
          <p className="text-xl text-white/80">Keine aktiven Agenda-Elemente – bitte warten…</p>
        )}
        {!loading && !error && item && (
          <>
            <p className="text-4xl font-semibold drop-shadow-lg">{item?.title ?? "Bereit für das nächste Thema"}</p>
            {item?.kind === "poll" && (
              <div className="mt-8 w-full max-w-3xl space-y-4">
                {(item.pollOptions ?? []).map((opt) => {
                  const count = item.pollTotals?.[opt] ?? 0;
                  const total = Object.values(item.pollTotals ?? {}).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={opt} className="space-y-1">
                      <div className="flex items-center justify-between text-sm uppercase tracking-wide">
                        <span>{opt}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-white/20">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <footer className="p-6 text-right text-sm uppercase tracking-wide text-white/70">
        {item?.publicAttribution === "public" ? "Öffentliche Abstimmung" : "Anonyme Abstimmung"}
      </footer>
    </div>
  );
}
