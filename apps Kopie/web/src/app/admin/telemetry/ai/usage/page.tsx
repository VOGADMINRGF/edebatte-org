"use client";

import { useEffect, useState } from "react";
import type { AiUsageBreakdownSnapshot } from "@core/telemetry/aiUsageSnapshot";

type ApiResponse = { ok: boolean; snapshot?: AiUsageBreakdownSnapshot; error?: string };

type RangeOption = { value: string; label: string };

const RANGE_OPTIONS: RangeOption[] = [
  { value: "7", label: "Letzte 7 Tage" },
  { value: "30", label: "Letzte 30 Tage" },
  { value: "90", label: "Letzte 90 Tage" },
];

function formatNumber(value: number) {
  return value.toLocaleString("de-DE");
}

function formatCurrency(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export default function AiUsageTelemetryPage() {
  const [range, setRange] = useState<RangeOption>(RANGE_OPTIONS[1]);
  const [snapshot, setSnapshot] = useState<AiUsageBreakdownSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = snapshot !== null && (snapshot.totals.calls > 0 || snapshot.totals.tokens > 0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/telemetry/ai/usage?range=${range.value}`);
        const body = (await res.json().catch(() => null)) as ApiResponse | null;
        if (!res.ok || !body?.ok || !body.snapshot) {
          throw new Error(body?.error || res.statusText);
        }
        setSnapshot(body.snapshot);
      } catch (err: any) {
        setError(err?.message ?? "Usage-Daten konnten nicht geladen werden");
        setSnapshot(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [range]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Telemetry · AI</p>
        <h1 className="text-2xl font-bold text-slate-900">AI Usage</h1>
        <p className="text-sm text-slate-600">
          Kosten-, Token- und Call-Übersicht pro Provider und Pipeline. Daten basieren auf den täglichen Aggregaten im Core.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor="range">
          Zeitraum
        </label>
        <select
          id="range"
          value={range.value}
          onChange={(event) => {
            const next = RANGE_OPTIONS.find((opt) => opt.value === event.target.value) ?? RANGE_OPTIONS[1];
            setRange(next);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && <span className="text-sm text-slate-600">Lädt …</span>}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </section>

      {!loading && !error && snapshot === null && (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Noch kein Snapshot geladen</p>
          <p>Wähle einen Zeitraum, um die AI-Nutzungsdaten abzurufen.</p>
        </section>
      )}

      {snapshot && hasData && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <UsageTile label="Tokens" value={formatNumber(snapshot.totals.tokens)} />
          <UsageTile label="Kosten" value={formatCurrency(snapshot.totals.costEur)} />
          <UsageTile label="Calls" value={formatNumber(snapshot.totals.calls)} />
          <UsageTile label="Fehler" value={formatNumber(snapshot.totals.errors)} />
        </section>
      )}

      {snapshot && hasData && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UsageTable title="Nach Provider" rows={snapshot.byProvider} />
          <UsageTable title="Nach Pipeline" rows={snapshot.byPipeline} />
        </section>
      )}

      {snapshot && !hasData && (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Keine Events im Zeitraum</p>
          <p>Es wurden keine AI-Usage-Events für den gewählten Zeitraum gefunden.</p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Hinweise</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Basis sind Tages-Aggregate (`ai_usage_daily`). Einzelne Ausreißer in den Raw-Events können daher geglättet sein.</li>
          <li>Fehler zählen alle Events mit `success = false` im gewählten Zeitraum.</li>
          <li>Region-Filter kann über den API-Aufruf gesetzt werden (`region` Query-Param), UI folgt später.</li>
        </ul>
      </section>
    </main>
  );
}

function UsageTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

type UsageTableProps = {
  title: string;
  rows: AiUsageBreakdownSnapshot["byProvider"];
};

function UsageTable({ title, rows }: UsageTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Tokens</th>
              <th className="px-4 py-2">Kosten</th>
              <th className="px-4 py-2">Calls</th>
              <th className="px-4 py-2">Fehlerquote</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-600" colSpan={5}>
                  Keine Zeilen für den gewählten Zeitraum.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const errorRate = row.calls ? (row.errors / row.calls) * 100 : 0;
              return (
                <tr key={row.key}>
                  <td className="px-4 py-2 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-4 py-2">{formatNumber(row.tokens)}</td>
                  <td className="px-4 py-2">{formatCurrency(row.costEur)}</td>
                  <td className="px-4 py-2">{formatNumber(row.calls)}</td>
                  <td className="px-4 py-2">{errorRate.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
