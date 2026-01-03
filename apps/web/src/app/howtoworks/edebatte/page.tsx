"use client";

import * as React from "react";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";

const heroCopy = {
  title_de: "So funktioniert eDebatte",
  title_en: "How eDebatte works",
  lead_de:
    "eDebatte ist die App, mit der wir Anliegen aus Alltagssprache in nachvollziehbare Abstimmungsfragen übersetzen: Fakten sammeln, Pro & Contra sichtbar machen, abstimmen, Umsetzung begleiten.",
  lead_en:
    "eDebatte is the app that translates everyday concerns into transparent voting templates: gather facts, show pros and cons, vote securely, and follow through on implementation.",
  secondary_de:
    "Die App bleibt neutral: gleiche Regeln für alle Themen, klare Abläufe und ein offenes Prüfprotokoll. Kommune, Organisation, Parlament oder Initiative – alle arbeiten mit denselben Verfahren.",
  secondary_en:
    "The app stays neutral: same rules for every topic, transparent processes, and an open audit log. Municipalities, organisations, parliaments, or initiatives all work with the same playbook.",
};

const heroChips = [
  {
    id: "chip-structure",
    label_de: "strukturierte Vorlagen statt Chaos-Debatten",
    label_en: "structured templates instead of chaos debates",
  },
  { id: "chip-sources", label_de: "Quellen offen gelegt", label_en: "sources laid open" },
  { id: "chip-results", label_de: "Ergebnisse reproduzierbar", label_en: "results reproducible" },
];

const heroButtons = [
  {
    id: "cta-statements",
    href: "/statements/new",
    label_de: "Anliegen einreichen",
    label_en: "Submit a concern",
    primary: true,
  },
  {
    id: "cta-movement",
    href: "/howtoworks/bewegung",
    label_de: "Mehr über die Bewegung",
    label_en: "More about the movement",
    primary: false,
  },
];

const roleSpotlightHeading = {
  title_de: "Rollen & Schwerpunkte",
  title_en: "Roles & focus areas",
  lead_de:
    "Für jede Rolle zeigen wir Schwerpunkt, Funktionen und ein kurzes Fallbeispiel.",
  lead_en:
    "Each role includes a focus, core functions, and a short case example.",
};

const roleSpotlightLabels = {
  focus_de: "Schwerpunkt",
  focus_en: "Focus",
  functions_de: "Funktionen",
  functions_en: "Core functions",
  outputs_de: "Ergebnisse",
  outputs_en: "Outputs",
  example_de: "Fallbeispiel",
  example_en: "Case example",
  details_de: "Mehr Details",
  details_en: "More details",
};

