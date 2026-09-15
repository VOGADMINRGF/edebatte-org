"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { GO_TO_MARKET_PACKAGING } from "@features/pricing/goToMarketPackaging";

const offer = GO_TO_MARKET_PACKAGING.foundingDecisionIntelligence;

const productDetails = {
  decisionDossier: {
    de: {
      title: "Decision Dossier",
      lead: "Ein Thema. Ein nachvollziehbares Entscheidungsbild.",
      items: [
        "Ausgangslage und Entwicklung",
        "relevante Quellen und Evidenzen",
        "Positionen und Interessenlagen",
        "Alternativen und Entscheidungsoptionen",
        "Auswirkungen, Unsicherheiten und offene Fragen",
      ],
      suffix: "einmalig",
    },
    en: {
      title: "Decision Dossier",
      lead: "One topic. One traceable decision picture.",
      items: [
        "starting point and development",
        "relevant sources and evidence",
        "positions and stakeholder interests",
        "alternatives and decision options",
        "impacts, uncertainties and open questions",
      ],
      suffix: "one time",
    },
  },
  threeDossierPilot: {
    de: {
      title: "3-Dossier Pilot",
      lead: "Drei reale Themen, um den Nutzen im eigenen Kontext zu prüfen.",
      items: [
        "drei abgestimmte Themen",
        "einheitliche Analyse- und Evidenzlogik",
        "vergleichbare Struktur über alle Dossiers",
        "gemeinsame Auswertung der Pilotphase",
        "Grundlage für eine mögliche laufende Zusammenarbeit",
      ],
      suffix: "einmalig",
    },
    en: {
      title: "3-Dossier Pilot",
      lead: "Three real topics to test the value in your own context.",
      items: [
        "three agreed topics",
        "consistent analysis and evidence logic",
        "comparable structure across dossiers",
        "joint review of the pilot",
        "basis for a possible ongoing engagement",
      ],
      suffix: "one time",
    },
  },
  topicIntelligence: {
    de: {
      title: "Topic Intelligence",
      lead: "Ein relevantes Thema über Zeit strukturiert im Blick behalten.",
      items: [
        "ein vereinbartes Kernthema",
        "laufende Recherche im vereinbarten Rhythmus",
        "Änderungen bei Quellen, Positionen und Rahmenbedingungen",
        "aktualisiertes Entscheidungsbild",
        "kompakte Updates für den Arbeitsalltag",
      ],
      suffix: "im ersten Monat, danach 1.490 €/Monat",
    },
    en: {
      title: "Topic Intelligence",
      lead: "Keep one relevant topic structured and up to date over time.",
      items: [
        "one agreed core topic",
        "ongoing research at an agreed cadence",
        "changes in sources, positions and context",
        "updated decision picture",
        "concise updates for day-to-day work",
      ],
      suffix: "first month, then €1,490/month",
    },
  },
  proIntelligence: {
    de: {
      title: "Pro Intelligence",
      lead: "Für Teams mit mehreren Themen und höherem laufendem Analysebedarf.",
      items: [
        "mehrere vereinbarte Themenstränge",
        "priorisierte Recherche und Aktualisierung",
        "vergleichbare Entscheidungslogik",
        "teamfähige Zusammenfassungen",
        "individuelle Abstimmung von Rhythmus und Umfang",
      ],
      suffix: "im ersten Monat, danach 2.990 €/Monat",
    },
    en: {
      title: "Pro Intelligence",
      lead: "For teams with multiple topics and higher ongoing analysis needs.",
      items: [
        "multiple agreed topic streams",
        "prioritised research and updates",
        "comparable decision logic",
        "team-ready summaries",
        "an individually agreed cadence and scope",
      ],
      suffix: "first month, then €2,990/month",
    },
  },
} as const;

