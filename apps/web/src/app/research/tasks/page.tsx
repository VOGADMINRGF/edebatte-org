"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ResearchTask } from "@core/research";

interface SourceInput {
  label: string;
  url: string;
}

export default function ResearchTasksPage() {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  const [sources, setSources] = useState<SourceInput[]>([{ label: "", url: "" }]);
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/research/tasks/list", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setTasks(body.items ?? []);
    } catch (err: any) {
      setFeedback(err?.message ?? "Konnte Aufgaben nicht laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const selectTask = async (id: string) => {
    setSelectedId(id);
    setSelectedTask(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/research/tasks/${id}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setSelectedTask(body.task ?? null);
    } catch (err: any) {
      setFeedback(err?.message ?? "Konnte Aufgabe nicht laden.");
    }
  };

  const addSourceRow = () => setSources((rows) => [...rows, { label: "", url: "" }]);

  const updateSource = (idx: number, field: "label" | "url", value: string) => {
    setSources((rows) => rows.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const submitContribution = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/research/tasks/${selectedId}/contribute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          summary,
          details,
          sources: sources
            .map((s) => ({ label: s.label.trim(), url: s.url.trim() || undefined }))
            .filter((s) => s.label || s.url),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setFeedback("Contribution eingereicht. Danke!");
      setSummary("");
      setDetails("");
      setSources([{ label: "", url: "" }]);
    } catch (err: any) {
      setFeedback(err?.message ?? "Einreichung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "archived"), [tasks]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Community Research</p>
        <h1 className="text-2xl font-bold text-slate-900">Research Board</h1>
        <p className="text-sm text-slate-600">
          Wähle eine Aufgabe aus und reiche deine Recherche ein, um XP zu verdienen.
        </p>
      </header>

      {feedback && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{feedback}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Offene Aufgaben</h2>
            <p className="text-xs text-slate-500">Basic / Advanced / Expert</p>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-4 py-4 text-sm text-slate-500">Lädt …</div>
            ) : openTasks.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-500">Keine offenen Aufgaben.</div>
            ) : (
              openTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => selectTask(task.id!)}
                  className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                    selectedId === task.id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-slate-900">{task.title}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                      {task.level ?? "basic"}
                    </span>
                  </div>
                  {task.tags?.length ? (
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">
                      {task.tags.join(" · ")}
                    </div>
                  ) : null}
                  {task.description && <p className="text-xs text-slate-600">{task.description}</p>}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Task-Details & Beitrag</h2>
            {!selectedTask && <p className="text-xs text-slate-500">Wähle eine Aufgabe aus der Liste.</p>}
            {selectedTask && <p className="text-xs text-slate-500">Level: {selectedTask.level ?? "basic"}</p>}
          </div>

          {selectedTask ? (
            <form className="space-y-4 px-4 py-4" onSubmit={submitContribution}>
              <div>
                <h3 className="text-base font-semibold text-slate-900">{selectedTask.title}</h3>
                {selectedTask.description && <p className="text-sm text-slate-600">{selectedTask.description}</p>}
                {selectedTask.hints?.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {selectedTask.hints.map((hint, idx) => (
                      <li key={idx}>{hint}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Kurzfassung</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Details / Quellen</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Links / Quellen</label>
                  <button
                    type="button"
                    onClick={addSourceRow}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                  >
                    weitere Quelle
                  </button>
                </div>
                <div className="space-y-2">
                  {sources.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="Label"
                        value={row.label}
                        onChange={(e) => updateSource(idx, "label", e.target.value)}
                      />
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        placeholder="https://"
                        value={row.url}
                        onChange={(e) => updateSource(idx, "url", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    setSelectedTask(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-70"
                >
                  {submitting ? "Sendet…" : "Contribution einreichen"}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500">Keine Aufgabe ausgewählt.</div>
          )}
        </div>
      </div>
    </main>
  );
}