const roleSpotlights = [
  {
    id: "rolle-buerger",
    title_de: "Bürger:innen",
    title_en: "Citizens",
    image: "/dummy/dummy1.jpg",
    imageAlt: "Platzhalter Illustration für Bürger:innen",
    focus_de:
      "Mitreden, mitentscheiden und als Creator Themen, Streams oder Regionen begleiten.",
    focus_en:
      "Participate, decide, and act as a creator for topics, streams, or regions.",
    functions_de: [
      "Abstimmungen mit geheimer Stimme und klaren Quoren.",
      "Anliegen einreichen und Varianten vergleichen.",
      "Themen, Streams oder Regionen als Creator kuratieren.",
      "Pro/Contra und Quellen in Alltagssprache prüfen.",
      "Minderheitenbericht und Ergebnis nachvollziehen.",
    ],
    functions_en: [
      "Vote with a secret ballot and clear quorums.",
      "Submit concerns and compare variants.",
      "Curate topics, streams, or regions as a creator.",
      "Review pro/contra and sources in plain language.",
      "Track minority reports and results.",
    ],
    outputs_de: [
      "Dokumentierte Mehrheiten und Minderheiten.",
      "Transparente Quellenlage.",
      "Mandat für die nächste Umsetzung.",
      "Creator-Formate mit Community-Bezug.",
    ],
    outputs_en: [
      "Documented majorities and minorities.",
      "Transparent source base.",
      "A mandate for implementation.",
      "Creator formats with community relevance.",
    ],
    example_de:
      "Stadtteil-Stream: Bürger:innen sammeln Quellen, moderieren ein Thema und begleiten die Abstimmung ihrer Region. Ergebnis und Wirkung bleiben öffentlich nachvollziehbar.",
    example_en:
      "Neighborhood stream: citizens gather sources, moderate a topic, and follow the vote in their region. Outcome and impact stay publicly traceable.",
    ctaLabel_de: "Mehr zu Abstimmen & Ergebnis",
    ctaLabel_en: "More about voting & results",
    ctaHref: "/howtoworks/edebatte/abstimmen",
  },
  {
    id: "rolle-vereine",
    title_de: "Vereine, Verbände & Journalist:innen",
    title_en: "Associations, federations & journalists",
    image: "/dummy/dummy2.jpg",
    imageAlt: "Platzhalter Illustration für Vereine und Journalist:innen",
    focus_de: "Mitglieder beteiligen und Themen redaktionell einordnen.",
    focus_en: "Engage members and contribute editorially.",
    functions_de: [
      "Mitgliederbefragungen und interne Abstimmungen aufsetzen.",
      "Dossiers strukturieren und Quellen verlinken.",
      "Faktenchecks koordinieren und Gegenpositionen sichtbar machen.",
      "Redaktionelle Beiträge, Podcasts oder Streams mit Daten anreichern.",
      "Exporte und Einbettungen für Mitgliederportale nutzen.",
    ],
    functions_en: [
      "Set up member surveys and internal votes.",
      "Structure dossiers and link sources.",
      "Coordinate fact-checks and surface counter-positions.",
      "Enrich editorial pieces, podcasts, or streams with data.",
      "Use exports and embeds for member portals.",
    ],
    outputs_de: [
      "Dossiers mit klarer Quellenlage für Mitglieder und Öffentlichkeit.",
      "Redaktionell nutzbare Daten, Zitate und Grafiken.",
      "Nachvollziehbare Streitpunkte und Unsicherheiten.",
      "Material für Artikel, Podcasts und Streams.",
    ],
    outputs_en: [
      "Dossiers with clear sources for members and the public.",
      "Editorial-ready data, quotes, and visuals.",
      "Transparent points of debate and uncertainty.",
      "Material for articles, podcasts, and streams.",
    ],
    example_de:
      "Wohnraum: Ein Verband befragt Mitglieder, Journalist:innen erstellen ein Dossier und begleiten das Thema redaktionell.",
    example_en:
      "Housing: an association surveys members, journalists create a dossier and cover the topic editorially.",
    ctaLabel_de: "Mehr zu Dossier & Faktencheck",
    ctaLabel_en: "More about dossiers & fact-checking",
    ctaHref: "/howtoworks/edebatte/dossier",
  },
  {
    id: "rolle-verwaltung",
    title_de: "Verwaltung & Repräsentant:innen",
    title_en: "Administration & representatives",
    image: "/dummy/dummy3.jpg",
    imageAlt: "Platzhalter Illustration für Verwaltung und Repräsentant:innen",
    focus_de: "Entscheidungsgrundlagen schaffen, Mandat sichern, Umsetzung steuern.",
    focus_en: "Prepare decision-ready data, secure mandates, guide implementation.",
    functions_de: [
      "Umfragen starten und Regeln transparent machen.",
      "Daten, Quellen und Wirkungen als Entscheidungsgrundlage aufbereiten.",
      "Mandate und Zuständigkeiten veröffentlichen.",
      "Meilensteine, Risiken und Fortschritt dokumentieren.",
      "Wirkung und Kennzahlen offen nachverfolgen.",
    ],
    functions_en: [
      "Launch surveys and make rules transparent.",
      "Prepare data, sources, and impacts as decision support.",
      "Publish mandates and responsibilities.",
      "Document milestones, risks, and progress.",
      "Track impact and metrics openly.",
    ],
    outputs_de: [
      "Aufbereitete Entscheidungsgrundlagen als Datenpakete.",
      "Öffentlicher Umsetzungsplan.",
      "Transparente Rechenschaft und Fortschritt.",
      "Lernbasis für nächste Entscheidungen.",
    ],
    outputs_en: [
      "Decision-ready data packages.",
      "A public implementation plan.",
      "Transparent accountability and progress.",
      "A learning base for next decisions.",
    ],
    example_de:
      "Energieeffizienz-Programm: Die Verwaltung bereitet Daten auf, erhält ein Mandat und veröffentlicht Meilensteine sowie Wirkungskennzahlen.",
    example_en:
      "Energy-efficiency program: the administration prepares data, receives a mandate, and publishes milestones plus impact metrics.",
    ctaLabel_de: "Mehr zu Mandat & Umsetzung",
    ctaLabel_en: "More about mandate & implementation",
    ctaHref: "/howtoworks/edebatte/mandat",
  },
];

