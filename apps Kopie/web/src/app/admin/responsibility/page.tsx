"use client";

import { useEffect, useMemo, useState } from "react";

type DirectoryEntry = {
  _id: string;
  actorKey: string;
  level: string;
  locale: string;
  regionCode?: string;
  displayName: string;
  description?: string;
  contactUrl?: string;
  updatedAt?: string;
};

type ResponsibilityPath = {
  _id: string;
  statementId: string;
  locale: string;
  nodes: Array<{
    level: string;
    actorKey: string;
    displayName: string;
    relevance?: number;
  }>;
  updatedAt?: string;
};

const LEVEL_LABELS: Record<string, string> = {
  municipality: "Gemeinde",
  district: "Kreis",
  state: "Land",
  federal: "Bund",
  eu: "EU",
  ngo: "NGO",
  private: "Privat",
  unknown: "Unbekannt",
};

const levelOptions = Object.entries(LEVEL_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function ResponsibilityAdminPage() {
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [paths, setPaths] = useState<ResponsibilityPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    actorKey: "",
    level: "municipality",
    locale: "de",
    displayName: "",
    description: "",
    contactUrl: "",
  });
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [dirRes, pathRes] = await Promise.all([
        fetch("/api/admin/responsibility/directory"),
        fetch("/api/admin/responsibility/paths"),
      ]);
      const dirJson = await dirRes.json();
      const pathJson = await pathRes.json();
      if (dirJson.ok) setEntries(dirJson.entries ?? []);
      if (pathJson.ok) setPaths(pathJson.paths ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const groupedEntries = useMemo(() => {
    return entries.reduce<Record<string, DirectoryEntry[]>>((acc, entry) => {
      acc[entry.level] = acc[entry.level] ? [...acc[entry.level], entry] : [entry];
      return acc;
    }, {});
  }, [entries]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Speichere …");
    try {
      const res = await fetch("/api/admin/responsibility/directory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actorKey: form.actorKey,
          level: form.level,
          locale: form.locale,
          displayName: form.displayName || form.actorKey,
          description: form.description || undefined,
          contactUrl: form.contactUrl || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body?.error ?? res.statusText);
      }
      setForm({
        actorKey: "",
        level: form.level,
        locale: form.locale,
        displayName: "",
        description: "",
        contactUrl: "",
      });
      setStatus("Gespeichert.");
      refresh();
    } catch (err: any) {
      setStatus(err?.message ?? "Fehler beim Speichern");
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Admin · Responsibility Navigator
        </p>
        <h1 className="text-3xl font-bold text-slate-900">Responsibility Directory</h1>
        <p className="text-sm text-slate-600">
          Pflege die zentrale Directory-Liste und Responsibility-Pfade für Statements.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Eintrag hinzufügen / bearbeiten</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm text-slate-600">
            Actor Key
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={form.actorKey}
              onChange={(e) => setForm((prev) => ({ ...prev, actorKey: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm text-slate-600">
            Anzeigename
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={form.displayName}
              onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="z.B. Stadtrat Köln"
            />
          </label>
          <label className="text-sm text-slate-600">
            Level
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={form.level}
              onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
            >
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Locale
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={form.locale}
              onChange={(e) => setForm((prev) => ({ ...prev, locale: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Beschreibung
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            Kontakt / URL
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
              value={form.contactUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, contactUrl: e.target.value }))}
              placeholder="https://..."
            />
          </label>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Speichern / Aktualisieren
            </button>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Neu laden
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700"
              title="Import/Export folgt"
            >
              Import / Export (coming soon)
            </button>
            {status && <span className="text-sm text-slate-500">{status}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Directory-Einträge</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Lade …</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Einträge angelegt.</p>
        ) : (
          Object.entries(groupedEntries).map(([level, list]) => (
            <div key={level} className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">
                {LEVEL_LABELS[level] ?? level} ({list.length})
              </h3>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {list.map((entry) => (
                  <article
                    key={entry._id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm"
                  >
                    <div className="font-semibold text-slate-900">{entry.displayName}</div>
                    <div className="text-[12px] text-slate-500">{entry.actorKey}</div>
                    {entry.description && (
                      <p className="mt-1 text-[13px] text-slate-600">{entry.description}</p>
                    )}
                    {entry.contactUrl && (
                      <a
                        href={entry.contactUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-sky-600 underline"
                      >
                        Ressource öffnen
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Responsibility Paths</h2>
        {paths.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Pfade hinterlegt.</p>
        ) : (
          <div className="space-y-3">
            {paths.map((path) => (
              <article key={path._id} className="rounded-xl border border-slate-100 p-3">
                <div className="text-sm font-semibold text-slate-800">
                  Statement {path.statementId} ({path.locale})
                </div>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {path.nodes.map((node, idx) => (
                    <li key={`${path._id}-${idx}`}>
                      <span className="font-semibold">
                        {node.displayName} ({LEVEL_LABELS[node.level] ?? node.level})
                      </span>
                      {typeof node.relevance === "number" && (
                        <span className="text-xs text-slate-500">
                          {" "}
                          · Relevanz {(node.relevance * 100).toFixed(0)}%
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
