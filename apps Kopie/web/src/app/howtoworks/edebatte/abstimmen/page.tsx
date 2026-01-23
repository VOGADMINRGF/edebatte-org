"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";

const hero = {
  kicker_de: "eDebatte Modul",
  title_de: "Abstimmen & Ergebnis",
  lead_de:
    "Geheime Stimme, klare Regeln, nachvollziehbare Ergebnisse. So wird Beteiligung fair und belastbar.",
};

const heroChips = ["Geheime Stimme", "Quorum", "Minderheitenbericht", "Prüfprotokoll"];
const heroImage = {
  src: "/dummy/dummy5.jpg",
  alt: "Platzhalter Illustration für Abstimmen & Ergebnis",
};

const overview = {
  title_de: "Worum es geht",
  body_de:
    "Nach dem Dossier folgt die Abstimmung. eDebatte steht für faire Regeln, eDebatte setzt sie transparent um: Identität und Stimmzettel sind getrennt, Ergebnis, Beteiligung und Quorum bleiben nachvollziehbar. Die Ergebnisse liefern Mandate für Politik, Orientierung für Verbände und belastbares Material für Redaktionen.",
};

const steps = [
  "Vorlage lesen: Kurztext, Begründung, Pro & Contra, Quellen und Unsicherheiten.",
  "Berechtigung prüfen: Regeln sind vorab klar sichtbar.",
  "Stimme abgeben: geheim und technisch getrennt von deiner Identität.",
  "Auswertung: Quorum und Mehrheiten werden automatisch berechnet.",
  "Ergebnis veröffentlichen: inkl. Minderheitenbericht und Prüfprotokoll.",
];

const outputs = {
  title_de: "Was du bekommst",
  items_de: [
    "Ergebnis mit Beteiligung, Quorum und Mehrheitslage.",
    "Minderheitenbericht als fester Bestandteil.",
    "Mandat als klare Grundlage für die Umsetzung.",
    "Exportierbare Ergebnisdaten für Politik, Verbände und Redaktionen.",
  ],
};

const safeguards = {
  title_de: "Fairness & Sicherheit",
  items_de: [
    "Eine Person, eine Stimme – keine Zusatzrechte durch Geld oder Rolle.",
    "Identität und Stimmzettel sind technisch getrennt.",
    "Regeln werden vor der Abstimmung sichtbar gemacht und dokumentiert.",
  ],
};

const example = {
  title_de: "Beispiel",
  body_de:
    "Tempo 30 vor Schulen: Die Gemeinschaft stimmt über eine klar formulierte Vorlage ab. Ergebnis, Beteiligung und Minderheitenbericht sind öffentlich nachvollziehbar.",
};

export default function AbstimmenPage() {
  const { locale } = useLocale();
  const text = React.useCallback(
    (entry: Record<string, any>, key: string) => resolveLocalizedField(entry, key, locale),
    [locale],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {text(hero, "kicker")}
          </p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900">
            {text(hero, "title")}
          </h1>
          <p className="text-lg text-slate-700">{text(hero, "lead")}</p>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
            {heroChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border px-3 py-1 shadow-sm"
                style={{ borderColor: "var(--chip-border)", background: "rgba(14,165,233,0.08)" }}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/howtoworks/edebatte#rolle-buerger" className="btn bg-brand-grad text-white shadow-soft">
              Zur Rolle Bürger:innen
            </Link>
            <Link href="/howtoworks/edebatte/mandat" className="btn border border-slate-300 bg-white">
              Weiter zu Mandat & Umsetzung
            </Link>
          </div>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="aspect-[16/9]">
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{text(overview, "title")}</h2>
          <p className="mt-2 text-sm text-slate-700">{text(overview, "body")}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">So läuft es ab</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{text(outputs, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {outputs.items_de.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{text(safeguards, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {safeguards.items_de.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">{text(example, "title")}</h2>
            <p className="mt-2 text-sm text-slate-700">{text(example, "body")}</p>
          </article>
        </section>
      </section>
    </main>
  );
}
