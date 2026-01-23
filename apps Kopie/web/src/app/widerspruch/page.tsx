// apps/web/src/app/widerspruch/page.tsx
"use client";

import { useState } from "react";

const CONTACT_MAIL = "kontakt@edebatte.org";
type SelfServiceAction = "cancel_membership" | "delete_account";

const encodeMailParam = (value: string) => encodeURIComponent(value);

export default function WiderspruchPage() {
  const [selfAction, setSelfAction] = useState<SelfServiceAction>("cancel_membership");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [ack, setAck] = useState(false);

  const subjectCancel = encodeMailParam(
    "Kündigung / Widerspruch – eDebatte"
  );
  const bodyCancel = encodeMailParam(
    [
      "Hallo eDebatte-Team,",
      "",
      "hiermit kündige ich meine Mitgliedschaft / mein Paket bzw. widerspreche der weiteren Nutzung meiner Daten.",
      "",
      "Name:",
      "E-Mail-Adresse (mit der ich bei euch registriert bin):",
      "",
      "Bitte bestätigt mir den Eingang dieser Nachricht.",
      "",
      "Vielen Dank.",
    ].join("\n")
  );

  const subjectData = encodeMailParam(
    "Widerspruch gegen Datenverarbeitung – eDebatte"
  );
  const bodyData = encodeMailParam(
    [
      "Hallo eDebatte-Team,",
      "",
      "hiermit widerspreche ich der weiteren Verarbeitung meiner personenbezogenen Daten, soweit rechtlich möglich.",
      "",
      "Name:",
      "E-Mail-Adresse (mit der ich bei euch registriert bin):",
      "Betroffene Bereiche (z. B. Newsletter, Statistik, Konto):",
      "",
      "Bitte informiert mich, welche Daten ihr löscht bzw. einschränkt.",
      "",
      "Vielen Dank.",
    ].join("\n")
  );
   
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <div className="mx-auto max-w-3xl px-4 py-16 space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
            Rechtliches
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
            Widerspruch &amp; Kündigung
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
            Hier kannst du einfach der Nutzung deiner Daten widersprechen oder
            deine Mitgliedschaft bzw. dein Paket kündigen. Ohne Begründung, ohne
            Hürden.
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
                Direkt widersprechen oder kündigen
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Die Buttons öffnen dein Mail-Programm mit einer
                vorausgefüllten Nachricht. Du kannst den Text vor dem Senden
                jederzeit anpassen.
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
                  Mitgliedschaft / Paket kündigen
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Beendet deine Mitgliedschaft oder dein gebuchtes Paket. Wir
                  bestätigen dir die Kündigung per E-Mail.
                </p>
              </div>
              <span className="mt-2 text-xs font-medium text-sky-700 group-hover:underline">
                Kündigung per E-Mail öffnen
              </span>
            </a>

            <a
              href={`mailto:${CONTACT_MAIL}?subject=${subjectData}&body=${bodyData}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Widerspruch gegen Datenverarbeitung
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Du kannst z.&nbsp;B. Newsletter, Statistik-Auswertungen oder
                  dein Konto betreffen lassen.
                </p>
              </div>
              <span className="mt-2 text-xs font-medium text-sky-700 group-hover:underline">
                Widerspruch per E-Mail öffnen
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
              Direkt hier erledigen (eingeloggt)
            </h2>
            <p className="text-sm text-slate-600">
              Wenn du eingeloggt bist, kannst du hier dein Konto herunterstufen oder zur Löschung vormerken.
              Bei der Löschung fragen wir dein Passwort ab und melden dich danach ab.
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
                setMessage("Bitte bestätige kurz, dass du den Vorgang verstanden hast.");
                return;
              }
              if (selfAction === "delete_account" && !password.trim()) {
                setStatus("error");
                setMessage("Bitte Passwort eingeben, um die Löschung zu bestätigen.");
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
                  throw new Error(body?.error || "Aktion fehlgeschlagen");
                }
                setStatus("success");
                setMessage(
                  selfAction === "cancel_membership"
                    ? "Mitgliedschaft wird beendet. Wir bestätigen per E-Mail."
                    : "Löschung angestoßen – wir melden dich ab."
                );
                if (body?.next) {
                  setTimeout(() => {
                    window.location.href = body.next;
                  }, 800);
                }
              } catch (err: any) {
                setStatus("error");
                setMessage(err?.message ?? "Aktion fehlgeschlagen");
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
                  <p className="font-semibold text-slate-900">Mitgliedschaft beenden</p>
                  <p className="text-xs text-slate-600">
                    Status wird beendet, Beiträge gestoppt, Haushalt gesperrt.
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
                  <p className="font-semibold text-slate-900">Account-Löschung anstoßen</p>
                  <p className="text-xs text-slate-600">
                    Markiert dein Konto zur Löschung (inkl. Kündigung von Paketen) – wir melden dich danach ab.
                  </p>
                </div>
              </label>
            </div>

            {selfAction === "delete_account" && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="deletePassword">
                  Passwort zur Bestätigung
                </label>
                <input
                  id="deletePassword"
                  type="password"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Passwort eingeben"
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
                Ich bestätige, dass ich die Konsequenzen verstanden habe (Beendigung bzw. Löschung). Dieser Schritt ersetzt
                eine gesonderte Bestätigung per E-Mail.
              </span>
            </label>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Optionaler Hinweis
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optionaler Kommentar, falls wir etwas beachten sollen."
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
                ? "Wird ausgeführt …"
                : selfAction === "cancel_membership"
                  ? "Mitgliedschaft beenden"
                  : "Löschanfrage stellen"}
            </button>
          </form>
        </section>

        {/* Erläuterungen in einfacher Sprache */}
        <section
          aria-labelledby="info-heading"
          className="space-y-4 text-slate-700"
        >
          <h2 id="info-heading" className="text-base font-semibold text-slate-900">
            Was du hier tun kannst
          </h2>
          <div className="bg-white/95 border border-slate-100 rounded-3xl p-5 md:p-6 shadow-sm">
            <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
              <li>
                <span className="font-semibold">Mitgliedschaft / Paket kündigen:</span>{" "}
                Du kannst deine Zahlungen beenden und dein Konto schließen
                lassen.
              </li>
              <li>
                <span className="font-semibold">
                  Widerspruch gegen Datenverarbeitung:
                </span>{" "}
                Du kannst der Nutzung deiner personenbezogenen Daten für
                bestimmte Zwecke widersprechen, zum Beispiel Newsletter oder
                Statistik.
              </li>
              <li>
                <span className="font-semibold">Keine Begründung nötig:</span>{" "}
                Du musst deinen Widerspruch nicht begründen. Ein kurzer Hinweis
                reicht aus.
              </li>
              <li>
                <span className="font-semibold">Barrierefrei:</span> Wenn du
                Unterstützung brauchst (z.&nbsp;B. einfache Sprache), schreib
                das gern in deine Nachricht – wir versuchen, dir so klar und
                verständlich wie möglich zu antworten.
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
            Alternative Kontaktwege
          </h2>
          <p className="text-sm leading-relaxed">
            Wenn die Buttons oben bei dir nicht funktionieren, kannst du uns
            auch direkt an diese Adresse schreiben:
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
            Bitte gib immer die E-Mail-Adresse an, mit der du bei eDebatte
            registriert bist. So können wir dein Konto eindeutig zuordnen.
          </p>
        </section>
      </div>
    </main>
  );
}
