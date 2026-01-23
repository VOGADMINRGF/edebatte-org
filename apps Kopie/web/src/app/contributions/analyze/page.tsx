// apps/web/src/app/contributions/analyze/page.tsx
"use client";

type TopicReport = {
  id: string;
  label: string;
  description: string;
  statements: number;
  evidenceSlots: number;
  openQuestions: number;
  countries: string[];
  lastUpdated: string;
};

const MOCK_TOPICS: TopicReport[] = [
  {
    id: "tier_agri",
    label: "Tierschutz ↔ Agrarwirtschaft",
    description:
      "Wie vereinbaren wir Tierwohl, Ernährungssicherheit und wirtschaftliche Tragfähigkeit der Landwirtschaft?",
    statements: 42,
    evidenceSlots: 118,
    openQuestions: 17,
    countries: ["DE", "NL", "DK", "ES"],
    lastUpdated: "2025-11-12",
  },
  {
    id: "prices_inflation",
    label: "Preise & Lebenshaltungskosten",
    description:
      "Preiserhöhungen, Energie, Mieten – welche Maßnahmen werden diskutiert und welche Evidenz gibt es?",
    statements: 73,
    evidenceSlots: 204,
    openQuestions: 31,
    countries: ["DE", "FR", "IT", "PL"],
    lastUpdated: "2025-11-10",
  },
];

export default function ContributionsAnalyzeLevel3Page() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-emerald-100">
      <div className="container-vog py-8">
        <header className="mb-6 text-center">
          <h1 className="vog-head mb-2">Themen-Reports & Wissensstände</h1>
          <p className="max-w-3xl mx-auto text-sm text-slate-600">
            Hier bündelt eDebatte Aussagen, Belege und offene Fragen zu zentralen Knoten
            (z.B. Tierschutz ↔ Agrarwirtschaft). Diese Ebene ist für Reports, Politik, Medien und
            Forschung gedacht.
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Die Daten stammen aus Bürger-Beiträgen (Stufe 1), strukturierten Analysen (Stufe 2), Newsfeeds und
            weiteren Quellen.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {MOCK_TOPICS.map((t) => (
            <article
              key={t.id}
              className="rounded-3xl bg-white/95 border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col gap-3"
            >
              <header className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-1">
                    {t.label}
                  </h2>
                  <p className="text-xs text-slate-600">{t.description}</p>
                </div>
                <span className="text-[10px] text-slate-400">
                  Stand: {t.lastUpdated}
                </span>
              </header>

              <dl className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="rounded-2xl bg-sky-50 px-3 py-2">
                  <dt className="text-[10px] uppercase text-sky-700 mb-0.5">
                    Aussagen
                  </dt>
                  <dd className="text-base font-semibold">{t.statements}</dd>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-2">
                  <dt className="text-[10px] uppercase text-emerald-700 mb-0.5">
                    Belege
                  </dt>
                  <dd className="text-base font-semibold">{t.evidenceSlots}</dd>
                </div>
                <div className="rounded-2xl bg-amber-50 px-3 py-2">
                  <dt className="text-[10px] uppercase text-amber-700 mb-0.5">
                    Offene Fragen
                  </dt>
                  <dd className="text-base font-semibold">{t.openQuestions}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div>
                  Fokus-Länder: {t.countries.join(", ")}
                </div>
                <a
                  href={`/reports/${t.id}`}
                  className="underline text-sky-700 font-semibold"
                >
                  Detail-Report öffnen
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