const steps = [
  {
    id: "step-1",
    text_de: "Anliegen einreichen: Ziel, Region, Zuständigkeit, kurze Begründung.",
    text_en: "Submit a concern: goal, region, responsibility, short rationale.",
  },
  {
    id: "step-2",
    text_de: "Fakten sammeln: Quellen, Daten, Gegenpositionen – alles verlinkt.",
    text_en: "Collect facts: sources, data, counter-positions – all linked.",
  },
  {
    id: "step-3",
    text_de: "Debatte: Pro & Contra werden gleich behandelt, Identität bleibt geschützt.",
    text_en: "Debate: pro & contra receive equal space, identity stays protected.",
  },
  {
    id: "step-4",
    text_de: "Abstimmen: geheime Stimme, Quorum & Mehrheiten transparent.",
    text_en: "Vote: secret ballot, transparent quorum and majorities.",
  },
  {
    id: "step-5",
    text_de: "Umsetzen: Ergebnis mit Mandat, Plan, Risiken und Prüfprotokoll begleiten.",
    text_en: "Implement: accompany the result with mandate, plan, risks, and an audit log.",
  },
];

const evidenceLegend = [
  {
    id: "legend-1",
    label_de: "Aussage",
    label_en: "Statement",
    color: "#0ea5e9",
    explainer_de: "klarer Satz, der später abgestimmt wird",
    explainer_en: "clear sentence that will be voted on later",
  },
  {
    id: "legend-2",
    label_de: "Beleg",
    label_en: "Evidence",
    color: "#10b981",
    explainer_de: "Studien, Daten, Erfahrungen mit Quelle",
    explainer_en: "studies, data, lived experience with a source",
  },
  {
    id: "legend-3",
    label_de: "Gegenbeleg",
    label_en: "Counter-evidence",
    color: "#f97316",
    explainer_de: "zeigt Grenzen oder Widersprüche",
    explainer_en: "shows limits or contradictions",
  },
  {
    id: "legend-4",
    label_de: "Entscheidung",
    label_en: "Decision",
    color: "#8b5cf6",
    explainer_de: "zeigt, wie aus Evidenz ein Mandat wird",
    explainer_en: "shows how evidence turns into a mandate",
  },
];

const stepsHeading = {
  title_de: "Der Ablauf – in fünf Schritten",
  title_en: "The process – in five steps",
};

const exampleCopy = {
  title_de: "Der einfachste Einstieg – ein Beispiel",
  title_en: "Easiest starting point – one example",
  body_de:
    "„Sicherer Schulweg“: Eine Mutter schlägt vor, vor der Schule Tempo 30 ganztägig einzuführen. Wir zerlegen das Anliegen in prüfbare Aussagen (Unfalllage, Verkehrsfluss, Alternativen), sammeln Quellen und zeigen Gegenpositionen. Danach entscheidet die Gemeinschaft – mit klaren Regeln.",
  body_en:
    "\"Safe route to school\": a parent proposes a 30 km/h zone all day. We break the concern into verifiable statements (accidents, traffic flow, alternatives), collect sources, show counter-arguments. Then the community decides – with clear rules.",
};

const evidenceHeading = {
  title_de: "Evidenz-Graph & Fact-Checking – in Alltagssprache",
  title_en: "Evidence graph & fact-checking – in everyday language",
};

