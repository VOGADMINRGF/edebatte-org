"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CREATE_HONEYPOT_MAX_LENGTH,
  CREATE_MAX_TEXT_LENGTH,
  createMutationRequestHeaders,
} from "@/features/create/createMutationSecurityContract";
import type { OperatorLocale } from "@/features/i18n/operatorSystemTexts";

type GuestCreateEphemeralClientProps = {
  locale: OperatorLocale;
};

type GuestStatus = "idle" | "submitting" | "accepted" | "error";

const COPY = {
  de: {
    title: "Anliegen ohne Konto mitteilen",
    lead: "Dein Text bleibt nur für diese aktuelle Eingabe im Browser und geht beim Neuladen verloren.",
    label: "Dein Anliegen",
    placeholder: "Worum geht es?",
    submit: "Anfrage senden",
    submitting: "Wird gesendet …",
    accepted: "Die Anfrage wurde für diesen Vorgang angenommen. Dein Text wird hier nicht als Entwurf gespeichert und kann nach dem Verlassen oder Neuladen der Seite nicht wiederhergestellt werden.",
    error: "Die Anfrage konnte nicht verarbeitet werden.",
    login: "Mit Konto anmelden",
    count: "Zeichen",
  },
  en: {
    title: "Share a concern without an account",
    lead: "Your text stays in this browser only for the current entry and is lost when the page reloads.",
    label: "Your concern",
    placeholder: "What is your concern?",
    submit: "Send request",
    submitting: "Sending …",
    accepted: "The request was accepted for this operation. Your text is not saved here as a draft and cannot be restored after leaving or reloading the page.",
    error: "The request could not be processed.",
    login: "Log in with an account",
    count: "characters",
  },
} as const;

function textFor(locale: OperatorLocale) {
  return locale === "de" ? COPY.de : COPY.en;
}

export default function GuestCreateEphemeralClient({ locale }: GuestCreateEphemeralClientProps) {
  const copy = textFor(locale);
  const [guestText, setGuestText] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");
  const [status, setStatus] = useState<GuestStatus>("idle");
  const trimmedText = guestText.trim();
  const isSubmitting = status === "submitting";

  async function submitGuestClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedText || isSubmitting) return;

    setStatus("submitting");
    try {
      const headers = createMutationRequestHeaders({ honeypotValue });
      const sessionResponse = await fetch("/api/create/session", {
        method: "POST",
        headers,
      });
      if (!sessionResponse.ok) {
        setStatus("error");
        return;
      }

      const intakeResponse = await fetch("/api/create/intake", {
        method: "POST",
        headers,
        body: JSON.stringify({ claim: trimmedText }),
      });
      if (intakeResponse.status === 202) {
        setGuestText("");
        setStatus("accepted");
        return;
      }
    } catch {
      // A fixed local error state intentionally avoids exposing request details.
    }
    setGuestText("");
    setStatus("error");
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <section aria-labelledby="guest-create-title" className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-white/5 sm:p-8">
          <h1 id="guest-create-title" className="text-2xl font-semibold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/70 dark:text-white/70">{copy.lead}</p>

          <form className="mt-6 space-y-4" onSubmit={submitGuestClaim}>
            <label className="block text-sm font-medium" htmlFor="guest-create-claim">
              {copy.label}
            </label>
            <textarea
              id="guest-create-claim"
              value={guestText}
              onChange={(event) => setGuestText(event.currentTarget.value.slice(0, CREATE_MAX_TEXT_LENGTH))}
              placeholder={copy.placeholder}
              maxLength={CREATE_MAX_TEXT_LENGTH}
              rows={7}
              className="w-full rounded-xl border border-black/20 bg-transparent p-3 text-base leading-6 outline-none focus:border-black dark:border-white/30 dark:focus:border-white"
            />
            <p className="text-sm text-black/60 dark:text-white/60" aria-live="polite">
              {guestText.length} / {CREATE_MAX_TEXT_LENGTH} {copy.count}
            </p>
            <div aria-hidden="true" style={{ left: "-10000px", pointerEvents: "none", position: "absolute" }}>
              <label htmlFor="guest-create-request-note">Leave this field empty</label>
              <input
                id="guest-create-request-note"
                name="request_note_2f7"
                value={honeypotValue}
                onChange={(event) => setHoneypotValue(event.currentTarget.value.slice(0, CREATE_HONEYPOT_MAX_LENGTH))}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={!trimmedText || isSubmitting}
              aria-busy={isSubmitting}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {isSubmitting ? copy.submitting : copy.submit}
            </button>
          </form>

          <div aria-live="polite" className="mt-5 text-sm leading-6">
            {status === "accepted" ? <p>{copy.accepted}</p> : null}
            {status === "error" ? <p role="alert">{copy.error}</p> : null}
          </div>

          <Link className="mt-6 inline-block text-sm underline underline-offset-4" href="/login?next=/create">
            {copy.login}
          </Link>
        </section>
      </div>
    </main>
  );
}
