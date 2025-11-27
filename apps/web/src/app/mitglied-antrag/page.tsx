"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  EDEBATTE_PLANS,
  MEMBER_DISCOUNT,
  type EDebattePlanId,
} from "@/config/pricing";

export default function MitgliedAntragPage() {
  const searchParams = useSearchParams();
  const betrag = searchParams.get("betrag");
  const rhythm = searchParams.get("rhythm");
  const personen = searchParams.get("personen");
  const planId = searchParams.get("edbPlan") as EDebattePlanId | null;
  const selectedPlan = planId
    ? EDEBATTE_PLANS.find((plan) => plan.id === planId) ?? null
    : null;

  const [submitted, setSubmitted] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // hier später: API-Call / Mailversand
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-3xl px-4 py-16 space-y-8">
        <header className="space-y-3">
          <h1
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Mitgliedsantrag – VoiceOpenGov
          </h1>
          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
            Fast geschafft: Mit diesem Formular stellst du deinen Mitgliedsantrag für die VoiceOpenGov-Bewegung.
            Nach der finalen Bestätigung erhältst du eine E-Mail mit allen weiteren Infos zur Zahlung und zur
            Aktivierung deines Zugangs.
          </p>
        </header>

        {/* Zusammenfassung aus dem Rechner */}
        <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2 text-xs md:text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Dein Vorschlag aus dem Rechner</p>
          <p>
            <span className="font-medium">Beitrag gesamt:</span>{" "}
            {betrag ? `${betrag.replace(".", ",")} €` : "—"}
            {rhythm ? ` · ${rhythm}` : ""}
          </p>
          <p>
            <span className="font-medium">Anzahl Personen (≥ 16 Jahre):</span>{" "}
            {personen ?? "—"}
          </p>
          {selectedPlan && (
            <p className="text-xs text-slate-700">
              Gewähltes eDebatte-Paket: <strong>{selectedPlan.label}</strong>.{" "}
              Listenpreis: {selectedPlan.listPrice.amount.toFixed(2)} € /{" "}
              {selectedPlan.listPrice.interval === "month" ? "Monat" : "Jahr"} – als VOG-Mitglied erhältst du
              darauf automatisch {MEMBER_DISCOUNT.percent}% Nachlass.
            </p>
          )}
          <p className="text-[11px] text-slate-600">
            Du kannst deinen Beitrag im nächsten Schritt noch anpassen. Der Vorschlag soll nur eine faire
            Orientierung geben.
          </p>
          <p className="text-[11px] text-slate-600">
            Mitgliedschaft (ideell) und App-Pakete (Produkt) werden buchhalterisch getrennt. Rabatte werden später
            im Abrechnungssystem umgesetzt – hier siehst du nur die Vorschau bzw. Absichtserklärung.
          </p>
        </section>

        {/* Formular */}
        <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] p-6 md:p-8">
          {submitted ? (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="text-base font-semibold text-slate-900">
                Danke für deinen Antrag!
              </p>
              <p>
                Deine Angaben wurden lokal erfasst. In der echten Version wird an dieser Stelle eine
                Bestätigungsmail verschickt und unser Team informiert. Bis dahin kannst du uns deinen Antrag
                auch direkt per E-Mail schicken:{" "}
                <a
                  href="mailto:hello@voiceopengov.org"
                  className="font-medium text-sky-700 underline underline-offset-2"
                >
                  hello@voiceopengov.org
                </a>
                .
              </p>
              <p>
                Du kannst jederzeit zu{" "}
                <Link href="/mitglied-werden" className="text-sky-700 underline underline-offset-2">
                  „Mitglied werden“
                </Link>{" "}
                zurückspringen und deinen Beitrag neu berechnen.
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Personendaten */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Persönliche Angaben</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Vorname
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Nachname
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      E-Mail
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Telefon (optional)
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">Adresse</h2>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Straße &amp; Hausnummer
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      PLZ
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Ort
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Land
                  </label>
                  <input
                    required
                    type="text"
                    defaultValue="Deutschland"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Beitrag & Fokus */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Beitrag &amp; Fokus
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Gewünschter Mitgliedsbeitrag (gesamt)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      defaultValue={betrag ?? undefined}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Rhythmus
                    </label>
                    <select
                      defaultValue={rhythm ?? "monatlich"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="monatlich">monatlich</option>
                      <option value="einmalig">einmalig</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Wie möchtest du dich – neben deinem Beitrag – einbringen? (optional)
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder="z. B. Moderation, Design, Tech, Community-Management, Übersetzungen …"
                  />
                </div>
              </div>

              {/* Bestätigungen */}
              <div className="space-y-2 text-xs md:text-sm text-slate-700">
                <label className="flex items-start gap-2">
                  <input
                    required
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    Ich bestätige, dass ich die Satzung von VoiceOpenGov gelesen habe und meine Mitgliedschaft
                    im Rahmen dieser Regeln führen möchte.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    required
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>
                    Ich bin mit der Verarbeitung meiner Daten zur Bearbeitung des Mitgliedsantrags einverstanden.
                  </span>
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <Link
                  href="/mitglied-werden"
                  className="text-xs md:text-sm text-slate-600 underline underline-offset-2 hover:text-slate-800"
                >
                  Zurück zur Beitragsempfehlung
                </Link>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105"
                >
                  Mitgliedsantrag absenden
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}