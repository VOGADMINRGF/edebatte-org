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
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [qrQuestions, setQrQuestions] = useState<
    Array<{ title: string; description: string; options: string; publicAttribution: "public" | "hidden" }>
  >([{ title: "", description: "", options: "Ja\nNein", publicAttribution: "hidden" }]);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCreating, setQrCreating] = useState(false);

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

  function updateQrQuestion(index: number, patch: Partial<{ title: string; description: string; options: string }>) {
    setQrQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function toggleQrVisibility(index: number) {
    setQrError(null);
    setQrQuestions((prev) => {
      const currentPublic = prev.filter((q) => q.publicAttribution === "public").length;
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const nextValue = target.publicAttribution === "public" ? "hidden" : "public";
      if (nextValue === "public" && currentPublic >= 3) {
        setQrError("Maximal 3 Fragen dürfen nicht anonym sein.");
        return prev;
      }
      next[index] = { ...target, publicAttribution: nextValue };
      return next;
    });
  }

  function addQrQuestion() {
    setQrError(null);
    setQrQuestions((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, { title: "", description: "", options: "Ja\nNein", publicAttribution: "hidden" }];
    });
  }

  async function createQrSet() {
    setQrCreating(true);
    setQrError(null);
    setQrNotice(null);
    try {
      const publicCount = qrQuestions.filter((q) => q.publicAttribution === "public").length;
      if (publicCount > 3) {
        setQrError("Maximal 3 Fragen dürfen nicht anonym sein.");
        return;
      }
      const hiddenCount = qrQuestions.length - publicCount;
      if (qrQuestions.length >= 5 && hiddenCount < 2) {
        setQrError("Bei 5 Fragen müssen mindestens 2 anonym sein.");
        return;
      }
      const payload = {
        streamSessionId: params.id,
        title: `Stream ${session?.title ?? "Session"}`,
        questions: qrQuestions.map((q) => ({
          title: q.title.trim() || "Neue Frage",
          description: q.description.trim() || undefined,
          options: q.options
            .split("\n")
            .map((opt) => opt.trim())
            .filter(Boolean),
          publicAttribution: q.publicAttribution,
        })),
      };
      const res = await fetch("/api/qr/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === "public_limit_exceeded") {
          throw new Error("Maximal 3 Fragen dürfen nicht anonym sein.");
        }
        if (body?.error === "anonymous_minimum") {
          throw new Error("Bei 5 Fragen müssen mindestens 2 anonym sein.");
        }
        if (body?.error === "options_required") {
          throw new Error("Bitte mindestens zwei Eventualitäten pro Frage angeben.");
        }
        throw new Error(body?.error || res.statusText);
      }
      setQrCode(body.code ?? null);
      setQrNotice("QR-Set erstellt.");
    } catch (err: any) {
      setQrError(err?.message ?? "QR-Set konnte nicht erstellt werden.");
    } finally {
      setQrCreating(false);
    }
  }

  async function autofillAgenda() {
    setAutofilling(true);
    setAutofillError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/agenda/autofill`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const msg = body?.error || res.statusText;
        if (msg === "topic_required") {
          throw new Error("Bitte zuerst ein Thema an der Session setzen.");
        }
        if (msg === "topic_not_ready") {
          throw new Error("Zum Thema fehlen noch Statements. Bitte erst den Workflow durchlaufen.");
        }
        throw new Error(msg);
      }
      setItems(body.agenda ?? []);
    } catch (err: any) {
      setAutofillError(err?.message ?? "Autofill nicht möglich. Bitte später erneut versuchen.");
    } finally {
      setAutofilling(false);
    }
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Agenda</h2>
            <button
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold"
              onClick={autofillAgenda}
              disabled={autofilling}
            >
              {autofilling ? "Agenda wird gefüllt…" : "Agenda aus Thema füllen"}
            </button>
          </div>
          {autofillError && (
            <p className="text-xs text-rose-600">{autofillError}</p>
          )}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">QR Fragen-Set</h2>
            <button
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold"
              onClick={addQrQuestion}
              disabled={qrQuestions.length >= 5}
            >
              Frage hinzufügen
            </button>
          </div>
          {qrError && <p className="text-xs text-rose-600">{qrError}</p>}
          {qrNotice && <p className="text-xs text-emerald-600">{qrNotice}</p>}
          {qrCode && (
            <p className="text-xs text-slate-600">
              QR-Link: <a className="underline" href={`/qr/${qrCode}`}>{`/qr/${qrCode}`}</a>
            </p>
          )}
          <div className="space-y-3">
            {qrQuestions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Frage {idx + 1}</p>
                  <button
                    className="text-xs underline text-slate-500"
                    onClick={() => toggleQrVisibility(idx)}
                  >
                    {q.publicAttribution === "public" ? "Nicht anonym" : "Anonym"}
                  </button>
                </div>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Frage"
                  value={q.title}
                  onChange={(e) => updateQrQuestion(idx, { title: e.target.value })}
                />
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Eventualitäten / Optionen (eine pro Zeile)"
                  rows={3}
                  value={q.options}
                  onChange={(e) => updateQrQuestion(idx, { options: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={createQrSet}
            disabled={qrCreating}
          >
            {qrCreating ? "QR-Set wird erstellt…" : "QR-Set erstellen"}
          </button>
        </section>
      </div>
    </main>
  );
}
