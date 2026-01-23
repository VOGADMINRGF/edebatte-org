"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";

type ProviderStats = {
  provider: string;
  calls: number;
  successRate: number;
  avgDurationMs: number;
  fallbackRate: number;
};

type TelemetrySummary = {
  totals: ProviderStats;
  perProvider: ProviderStats[];
};

type TelemetryEvent = {
  ts: number;
  task: string;
  pipeline: string;
  provider: string;
  model?: string;
  success: boolean;
  retries: number;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  fallbackUsed?: boolean;
  errorKind?: AiErrorKind | null;
};

type ApiResponse = {
  ok: boolean;
  summary: TelemetrySummary;
  events: TelemetryEvent[];
  error?: string;
};

const numberFormatter = new Intl.NumberFormat("de-DE");
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export default function AiTelemetryDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [pipelineFilter, setPipelineFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "error">("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/telemetry/ai/events", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? res.statusText);
      }
      setData(body);
    } catch (err: any) {
      setError(err?.message ?? "Telemetry nicht erreichbar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const providerStats = useMemo(() => data?.summary.perProvider ?? [], [data]);
  const providers = useMemo(
    () => Array.from(new Set((data?.events ?? []).map((e) => e.provider))).sort(),
    [data],
  );
  const pipelines = useMemo(
    () => Array.from(new Set((data?.events ?? []).map((e) => e.pipeline))).sort(),
    [data],
  );

  const filteredEvents = useMemo(() => {
    const rows = data?.events ?? [];
    return rows
      .filter((ev) => (providerFilter ? ev.provider === providerFilter : true))
      .filter((ev) => (pipelineFilter ? ev.pipeline === pipelineFilter : true))
      .filter((ev) => {
        if (statusFilter === "ok") return ev.success;
        if (statusFilter === "error") return !ev.success;
        return true;
      })
      .slice(-50)
      .reverse();
  }, [data, providerFilter, pipelineFilter, statusFilter]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin · Telemetry · AI
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Orchestrator-Telemetrie</h1>
        <p className="text-sm text-slate-600">
          Live-Sicht auf die letzten Provider-Aufrufe. Enthält nur technische Metriken –
          keine Rohtexte oder PII.
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Aktualisiere …" : "Aktualisieren"}
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      </header>

      {data && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Calls (24h)", value: data.summary.totals.calls },
            { label: "Success-Rate", value: `${data.summary.totals.successRate}%` },
            { label: "Ø Dauer (ms)", value: data.summary.totals.avgDurationMs },
            { label: "Fallback-Rate", value: `${data.summary.totals.fallbackRate}%` },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {typeof card.value === "number"
                  ? numberFormatter.format(card.value)
                  : card.value}
              </p>
            </article>
          ))}
        </section>
      )}

      {providerStats.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Provider-Übersicht</h2>
          <table className="mt-4 min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Calls</th>
                <th className="px-3 py-2">Success</th>
                <th className="px-3 py-2">Ø Dauer (ms)</th>
                <th className="px-3 py-2">Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {providerStats.map((provider) => (
                <tr key={provider.provider}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{provider.provider}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {numberFormatter.format(provider.calls)}
                  </td>
                  <td className="px-3 py-2">{provider.successRate}%</td>
                  <td className="px-3 py-2">{numberFormatter.format(provider.avgDurationMs)}</td>
                  <td className="px-3 py-2">{provider.fallbackRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data?.events && data.events.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Letzte Aufrufe</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <option value="">Provider: alle</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={pipelineFilter}
              onChange={(e) => setPipelineFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <option value="">Pipeline: alle</option>
              {pipelines.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            >
              <option value="all">Status: alle</option>
              <option value="ok">nur OK</option>
              <option value="error">nur Fehler</option>
            </select>
            <span className="text-xs text-slate-500">
              {filteredEvents.length} von {data.events.length} (max 50)
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Zeit</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Pipeline</th>
                  <th className="px-3 py-2">Modell</th>
                  <th className="px-3 py-2">Dauer</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <tr key={`${event.provider}-${event.ts}-${event.pipeline}`}>
                    <td className="px-3 py-2 text-slate-500">
                      {dateFormatter.format(new Date(event.ts))}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">{event.provider}</td>
                    <td className="px-3 py-2 text-slate-600">{event.pipeline}</td>
                    <td className="px-3 py-2 text-slate-600">{event.model ?? "—"}</td>
                    <td className="px-3 py-2">
                      {event.durationMs != null ? `${event.durationMs} ms` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {event.success ? (
                        <span className="text-emerald-600">✅ Erfolg</span>
                      ) : (
                        <span className="text-rose-600">
                          ❌ Fehler {event.errorKind ? `(${event.errorKind})` : ""}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
