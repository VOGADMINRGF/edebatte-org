// apps/web/src/app/widerspruch/page.tsx
"use client";

import { useState } from "react";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CONTACT_MAIL = "kontakt@edebatte.org";
type SelfServiceAction = "cancel_membership" | "delete_account";

const encodeMailParam = (value: string) => encodeURIComponent(value);

export default function WiderspruchPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "widerspruch" });
  const [selfAction, setSelfAction] = useState<SelfServiceAction>("cancel_membership");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [ack, setAck] = useState(false);

  const subjectCancel = encodeMailParam(
    t("Kündigung / Widerspruch – eDebatte", "mail.cancel.subject"),
  );
  const bodyCancel = encodeMailParam(
    [
      t("Hallo eDebatte-Team,", "mail.cancel.0"),
      "",
      t(
        "hiermit kündige ich meine Mitgliedschaft / mein Paket bzw. widerspreche der weiteren Nutzung meiner Daten.",
        "mail.cancel.1",
      ),
      "",
      t("Name:", "mail.cancel.2"),
      t("E-Mail-Adresse (mit der ich bei euch registriert bin):", "mail.cancel.3"),
      "",
      t("Bitte bestätigt mir den Eingang dieser Nachricht.", "mail.cancel.4"),
      "",
      t("Vielen Dank.", "mail.cancel.5"),
    ].join("\n"),
  );

  const subjectData = encodeMailParam(
    t("Widerspruch gegen Datenverarbeitung – eDebatte", "mail.data.subject"),
  );
  const bodyData = encodeMailParam(
    [
      t("Hallo eDebatte-Team,", "mail.data.0"),
      "",
      t(
        "hiermit widerspreche ich der weiteren Verarbeitung meiner personenbezogenen Daten, soweit rechtlich möglich.",
        "mail.data.1",
      ),
      "",
      t("Name:", "mail.data.2"),
      t("E-Mail-Adresse (mit der ich bei euch registriert bin):", "mail.data.3"),
      t("Betroffene Bereiche (z. B. Newsletter, Statistik, Konto):", "mail.data.4"),
      "",
      t("Bitte informiert mich, welche Daten ihr löscht bzw. einschränkt.", "mail.data.5"),
      "",
      t("Vielen Dank.", "mail.data.6"),
    ].join("\n"),
  );
   
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
            {t("Rechtliches", "kicker")}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            {t("Widerspruch & Kündigung", "title")}
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            {t(
              "Hier kannst du einfach der Nutzung deiner Daten widersprechen oder deine Mitgliedschaft bzw. dein Paket kündigen. Ohne Begründung, ohne Hürden.",
              "lead",
            )}
          </p>
        </header>

        {/* Schnellaktionen */}
        <section
          aria-labelledby="quick-actions-heading"
          className="bg-white/95 border border-slate-100 rounded-3xl p-5 md:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2
                id="quick-actions-heading"
                className="text-base font-semibold text-slate-900"
              >
                {t("Direkt widersprechen oder kündigen", "quick.title")}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t(
                  "Die Buttons öffnen dein Mail-Programm mit einer vorausgefüllten Nachricht. Du kannst den Text vor dem Senden jederzeit anpassen.",
                  "quick.body",
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <a
              href={`mailto:${CONTACT_MAIL}?subject=${subjectCancel}&body=${bodyCancel}`}
              className="group flex flex-col justify-between rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {t("Mitgliedschaft / Paket kündigen", "quick.cancel.title")}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {t(
                    "Beendet deine Mitgliedschaft oder dein gebuchtes Paket. Wir bestätigen dir die Kündigung per E-Mail.",
                    "quick.cancel.body",
                  )}
                </p>
              </div>
              <span className="mt-2 text-xs font-medium text-sky-700 group-hover:underline">
                {t("Kündigung per E-Mail öffnen", "quick.cancel.cta")}
              </span>
            </a>

            <a
              href={`mailto:${CONTACT_MAIL}?subject=${subjectData}&body=${bodyData}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {t("Widerspruch gegen Datenverarbeitung", "quick.data.title")}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {t(
                    "Du kannst z. B. Newsletter, Statistik-Auswertungen oder dein Konto betreffen lassen.",
                    "quick.data.body",
                  )}
                </p>
              </div>
              <span className="mt-2 text-xs font-medium text-sky-700 group-hover:underline">
                {t("Widerspruch per E-Mail öffnen", "quick.data.cta")}
              </span>
            </a>
          </div>
        </section>

        {/* Selbst erledigen (systemseitig) */}
        <section
          aria-labelledby="self-service-heading"
          className="bg-white/95 border border-slate-100 rounded-3xl p-5 md:p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] space-y-4"
        >
          <div className="flex flex-col gap-2">
            <h2
              id="self-service-heading"
              className="text-base font-semibold text-slate-900"
            >
              {t("Direkt hier erledigen (eingeloggt)", "self.title")}
            </h2>
            <p className="text-sm text-slate-600">
              {t(
                "Wenn du eingeloggt bist, kannst du hier dein Konto herunterstufen oder zur Löschung vormerken. Bei der Löschung fragen wir dein Passwort ab und melden dich danach ab.",
                "self.body",
              )}
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setStatus("pending");
              setMessage(null);
              if (!ack) {
                setStatus("error");
                setMessage(t("Bitte bestätige kurz, dass du den Vorgang verstanden hast.", "self.ack"));
                return;
              }
              if (selfAction === "delete_account" && !password.trim()) {
                setStatus("error");
                setMessage(t("Bitte Passwort eingeben, um die Löschung zu bestätigen.", "self.password"));
                return;
              }
              try {
                const res = await fetch("/api/account/self-service", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ action: selfAction, note, password: password || undefined }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  throw new Error(body?.error || t("Aktion fehlgeschlagen", "self.failed"));
                }
                setStatus("success");
                setMessage(
                  selfAction === "cancel_membership"
                    ? t("Mitgliedschaft wird beendet. Wir bestätigen per E-Mail.", "self.success.cancel")
                    : t("Löschung angestoßen – wir melden dich ab.", "self.success.delete"),
                );
                if (body?.next) {
                  setTimeout(() => {
                    window.location.href = body.next;
                  }, 800);
                }
              } catch (err: any) {
                setStatus("error");
                setMessage(err?.message ?? t("Aktion fehlgeschlagen", "self.failed"));
              }
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name="selfAction"
                  value="cancel_membership"
                  checked={selfAction === "cancel_membership"}
                  onChange={() => setSelfAction("cancel_membership")}
                  className="mt-1 h-4 w-4 text-sky-600"
                />
                <div>
                  <p className="font-semibold text-slate-900">
                    {t("Mitgliedschaft beenden", "self.option.cancel.title")}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t(
                      "Status wird beendet, Beiträge gestoppt, Haushalt gesperrt.",
                      "self.option.cancel.body",
                    )}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name="selfAction"
                  value="delete_account"
                  checked={selfAction === "delete_account"}
                  onChange={() => setSelfAction("delete_account")}
                  className="mt-1 h-4 w-4 text-sky-600"
                />
                <div>
                  <p className="font-semibold text-slate-900">
                    {t("Account-Löschung anstoßen", "self.option.delete.title")}
                  </p>
                  <p className="text-xs text-slate-600">
                    {t(
                      "Markiert dein Konto zur Löschung (inkl. Kündigung von Paketen) – wir melden dich danach ab.",
                      "self.option.delete.body",
                    )}
                  </p>
                </div>
              </label>
            </div>

            {selfAction === "delete_account" && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="deletePassword">
                  {t("Passwort zur Bestätigung", "self.password.label")}
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("Passwort eingeben", "self.password.placeholder")}
                  required
                  autoComplete="current-password"
                  disabled={status === "pending"}
                />
              </div>
            )}

            <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-sky-600"
              />
              <span>
                {t(
                  "Ich bestätige, dass ich die Konsequenzen verstanden habe (Beendigung bzw. Löschung). Dieser Schritt ersetzt eine gesonderte Bestätigung per E-Mail.",
                  "self.ack.copy",
                )}
              </span>
            </label>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                {t("Optionaler Hinweis", "self.note.label")}
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t(
                  "Optionaler Kommentar, falls wir etwas beachten sollen.",
                  "self.note.placeholder",
                )}
              />
            </div>

            {message && (
              <p
                className={`text-sm ${
                  status === "error" ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={status === "pending"}
            >
              {status === "pending"
                ? t("Wird ausgeführt …", "self.submit.pending")
                : selfAction === "cancel_membership"
                  ? t("Mitgliedschaft beenden", "self.submit.cancel")
                  : t("Löschanfrage stellen", "self.submit.delete")}
            </button>
          </form>
        </section>

        {/* Erläuterungen in einfacher Sprache */}
        <section
          aria-labelledby="info-heading"
          className="space-y-4 text-slate-700"
        >
          <h2 id="info-heading" className="text-base font-semibold text-slate-900">
            {t("Was du hier tun kannst", "info.title")}
          </h2>
          <div className="bg-white/95 border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm">
            <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
              <li>
                <span className="font-semibold">
                  {t("Mitgliedschaft / Paket kündigen:", "info.0.title")}
                </span>{" "}
                {t(
                  "Du kannst deine Zahlungen beenden und dein Konto schließen lassen.",
                  "info.0.body",
                )}
              </li>
              <li>
                <span className="font-semibold">
                  {t("Widerspruch gegen Datenverarbeitung:", "info.1.title")}
                </span>{" "}
                {t(
                  "Du kannst der Nutzung deiner personenbezogenen Daten für bestimmte Zwecke widersprechen, zum Beispiel Newsletter oder Statistik.",
                  "info.1.body",
                )}
              </li>
              <li>
                <span className="font-semibold">
                  {t("Keine Begründung nötig:", "info.2.title")}
                </span>{" "}
                {t(
                  "Du musst deinen Widerspruch nicht begründen. Ein kurzer Hinweis reicht aus.",
                  "info.2.body",
                )}
              </li>
              <li>
                <span className="font-semibold">{t("Barrierefrei:", "info.3.title")}</span>{" "}
                {t(
                  "Wenn du Unterstützung brauchst (z. B. einfache Sprache), schreib das gern in deine Nachricht – wir versuchen, dir so klar und verständlich wie möglich zu antworten.",
                  "info.3.body",
                )}
              </li>
            </ul>
          </div>
        </section>

        {/* Alternative Kontaktwege */}
        <section
          aria-labelledby="alt-contact-heading"
          className="space-y-3 text-slate-700"
        >
          <h2
            id="alt-contact-heading"
            className="text-base font-semibold text-slate-900"
          >
            {t("Alternative Kontaktwege", "alt.title")}
          </h2>
          <p className="text-sm leading-relaxed">
            {t(
              "Wenn die Buttons oben bei dir nicht funktionieren, kannst du uns auch direkt an diese Adresse schreiben:",
              "alt.body",
            )}
          </p>
          <p className="text-sm">
            <a
              href={`mailto:${CONTACT_MAIL}`}
              className="font-medium text-sky-700 underline underline-offset-4"
            >
              {CONTACT_MAIL}
            </a>
          </p>
          <p className="text-xs text-slate-500">
            {t(
              "Bitte gib immer die E-Mail-Adresse an, mit der du bei eDebatte registriert bist. So können wir dein Konto eindeutig zuordnen.",
              "alt.note",
            )}
          </p>
        </section>
      </div>
    </main>
  );
}
