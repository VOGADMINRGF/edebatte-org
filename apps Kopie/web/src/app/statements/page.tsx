import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Statements – eDebatte",
};

const steps = [
  {
    title: "Thema einreichen",
    body: "Beschreibe dein Anliegen in klaren Sätzen. Wir helfen dir, es in prüfbare Aussagen zu strukturieren.",
  },
  {
    title: "Struktur & Kontext",
    body: "Statements werden mit Zuständigkeit, Zeitbezug und Kontextfragen ergänzt.",
  },
  {
    title: "Prüfung & Dossier",
    body: "Quellen, Pro/Contra und Unsicherheiten werden dokumentiert, bevor etwas in die öffentliche Phase geht.",
  },
  {
    title: "Abstimmung & Ergebnis",
    body: "Nach der Prüfung kann eine Abstimmung starten – nachvollziehbar, fair und ohne Zusatzstimmen.",
  },
];

const structureItems = [
  {
    title: "Kernaussage",
    body: "Was soll konkret entschieden werden? Ein Satz pro Aussage hilft bei der Prüfung.",
  },
  {
    title: "Zuständigkeit",
    body: "Wer ist verantwortlich? (Kommune, Land, Bund, EU …)",
  },
  {
    title: "Zeitbezug",
    body: "Ab wann oder bis wann soll etwas gelten?",
  },
  {
    title: "Belege (optional)",
    body: "Quellen oder Beispiele erhöhen die Qualität und beschleunigen die Prüfung.",
  },
];

export default function StatementsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Statements &amp; Debatte
          </p>
          <h1
            className="text-3xl md:text-4xl font-extrabold leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Wie eDebatte aus Anliegen belastbare Entscheidungen macht
          </h1>
          <p className="text-base md:text-lg text-slate-700 leading-relaxed">
            Statements sind das Herz der Plattform: klare, prüfbare Aussagen mit
            nachvollziehbarer Evidenz. Sie sind die Grundlage für Dossiers,
            Diskussionen und Abstimmungen – offen, fair und transparent.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/statements/new"
              className="btn btn-primary bg-brand-grad text-white"
            >
              Statement erstellen
            </Link>
            <Link
              href="/thema-einreichen"
              className="btn border border-slate-300 bg-white/80 hover:bg-white"
            >
              Ablauf verstehen
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.title}
              className="rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {step.title}
              </p>
              <p className="mt-2 text-sm text-slate-700">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              So sieht ein Statement aus
            </h2>
            <div className="space-y-3">
              {structureItems.map((item) => (
                <div key={item.title} className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-700">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Demo-Vorschau</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Statement
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Tempo 30 vor Schulen soll ab 2026 verpflichtend gelten.
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">
                  Zuständigkeit: Kommune
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 border border-slate-200">
                  Zeitbezug: ab 2026
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Quellen, Gegenpositionen und Unsicherheiten folgen im Dossier.
              </p>
            </div>
            <Link
              href="/howtoworks/edebatte/dossier"
              className="text-sm font-semibold text-sky-700 underline underline-offset-2"
            >
              Dossier &amp; Faktencheck ansehen →
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 md:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Bereit, dein Anliegen einzureichen?
              </h2>
              <p className="text-sm text-slate-700">
                Starte im Statement-Editor und forme dein Thema in wenigen
                Minuten zu einer prüfbaren Aussage.
              </p>
            </div>
            <Link
              href="/statements/new"
              className="btn btn-primary bg-brand-grad text-white"
            >
              Jetzt starten
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
