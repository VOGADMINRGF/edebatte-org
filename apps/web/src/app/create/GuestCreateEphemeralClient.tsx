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

type GuestStatus = "idle" | "submitting" | "preparing" | "ready" | "error";

const TRANSITION_TARGET = "/create?nextAction=guest-adoption-resume";
const LOGIN_CONTINUATION_HREF = `/login?next=${encodeURIComponent(TRANSITION_TARGET)}`;

const COPY = {
  de: {
    title: "Anliegen ohne Konto mitteilen",
    lead: "Dein Text bleibt nur für diese aktuelle Eingabe im Browser und geht beim Neuladen verloren.",
    label: "Dein Anliegen",
    placeholder: "Worum geht es?",
    submit: "Anfrage vorbereiten",
    submitting: "Wird geprüft …",
    preparing: "Fortsetzung wird vorbereitet …",
    ready: "Dein Anliegen ist vorübergehend serverseitig für die Übernahme nach der Anmeldung vorbereitet. Es ist noch kein Konto-Entwurf gespeichert.",
    error: "Die Fortsetzung konnte nicht vorbereitet werden. Dein Text bleibt in dieser Eingabe erhalten. Bitte versuche es erneut.",
    login: "Anmelden und fortsetzen",
    count: "Zeichen",
  },
  en: {
    title: "Share a concern without an account",
    lead: "Your text stays in this browser only for the current entry and is lost when the page reloads.",
    label: "Your concern",
    placeholder: "What is your concern?",
    submit: "Prepare request",
    submitting: "Checking …",
    preparing: "Preparing continuation …",
    ready: "Your concern is temporarily prepared on the server for transfer after sign-in. It is not yet saved as an account draft.",
    error: "The continuation could not be prepared. Your text remains in this entry. Please try again.",
    login: "Log in and continue",
    count: "characters",
  },
} as const;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function textFor(locale: OperatorLocale) {
  return locale === "de" ? COPY.de : COPY.en;
}

function isAcceptedGuestClaimResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 3 || !keys.includes("ok") || !keys.includes("operationId") || !keys.includes("status")) {
    return false;
  }
  const operationId = record.operationId;
  return record.ok === true && record.status === "accepted" && typeof operationId === "string" && UUID_V4.test(operationId);
}

function isPreparedGuestAdoptionResponse(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === 2 && keys.includes("ok") && keys.includes("status") &&
    record.ok === true && record.status === "prepared";
}

export default function GuestCreateEphemeralClient({ locale }: GuestCreateEphemeralClientProps) {
  const copy = textFor(locale);
  const [guestText, setGuestText] = useState("");
  const [honeypotValue, setHoneypotValue] = useState("");
  const [status, setStatus] = useState<GuestStatus>("idle");
  const trimmedText = guestText.trim();
  const isBusy = status === "submitting" || status === "preparing";

  async function submitGuestClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedText || isBusy) return;

    const claim = trimmedText;
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
        body: JSON.stringify({ claim }),
      });
      if (
        intakeResponse.status !== 202 ||
        !isAcceptedGuestClaimResponse(await intakeResponse.json())
      ) {
        setStatus("error");
        return;
      }

      setStatus("preparing");
      const preparationResponse = await fetch("/api/create/adoption-preparation", {
        method: "POST",
        headers,
        body: JSON.stringify({ claim }),
      });
      if (
        preparationResponse.status !== 202 ||
        !isPreparedGuestAdoptionResponse(await preparationResponse.json())
      ) {
        setStatus("error");
        return;
      }

      setGuestText("");
      setStatus("ready");
    } catch {
      // Fixed local copy intentionally avoids exposing request or security details.
      setStatus("error");
    }
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
              onChange={(event) => {
                setGuestText(event.currentTarget.value.slice(0, CREATE_MAX_TEXT_LENGTH));
                if (status === "ready" || status === "error") setStatus("idle");
              }}
              placeholder={copy.placeholder}
              maxLength={CREATE_MAX_TEXT_LENGTH}
              rows={7}
              disabled={isBusy}
              className="w-full rounded-xl border border-black/20 bg-transparent p-3 text-base leading-6 outline-none focus:border-black disabled:cursor-wait disabled:opacity-70 dark:border-white/30 dark:focus:border-white"
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
              disabled={!trimmedText || isBusy}
              aria-busy={isBusy}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {status === "preparing" ? copy.preparing : status === "submitting" ? copy.submitting : copy.submit}
            </button>
          </form>

          <div aria-live="polite" className="mt-5 text-sm leading-6">
            {status === "preparing" ? <p role="status">{copy.preparing}</p> : null}
            {status === "ready" ? <p role="status">{copy.ready}</p> : null}
            {status === "error" ? <p role="alert">{copy.error}</p> : null}
          </div>

          {status === "ready" ? (
            <Link className="mt-6 inline-block text-sm underline underline-offset-4" href={LOGIN_CONTINUATION_HREF}>
              {copy.login}
            </Link>
          ) : null}
        </section>
      </div>
    </main>
  );
}
