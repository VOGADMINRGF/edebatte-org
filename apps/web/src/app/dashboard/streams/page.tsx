"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionSummary = {
  _id: string;
  title: string;
  description?: string | null;
  isLive: boolean;
  visibility: "public" | "unlisted";
  status?: "draft" | "scheduled" | "live" | "ended" | "cancelled";
  updatedAt?: string;
  startsAt?: string | null;
};

function creationErrorMessage(value: unknown) {
  const code = String(value ?? "");
  if (code === "topic_not_registered") {
    return "Thema nicht im System. Bitte erst einmal den Workflow durchlaufen.";
  }
  if (code === "public_requires_schedule") {
    return "Öffentliche Events brauchen eine zukünftige Startzeit. Ohne Termin bleibt die Session ein nicht gelisteter Entwurf.";
  }
  if (code === "unsafe_player_url") {
    return "Die Player-URL ist nicht zulässig. Verwende eine HTTPS-Adresse eines vertrauenswürdigen Players oder Videos.";
  }
  if (code === "rate_limited") return "Zu viele neue Sessions in kurzer Zeit. Bitte später erneut versuchen.";
  return code || "Session konnte nicht erstellt werden";
}

export default function StreamsDashboardPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [title, setTitle] = useState("");
  const [topicKey, setTopicKey] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [playerUrl, setPlayerUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("unlisted");
  const [autofillAgenda, setAutofillAgenda] = useState(false);
  const [topicOptions, setTopicOptions] = useState<Array<{ key: string; label: string; source: string }>>([]);
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

  useEffect(() => {
    let ignore = false;
    async function loadTopics() {
      try {
        const res = await fetch("/api/streams/topics", { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!ignore && res.ok) setTopicOptions(body.topics ?? []);
      } catch {
        if (!ignore) setTopicOptions([]);
      }
    }
    loadTopics();
    return () => {
      ignore = true;
    };
  }, []);

  async function createSession() {
    const name = title.trim();
    if (!name) return;
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title: name,
        topicKey: topicKey.trim() || undefined,
        regionCode: regionCode.trim() || undefined,
        playerUrl: playerUrl.trim() || undefined,
        visibility,
        autofillAgenda,
      };
      if (startsAt.trim()) {
        const dt = new Date(startsAt);
        if (!isNaN(dt.getTime())) payload.startsAt = dt.toISOString();
      }
      const res = await fetch("/api/streams/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(creationErrorMessage(body?.error || res.statusText));
      }
      const createdStatus: SessionSummary["status"] = payload.startsAt ? "scheduled" : "draft";
      setTitle("");
      setTopicKey("");
      setRegionCode("");
      setStartsAt("");
      setPlayerUrl("");
      setAutofillAgenda(false);
      setSessions((prev) => [
        {
          _id: body.sessionId,
          title: name,
          description: "",
          isLive: false,
          visibility,
          status: createdStatus,
          startsAt: payload.startsAt ?? null,
        },
        ...prev,
      ]);
      if (body?.autofillError === "topic_required") {
        setError("Agenda konnte nicht automatisch gefüllt werden: Bitte Thema setzen.");
      } else if (body?.autofillError === "topic_not_ready") {
        setError("Agenda konnte nicht automatisch gefüllt werden: Thema noch nicht im Workflow.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Session konnte nicht erstellt werden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Events</p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">Event-Sessions &amp; Overlays</h1>
        <p className="text-sm text-[rgb(var(--muted))]">
          Bereite Event-Kontext, Player, Agenda und Polls vor. Eine Session ohne zukünftige Startzeit bleibt Entwurf und wird nicht öffentlich gelistet.
        </p>
        <p className="mt-2 text-xs text-[rgb(var(--muted))]">
          Ein Player ist optional. „Live“ oder „Replay“ wird öffentlich nur dort angezeigt, wo der jeweilige Zustand tatsächlich vorliegt.
        </p>
        <p className="mt-2 text-xs text-[rgb(var(--muted))]">
          Onboarding:{" "}
          <Link href="/howtoworks/streamer" className="font-semibold text-sky-700 underline">
            Wie werde ich Streamer:in?
          </Link>
        </p>
      </header>

      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Neue Session</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            placeholder="Thema (topicKey)"
            value={topicKey}
            onChange={(e) => setTopicKey(e.target.value)}
            list="stream-topic-options"
          />
          <datalist id="stream-topic-options">
            {topicOptions.map((topic) => (
              <option key={topic.key} value={topic.key}>
                {topic.label}
              </option>
            ))}
          </datalist>
          <input
            className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            placeholder="Region (z. B. DE-BE oder PLZ)"
            value={regionCode}
            onChange={(e) => setRegionCode(e.target.value)}
          />
          <input
            className="rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            placeholder="Optionale HTTPS-Player-URL"
            value={playerUrl}
            onChange={(e) => setPlayerUrl(e.target.value)}
          />
          <label className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm">
            <span className="shrink-0 text-[rgb(var(--muted))]">Startzeit</span>
            <input
              className="w-full rounded-md border border-[rgb(var(--border))] px-2 py-1 text-sm"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm">
            <span className="shrink-0 text-[rgb(var(--muted))]">Sichtbarkeit</span>
            <select
              className="w-full rounded-md border border-[rgb(var(--border))] px-2 py-1 text-sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "public" | "unlisted")}
            >
              <option value="unlisted">Entwurf / nicht gelistet</option>
              <option value="public">Öffentlich geplant</option>
            </select>
          </label>
          {visibility === "public" && !startsAt ? (
            <p className="text-xs text-amber-700 md:col-span-2">
              Für „Öffentlich geplant“ ist eine zukünftige Startzeit erforderlich. Ohne Termin bitte „Entwurf / nicht gelistet“ verwenden.
            </p>
          ) : null}
          <label className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={autofillAgenda}
              onChange={(e) => setAutofillAgenda(e.target.checked)}
            />
            <span>Agenda automatisch aus aktuellem Thema füllen</span>
          </label>
        </div>
        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          onClick={createSession}
          disabled={loading || (visibility === "public" && !startsAt)}
        >
          {visibility === "public" ? "Event planen" : "Entwurf anlegen"}
        </button>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Deine Sessions</h2>
        {loading && !sessions.length ? (
          <p className="text-sm text-[rgb(var(--muted))]">Lädt …</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[rgb(var(--muted))]">Noch keine Sessions angelegt.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => {
              const publicViewerAvailable = session.status !== "draft" && session.status !== "cancelled";
              return (
                <li
                  key={session._id}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-[rgb(var(--fg))]">{session.title}</p>
                    <p className="text-xs text-[rgb(var(--muted))]">
                      {session.isLive ? "Event läuft" : session.status === "draft" ? "Entwurf" : session.status ?? "Offline"} · {session.visibility}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {publicViewerAvailable ? (
                        <Link href={`/stream/${session._id}`} className="text-sky-700 underline">
                          Öffentliche Eventansicht
                        </Link>
                      ) : (
                        <span className="text-[rgb(var(--muted))]">Noch keine öffentliche Eventansicht</span>
                      )}
                      <Link href={`/overlay/stream/${session._id}`} className="text-sky-700 underline">
                        Overlay
                      </Link>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/streams/${session._id}`}
                    className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm font-semibold text-[rgb(var(--muted))]"
                  >
                    Öffnen
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
