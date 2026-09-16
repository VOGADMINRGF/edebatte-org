"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ProviderName = "openai" | "anthropic" | "mistral" | "gemini";
type ProfileName =
  | "planner"
  | "smoke"
  | "providerProbe"
  | "runtimeProbe"
  | "fullContract"
  | "fullContractLite"
  | "fullContractRepair"
  | "contributionTrace"
  | "qualityClarify";

type LifecycleRow = {
  provider: ProviderName;
  configuredModel: string | null;
  effectiveModel: string;
  providerRecommendedReplacement: string | null;
  migrated: boolean;
  modelAvailable: boolean | null;
  providerReachable: boolean;
  status: "ok" | "retired_migrated" | "model_not_found" | "config_missing" | "provider_error";
  httpStatus: number | null;
  durationMs: number;
  reason: string | null;
};

type RoutingCheck = {
  provider: ProviderName;
  model: string;
  profiles: ProfileName[];
  result: LifecycleRow;
};

type LifecycleResponse = {
  ok: boolean;
  checkedAt: string;
  routing: {
    mode: "legacy" | "profiled";
    profiles: Record<ProfileName, { timeoutMs: number; maxOutputTokens?: number; modelTier: "economy" | "balanced" | "quality" }>;
    providers: Record<ProviderName, Record<ProfileName, string>>;
    checks: RoutingCheck[];
  };
  providers: LifecycleRow[];
  drift: Array<LifecycleRow & { profiles?: ProfileName[]; routedModel?: string }>;
  error?: string;
};

const PROVIDERS: ProviderName[] = ["openai", "anthropic", "mistral", "gemini"];
const PROFILE_ROWS: Array<{ profile: ProfileName; label: string }> = [
  { profile: "providerProbe", label: "Provider probe" },
  { profile: "runtimeProbe", label: "Runtime probe" },
  { profile: "smoke", label: "Smoke" },
  { profile: "qualityClarify", label: "Quality clarify" },
  { profile: "planner", label: "Planner" },
  { profile: "contributionTrace", label: "Contribution trace" },
  { profile: "fullContractLite", label: "Full contract lite" },
  { profile: "fullContract", label: "Full contract" },
  { profile: "fullContractRepair", label: "Full contract repair" },
];

function statusClasses(status: LifecycleRow["status"]): string {
  if (status === "ok") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "retired_migrated") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "config_missing") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function lifecycleLabel(row: LifecycleRow): string {
  if (row.status === "retired_migrated") return "Retired → migriert";
  if (row.status === "model_not_found") return "Modell fehlt";
  if (row.status === "config_missing") return "Nicht konfiguriert";
  if (row.status === "provider_error") return "Providerfehler";
  return "Aktiv";
}

function isBlocking(row: LifecycleRow): boolean {
  return row.status === "model_not_found" || row.status === "provider_error";
}

