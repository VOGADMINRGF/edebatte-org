"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";
import type { HumanChallenge } from "@/lib/spam/humanChallenge";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, any>) => string;
      reset?: (id?: string) => void;
      remove?: (id?: string) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const SHAPE_OPTIONS = [
  {
    value: "kreis",
    label: "Kreis",
    hint: "blau",
    shape: "circle" as const,
    gradient: "bg-gradient-to-br from-sky-400 to-blue-600",
  },
  {
    value: "rechteck",
    label: "Rechteck",
    hint: "türkis",
    shape: "rect" as const,
    gradient: "bg-gradient-to-br from-teal-300 to-cyan-400",
  },
  {
    value: "dreieck",
    label: "Dreieck",
    hint: "grün",
    shape: "triangle" as const,
    gradient: "bg-gradient-to-br from-emerald-300 to-emerald-500",
  },
];

type Props = {
  sent?: boolean;
  error?: string;
  challenge: HumanChallenge;
};

function useFormStartTimestamp() {
  const [formStartedAt, setFormStartedAt] = useState<string>("");
  useEffect(() => {
    setFormStartedAt(String(Date.now()));
  }, []);
  return formStartedAt;
}

function useTurnstile() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !widgetRef.current) return;
    let cancelled = false;

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.turnstile) return resolve();
        const existing = document.querySelector<HTMLScriptElement>(
          "script[data-turnstile]"
        );
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true });
          existing.addEventListener("error", () => reject(new Error("load")), {
            once: true,
          });
          return;
        }
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("load"));
        document.head.appendChild(script);
      });

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || !widgetRef.current) return;
        try {
          const id = window.turnstile.render(widgetRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            "response-field": false,
            callback: (val: string) => setToken(val),
            "error-callback": () => setError("verify_failed"),
            "expired-callback": () => setToken(""),
          });
          widgetIdRef.current = id;
        } catch (e) {
          setError("render_failed");
        }
      })
      .catch(() => setError("load_failed"));

    return () => {
      cancelled = true;
      if (widgetIdRef.current) {
        window.turnstile?.reset?.(widgetIdRef.current);
        window.turnstile?.remove?.(widgetIdRef.current);
      }
    };
  }, []);

  return { token, error, widgetRef };
}

const errorText: Record<string, string> = {
  ratelimit: "Kurz zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut oder schreib direkt an kontakt@edebatte.org.",
  captcha:
    "Die Verifizierung konnte nicht abgeschlossen werden. Bitte lade die Seite neu oder schreib uns direkt an kontakt@edebatte.org.",
  invalid:
    "Die Angaben waren unvollständig. Bitte prüfe die Felder oder schreib direkt an kontakt@edebatte.org.",
  challenge:
    "Die Sicherheitsfrage wurde nicht korrekt beantwortet. Bitte versuche es erneut oder schreib uns direkt an kontakt@edebatte.org.",
  shape:
    "Bitte klicke die korrekte Form an (Kreis). Sollte das nicht funktionieren, schreib uns direkt an kontakt@edebatte.org.",
};

