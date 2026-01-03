"use client";

import { useState } from "react";
import Link from "next/link";

type ProviderSmokeResult = {
  providerId: string;
  ok: boolean;
  durationMs: number;
  errorMessage?: string;
  state?: "disabled" | "skipped";
};

type SmokeResponse = {
  ok: boolean;
  bestProviderId?: string | null;
  bestRawText?: string | null;
  results: ProviderSmokeResult[];
  error?: string;
};

export default function OrchestratorTelemetryPage() {
  const [data, setData] = useState<SmokeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSmoke(mode?: "full") {
    setLoading(true);
    setError(null);
    try {
      const suffix = mode === "full" ? "?mode=full" : "";
      const res = await fetch(`/api/admin/ai/orchestrator-smoke${suffix}`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as SmokeResponse | null;
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setData(body);
    } catch (err: any) {
      setError(err?.message ?? "Smoke-Test fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin · Telemetry · AI
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Orchestrator-Status</h1>
        <p className="text-sm text-slate-600">
          Teste, welche Provider aktuell erreichbar sind und wie lange sie brauchen.
          Ergebnisse werden nicht gespeichert – für langfristige Zahlen siehe{" "}
          <Link href="/dashboard/usage" className="text-sky-600 underline">
            /dashboard/usage
          </Link>
          .
        </p>
      </header>

      <div className="flex items-center gap-3">
        <button
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => runSmoke()}
          disabled={loading}
        >
          {loading ? "Test läuft …" : "Smoke-Test ausführen"}
        </button>
        <button
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          onClick={() => runSmoke("full")}
          disabled={loading}
        >
          {loading ? "…" : "Volltest"}
        </button>
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>

      {data && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="text-sm text-slate-600">
            <p>
              Best Provider:{" "}
              <span className="font-semibold text-slate-900">
                {data.bestProviderId ?? "—"}
              </span>
            </p>
            <p>
              Erfolgreich:{" "}
              <span className={data.ok ? "text-emerald-600" : "text-rose-600"}>
                {data.ok ? "Ja" : "Nein"}
              </span>
            </p>
          </div>

          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Dauer (ms)</th>
                <th className="px-3 py-2">Fehlermeldung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.results.map((result) => (
                <tr key={result.providerId}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{result.providerId}</td>
                  <td className="px-3 py-2">
                    {result.state === "disabled" ? (
                      <span className="text-slate-500">⏸ deaktiviert (lokal)</span>
                    ) : result.state === "skipped" ? (
                      <span className="text-amber-600">⤼ übersprungen</span>
                    ) : result.ok ? (
                      <span className="text-emerald-600">✅ OK</span>
                    ) : (
                      <span className="text-rose-600">❌ Fehler</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{result.durationMs}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {result.errorMessage ?? "—"}
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
