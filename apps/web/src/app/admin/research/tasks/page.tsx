"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ResearchContribution, ResearchTask } from "@core/research";

const LEVEL_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const KIND_OPTIONS = [
  { value: "question", label: "Question" },
  { value: "knot", label: "Knot" },
  { value: "eventuality", label: "Eventuality" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "completed", label: "Abgeschlossen" },
  { value: "archived", label: "Archiviert" },
];

type FormState = {
  id?: string;
  title: string;
  description: string;
  level: string;
  kind: string;
  tags: string;
  hints: string;
  status: string;
};

export default function ResearchTasksAdminPage() {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [contributions, setContributions] = useState<ResearchContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    title: "",
    description: "",
    level: "basic",
    kind: "custom",
    tags: "",
    hints: "",
    status: "open",
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const loadTasks = async (taskId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(window.location.origin + "/api/admin/research/tasks/list");
      if (taskId) url.searchParams.set("taskId", taskId);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setTasks(body.items ?? []);
      setContributions(body.contributions ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Konnte Tasks nicht laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const openForm = (task?: ResearchTask) => {
    setFormState({
      id: task?.id,
      title: task?.title ?? "",
      description: task?.description ?? "",
      level: task?.level ?? "basic",
      kind: task?.kind ?? "custom",
      tags: task?.tags?.join(", ") ?? "",
      hints: task?.hints?.join("\n") ?? "",
      status: task?.status ?? "open",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/research/tasks/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...formState,
          tags: formState.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          hints: formState.hints
            .split(/\n+/)
            .map((h) => h.trim())
            .filter(Boolean),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setFormOpen(false);
      await loadTasks(formState.id ?? undefined);
    } catch (err: any) {
      setError(err?.message ?? "Speichern fehlgeschlagen.");
    }
  };

  const selectTask = async (id: string) => {
    setSelectedTaskId(id);
    await loadTasks(id);
  };

  const updateContribution = async (contributionId: string, status: "accepted" | "rejected") => {
    setError(null);
    try {
      const res = await fetch("/api/admin/research/contributions/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contributionId, status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      await loadTasks(selectedTaskId ?? undefined);
    } catch (err: any) {
      setError(err?.message ?? "Aktion fehlgeschlagen.");
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Research</p>
          <h1 className="text-2xl font-bold text-slate-900">Research Tasks</h1>
          <p className="text-sm text-slate-600">Aufgaben anlegen, Contributions prüfen und XP vergeben.</p>
        </div>
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          Neue Task
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Titel</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Lädt …
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className={selectedTaskId === task.id ? "bg-slate-50" : ""}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{task.title}</div>
                    {task.description && <div className="text-xs text-slate-500">{task.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{task.kind ?? "custom"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{task.level ?? "basic"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{task.status ?? "open"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{task.tags?.join(", ") ?? "–"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openForm(task)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => selectTask(task.id!)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Beiträge
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedTask && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributions</p>
              <h2 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h2>
              <p className="text-xs text-slate-500">{selectedTask.description}</p>
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              schließen
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">Summary</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contributions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                      Keine Contributions vorhanden.
                    </td>
                  </tr>
                ) : (
                  contributions.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.authorId}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{c.summary}</div>
                        {c.details && <div className="text-xs text-slate-500">{c.details}</div>}
                        {c.sources?.length ? (
                          <div className="mt-1 space-y-1 text-xs text-slate-500">
                            {c.sources.map((s, idx) => (
                              <div key={idx}>
                                {s.url ? (
                                  <a className="text-sky-600 hover:underline" href={s.url} target="_blank" rel="noreferrer">
                                    {s.label || s.url}
                                  </a>
                                ) : (
                                  s.label
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{c.status ?? "submitted"}</td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          onClick={() => updateContribution(c.id!, "accepted")}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateContribution(c.id!, "rejected")}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {formState.id ? "Task bearbeiten" : "Neue Task anlegen"}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
                schließen
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Titel</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Beschreibung</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={formState.description}
                  onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Kind</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.kind}
                    onChange={(e) => setFormState((s) => ({ ...s, kind: e.target.value }))}
                  >
                    {KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Level</label>
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
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.status}
                    onChange={(e) => setFormState((s) => ({ ...s, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Tags (comma separated)</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    value={formState.tags}
                    onChange={(e) => setFormState((s) => ({ ...s, tags: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Hinweise (eine pro Zeile)</label>
                  <textarea
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    rows={2}
                    value={formState.hints}
                    onChange={(e) => setFormState((s) => ({ ...s, hints: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
