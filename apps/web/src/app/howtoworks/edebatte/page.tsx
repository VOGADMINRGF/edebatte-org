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
    "Die App bleibt neutral: gleiche Regeln für alle Themen, klare Abläufe und ein offener Audit-Trail. Kommune, Organisation, Parlament oder Initiative – alle arbeiten mit denselben Verfahren.",
  secondary_en:
    "The app stays neutral: same rules for every topic, transparent processes, and an open audit trail. Municipalities, organisations, parliaments, or initiatives all work with the same playbook.",
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

const audiences = [
  {
    id: "aud-1",
    title_de: "Menschen vor Ort",
    title_en: "People on the ground",
    body_de: "bringen Anliegen ein, sehen Fakten und stimmen geheim ab.",
    body_en: "submit concerns, see the facts, and vote anonymously.",
  },
  {
    id: "aud-2",
    title_de: "Journalist:innen",
    title_en: "Journalists",
    body_de:
      "finden aktuelle Themen, bekommen Frage-Schablonen und können Beiträge oder Streams direkt auf Basis der Dossiers bauen.",
    body_en:
      "find current topics, get ready-made question sets, and can build stories or streams directly from the dossiers.",
  },
  {
    id: "aud-3",
    title_de: "Verwaltungen, Parteien & Organisationen",
    title_en: "Administrations, parties & organisations",
    body_de: "erhalten aus aktuellen Meinungsbildern Daten, Mandate und Handlungsempfehlungen – nachvollziehbar für alle.",
    body_en: "receive data, mandates, and recommendations from live sentiment – traceable for everyone.",
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
    text_de: "Umsetzen: Ergebnis mit Mandat, Plan, Risiken und Audit-Trail begleiten.",
    text_en: "Implement: accompany the result with mandate, plan, risks, and audit trail.",
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

const audienceHeading = {
  title_de: "Für wen ist das?",
  title_en: "Who is it for?",
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
              <li>E150-Analyse (Claims, Notizen, Fragen, Knoten) inkl. Link-Interpretation.</li>
              <li>Verlinkte Quellen mit Versionierung, automatische Hinweise bei toten Links.</li>
              <li>Moderationswerkzeuge, Rollen & Rechte (Bürger:innen, Redaktion, Partner).</li>
              <li>Abstimmungsmodul mit Quorum, Mehrheiten, Audit-Trail und Export.</li>
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
              eDebatte lässt sich als White-Label-Version mit identischem Sicherheits- und Regelset betreiben – unabhängig
              von einzelnen Personen.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{text(audienceHeading, "title")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {audiences.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{text(item, "title")}</h3>
                <p className="mt-2 text-sm text-slate-600">{text(item, "body")}</p>
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
          <h2 className="text-lg font-semibold text-slate-900">Fact-Checking & Trust-Score – Alltagssprache</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Wer prüft? Community, Kurator:innen und verifizierte Expert:innen.</li>
            <li>Was misst der Trust-Score? Mischung aus Quellenqualität, Plausibilität und Konsensbreite.</li>
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
          <h2 className="text-lg font-semibold text-slate-900">Ausblick – Wirkung & Vertrauens-Score 2.0</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Impact-Dashboards zeigen Beteiligung & Wirkung über Zeit.</li>
            <li>Trust-Score 2.0: graphbasierte Maße (Quellgüte, Widersprüche, Korrekturen, Community-Review).</li>
            <li>Replikations-Kits: geprüfte Skripte/Daten für externe Nachrechnungen.</li>
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
