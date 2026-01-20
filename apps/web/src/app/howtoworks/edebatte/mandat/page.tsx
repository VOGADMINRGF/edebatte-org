"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";

const hero = {
  kicker_de: "eDebatte Modul",
  title_de: "Mandat & Umsetzung",
  lead_de:
    "Entscheidungen bleiben nicht im Papierkorb. Mandat, Verantwortlichkeiten und Wirkung werden sichtbar gemacht.",
};

const heroChips = ["Mandat", "Meilensteine", "Risiken", "Wirkung"];
const heroImage = {
  src: "/dummy/dummy6.jpg",
  alt: "Platzhalter Illustration für Mandat & Umsetzung",
};

const overview = {
  title_de: "Worum es geht",
  body_de:
    "Nach der Abstimmung dokumentiert eDebatte das Mandat: Wer ist zuständig, was ist das Ziel, welche Schritte folgen? eDebatte sorgt für klare Regeln, eDebatte macht Umsetzung und Wirkung sichtbar.",
};

const features = {
  title_de: "Funktionen im Überblick",
  items_de: [
    "Mandat und Zuständigkeiten klar festhalten.",
    "Meilensteine und Zeitplan transparent machen.",
    "Risiken, Abhängigkeiten und offene Fragen dokumentieren.",
    "Aufbereitete Datenpakete als Entscheidungsgrundlage bereitstellen.",
    "Fortschritt und Wirkung öffentlich nachverfolgen.",
  ],
};

const outputs = {
  title_de: "Ergebnisse & Wirkung",
  items_de: [
    "Aufbereitete Entscheidungsgrundlagen für Politik und Verwaltung.",
    "Öffentlicher Umsetzungsplan mit klaren Zuständigkeiten.",
    "Transparente Rechenschaft über Fortschritt und Abweichungen.",
    "Lernbasis für die nächste Entscheidung.",
  ],
};

const example = {
  title_de: "Beispiel",
  body_de:
    "Energieeffizienz-Programm: Nach dem Mandat werden Meilensteine, Budgetrahmen und Wirkungskennzahlen veröffentlicht. Fortschritte bleiben nachvollziehbar – vom Start bis zur Wirkung.",
};

export default function MandatPage() {
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
            <Link href="/howtoworks/edebatte#rolle-verwaltung" className="btn bg-brand-grad text-white shadow-soft">
              Zur Rolle Verwaltung & Repräsentant:innen
            </Link>
            <Link href="/howtoworks/edebatte" className="btn border border-slate-300 bg-white">
              Zurück zur Übersicht
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
            <h2 className="text-base font-semibold text-slate-900">{text(features, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {features.items_de.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
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

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{text(example, "title")}</h2>
          <p className="mt-2 text-sm text-slate-700">{text(example, "body")}</p>
        </section>
      </section>
    </main>
  );
}