export default function AiModelLifecyclePage() {
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/ai/model-lifecycle", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as LifecycleResponse | null;
      if (!body) throw new Error(response.statusText || "Model-Lifecycle nicht erreichbar");
      setData(body);
      if (!response.ok && !body.providers) {
        throw new Error(body.error ?? response.statusText);
      }
    } catch (err: any) {
      setError(err?.message ?? "Model-Lifecycle nicht erreichbar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const routingHealthByKey = useMemo(() => {
    const map = new Map<string, LifecycleRow>();
    for (const check of data?.routing.checks ?? []) {
      map.set(`${check.provider}:${check.model}`, check.result);
    }
    return map;
  }, [data]);

  const driftCount = data?.drift.length ?? 0;
  const missingCount = useMemo(() => {
    const base = data?.providers.filter(isBlocking).length ?? 0;
    const routed = data?.routing.checks.filter((check) => isBlocking(check.result)).length ?? 0;
    return base + routed;
  }, [data]);

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Admin · Telemetry · AI</p>
          <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">Model Lifecycle & Routing</h1>
          <p className="max-w-3xl text-sm text-[rgb(var(--muted))]">
            Zeigt konfigurierte und effektiv verwendete Modelle, Retirement-Migrationen und das aktive Kosten-/Qualitätsrouting. Ein erreichbarer Provider gilt nicht automatisch als gesund, wenn eines der tatsächlich gerouteten Modelle fehlt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/telemetry/ai" className="rounded-full border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold text-sky-700">
            AI Overview
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
          >
            {loading ? "Prüfe…" : "Neu prüfen"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Routing Mode" value={data?.routing.mode ?? (loading ? "…" : "unbekannt")} detail={data?.routing.mode === "profiled" ? "Economy / Balanced / Quality aktiv" : "Bestehendes Single-Model-Verhalten"} />
        <SummaryCard label="Konfigurationsdrift" value={loading ? "…" : String(driftCount)} detail="Retired-Konfiguration oder fehlendes effektives/routetes Modell" />
        <SummaryCard label="Blockierende Modellfehler" value={loading ? "…" : String(missingCount)} detail="MODEL_NOT_FOUND oder Provider-Katalog nicht prüfbar" />
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Configured → Effective</h2>
            <p className="text-sm text-[rgb(var(--muted))]">Retired IDs werden sichtbar migriert; unbekannte IDs werden nicht still umgeschrieben.</p>
          </div>
          <div className="text-xs text-[rgb(var(--muted))]">
            {data?.checkedAt ? `Geprüft ${new Date(data.checkedAt).toLocaleString("de-DE")}` : "Noch nicht geprüft"}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[rgb(var(--border))] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-[rgb(var(--muted))]">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Configured</th>
                <th className="px-3 py-2">Effective</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Provider-Empfehlung</th>
                <th className="px-3 py-2">Katalog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {(data?.providers ?? []).map((row) => (
                <tr key={row.provider}>
                  <td className="px-3 py-3 font-semibold">{row.provider}</td>
                  <td className="px-3 py-3 font-mono text-xs">{row.configuredModel ?? "Registry default"}</td>
                  <td className="px-3 py-3 font-mono text-xs">{row.effectiveModel}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses(row.status)}`}>
                      {lifecycleLabel(row)}
                    </span>
                    {row.reason ? <div className="mt-1 max-w-xs text-xs text-[rgb(var(--muted))]">{row.reason}</div> : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{row.providerRecommendedReplacement ?? "—"}</td>
                  <td className="px-3 py-3 text-xs">
                    {row.modelAvailable === true ? "Modell vorhanden" : row.modelAvailable === false ? "Modell fehlt" : row.providerReachable ? "nicht eindeutig" : "nicht geprüft"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Runtime-Profile</h2>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Im Modus <code>legacy</code> bleiben alle Profile beim explizit konfigurierten bzw. bisherigen Default-Modell. <code>profiled</code> aktiviert die abgestufte Auswahl. Jedes hier gezeigte Modell wird zusätzlich gegen den Provider-Katalog geprüft.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[rgb(var(--border))] text-xs">
            <thead className="text-left uppercase tracking-wide text-[rgb(var(--muted))]">
              <tr>
                <th className="px-3 py-2">Profil</th>
                <th className="px-3 py-2">Tier</th>
                {PROVIDERS.map((provider) => <th key={provider} className="px-3 py-2">{provider}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {PROFILE_ROWS.map(({ profile, label }) => (
                <tr key={profile}>
                  <td className="px-3 py-2 font-semibold">{label}</td>
                  <td className="px-3 py-2">{data?.routing.profiles[profile]?.modelTier ?? "—"}</td>
                  {PROVIDERS.map((provider) => {
                    const model = data?.routing.providers[provider]?.[profile] ?? null;
                    const health = model ? routingHealthByKey.get(`${provider}:${model}`) ?? null : null;
                    return (
                      <td key={`${profile}-${provider}`} className="px-3 py-2 align-top">
                        <div className="font-mono">{model ?? "—"}</div>
                        {health ? (
                          <span className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusClasses(health.status)}`}>
                            {lifecycleLabel(health)}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{label}</div>
      <div className="mt-1 text-xl font-bold text-[rgb(var(--fg))]">{value}</div>
      <div className="mt-1 text-xs text-[rgb(var(--muted))]">{detail}</div>
    </div>
  );
}
