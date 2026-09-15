"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { GO_TO_MARKET_PACKAGING } from "@features/pricing/goToMarketPackaging";

const offer = GO_TO_MARKET_PACKAGING.foundingDecisionIntelligence;

const packageCopy = {
  decisionDossier: {
    de: {
      description:
        "Ein relevantes Thema als strukturierte Entscheidungsgrundlage: Quellen, Positionen, Entwicklung, Alternativen, Auswirkungen und offene Fragen.",
      priceSuffix: "einmalig",
    },
    en: {
      description:
        "One relevant topic turned into a structured decision basis: sources, positions, development, alternatives, impacts and open questions.",
      priceSuffix: "one time",
    },
  },
  threeDossierPilot: {
    de: {
      description:
        "Drei konkrete Themen als gemeinsamer Pilot – ideal, um eDebatte im eigenen Arbeitskontext mit realen Fragestellungen zu erproben.",
      priceSuffix: "einmalig",
    },
    en: {
      description:
        "Three concrete topics as one pilot – designed to test eDebatte in your own working context with real questions.",
      priceSuffix: "one time",
    },
  },
  topicIntelligence: {
    de: {
      description:
        "Ein vereinbartes Thema laufend beobachten und den Entscheidungsstand in einem abgestimmten Rhythmus aktualisieren.",
      priceSuffix: "im ersten Monat",
    },
    en: {
      description:
        "Keep one agreed topic under review and update the decision picture at an agreed cadence.",
      priceSuffix: "for the first month",
    },
  },
} as const;

export default function DecisionIntelligenceHomeSection() {
  const { locale } = useLocale();
  const de = locale === "de";
  const number = new Intl.NumberFormat(de ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  const packages = [
    ["decisionDossier", offer.products.decisionDossier],
    ["threeDossierPilot", offer.products.threeDossierPilot],
    ["topicIntelligence", offer.products.topicIntelligence],
  ] as const;

  return (
    <section
      aria-labelledby="decision-intelligence-heading"
      className="border-t border-[color:var(--border)] bg-slate-950 py-16 text-white sm:py-20"
    >
      <div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              {de ? "Für Organisationen & Entscheider" : "For organisations & decision-makers"}
            </p>
            <h2
              id="decision-intelligence-heading"
              className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.035em] sm:text-5xl"
            >
              {de
                ? "Aus komplexen Themen werden belastbare Entscheidungsgrundlagen."
                : "Turn complex topics into decision-ready evidence."}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              {de
                ? "eDebatte strukturiert Recherche, Quellen, Positionen, Entwicklungen, Alternativen und offene Fragen für Unternehmen, Verbände, Medien, NGOs und andere professionelle Teams."
                : "eDebatte structures research, sources, positions, developments, alternatives and open questions for companies, associations, media, NGOs and other professional teams."}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-cyan-400/40 bg-cyan-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              Founding {offer.acceptedEngagementLimit}
            </p>
            <p className="mt-2 text-2xl font-black">
              {de
                ? `${offer.discountPercent} % auf den ersten Auftrag`
                : `${offer.discountPercent}% off the first engagement`}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {de
                ? "Bei laufenden Paketen gilt der Founding-Vorteil nur im ersten Monat. Danach gilt der reguläre Preis."
                : "For recurring packages, the Founding benefit applies only to the first month. Regular pricing applies afterwards."}
            </p>
          </div>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {packages.map(([key, product]) => {
            const copy = packageCopy[key][de ? "de" : "en"];
            return (
              <article
                key={product.id}
                className="flex h-full flex-col rounded-[1.6rem] border border-white/15 bg-white/[0.045] p-6"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
                  {product.name[de ? "de" : "en"]}
                </p>
                <p className="mt-4 flex items-baseline gap-3">
                  <span className="text-sm text-slate-400 line-through">
                    {number.format(product.listPriceEur)}
                  </span>
                  <span className="text-3xl font-black tracking-[-0.03em]">
                    {number.format(product.foundingPriceEur)}
                  </span>
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{copy.priceSuffix}</p>
                <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">{copy.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-5 rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="font-black text-white">
              {de
                ? "Fakten bleiben Fakten. Bezahlt wird für individuelle Arbeit."
                : "Facts remain facts. Professional work is what customers pay for."}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {de
                ? "Öffentliche Fakten, Quellenzugang und Beteiligung werden durch diese Angebote nicht zu Premiumwissen. Professionelle Aufträge bezahlen individuelle Recherche, Aufbereitung, Monitoring, Workflow und Geschwindigkeit – und helfen, den unabhängigen Aufbau von eDebatte und VoiceOpenGov zu finanzieren."
                : "Public facts, source access and participation do not become premium knowledge through these offers. Professional engagements pay for individual research, synthesis, monitoring, workflow and speed — and help fund the independent development of eDebatte and VoiceOpenGov."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/pricing/institutionen/decision-intelligence"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
            >
              {de ? "Founding-Angebote ansehen" : "View Founding offers"} →
            </Link>
            <Link
              href="/transparenz"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-black text-white transition hover:border-cyan-300/60"
            >
              {de ? "Zur Transparenz" : "Transparency"}
            </Link>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          {de
            ? "Founding 100 gilt, solange Plätze verfügbar sind. Kein automatischer Checkout: Beauftragung erfolgt nach Anfrage und individueller Bestätigung."
            : "Founding 100 applies while places remain available. There is no automatic checkout: engagements are confirmed individually after an inquiry."}
        </p>
      </div>
    </section>
  );
}
