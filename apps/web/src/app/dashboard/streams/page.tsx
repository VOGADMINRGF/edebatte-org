"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionSummary = {
  _id: string;
  title: string;
  description?: string | null;
  isLive: boolean;
  visibility: "public" | "unlisted";
  updatedAt?: string;
};

export default function StreamsDashboardPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/streams/sessions", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) setSessions(body.sessions ?? []);
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Fehler beim Laden der Sessions");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function createSession() {
    const name = title.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/streams/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setTitle("");
      setSessions((prev) => [
        { _id: body.sessionId, title: name, description: "", isLive: false, visibility: "unlisted" },
        ...prev,
      ]);
    } catch (err: any) {
      setError(err?.message ?? "Session konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Streams</p>
        <h1 className="text-2xl font-bold text-slate-900">Live-Sessions &amp; Overlays</h1>
        <p className="text-sm text-slate-600">
          Verwalte deine Live-Streams, Agenda und Polls. Nutze das OBS-Overlay für sendefertige Anzeigen.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Neue Session</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={createSession}
            disabled={loading}
          >
            Anlegen
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Deine Sessions</h2>
        {loading && !sessions.length ? (
          <p className="text-sm text-slate-500">Lädt …</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Sessions angelegt.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li
                key={session._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">{session.title}</p>
                  <p className="text-xs text-slate-500">
                    {session.isLive ? "Live" : "Offline"} · {session.visibility}
                  </p>
                </div>
                <Link
                  href={`/dashboard/streams/${session._id}`}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
                >
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
