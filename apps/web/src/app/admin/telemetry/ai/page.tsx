"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AiUsageBreakdownSnapshot } from "@core/telemetry/aiUsageSnapshot";
import type { AiErrorKind } from "@core/telemetry/aiUsageTypes";

type UsageResponse = { ok: boolean; snapshot?: AiUsageBreakdownSnapshot; error?: string };

type SmokeResult = {
  providerId: string;
  ok: boolean;
  durationMs: number;
  errorMessage?: string;
  state?: "disabled" | "skipped";
};

type SmokeResponse = {
  ok: boolean;
  bestProviderId?: string | null;
  results: SmokeResult[];
  error?: string;
};

type EventSummary = {
  ok: boolean;
  summary: {
    totals: {
      calls: number;
      successRate: number;
      avgDurationMs: number;
      fallbackRate: number;
    };
  };
  events: { provider: string; ts: number; success: boolean; errorKind?: AiErrorKind | null }[];
  error?: string;
};

const nf = new Intl.NumberFormat("de-DE");
const cf = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const RANGE_OPTIONS = [
  { value: "7", label: "Letzte 7 Tage" },
  { value: "30", label: "Letzte 30 Tage" },
  { value: "90", label: "Letzte 90 Tage" },
];

export default function AdminAiHubPage() {
  const [range, setRange] = useState<string>("30");
  const [usage, setUsage] = useState<AiUsageBreakdownSnapshot | null>(null);
  const [events, setEvents] = useState<EventSummary | null>(null);
  const [smoke, setSmoke] = useState<SmokeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [smoking, setSmoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSmokeAt, setLastSmokeAt] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [usageRes, eventsRes] = await Promise.all([
          fetch(`/api/admin/telemetry/ai/usage?range=${range}`, { cache: "no-store" }),
          fetch("/api/admin/telemetry/ai/events", { cache: "no-store" }),
        ]);
        const usageBody = (await usageRes.json().catch(() => null)) as UsageResponse | null;
        const eventsBody = (await eventsRes.json().catch(() => null)) as EventSummary | null;

        if (!usageRes.ok || !usageBody?.ok || !usageBody.snapshot) {
          throw new Error(usageBody?.error ?? usageRes.statusText);
        }
        if (!eventsRes.ok || !eventsBody?.ok) {
          throw new Error(eventsBody?.error ?? eventsRes.statusText);
        }
        setUsage(usageBody.snapshot);
        setEvents(eventsBody);
      } catch (err: any) {
        setError(err?.message ?? "AI-Daten nicht erreichbar.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const hasUsage =
    usage && (usage.totals.calls > 0 || usage.totals.tokens > 0 || usage.totals.costEur > 0);

  const lastEvents = useMemo(() => events?.events?.slice(0, 5) ?? [], [events]);

  async function runSmoke() {
    setSmoking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/orchestrator-smoke", { method: "POST" });
      const body = (await res.json().catch(() => null)) as SmokeResponse | null;
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? res.statusText);
      setSmoke(body);
      setLastSmokeAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message ?? "Smoke-Test fehlgeschlagen");
    } finally {
      setSmoking(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Admin · Telemetry · AI
          </p>
          <h1 className="text-2xl font-bold text-slate-900">AI Übersicht</h1>
          <p className="text-sm text-slate-600">
            Smoke-Tests, Kosten & Tokens, Provider-Health – alles auf einen Blick. Daten basieren auf
            deinen bestehenden Telemetry-APIs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/telemetry/ai/usage"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Detail: Usage
          </Link>
          <Link
            href="/admin/telemetry/ai/dashboard"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Live Events
          </Link>
          <Link
            href="/admin/telemetry/ai/orchestrator"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Orchestrator Health
          </Link>
          <Link
            href="/admin/telemetry/ai/flow"
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Flow Health
          </Link>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
        <label className="font-semibold" htmlFor="range">
          Zeitraum
        </label>
        <select
          id="range"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {loading && <span className="text-slate-500">Lädt …</span>}
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Calls (30d)"
          value={hasUsage ? nf.format(usage?.totals.calls ?? 0) : "—"}
          loading={loading}
        />
        <StatCard
          title="Tokens (30d)"
          value={hasUsage ? nf.format(usage?.totals.tokens ?? 0) : "—"}
          loading={loading}
        />
        <StatCard
          title="Kosten (30d)"
          value={hasUsage ? cf.format(usage?.totals.costEur ?? 0) : "—"}
          loading={loading}
        />
        <StatCard
          title="Fehlerquote"
          value={
            hasUsage && usage?.totals.calls
              ? `${((usage.totals.errors / usage.totals.calls) * 100).toFixed(1)}%`
              : "—"
          }
          loading={loading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Provider / Pipelines
              </p>
              <h2 className="text-lg font-semibold text-slate-900">Top-Linien (30d)</h2>
            </div>
            <Link
              href="/admin/telemetry/ai/usage"
              className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
            >
              zur Usage-Ansicht
            </Link>
          </div>
          {loading && <p className="text-sm text-slate-600">Lädt …</p>}
          {!loading && hasUsage && (
            <div className="grid gap-3 md:grid-cols-2">
              <UsageList title="Provider" rows={usage?.byProvider ?? []} />
              <UsageList title="Pipelines" rows={usage?.byPipeline ?? []} />
            </div>
          )}
          {!loading && !hasUsage && (
            <p className="text-sm text-slate-600">Keine Usage-Daten im Zeitraum.</p>
          )}
        </div>

        <div className="space-y-3 rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Smoke Test
              </p>
              <h2 className="text-lg font-semibold text-slate-900">Provider Check</h2>
              {lastSmokeAt && (
                <p className="text-xs text-slate-500">Zuletzt: {new Date(lastSmokeAt).toLocaleString("de-DE")}</p>
              )}
            </div>
            <button
              type="button"
              onClick={runSmoke}
              disabled={smoking}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {smoking ? "läuft …" : "Jetzt testen"}
            </button>
          </div>
          {!smoke && <p className="text-sm text-slate-600">Starte einen Smoke-Test.</p>}
          {smoke && (
            <div className="space-y-2">
              <p className="text-sm">
                Best Provider:{" "}
                <span className="font-semibold text-slate-900">{smoke.bestProviderId ?? "—"}</span>
              </p>
              <div className="space-y-1">
                {smoke.results.slice(0, 4).map((r) => (
                  <div key={r.providerId} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{r.providerId}</span>
                      <span className="text-[11px] text-slate-500">{r.durationMs} ms</span>
                    </div>
                    <span className={r.ok ? "text-emerald-600" : "text-rose-600"}>
                      {r.state === "disabled"
                        ? "deaktiviert"
                        : r.state === "skipped"
                        ? "übersprungen"
                        : r.ok
                        ? "OK"
                        : "Fehler"}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/admin/telemetry/ai/orchestrator"
                className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
              >
                Details öffnen
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Letzte Events
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Quick-Glance</h2>
          </div>
          <Link
            href="/admin/telemetry/ai/dashboard"
            className="text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
          >
            Live-Log
          </Link>
        </div>
        {loading && <p className="text-sm text-slate-600">Lädt …</p>}
        {!loading && lastEvents.length === 0 && (
          <p className="text-sm text-slate-600">Keine Events gefunden.</p>
        )}
        {!loading && lastEvents.length > 0 && (
          <div className="mt-3 space-y-2">
            {lastEvents.map((ev) => (
              <div
                key={`${ev.provider}-${ev.ts}`}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">{ev.provider}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(ev.ts).toLocaleString("de-DE")}
                  </span>
                </div>
                <span className={ev.success ? "text-emerald-600" : "text-rose-600"}>
                  {ev.success ? "OK" : `Fehler ${ev.errorKind ?? ""}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ title, value, loading }: { title: string; value: string; loading: boolean }) {
  return (
    <div className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      {loading ? (
        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      )}
    </div>
  );
}

function UsageList({
  title,
  rows,
}: {
  title: string;
  rows: NonNullable<AiUsageBreakdownSnapshot["byProvider"]>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-2 space-y-1">
        {rows.slice(0, 5).map((row) => {
          const errorRate = row.calls ? (row.errors / row.calls) * 100 : 0;
          return (
            <div
              key={row.key}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900">{row.label}</span>
                <span className="text-[11px] text-slate-500">
                  {nf.format(row.calls)} Calls · {errorRate.toFixed(1)}% Fehler
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-800">{cf.format(row.costEur)}</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-sm text-slate-600">Keine Daten.</p>}
      </div>
    </div>
  );
}
