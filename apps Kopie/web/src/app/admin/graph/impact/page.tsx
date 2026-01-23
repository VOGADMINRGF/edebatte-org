"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ImpactSummaryResponse =
  | {
      ok: true;
      summary: ImpactSummary;
    }
  | { ok: false; error: string };

type ImpactSummary = {
  totalStatements: number;
  totalEventualities: number;
  totalConsequences: number;
  totalResponsibilities: number;
  totalResponsibilityPaths: number;
  byLevel?: Array<{
    level: string;
    responsibilityCount: number;
    pathCount: number;
  }>;
};

export default function GraphImpactPage() {
  const [summary, setSummary] = useState<ImpactSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/graph/impact/summary", { cache: "no-store" });
        const data = (await res.json()) as ImpactSummaryResponse;
        if (!res.ok || !data.ok) {
          throw new Error((data as any)?.error || res.statusText);
        }
        if (!ignore) setSummary(data.summary);
      } catch (err: any) {
        if (!ignore) {
          setSummary(null);
          setError(err?.message ?? "Impact-Statistiken konnten nicht geladen werden.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Graph Impact</p>
        <h1 className="text-2xl font-bold text-slate-900">Impact-Zusammenfassung</h1>
        <p className="text-sm text-slate-600">
          Aggregierte Kennzahlen direkt aus dem Graph. Dient als früher Indikator, dass Eventualitäten,
          Konsequenzen und Zuständigkeiten korrekt synchronisiert werden.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
          Lädt Graph-Daten …
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard label="Statements" value={summary.totalStatements} />
            <KpiCard label="Eventualitäten" value={summary.totalEventualities} />
            <KpiCard label="Consequences" value={summary.totalConsequences} />
            <KpiCard label="Responsibilities" value={summary.totalResponsibilities} />
            <KpiCard label="Responsibility Paths" value={summary.totalResponsibilityPaths} />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Weiterführende Reports</h2>
              <p className="text-xs text-slate-500">Demo-Links – Picker folgt.</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/admin/reports/topic/demo-topic"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                Topic-Impact-Report öffnen →
              </Link>
              <Link
                href="/admin/reports/region/demo-region"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                Region-Impact-Report öffnen →
              </Link>
            </div>
          </section>

          {summary.byLevel && summary.byLevel.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Verteilung nach Ebene</h2>
                <span className="text-xs text-slate-500">Responsibility & Path Steps</span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Ebene</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Responsibilities</th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">Path-Steps</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.byLevel.map((entry) => (
                      <tr key={entry.level}>
                        <td className="px-4 py-2 text-slate-800 font-semibold">{entry.level}</td>
                        <td className="px-4 py-2 text-slate-700">{entry.responsibilityCount}</td>
                        <td className="px-4 py-2 text-slate-700">{entry.pathCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
