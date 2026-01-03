"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";

const hero = {
  kicker_de: "eDebatte Modul",
  title_de: "Dossier & Faktencheck",
  lead_de:
    "Hier bündeln wir Quellen, prüfen Aussagen und machen offene Fragen sichtbar. So entsteht eine belastbare Grundlage für Entscheidungen.",
};

const heroChips = ["Quellenlage", "Pro & Contra", "Unsicherheiten", "Evidenz-Graph"];
const heroImage = {
  src: "/dummy/dummy4.jpg",
  alt: "Platzhalter Illustration für Dossier & Faktencheck",
};

const introBlocks = [
  {
    id: "worum",
    title_de: "Worum es geht",
    body_de:
      "VoiceOpenGov und eDebatte übersetzen Anliegen in prüfbare Aussagen. Das Dossier verknüpft Aussagen mit Quellen, Gegenpositionen und Kontext. So wird sichtbar, worauf eine Entscheidung aufbaut.",
  },
  {
    id: "warum",
    title_de: "Warum das wichtig ist",
    body_de:
      "Gut dokumentierte Grundlagen schützen vor Stimmungsschwankungen. Wer abstimmt, sieht denselben Wissensstand – inklusive Unsicherheiten und Minderheitenpositionen.",
  },
];

const features = {
  title_de: "Funktionen im Überblick",
  items_de: [
    "Aussagen aus Alltagssprache in klare Fragestellungen überführen.",
    "Quellen sammeln, versionieren und mit Kontext markieren.",
    "Pro/Contra gleichberechtigt darstellen; Unsicherheiten sichtbar halten.",
    "Evidenz-Graph verknüpft Aussagen, Quellen und Gegenpositionen.",
    "Offene Fragen und Zuständigkeiten sichtbar machen.",
    "Exporte (z. B. CSV/JSON) und Einbettungen für Redaktion, Verbände und Mitgliederportale.",
  ],
};

const outputs = {
  title_de: "Ergebnisse & Nutzen",
  items_de: [
    "Dossier mit klarer Quellenlage und nachvollziehbaren Argumenten.",
    "Schneller Überblick über Konsens, Streitpunkte und offene Fragen.",
    "Belastbare Grundlage für Abstimmung, Mandat und Umsetzung.",
    "Redaktionell nutzbares Material für Beiträge und Mitgliederkommunikation.",
  ],
};

const safeguards = {
  title_de: "Qualität & Fairness",
  items_de: [
    "Quellenpflicht und transparente Verweise statt Behauptungen ohne Beleg.",
    "Gegenpositionen werden sichtbar gemacht, nicht ausgeblendet.",
    "Korrekturen bleiben nachvollziehbar, nichts wird heimlich entfernt.",
  ],
};

const example = {
  title_de: "Beispiel",
  body_de:
    "Sichere Radwege: Ein Verein sammelt Quellen zu Unfallzahlen, Alternativen und Kosten. Journalist:innen prüfen die Belege. Das Dossier zeigt Pro/Contra und offene Fragen – eine saubere Basis für die Abstimmung.",
};

export default function DossierPage() {
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
            <Link href="/howtoworks/edebatte#rolle-vereine" className="btn bg-brand-grad text-white shadow-soft">
              Zur Rolle Vereine & Journalist:innen
            </Link>
            <Link href="/howtoworks/edebatte/abstimmen" className="btn border border-slate-300 bg-white">
              Weiter zu Abstimmen & Ergebnis
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

        <section className="grid gap-4 md:grid-cols-2">
          {introBlocks.map((block) => (
            <article key={block.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">{text(block, "title")}</h2>
              <p className="mt-2 text-sm text-slate-700">{text(block, "body")}</p>
            </article>
          ))}
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
