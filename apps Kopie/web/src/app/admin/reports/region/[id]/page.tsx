"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type RegionReportResponse =
  | { ok: true; summary: ReportSummary; meta: { regionId: string } }
  | { ok: false; error: string };

type ReportSummary = {
  statements: number;
  eventualities: number;
  consequences: number;
  responsibilities: number;
  byLevel: Array<{ level: string; responsibilityCount: number }>;
};

export default function RegionReportPage() {
  const params = useParams<{ id: string }>();
  const regionId = params?.id ?? "";
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/reports/region/${encodeURIComponent(regionId)}`, { cache: "no-store" });
        const json = (await res.json()) as RegionReportResponse;
        if (!res.ok || !json.ok) {
          throw new Error((json as any)?.error || res.statusText);
        }
        if (!ignore) setSummary(json.summary);
      } catch (err: any) {
        if (!ignore) {
          setSummary(null);
          setError(err?.message ?? "Region-Report konnte nicht geladen werden.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (regionId) {
      load();
    }
    return () => {
      ignore = true;
    };
  }, [regionId]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Region Report</p>
        <h1 className="text-2xl font-bold text-slate-900">Region Impact · {regionId}</h1>
        <p className="text-sm text-slate-600">
          Kennzahlen für Statements in Region {regionId}. Zeigt Impact-Dichte und Zuständigkeits-Ebenen.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
          Lädt Region-Report …
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
            <KpiCard label="Statements" value={summary.statements} />
            <KpiCard label="Eventualitäten" value={summary.eventualities} />
            <KpiCard label="Consequences" value={summary.consequences} />
            <KpiCard label="Responsibility Steps" value={summary.responsibilities} />
          </section>

          {summary.byLevel?.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Ebene / Verantwortungen</h2>
                <span className="text-xs text-slate-500">Graph-Aggregate</span>
              </div>
              <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Ebene</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Responsibility Steps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.byLevel.map((entry) => (
                    <tr key={entry.level}>
                      <td className="px-4 py-2 font-semibold text-slate-800">{entry.level}</td>
                      <td className="px-4 py-2 text-slate-700">{entry.responsibilityCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
