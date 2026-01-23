 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WaitingItem = {
  coreUserId: string;
  householdSize: number;
  amountPerPeriod: number;
  membershipAmountPerMonth?: number;
  rhythm: string;
  paymentReference?: string;
  firstDueAt?: string;
  dunningLevel?: number;
  createdAt?: string;
  _id?: string;
};

type Overview = {
  activeCount: number;
  waitingPaymentCount: number;
  cancelledLast30: number;
  totalMonthlyVolumeActive: number;
  waiting: WaitingItem[];
};

export default function AdminMembershipsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch("/api/admin/memberships/overview", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.overview) {
      setError(body?.error || "Konnte Übersicht nicht laden");
      return;
    }
    setOverview(body.overview as Overview);
  }

  useEffect(() => {
    load();
  }, []);

  async function markPaid(id?: string) {
    if (!id) return;
    await fetch(`/api/admin/memberships/${id}/mark-paid`, { method: "POST" });
    load();
  }

  async function cancel(id?: string) {
    if (!id) return;
    await fetch(`/api/admin/memberships/${id}/cancel`, { method: "POST" });
    load();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
          <h1 className="text-2xl font-bold text-slate-900">Mitgliedschaften</h1>
        </div>
        <Link href="/dashboard/admin" className="text-sm text-sky-600 underline">
          Zurück
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {overview ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Aktive Mitgliedschaften" value={overview.activeCount} />
            <Stat label="Offene Zahlungen" value={overview.waitingPaymentCount} />
            <Stat label="Stornos (30 Tage)" value={overview.cancelledLast30} />
            <Stat
              label="Monatsvolumen (aktiv)"
              value={`${overview.totalMonthlyVolumeActive.toFixed(2)} €`}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Offene Zahlungen</h2>
              <button
                type="button"
                onClick={load}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:border-sky-400"
              >
                Aktualisieren
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm text-slate-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Betrag</th>
                    <th className="px-2 py-2">Rhythmus</th>
                    <th className="px-2 py-2">Haushalt</th>
                    <th className="px-2 py-2">Due</th>
                    <th className="px-2 py-2">Dunning</th>
                    <th className="px-2 py-2">Ref</th>
                    <th className="px-2 py-2">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.waiting.length === 0 && (
                    <tr>
                      <td className="px-2 py-3 text-slate-500" colSpan={7}>
                        Keine offenen Zahlungen.
                      </td>
                    </tr>
                  )}
                  {overview.waiting.map((item) => (
                    <tr key={item.paymentReference} className="border-t border-slate-100">
                      <td className="px-2 py-2">
                        {(item.membershipAmountPerMonth ?? item.amountPerPeriod).toFixed(2)} €
                      </td>
                      <td className="px-2 py-2">{item.rhythm}</td>
                      <td className="px-2 py-2">{item.householdSize}</td>
                      <td className="px-2 py-2">
                        {item.firstDueAt ? new Date(item.firstDueAt).toLocaleDateString("de-DE") : "n/a"}
                      </td>
                      <td className="px-2 py-2">{item.dunningLevel ?? 0}</td>
                      <td className="px-2 py-2">{item.paymentReference}</td>
                      <td className="px-2 py-2 space-x-2">
                        <button
                          type="button"
                          onClick={() => markPaid((item as any)._id)}
                          className="rounded-full bg-emerald-500 px-3 py-1 text-white"
                        >
                          Verbuchen
                        </button>
                        <button
                          type="button"
                          onClick={() => cancel((item as any)._id)}
                          className="rounded-full border border-red-300 px-3 py-1 text-red-700"
                        >
                          Kündigen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Lade Daten …</p>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
