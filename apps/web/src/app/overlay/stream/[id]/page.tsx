"use client";

import { useEffect, useState } from "react";

type OverlayResponse = {
  ok: boolean;
  session?: { title: string; description?: string | null };
  items?: Array<{
    id: string;
    kind: string;
    title: string;
    body?: string | null;
    pollOptions?: string[];
    pollTotals?: Record<string, number>;
    allowAnonymousVoting: boolean;
    publicAttribution: string;
  }>;
};

export default function StreamOverlayPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<OverlayResponse | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      const res = await fetch(`/api/streams/sessions/${params.id}/overlay-feed`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as OverlayResponse | null;
      if (!ignore) setData(body);
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [params.id]);

  const item = data?.items?.[0];

  return (
    <div className="flex h-screen flex-col justify-between bg-transparent text-white">
      <header className="p-6 text-left text-3xl font-bold drop-shadow-lg">
        {data?.session?.title ?? "Live Session"}
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-10 text-center">
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
      </main>
      <footer className="p-6 text-right text-sm uppercase tracking-wide text-white/70">
        {item?.publicAttribution === "public" ? "Öffentliche Abstimmung" : "Anonyme Abstimmung"}
      </footer>
    </div>
  );
}
