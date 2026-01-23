"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type GraphHealth = {
  nodes: number;
  edges: number;
  orphans: number;
  duplicatesSuggested: number;
  brokenPaths: number;
  unlinkedEvidence: number;
  lastSyncAt?: string | null;
};

type Meta = {
  generatedAt: string;
  windowDays: number;
  source: string;
};

export default function AdminGraphHealthPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<GraphHealth | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nf = new Intl.NumberFormat("de-DE");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/graph/health", { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/admin/graph/health");
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body?.ok) throw new Error(body?.error || res.statusText);
        if (active) {
          setSummary(body.summary ?? null);
          setMeta(body._meta ?? null);
        }
      } catch (err: any) {
        if (active) setError(err?.message ?? "graph_health_failed");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Graph</p>
        <h1 className="text-2xl font-bold text-slate-900">Graph Health</h1>
        <p className="text-sm text-slate-600">Uebersicht ueber Knoten, Pfade und Reparatur-Backlog.</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2">
        {renderCard("Nodes", summary?.nodes, loading, nf)}
        {renderCard("Edges", summary?.edges, loading, nf)}
        {renderCard("Orphans", summary?.orphans, loading, nf)}
        {renderCard("Duplicates", summary?.duplicatesSuggested, loading, nf)}
        {renderCard("Broken Paths", summary?.brokenPaths, loading, nf)}
        {renderCard("Unlinked Evidence", summary?.unlinkedEvidence, loading, nf)}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Meta</h2>
        <div className="mt-2 text-sm text-slate-600">
          <p>Generated: {meta?.generatedAt ?? "—"}</p>
          <p>Window: {meta?.windowDays ?? "—"} Tage</p>
          <p>Source: {meta?.source ?? "—"}</p>
          <p>Last sync: {summary?.lastSyncAt ?? "—"}</p>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/graph/repairs"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
        >
          Repairs oeffnen
        </Link>
      </div>
    </div>
  );
}

function renderCard(label: string, value: number | undefined, loading: boolean, nf: Intl.NumberFormat) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-900">{nf.format(value ?? 0)}</p>
      )}
    </div>
  );
}