export default function KontaktForm({ sent, error, challenge }: Props) {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "kontakt-form" });
  const formStartedAt = useFormStartTimestamp();
  const { token: turnstileToken, error: turnstileError, widgetRef } = useTurnstile();
  const showTurnstile = Boolean(TURNSTILE_SITE_KEY);
  const displayError = error
    ? t(errorText[error] ?? errorText.invalid, `error.${error}`)
    : null;
  const [shapes, setShapes] = useState(SHAPE_OPTIONS);

  const reshuffleShapes = () => {
    const arr = [...SHAPE_OPTIONS];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShapes(arr);
  };

  return (
    <section
      id="kontaktformular"
      className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100"
    >
      <h2 className="text-base font-semibold text-slate-900 text-center">
        {t("Kontaktformular", "title")}
      </h2>
      <p className="mt-1 text-center text-xs text-slate-600">
        {t("Wir routen dein Anliegen intern an die passende Stelle.", "lead")}
      </p>
      {sent && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
          {t(
            "Danke! Deine Nachricht ist bei uns angekommen. Wir freuen uns über jedes Feedback und melden uns zeitnah.",
            "sent",
          )}
        </div>
      )}
      {displayError && (
        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
          {displayError}
        </div>
      )}
      {!sent && turnstileError && showTurnstile && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t(
            "Die Schutzabfrage konnte nicht geladen werden. Du kannst das Formular trotzdem absenden oder uns direkt per Mail an",
            "turnstile.failed",
          )}{" "}
          <a
            href="mailto:kontakt@edebatte.org"
            className="font-semibold text-amber-900 underline underline-offset-4"
          >
            kontakt@edebatte.org
          </a>{" "}
          {t("schreiben.", "turnstile.end")}
        </div>
      )}

      <form className="mt-5 space-y-4 relative" action="/api/contact" method="POST">
        <input type="hidden" name="formStartedAt" value={formStartedAt} readOnly />
        <input type="hidden" name="turnstileToken" value={turnstileToken} readOnly />
        <input type="hidden" name="humanChallengeId" value={challenge.id} readOnly />

        <div className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
          <label htmlFor="website">{t("Bitte dieses Feld frei lassen", "hp.label")}</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          <input id="hp_contact" name="hp_contact" type="text" tabIndex={-1} autoComplete="off" />
          <input id="hp_company" name="hp_company" type="text" tabIndex={-1} autoComplete="off" />
          <input id="hp_message_copy" name="hp_message_copy" type="text" tabIndex={-1} autoComplete="off" />
          <input id="hp_social" name="hp_social" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="category" className="block text-xs font-semibold text-slate-700">
            {t("Worum geht es?", "category.label")}
          </label>
          <select
            id="category"
            name="category"
            required
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">{t("Bitte auswählen …", "category.placeholder")}</option>
            <option value="juristisch">{t("Juristische / rechtliche Anfrage", "category.legal")}</option>
            <option value="presse">{t("Presse- / Interviewanfrage", "category.press")}</option>
            <option value="medien">{t("Medien / Kooperation", "category.media")}</option>
            <option value="partei">{t("Partei, Fraktion oder Mandatsträger:in", "category.party")}</option>
            <option value="bewerbung">{t("Bewerbung / Mitarbeit", "category.apply")}</option>
            <option value="sonstiges">{t("Sonstiges Anliegen", "category.other")}</option>
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-xs font-semibold text-slate-700">
              {t("Name", "name.label")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
              {t("E-Mail", "email.label")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">
            {t("Telefon (optional)", "phone.label")}
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder={t(
            "Wenn du einen Rückruf wünschst, gib bitte eine Nummer an.",
            "phone.placeholder",
          )}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="subject" className="block text-xs font-semibold text-slate-700">
          {t("Betreff (optional)", "subject.label")}
        </label>
          <input
            id="subject"
            name="subject"
            type="text"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder={t("Worum geht es in einem Satz?", "subject.placeholder")}
          maxLength={200}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="block text-xs font-semibold text-slate-700">
          {t("Nachricht", "message.label")}
        </label>
          <textarea
            id="message"
            name="message"
            required
          rows={6}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder={t("Wie können wir dir helfen?", "message.placeholder")}
          maxLength={5000}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("Human Check", "human.title")}
          </p>
          <p className="text-sm text-slate-700">
            {t("Bitte den", "human.copy.lead")}{" "}
            <span className="font-semibold text-slate-900">
              {t("blauen Kreis", "human.copy.shape")}
            </span>{" "}
            {t(
              "auswählen und die Farbe ins Feld schreiben. Hinweis: Rechteck ist türkis, Dreieck ist grün.",
              "human.copy.tail",
            )}
          </p>
        </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold text-slate-600">
                  {t("Klickcheck", "human.clickcheck")}
                </p>
                <button
                  type="button"
                  onClick={reshuffleShapes}
                  className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-4"
                >
                  {t("Challenge neu mischen", "human.shuffle")}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {shapes.map((shape) => (
                  <label className="block" key={shape.value}>
                    <input
                      type="radio"
                      name="humanShape"
                      value={shape.value}
                      required={shape.value === "kreis"}
                      className="peer sr-only"
                      aria-label={`${t(shape.label, `shape.${shape.value}.label`)} (${t(
                        shape.hint,
                        `shape.${shape.value}.hint`,
                      )})`}
                    />
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-sky-200 hover:shadow-md peer-checked:border-sky-500 peer-checked:ring-2 peer-checked:ring-sky-100">
                      <span className="flex h-10 w-10 items-center justify-center">
                        {shape.shape === "circle" && (
                          <span className={`block h-8 w-8 rounded-full ${shape.gradient} shadow-inner`} />
                        )}
                        {shape.shape === "rect" && (
                          <span className={`block h-8 w-8 rounded-lg ${shape.gradient}`} />
                        )}
                        {shape.shape === "triangle" && (
                          <span
                            className={`block h-8 w-8 ${shape.gradient}`}
                            style={{ clipPath: "polygon(50% 0, 0 100%, 100% 100%)" }}
                          />
                        )}
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-slate-900">
                          {t(shape.label, `shape.${shape.value}.label`)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {t(shape.hint, `shape.${shape.value}.hint`)}{" "}
                          {shape.value === "kreis"
                            ? t("(anklicken)", "shape.pick")
                            : t("(nicht auswählen)", "shape.skip")}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="humanAnswer" className="text-[11px] font-semibold text-slate-600">
                {t("Kurze Schreibfrage", "human.short.title")}
              </label>
              <p className="text-[11px] text-slate-600">
                {t(
                  "Schreibe die Farbe des angeklickten Kreises ins Feld (Tipp: blau).",
                  "human.short.hint",
                )}
              </p>
              <input
                id="humanAnswer"
                name="humanAnswer"
                type="text"
                autoComplete="off"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                placeholder={t('Bitte "blau" eintragen', "human.short.placeholder")}
              />
            </div>
          </div>
        </div>

        {showTurnstile && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
            <p className="text-[11px] text-slate-600">
              {t("Kurze Bestätigung, dass du kein Bot bist:", "turnstile.prompt")}
            </p>
            <div ref={widgetRef} className="mt-2" aria-live="polite" />
          </div>
        )}

        <div className="flex items-start gap-2 pt-1">
          <input
            id="newsletterOptIn"
            name="newsletterOptIn"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <label htmlFor="newsletterOptIn" className="text-[11px] leading-snug text-slate-600">
            {t(
              "Ich möchte gelegentlich Updates und Informationen zu eDebatte erhalten (Newsletter). Du kannst dich jederzeit wieder abmelden.",
              "newsletter.optin",
            )}
          </label>
        </div>

        <p className="text-[11px] text-slate-500">
          {t(
            "Mit dem Absenden erklärst du dich einverstanden, dass wir deine Angaben zur Bearbeitung deiner Anfrage verarbeiten. Vollständige Datenschutz-Hinweise folgen nach Gesellschaftseintragung.",
            "legal.copy",
          )}
        </p>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="submit"
            className="btn btn-primary w-full px-8 py-3 text-sm font-semibold shadow-soft md:w-auto md:px-10"
          >
            {t("Anfrage absenden", "submit")}
          </button>

          <Link
            href="mailto:kontakt@edebatte.org"
            className="btn btn-ghost w-full px-4 py-3 text-center text-sm font-semibold md:w-auto"
          >
            {t("Oder direkt per E-Mail schreiben", "submit.alt")}
          </Link>
        </div>
      </form>
    </section>
  );
}
