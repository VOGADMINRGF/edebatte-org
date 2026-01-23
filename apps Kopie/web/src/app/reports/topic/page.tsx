"use client";

import { useEffect, useState } from "react";

type TopicStat = {
  topic: string;
  responsibility: string;
  statements: number;
};

type SampleStatement = {
  id: string;
  text: string;
  topic?: string | null;
  responsibility?: string | null;
  updatedAt?: number;
};

export default function TopicReportPage() {
  const [topic, setTopic] = useState("");
  const [locale, setLocale] = useState("");
  const [stats, setStats] = useState<TopicStat[]>([]);
  const [statements, setStatements] = useState<SampleStatement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (topic.trim()) params.set("topic", topic.trim());
      if (locale.trim()) params.set("locale", locale.trim());
      const res = await fetch(`/api/reports/topic?${params.toString()}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body?.ok) throw new Error(body?.error ?? res.statusText);
      setStats(body.stats ?? []);
      setStatements(body.sampleStatements ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Report konnte nicht geladen werden.");
      setStats([]);
      setStatements([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Reports · Topic
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Topic & Responsibility Report</h1>
        <p className="text-sm text-slate-600">
          Aggregierte Statements aus dem Graph. Filter optional nach Topic/Locale.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            loadReport();
          }}
        >
          <label className="text-sm text-slate-600">
            Topic
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="z.B. Energie"
            />
          </label>
          <label className="text-sm text-slate-600">
            Locale
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="de, en, ..."
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Lade …" : "Report aktualisieren"}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Responsibility Überblick</h2>
        {stats.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Keine Daten für diesen Filter. Prüfe Topic/Locale oder synchronisiere neue Analysen.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Topic</th>
                  <th className="px-3 py-2">Responsibility</th>
                  <th className="px-3 py-2">Statements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((row, idx) => (
                  <tr key={`${row.topic}-${row.responsibility}-${idx}`}>
                    <td className="px-3 py-2">{row.topic}</td>
                    <td className="px-3 py-2">{row.responsibility}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.statements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Beispiel-Statements</h2>
        {statements.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Statements verfügbar.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {statements.map((stmt) => (
              <article
                key={stmt.id}
                className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                  <span>Topic: {stmt.topic ?? "–"}</span>
                  <span>Zuständigkeit: {stmt.responsibility ?? "–"}</span>
                </div>
                <p className="mt-1 text-slate-800">{stmt.text}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