export default function DecisionIntelligenceLanding() {
  const { locale } = useLocale();
  const de = locale === "de";
  const lang = de ? "de" : "en";
  const money = new Intl.NumberFormat(de ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  const products = [
    ["decisionDossier", offer.products.decisionDossier],
    ["threeDossierPilot", offer.products.threeDossierPilot],
    ["topicIntelligence", offer.products.topicIntelligence],
    ["proIntelligence", offer.products.proIntelligence],
  ] as const;

  return (
    <main id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="relative overflow-hidden border-b border-[color:var(--border)] bg-slate-950 text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(34,211,238,0.19),transparent_38%)]" />
        <div className="relative mx-auto max-w-[76rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            {de ? "Policy Intelligence & Entscheidungsanalyse" : "Policy intelligence & decision analysis"}
          </p>
          <h1 className="mt-5 max-w-5xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
            {de
              ? "Komplexe politische und gesellschaftliche Themen. Strukturiert für Entscheidungen."
              : "Complex policy and societal topics. Structured for decisions."}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            {de
              ? "eDebatte verbindet Recherche, Evidenzen, Positionen, historische Entwicklung, Alternativen und offene Fragen zu einer nachvollziehbaren Entscheidungsgrundlage – für Unternehmen, Verbände, Medien, NGOs und professionelle Teams."
              : "eDebatte brings research, evidence, positions, historical development, alternatives and open questions together into a traceable decision basis for companies, associations, media, NGOs and professional teams."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/kontakt?anfrage=decision-intelligence&programm=founding-100"
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-400 px-8 py-3.5 font-black text-slate-950 transition hover:-translate-y-0.5"
            >
              {de ? "Founding-Pilot anfragen" : "Request a Founding pilot"} →
            </Link>
            <Link
              href="/pricing/institutionen"
              className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 px-8 py-3.5 font-black text-white transition hover:border-cyan-300/70"
            >
              {de ? "Alle institutionellen Angebote" : "All institutional offers"}
            </Link>
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-400">
            {de
              ? "Kein automatischer Checkout. Anfrage, Scope und Beauftragung werden vorab bestätigt."
              : "No automatic checkout. Inquiry, scope and engagement are confirmed before work starts."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Founding {offer.acceptedEngagementLimit}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              {de ? `${offer.discountPercent} % Founding-Vorteil.` : `${offer.discountPercent}% Founding benefit.`}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
              {de
                ? "Die ersten 100 angenommenen professionellen Aufträge helfen, eDebatte in seiner frühen Phase weiter aufzubauen. Deshalb gilt für den ersten Auftrag ein einmaliger Founding-Preis. Bei laufenden Paketen gilt er ausschließlich im ersten Monat."
                : "The first 100 accepted professional engagements help build eDebatte in its early phase. That is why the first engagement receives a one-off Founding price. For recurring packages it applies only to the first month."}
            </p>
          </div>
          <aside className="rounded-[1.5rem] border border-cyan-500/35 bg-cyan-500/5 p-6">
            <p className="font-black">{de ? "Transparenz statt Kleingedrucktes" : "Transparency instead of fine print"}</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              {de
                ? "eDebatte befindet sich im unabhängigen Aufbau. Die professionellen Leistungen werden in dieser frühen Phase direkt durch den Gründer angeboten. Beauftragt wird eine konkrete Leistung – keine Spende. Einnahmen aus diesen Aufträgen werden für den weiteren Aufbau von eDebatte und VoiceOpenGov eingesetzt."
                : "eDebatte is being built independently. In this early phase, professional services are offered directly by the founder. Customers commission a concrete service — not a donation. Revenue from these engagements is used to continue building eDebatte and VoiceOpenGov."}
            </p>
          </aside>
        </div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid gap-5 md:grid-cols-2">
            {products.map(([key, product]) => {
              const details = productDetails[key][lang];
              return (
                <article key={product.id} className="flex h-full flex-col rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--background)] p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-cyan-700 dark:text-cyan-300">{details.title}</p>
                      <h2 className="mt-2 text-2xl font-black">{details.lead}</h2>
                    </div>
                    <span className="rounded-full border border-cyan-500/35 px-3 py-1 text-xs font-black text-cyan-700 dark:text-cyan-300">-{offer.discountPercent}%</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
                    {details.items.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 border-t border-[color:var(--border)] pt-5">
                    <p className="text-sm text-[color:var(--muted)] line-through">{money.format(product.listPriceEur)}</p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.03em]">{money.format(product.foundingPriceEur)}</p>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--muted)]">{details.suffix}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-9 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {de ? "Wofür Teams eDebatte einsetzen können" : "Where teams can use eDebatte"}
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              {de ? "Weniger Informationsrauschen. Mehr Entscheidungsfähigkeit." : "Less information noise. More decision clarity."}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(de
              ? ["Policy- und Gesetzgebungsfragen", "Public Affairs & Stakeholder", "Verbands- und Medienrecherche", "Strategische Themenbeobachtung", "Alternativen- und Szenarienvergleich", "Vorbereitung interner Entscheidungen"]
              : ["Policy and legislative questions", "Public affairs and stakeholders", "Association and media research", "Strategic issue monitoring", "Alternative and scenario comparison", "Preparing internal decisions"]
            ).map((item) => (
              <div key={item} className="rounded-2xl border border-[color:var(--border)] p-4 text-sm font-bold">{item}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
              {de ? "Unser Prinzip" : "Our principle"}
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              {de ? "Fakten bleiben Fakten." : "Facts remain facts."}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              {de
                ? "Professionelle Kunden kaufen keine besseren Fakten und keine bevorzugte Wahrheit. Bezahlt wird für individuelle Recherche, strukturierte Aufbereitung, Monitoring, Arbeitsabläufe und die Zeit, die ein konkreter Auftrag erfordert. Die öffentliche Wissens- und Beteiligungsebene bleibt davon getrennt."
                : "Professional customers do not buy better facts or a preferred truth. They pay for individual research, structured synthesis, monitoring, workflows and the time a concrete engagement requires. The public knowledge and participation layer remains separate."}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">FAQ</p>
          <div className="mt-5 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
            <div className="py-5">
              <h2 className="font-black">{de ? "Ist das eine Spende an eDebatte?" : "Is this a donation to eDebatte?"}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {de
                  ? "Nein. Beauftragt wird eine konkrete professionelle Leistung. Der Aufbaugedanke erklärt transparent, wofür die Einnahmen in dieser frühen Projektphase eingesetzt werden."
                  : "No. You commission a concrete professional service. The build-stage message transparently explains how revenue is used during this early project phase."}
              </p>
            </div>
            <div className="py-5">
              <h2 className="font-black">{de ? "Warum sind die ersten 100 Aufträge günstiger?" : "Why are the first 100 engagements cheaper?"}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {de
                  ? "Founding 100 ist ein zeitlich beziehungsweise mengenmäßig begrenzter Markteinführungs-Vorteil. Er gilt nur für den ersten Auftrag beziehungsweise bei laufenden Paketen für den ersten Monat."
                  : "Founding 100 is a limited launch benefit. It applies only to the first engagement or, for recurring packages, the first month."}
              </p>
            </div>
            <div className="py-5">
              <h2 className="font-black">{de ? "Gibt es bereits einen automatischen Checkout?" : "Is there an automatic checkout already?"}</h2>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                {de
                  ? "Nein. Umfang, Eignung und Beauftragung werden vorab individuell bestätigt. Dadurch versprechen wir keine Leistung, die im konkreten Fall nicht sauber erbracht werden kann."
                  : "No. Scope, fit and engagement are confirmed individually first so that we do not promise work that cannot be delivered properly in the specific case."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] px-5 py-14 text-center sm:py-16">
        <h2 className="mx-auto max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
          {de ? "Welches Thema soll eDebatte für Sie strukturieren?" : "Which topic should eDebatte structure for you?"}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          {de
            ? "Schildern Sie kurz das Thema und den gewünschten Einsatz. Danach klären wir, welches Paket sinnvoll ist."
            : "Briefly describe the topic and intended use. We will then determine which package makes sense."}
        </p>
        <div className="mt-7">
          <Link
            href="/kontakt?anfrage=decision-intelligence&programm=founding-100"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-500 px-8 py-3.5 font-black text-slate-950"
          >
            {de ? "Decision Intelligence anfragen" : "Request Decision Intelligence"} →
          </Link>
        </div>
      </section>
    </main>
  );
}