export default function HowToWorksEDebattePage() {
  const { locale } = useLocale();
  const text = React.useCallback(
    (entry: Record<string, any>, key: string) => resolveLocalizedField(entry, key, locale),
    [locale],
  );
  const list = React.useCallback(
    (entry: Record<string, unknown>, key: string) => {
      const normalized = String(locale ?? "de").slice(0, 2);
      const localizedKey = `${key}_${normalized}`;
      const value = entry[localizedKey] ?? entry[`${key}_de`];
      return Array.isArray(value) ? value : [];
    },
    [locale],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <h1
            className="text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage: "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {text(heroCopy, "title")}
          </h1>
          <div className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
            <div className="rounded-[36px] bg-white/90 p-6 space-y-4">
              <p className="text-lg text-slate-700">{text(heroCopy, "lead")}</p>
              <p className="text-sm text-slate-600">{text(heroCopy, "secondary")}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium text-slate-700">
                {heroChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="rounded-full border px-3 py-1 shadow-sm"
                    style={{ borderColor: "var(--chip-border)", background: "rgba(14,165,233,0.08)" }}
                  >
                    {text(chip, "label")}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {heroButtons.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.href}
                    className={
                      btn.primary
                        ? "btn bg-brand-grad text-white shadow-soft"
                        : "btn border border-slate-300 bg-white"
                    }
                  >
                    {text(btn, "label")}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{text(stepsHeading, "title")}</h2>
          <ol className="list-decimal space-y-2 pl-6 text-sm text-slate-700">
            {steps.map((step) => (
              <li key={step.id}>{text(step, "text")}</li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Was eDebatte leistet</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-slate-600">
              <li>Strukturierte Analyse (Aussagen, Notizen, Fragen, Verknüpfungen) mit klarem Quellbezug.</li>
              <li>Verlinkte Quellen mit Versionierung, automatische Hinweise bei toten Links.</li>
              <li>Moderationswerkzeuge, Rollen & Rechte (Bürger:innen, Redaktion, Partner).</li>
              <li>Abstimmungsmodul mit Quorum, Mehrheiten, Prüfprotokoll und Export.</li>
              <li>Versionierung, um Vorlagen bei neuen Fakten erneut laufen zu lassen.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-2">
            <h3 className="text-sm font-semibold text-slate-800">Wer setzt es um?</h3>
            <p className="mt-2 text-[13px] text-slate-600">
              Grundsätzlich soll eDebatte immer von der jeweils zuständigen Einheit betrieben werden – Kommune,
              Parlament, Organisation oder Verband. Dort werden Moderator:innen benannt, die für Betrieb, Transparenz
              und Auswertung zuständig sind.
            </p>
            <p className="mt-2 text-[13px] text-slate-600">
              Wo es vor Ort noch keine eigene Struktur gibt, kann VoiceOpenGov den Betrieb vorübergehend übernehmen:
              mit klaren Regeln, Schulungen und Moderation, bis eine Region ihre eigenen Vertreter:innen bestimmt hat.
              eDebatte lässt sich auch als neutrale Plattform mit identischem Sicherheits- und Regelset betreiben – unabhängig
              von einzelnen Personen.
            </p>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="role-spotlight-heading">
          <div className="space-y-2">
            <h2
              id="role-spotlight-heading"
              className="text-lg font-semibold text-slate-900"
            >
              {text(roleSpotlightHeading, "title")}
            </h2>
            <p className="text-sm text-slate-600">{text(roleSpotlightHeading, "lead")}</p>
          </div>
          <div className="grid gap-4">
            {roleSpotlights.map((role) => (
              <article
                key={role.id}
                id={role.id}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text(roleSpotlightLabels, "focus")}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">
                      {text(role, "title")}
                    </h3>
                    <p className="text-sm text-slate-700">
                      {text(role, "focus")}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-2">
                      {text(roleSpotlightLabels, "functions")}
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {list(role, "functions").map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-2">
                      {text(roleSpotlightLabels, "outputs")}
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {list(role, "outputs").map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {text(roleSpotlightLabels, "example")}
                    </p>
                    <p className="text-sm text-slate-700">{text(role, "example")}</p>
                    <a
                      href={role.ctaHref}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
                    >
                      {text(role, "ctaLabel")}
                      <span aria-hidden="true">→</span>
                    </a>
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                      <div className="aspect-[16/9]">
                        <img
                          src={role.image}
                          alt={role.imageAlt}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{text(exampleCopy, "title")}</h2>
          <p className="text-sm text-slate-700">{text(exampleCopy, "body")}</p>
        </section>

        <section id="evidenz" className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{text(evidenceHeading, "title")}</h2>
          <p className="text-sm text-slate-700">
            Jede Aussage, jeder Beleg und jede Entscheidung hängen zusammen. Der Evidenz-Graph zeigt diese Verbindung
            als leicht lesbares Netz. Pfeile zeigen, worauf sich etwas stützt, Farben markieren den Typ der Information.
          </p>
          <div className="rounded-3xl border border-transparent bg-gradient-to-br from-white via-slate-50 to-sky-50 p-[1px] shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-white/95 p-4">
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-700">
                {evidenceLegend.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {text(item, "label")}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {evidenceLegend.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/70 p-4 text-sm text-slate-700"
                    style={{ borderColor: item.color + "33" }}
                  >
                    <h3 className="text-sm font-semibold text-slate-900">{text(item, "label")}</h3>
                    <p className="mt-1">{text(item, "explainer")}</p>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-600">
                Die Community prüft Auffälligkeiten gemeinsam mit Kurator:innen sowie verifizierten Expert:innen.
                Jede Korrektur bleibt sichtbar – nichts wird nachträglich gelöscht.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Faktenprüfung & Vertrauenswert – Alltagssprache</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Wer prüft? Community, Kurator:innen und verifizierte Expert:innen.</li>
            <li>Was misst der Vertrauenswert? Mischung aus Quellenqualität, Plausibilität und Konsensbreite.</li>
            <li>Fehlerkultur: Korrekturen bleiben sichtbar, nichts wird versteckt.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Warum das fair ist</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Gleiche Regeln für Darstellung von Pro & Contra.</li>
            <li>Geheime Stimmabgabe; öffentlich sind nur Aggregate.</li>
            <li>Offene Methodik – keine nachträglichen Anpassungen.</li>
            <li>Minderheitenbericht gehört zum Standard.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Regeln – kurz & klar</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Quorum (Standard): 10 % der stimmberechtigten Einheit.</li>
            <li>Mehrheiten: Grundordnung/hohe Budgets → 2/3; Operatives → einfache Mehrheit.</li>
            <li>Bindungswirkung: intern verbindlich; extern adressieren wir zuständige Stellen mit Begründung.</li>
            <li>Barrierearm: klare Sprache, mobil-tauglich, symmetrische Darstellung.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Nach der Abstimmung</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Mandat & Zuständigkeit: Wer setzt um? Mit welchen Partnern?</li>
            <li>Plan: Meilensteine, Budget, Risiken – öffentlich trackbar.</li>
            <li>Wirkung: Kennzahlen & Lerneffekte fließen in die nächste Vorlage ein.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Journalistische Einbindung – Werkzeug für kritische Berichte</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            eDebatte zeigt, welche Themen brennen, wie die Argumente verteilt sind und wo noch offene Fragen liegen.
            Journalist:innen nutzen das als Startpunkt – die Bewertung bleibt bei ihnen.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Schablonen mit relevanten Fragestellungen für Beiträge, Podcasts oder Streams.</li>
            <li>Faktenlage und Verfahren offen einsehbar, Bewertung bleibt redaktionell.</li>
            <li>Exporte ermöglichen eigene Auswertungen ohne Re-Identifikation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Ausblick – Wirkung & Vertrauenswert 2.0</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Impact-Dashboards zeigen Beteiligung & Wirkung über Zeit.</li>
            <li>Vertrauenswert 2.0: graphbasierte Maße (Quellgüte, Widersprüche, Korrekturen, Community-Prüfung).</li>
            <li>Prüfpakete: geprüfte Skripte und Daten für externe Nachrechnungen.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Mit eDebatte starten</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Du möchtest ein Anliegen einreichen oder eDebatte für deine Organisation testen? So kannst du loslegen:
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/statements/new" className="btn bg-brand-grad text-white shadow-soft">
              Anliegen einreichen
            </a>
            <a href="/howtoworks/bewegung" className="btn border border-slate-300 bg-white">
              Mehr über die Bewegung
            </a>
            <a href="/team" className="btn border border-slate-300 bg-white">
              Kooperation & Team
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
