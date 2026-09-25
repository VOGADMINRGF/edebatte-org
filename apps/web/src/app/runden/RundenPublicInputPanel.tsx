"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  PUBLIC_ANLASSRAUM_INPUT_KINDS,
  PUBLIC_ANLASSRAUM_INPUT_EMPTY_STATE_COPY,
  type PublicAnlassraumInputKind,
  publicAnlassraumInputKindLabel,
  publicAnlassraumInputPlaceholder,
} from "@features/topicRound/publicInput";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; visibilityState: string; visibilityLabel: string }
  | { kind: "error"; message: string };

type RundenPublicInputPanelProps = {
  anlassraumId: string | null;
  anlassraumTitle: string | null;
};

export default function RundenPublicInputPanel({ anlassraumId, anlassraumTitle }: RundenPublicInputPanelProps) {
  const [kind, setKind] = useState<PublicAnlassraumInputKind>("frage");
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [submission, setSubmission] = useState<SubmissionState>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!anlassraumId) {
      setSubmission({ kind: "error", message: PUBLIC_ANLASSRAUM_INPUT_EMPTY_STATE_COPY });
      return;
    }

    setSubmission({ kind: "submitting" });
    const response = await fetch("/api/runden/public-input", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anlassraumId, kind, text, sourceUrl }),
    }).catch(() => null);

    if (!response) {
      setSubmission({ kind: "error", message: "Dein Beitrag konnte gerade nicht gesendet werden. Bitte versuche es noch einmal." });
      return;
    }

    const body = (await response.json().catch(() => null)) as
      | { ok?: boolean; signal?: { visibilityState?: string; visibilityLabel?: string }; error?: string }
      | null;

    if (!response.ok || !body?.ok || !body.signal) {
      setSubmission({
        kind: "error",
        message: body?.error === "public_anlassraum_not_found"
          ? PUBLIC_ANLASSRAUM_INPUT_EMPTY_STATE_COPY
          : "Dein Beitrag konnte nicht übernommen werden. Bitte prüfe deine Eingabe und versuche es erneut.",
      });
      return;
    }

    setText("");
    setSourceUrl("");
    setSubmission({
      kind: "success",
      visibilityState: String(body.signal.visibilityState ?? "internal_review"),
      visibilityLabel: String(body.signal.visibilityLabel ?? "in Prüfung"),
    });
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Etwas fehlt?</p>
          <h3 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">Ergänze es direkt.</h3>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
            Stelle eine Frage, ergänze eine Quelle, teile eine Erfahrung oder bringe eine fehlende Alternative ein. Dein Beitrag bleibt mit genau dieser Runde verbunden.
          </p>
        </div>
        {anlassraumTitle ? (
          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">{anlassraumTitle}</span>
        ) : null}
      </div>

      {!anlassraumId ? (
        <div className="mt-4 rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">Wähle zuerst eine laufende Runde.</p>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">{PUBLIC_ANLASSRAUM_INPUT_EMPTY_STATE_COPY}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--fg))]">Was möchtest du beitragen?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-5">
              {PUBLIC_ANLASSRAUM_INPUT_KINDS.map((entry) => {
                const active = kind === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setKind(entry)}
                    aria-pressed={active}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-[rgb(var(--grad-from))]/50 bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
                    }`}
                  >
                    {publicAnlassraumInputKindLabel(entry)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="runden-public-input-text" className="text-sm font-semibold text-[rgb(var(--fg))]">Dein Beitrag</label>
            <textarea
              id="runden-public-input-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              required
              minLength={8}
              maxLength={2400}
              className="mt-2 min-h-[120px] w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder={publicAnlassraumInputPlaceholder(kind)}
            />
          </div>

          {(kind === "quelle" || kind === "hinweis") && (
            <div>
              <label htmlFor="runden-public-input-source" className="text-sm font-semibold text-[rgb(var(--fg))]">Link oder Quelle <span className="font-normal text-[rgb(var(--muted))]">(optional)</span></label>
              <input
                id="runden-public-input-source"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="https://…"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={submission.kind === "submitting"} className="vog-btn-brand disabled:opacity-60">
              {submission.kind === "submitting" ? "Wird gesendet…" : `${publicAnlassraumInputKindLabel(kind)} beitragen`}
            </button>
            <Link href="/create?mode=source&intent=contribution&source=runden&reason=public_anlassraum_input" className="vog-btn-secondary">Mehr Kontext hinzufügen</Link>
          </div>

          {submission.kind === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Danke – dein Beitrag ist angekommen.</p>
              <p className="mt-1">Aktueller Status: <strong>{submission.visibilityLabel}</strong>.</p>
              <p className="mt-1 text-xs">Ob ein Beitrag bereits geprüft oder offiziell ist, wird getrennt und sichtbar gekennzeichnet.</p>
            </div>
          ) : null}

          {submission.kind === "error" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{submission.message}</div>
          ) : null}
        </form>
      )}
    </section>
  );
}
