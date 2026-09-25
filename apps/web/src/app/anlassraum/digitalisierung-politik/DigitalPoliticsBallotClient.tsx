"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { HumanCheck } from "@/components/security/HumanCheck";
import { DIGITAL_POLITICS_QUESTIONS } from "@/features/socialPublicBallot/digitalPolitics";

const UPDATES_INTEREST =
  "Digitalisierung politischer Beteiligung · eDebatte Social-Anlassraum";

type VoteState = "idle" | "saving" | "saved" | "error";
type UpdatesState = "idle" | "sending" | "pending_confirm" | "error";

export default function DigitalPoliticsBallotClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voteState, setVoteState] = useState<VoteState>("idle");
  const [voteMessage, setVoteMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [updatesEmail, setUpdatesEmail] = useState("");
  const [updatesConsent, setUpdatesConsent] = useState(false);
  const [updatesHumanToken, setUpdatesHumanToken] = useState("");
  const [updatesStartedAt, setUpdatesStartedAt] = useState<number | null>(null);
  const [updatesState, setUpdatesState] = useState<UpdatesState>("idle");
  const [updatesMessage, setUpdatesMessage] = useState<string | null>(null);

  const question = DIGITAL_POLITICS_QUESTIONS[step];
  const answeredCount = Object.keys(answers).length;
  const progress = completed
    ? 100
    : Math.max(4, Math.round(((step + 1) / DIGITAL_POLITICS_QUESTIONS.length) * 100));

  const selectedForCurrentQuestion = question ? answers[question.id] : undefined;

  const canSendUpdates = useMemo(
    () =>
      updatesEmail.trim().length > 3 &&
      updatesConsent &&
      updatesHumanToken.length > 0 &&
      updatesState !== "sending",
    [updatesConsent, updatesEmail, updatesHumanToken, updatesState],
  );

  const openUpdates = useCallback(() => {
    setUpdatesOpen(true);
    setUpdatesStartedAt(Date.now());
    setUpdatesMessage(null);
    setUpdatesState("idle");
  }, []);

  const handleHumanSolved = useCallback((result: { token: string }) => {
    setUpdatesHumanToken(result.token);
  }, []);

  async function saveAnswer(choice: string) {
    if (!question || voteState === "saving") return;

    setVoteState("saving");
    setVoteMessage(null);

    try {
      const response = await fetch("/api/public-ballots/digital-politics/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          choice,
          locale: "de",
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok) {
        setVoteState("error");
        setVoteMessage(
          body?.error === "rate_limited"
            ? "Gerade kommen sehr viele Stimmen an. Bitte versuche es in einem Moment erneut."
            : "Deine Antwort konnte noch nicht gespeichert werden. Bitte versuche es erneut.",
        );
        return;
      }

      const nextAnswers = { ...answers, [question.id]: choice };
      setAnswers(nextAnswers);
      setVoteState("saved");
      setVoteMessage("Antwort gespeichert.");

      if (step >= DIGITAL_POLITICS_QUESTIONS.length - 1) {
        setCompleted(true);
        return;
      }

      setStep((current) => current + 1);
      setVoteState("idle");
      setVoteMessage(null);
    } catch {
      setVoteState("error");
      setVoteMessage("Netzwerkfehler. Bitte versuche es erneut.");
    }
  }

  async function submitUpdates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSendUpdates || updatesStartedAt === null) return;

    setUpdatesState("sending");
    setUpdatesMessage(null);

    try {
      const response = await fetch("/api/public/updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: updatesEmail.trim(),
          interests: UPDATES_INTEREST,
          locale: "de",
          humanToken: updatesHumanToken,
          formStartedAt: updatesStartedAt,
          hp_updates: "",
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.ok) {
        setUpdatesState("error");
        setUpdatesMessage(
          body?.error === "rate_limited"
            ? "Zu viele Anfragen in kurzer Zeit. Bitte versuche es später erneut."
            : "Die Updates-Anmeldung konnte noch nicht gestartet werden. Bitte prüfe deine E-Mail-Adresse und versuche es erneut.",
        );
        return;
      }

      setUpdatesState("pending_confirm");
      setUpdatesMessage(
        "Fast geschafft: Wir haben dir eine E-Mail geschickt. Bitte bestätige dort die Anmeldung.",
      );
    } catch {
      setUpdatesState("error");
      setUpdatesMessage("Netzwerkfehler. Bitte versuche es erneut.");
    }
  }

  if (completed) {
    return (
      <main className="mx-auto min-h-[100svh] max-w-3xl px-4 py-8 sm:py-12">
        <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
          <div className="h-1.5 bg-[rgb(var(--border))]">
            <div className="h-full w-full bg-gradient-to-r from-sky-500 to-emerald-500" />
          </div>

          <section className="space-y-6 p-5 sm:p-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                Offene Konsultation · abgeschlossen
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-[rgb(var(--fg))] sm:text-4xl">
                Danke. Deine Antworten wurden gespeichert.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[rgb(var(--muted))] sm:text-base">
                Du hast {answeredCount} von {DIGITAL_POLITICS_QUESTIONS.length} Fragen beantwortet.
                Für die Teilnahme war kein Konto nötig. Diese Befragung ist eine offene Konsultation und
                kein repräsentatives Wahlergebnis.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={openUpdates}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Updates zu diesem Thema erhalten
              </button>
              <Link
                href="/register?source=digitalisierung-politik"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-5 py-3 text-sm font-semibold text-[rgb(var(--fg))] transition hover:bg-[rgb(var(--card))]"
              >
                Kostenloses eDebatte-Konto anlegen
              </Link>
            </div>

            {updatesOpen ? (
              <form
                onSubmit={submitUpdates}
                className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 sm:p-5"
              >
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Per E-Mail dranbleiben</h2>
                  <p className="text-sm leading-6 text-[rgb(var(--muted))]">
                    Die Anmeldung ist freiwillig und getrennt von deiner Abstimmung. Du erhältst zuerst
                    eine Bestätigungs-E-Mail (Double-Opt-in).
                  </p>
                </div>

                <label className="block space-y-1 text-sm font-medium text-[rgb(var(--fg))]">
                  E-Mail-Adresse
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={updatesEmail}
                    onChange={(event) => setUpdatesEmail(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-3 text-base text-[rgb(var(--fg))] outline-none focus:ring-2 focus:ring-[rgb(var(--border))]"
                    placeholder="name@beispiel.de"
                  />
                </label>

                <label className="flex items-start gap-3 text-sm leading-5 text-[rgb(var(--muted))]">
                  <input
                    type="checkbox"
                    checked={updatesConsent}
                    onChange={(event) => setUpdatesConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[rgb(var(--border))]"
                  />
                  <span>
                    Ich möchte Updates von eDebatte zu diesem Thema per E-Mail erhalten. Die Einwilligung
                    kann jederzeit widerrufen werden. Details stehen in der{" "}
                    <Link href="/datenschutz" className="font-semibold underline underline-offset-4">
                      Datenschutzerklärung
                    </Link>
                    .
                  </span>
                </label>

                <HumanCheck
                  formId="public-updates"
                  variant="compact"
                  onSolved={handleHumanSolved}
                  onError={() => setUpdatesHumanToken("")}
                  disabled={updatesState === "sending"}
                />

                <button
                  type="submit"
                  disabled={!canSendUpdates}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {updatesState === "sending" ? "Wird gesendet …" : "Bestätigungs-E-Mail senden"}
                </button>

                {updatesMessage ? (
                  <p
                    aria-live="polite"
                    className={`text-sm leading-6 ${
                      updatesState === "pending_confirm"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {updatesMessage}
                  </p>
                ) : null}
              </form>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-[rgb(var(--border))] pt-5 text-sm">
              <Link
                href="/runden"
                className="font-semibold text-[rgb(var(--fg))] underline decoration-[rgb(var(--border))] underline-offset-4"
              >
                Ohne Anmeldung weiter
              </Link>
              <a
                href="https://voiceopengov.org"
                className="font-semibold text-[rgb(var(--muted))] underline decoration-[rgb(var(--border))] underline-offset-4"
              >
                VoiceOpenGov kennenlernen
              </a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[100svh] max-w-3xl px-4 py-6 sm:py-10">
      <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm">
        <div className="h-1.5 bg-[rgb(var(--border))]" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <header className="space-y-4 border-b border-[rgb(var(--border))] p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-1 text-[rgb(var(--fg))]">
              Digitalisierung in der Politik
            </span>
            <a
              href="https://vote4gov.eu"
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
            >
              Impuls aus Vote4Gov
            </a>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Öffentlicher Anlassraum · keine Anmeldung nötig
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[rgb(var(--fg))] sm:text-4xl">
              Würdest du eDebatte nutzen?
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[rgb(var(--muted))] sm:text-base">
              Acht kurze Fragen dazu, wie digitale politische Beteiligung aussehen müsste, damit sie für
              dich nützlich und vertrauenswürdig wäre. Keine Parteizuordnung, keine Links-Rechts-Skala und
              keine religiöse Einordnung.
            </p>
          </div>

          <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs leading-5 text-[rgb(var(--muted))]">
            Methodischer Hinweis: Die Ergebnisse zeigen die Antworten der freiwillig Teilnehmenden. Sie
            werden nicht als repräsentativer Bevölkerungswille dargestellt.
          </p>
        </header>

        <section className="space-y-5 p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[rgb(var(--muted))]">
            <span>
              Frage {step + 1} von {DIGITAL_POLITICS_QUESTIONS.length}
            </span>
            <span>{answeredCount} gespeichert</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold leading-8 text-[rgb(var(--fg))] sm:text-2xl">
              {question.title}
            </h2>
            {question.note ? (
              <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs leading-5 text-[rgb(var(--muted))]">
                {question.note}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2" role="group" aria-label={`Antworten zu Frage ${step + 1}`}>
            {question.options.map((option) => {
              const isSelected = selectedForCurrentQuestion === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={voteState === "saving"}
                  onClick={() => void saveAnswer(option)}
                  className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium leading-6 transition disabled:cursor-wait disabled:opacity-60 ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--fg))] hover:border-sky-400 hover:bg-[rgb(var(--card))]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {voteMessage ? (
            <p
              aria-live="polite"
              className={`text-sm ${
                voteState === "error"
                  ? "text-rose-700 dark:text-rose-300"
                  : "text-[rgb(var(--muted))]"
              }`}
            >
              {voteMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-4">
            <button
              type="button"
              disabled={step === 0 || voteState === "saving"}
              onClick={() => {
                setStep((current) => Math.max(0, current - 1));
                setVoteState("idle");
                setVoteMessage(null);
              }}
              className="text-sm font-semibold text-[rgb(var(--muted))] disabled:opacity-30"
            >
              Zurück
            </button>
            <span className="text-xs text-[rgb(var(--muted))]">
              Auswahl antippen = speichern & weiter
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
