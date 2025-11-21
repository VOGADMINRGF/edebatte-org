"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type AgendaItem = {
  _id: string;
  kind: string;
  status: string;
  customQuestion?: string | null;
  description?: string | null;
  pollOptions?: string[];
  allowAnonymousVoting: boolean;
  publicAttribution: string;
};

export default function StreamCockpitPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<{ _id: string; title: string; description?: string | null } | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Ja\nNein");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/streams/sessions/${params.id}/agenda`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) {
          setSession(body.session);
          setItems(body.items ?? []);
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Fehler beim Laden der Agenda");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [params.id]);

  const liveItem = useMemo(() => items.find((item) => item.status === "live"), [items]);

  async function addQuestion(kind: "question" | "poll") {
    const payload: any = {
      kind,
      customQuestion: question.trim() || "Neue Frage",
      allowAnonymousVoting: true,
      publicAttribution: "hidden",
    };
    if (kind === "poll") {
      payload.pollOptions = pollOptions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    try {
      await fetch(`/api/streams/sessions/${params.id}/agenda`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setQuestion("");
    } catch {
      setError("Agenda-Item konnte nicht erstellt werden.");
    }
  }

  async function updateItem(itemId: string, action: string) {
    await fetch(`/api/streams/sessions/${params.id}/agenda`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, action }),
    });
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stream Cockpit</p>
        <h1 className="text-2xl font-bold text-slate-900">{session?.title ?? "Session"}</h1>
        <p className="text-sm text-slate-600">
          Steuere hier Fragen, Statements und Polls. Das OBS-Overlay aktualisiert sich automatisch.
        </p>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Agenda</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Lädt …</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {items.map((item) => (
                <li key={item._id} className="rounded-xl border border-slate-100 p-3">
                  <p className="font-semibold text-slate-900">{item.customQuestion || item.description || item.kind}</p>
                  <p className="text-xs text-slate-500 mb-2">Status: {item.status}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1"
                      onClick={() => updateItem(item._id, "go_live")}
                    >
                      Live
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1"
                      onClick={() => updateItem(item._id, "skip")}
                    >
                      Skip
                    </button>
                    <button
                      className="rounded-full border border-slate-300 px-3 py-1"
                      onClick={() => updateItem(item._id, "archive")}
                    >
                      Archiv
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Live</h2>
          {liveItem ? (
            <div>
              <p className="text-xl font-semibold text-slate-900">{liveItem.customQuestion || liveItem.description}</p>
              {liveItem.kind === "poll" && (
                <ul className="mt-3 space-y-2">
                  {(liveItem.pollOptions ?? []).map((opt) => (
                    <li key={opt} className="rounded-lg bg-slate-100 px-3 py-2 text-sm">
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-amber-600">
                {liveItem.publicAttribution === "public"
                  ? "Achtung: Öffentliche Abstimmung – Teilnehmer:innen werden sichtbar angezeigt."
                  : "Anonyme Abstimmung aktiv."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Noch kein Item live.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Neues Item</h2>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Frage oder Statement"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <label className="text-xs font-semibold text-slate-500">Poll-Optionen (eine pro Zeile)</label>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            value={pollOptions}
            onChange={(e) => setPollOptions(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-slate-300 px-3 py-1 text-sm"
              onClick={() => addQuestion("question")}
            >
              Frage anlegen
            </button>
            <button
              className="rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-sm text-white"
              onClick={() => addQuestion("poll")}
            >
              Poll anlegen
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
