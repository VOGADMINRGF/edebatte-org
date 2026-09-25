"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createMutationRequestHeaders } from "@/features/create/createMutationSecurityContract";
import type { OperatorLocale } from "@/features/i18n/operatorSystemTexts";

type AuthenticatedGuestAdoptionResumeClientProps = {
  locale: OperatorLocale;
};

type ResumeStatus = "resuming" | "error";

const CANONICAL_DRAFT_ID = /^[a-f0-9]{24}$/i;

const COPY = {
  de: {
    title: "Dein Anliegen wird übernommen",
    resuming: "Die vorbereitete Eingabe wird deinem Konto zugeordnet …",
    error: "Die Fortsetzung ist nicht verfügbar oder abgelaufen. Du kannst es erneut versuchen oder neu starten.",
    retry: "Erneut versuchen",
    freshStart: "Neu starten",
  },
  en: {
    title: "Continuing your concern",
    resuming: "The prepared entry is being linked to your account …",
    error: "The continuation is unavailable or has expired. You can retry or start fresh.",
    retry: "Try again",
    freshStart: "Start fresh",
  },
} as const;

function textFor(locale: OperatorLocale) {
  return locale === "de" ? COPY.de : COPY.en;
}

function readAuthoritativeDraftId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.getPrototypeOf(value) !== Object.prototype) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 3 ||
    !keys.includes("ok") ||
    !keys.includes("state") ||
    !keys.includes("draftId") ||
    record.ok !== true ||
    (record.state !== "resumed" && record.state !== "completed") ||
    typeof record.draftId !== "string" ||
    !CANONICAL_DRAFT_ID.test(record.draftId)
  ) {
    return null;
  }
  return record.draftId;
}

export default function AuthenticatedGuestAdoptionResumeClient({
  locale,
}: AuthenticatedGuestAdoptionResumeClientProps) {
  const copy = textFor(locale);
  const router = useRouter();
  const automaticAttempted = useRef(false);
  const inFlight = useRef(false);
  const [status, setStatus] = useState<ResumeStatus>("resuming");

  const resume = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("resuming");

    try {
      const response = await fetch("/api/create/adoption-resume", {
        method: "POST",
        headers: createMutationRequestHeaders(),
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        setStatus("error");
        return;
      }

      const draftId = readAuthoritativeDraftId(await response.json());
      if (!draftId) {
        setStatus("error");
        return;
      }

      router.replace(`/create?draftId=${encodeURIComponent(draftId)}`);
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (automaticAttempted.current) return;
    automaticAttempted.current = true;
    void resume();
  }, [resume]);

  const isResuming = status === "resuming";

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
        <section
          aria-labelledby="guest-adoption-resume-title"
          aria-busy={isResuming}
          className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/15 dark:bg-white/5 sm:p-8"
        >
          <h1 id="guest-adoption-resume-title" className="text-2xl font-semibold tracking-tight">
            {copy.title}
          </h1>

          <div className="mt-4 text-sm leading-6" aria-live="polite">
            {isResuming ? <p role="status">{copy.resuming}</p> : null}
            {status === "error" ? <p role="alert">{copy.error}</p> : null}
          </div>

          {status === "error" ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void resume()}
                className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
              >
                {copy.retry}
              </button>
              <Link className="text-sm underline underline-offset-4" href="/create">
                {copy.freshStart}
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
