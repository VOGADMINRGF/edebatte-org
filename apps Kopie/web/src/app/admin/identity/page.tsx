"use client";

import { useEffect, useMemo, useState } from "react";

type StageDatum = { stage: string; value: number };
type DropOffDatum = { label: string; value: number };

type FunnelResponse = {
  ok: boolean;
  totals: {
    totalAccounts: number;
    emailVerified: number;
    onboardingComplete: number;
    twoFactorEnabled: number;
    pendingEmail: number;
    pendingOnboarding: number;
    pending2FA: number;
  };
  stages: StageDatum[];
  dropOff: DropOffDatum[];
  error?: string;
};

const numberFormatter = new Intl.NumberFormat("de-DE");

export default function IdentityFunnelDashboard() {
  const [data, setData] = useState<FunnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/identity/funnel", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as FunnelResponse | null;
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? res.statusText);
      }
      setData(body);
    } catch (err: any) {
      setError(err?.message ?? "Dashboard konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    const { totals } = data;
    return [
      { label: "Registrierungen gesamt", value: totals.totalAccounts },
      { label: "E-Mail bestätigt", value: totals.emailVerified },
      { label: "Profil gepflegt", value: totals.onboardingComplete },
      { label: "2FA aktiv", value: totals.twoFactorEnabled },
      { label: "E-Mail offen", value: totals.pendingEmail },
      { label: "Onboarding offen", value: totals.pendingOnboarding },
      { label: "2FA offen", value: totals.pending2FA },
    ];
  }, [data]);

  const maxStageValue = data?.stages.reduce((max, stage) => Math.max(max, stage.value), 0) ?? 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin · Identity
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Identity Funnel Übersicht</h1>
        <p className="text-sm text-slate-600">
          Aggregierte Kennzahlen zu Registrierung, Verifikation und Onboarding. Alle Werte
          sind anonymisiert und enthalten keine PII.
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

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {numberFormatter.format(card.value)}
            </p>
          </article>
        ))}
        {!cards.length && !loading && (
          <p className="text-sm text-slate-500">Keine Daten verfügbar.</p>
        )}
      </section>

      {data && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Funnel-Stufen</h2>
          <p className="text-sm text-slate-500">
            Linearer Vergleich – Werte sind kumulativ, daher sinkt jeder Schritt.
          </p>
          <div className="mt-4 space-y-4">
            {data.stages.map((stage) => {
              const pct =
                maxStageValue > 0 ? Math.round((stage.value / maxStageValue) * 100) : 0;
              return (
                <div key={stage.stage}>
                  <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-slate-600">
                    <span>{stage.stage}</span>
                    <span>
                      {numberFormatter.format(stage.value)} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-slate-900 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Drop-Off Analyse</h2>
          <table className="mt-4 min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Stufe</th>
                <th className="px-3 py-2">Personen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.dropOff.map((entry) => (
                <tr key={entry.label}>
                  <td className="px-3 py-2 font-medium text-slate-900">{entry.label}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {numberFormatter.format(entry.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
