"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { ResponsibilityActor } from "@core/responsibility";

const LEVEL_OPTIONS = [
  { value: "kommune", label: "Kommune" },
  { value: "land", label: "Land" },
  { value: "bund", label: "Bund" },
  { value: "eu", label: "EU" },
  { value: "global", label: "Global" },
];

const ROLE_OPTIONS = [
  { value: "parlament", label: "Parlament" },
  { value: "regierung", label: "Regierung" },
  { value: "behoerde", label: "Behörde" },
  { value: "gericht", label: "Gericht" },
  { value: "buerger-assembly", label: "Bürger:innenversammlung" },
];

type FormState = {
  id?: string;
  actorKey: string;
  name: string;
  level: string;
  role: string;
  regionId?: string;
  description?: string;
};

export default function ResponsibilityDirectoryPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ResponsibilityActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    actorKey: "",
    name: "",
    level: "bund",
    role: "parlament",
    regionId: "",
    description: "",
  });

  const selectedItem = useMemo(
    () => items.find((it) => it.id === formState.id) ?? null,
    [items, formState.id],
  );

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/responsibility/directory/list", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setItems(body.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Konnte Directory nicht laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) setQuery(qParam);
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((actor) => {
      const haystack = [
        actor.name,
        actor.actorKey,
        actor.level,
        actor.role,
        actor.regionId,
        actor.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const openForm = (actor?: ResponsibilityActor) => {
    setFormState({
      id: actor?.id,
      actorKey: actor?.actorKey ?? "",
      name: actor?.name ?? "",
      level: actor?.level ?? "bund",
      role: actor?.role ?? "parlament",
      regionId: actor?.regionId ?? "",
      description: actor?.description ?? "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/responsibility/directory/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formState),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setFormOpen(false);
      await loadItems();
    } catch (err: any) {
      setError(err?.message ?? "Speichern fehlgeschlagen.");
    }
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsibility</p>
          <h1 className="text-2xl font-bold text-slate-900">Verantwortliche Stellen</h1>
          <p className="text-sm text-slate-600">
            Directory der relevanten Akteure. Nur Staff kann bearbeiten.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Neu anlegen
        </button>
      </header>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Akteur suchen (Name, actorKey, Region)"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">actorKey</th>
              <th className="px-4 py-3">Ebene</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            ) : (
              filteredItems.map((actor) => (
                <tr key={actor.id ?? actor.actorKey}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{actor.name}</div>
                    {actor.description && (
                      <div className="text-xs text-slate-500">{actor.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{actor.actorKey}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{actor.level ?? "–"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{actor.role ?? "–"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{actor.regionId ?? "–"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{actor.isActive === false ? "inaktiv" : "aktiv"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openForm(actor)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredItems.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          Keine Treffer für "{query}".
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedItem ? "Akteur bearbeiten" : "Neuen Akteur anlegen"}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                schließen
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">actorKey</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formState.actorKey}
                  onChange={(e) => setFormState((s) => ({ ...s, actorKey: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formState.name}
                  onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Ebene</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.level}
                    onChange={(e) => setFormState((s) => ({ ...s, level: e.target.value }))}
                  >
                    {LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Rolle</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.role}
                    onChange={(e) => setFormState((s) => ({ ...s, role: e.target.value }))}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Region-ID (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.regionId}
                    onChange={(e) => setFormState((s) => ({ ...s, regionId: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Beschreibung (optional)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.description}
                    onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
