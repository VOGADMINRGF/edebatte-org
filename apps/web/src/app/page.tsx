"use client";

import Link from "next/link";

const heroChips = ["Direktdemokratisch", "Lokal", "National", "Global"];

const audienceCards = [
  {
    title: "Für Bürger:innen",
    body: "Faire Pro/Contra-Darstellung, geheime Stimmabgabe, klare Regeln & Quoren.",
  },
  {
    title: "Für Journalist:innen",
    body: "Dossiers, Embeds & Exporte (CSV/JSON) – lokal, regional, investigativ.",
  },
  {
    title: "Für Verwaltungen",
    body: "Ergebnisse mit Mandat, Meilensteinen, Risiken & Wirkung transparent tracken.",
  },
  {
    title: "Für Politik & Repräsentanten",
    body: "Direktdemokratische Umfragen nach dem Mehrheitsprinzip, nachvollziehbar moderiert.",
  },
];

const uspItems = [
  {
    title: "Anliegen rein, Ergebnis raus.",
    body: "In 60 Sekunden einreichen – danach startet das direktdemokratische Verfahren in klaren Schritten bis zum Ergebnis.",
  },
  {
    title: "Mehr als Pro & Contra.",
    body: "Positionen, Szenarien und Folgen transparent gemacht. Minderheiten sichtbar, Mehrheiten erkennbar.",
  },
  {
    title: "Faktenbasiert & KI-gestützt.",
    body: "International geprüft, redaktionell kuratiert, wissenschaftlich belegt. Entscheidungen auf belastbaren Fakten.",
  },
  {
    title: "Im Auftrag des Volkes.",
    body: "Wir moderieren die Verfahren, dokumentieren Audit-Trails und begleiten die Umsetzung öffentlich.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] to-[var(--brand-to)] pb-16">
      <section
        id="hero"
        className="border-b border-slate-200/60 bg-gradient-to-b from-[var(--brand-from)] to-[var(--brand-to)]"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-14 pt-14 lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="mb-4 flex flex-wrap gap-2">
              {heroChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    border: `1px solid ${"var(--chip-border)"}`,
                    background: "var(--chip-bg)",
                    color: "var(--chip-text)",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
              Weniger reden. <br />
              Mehr entscheiden. <br />
              <span className="bg-brand-grad bg-clip-text text-transparent">
                Dein Anliegen
              </span>{" "}
              – unsere Struktur.
            </h1>
            <p className="mt-5 text-lg text-slate-700 md:text-xl">
              VoiceOpenGov verbindet Bürger:innen, Verwaltung und Journalist:innen.
              <strong> KI-orchestriert</strong> bündeln wir Quellen, Gegenquellen und Unsicherheiten
              in einem Evidenz-Graphen, stimmen fair ab und begleiten die Umsetzung
              öffentlich nachvollziehbar.
            </p>
            <ul className="mt-4 list-disc pl-5 text-base text-slate-700">
              <li>
                <strong>Transparente Verfahren:</strong> Jede Quelle und jeder Schritt sind einsehbar.
              </li>
              <li>
                <strong>Faire Debatten:</strong> Pro & Contra werden symmetrisch moderiert; Dominanz einzelner Stimmen wird verhindert.
              </li>
              <li>
                <strong>Regionale Legitimität:</strong> Entscheidungen lassen sich auf Gemeinden, Kreise oder Länder begrenzen.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/statements/new" className="btn btn-primary bg-brand-grad text-white">
                Thema einreichen
              </Link>
              <Link
                href="/contributions/new"
                className="btn border border-slate-300 bg-white/80 hover:bg-white"
              >
                Jetzt abstimmen
              </Link>
              <Link
                href="/mitglied-werden"
                className="btn border border-slate-300 bg-white/70 hover:bg-white"
              >
                Mitglied werden
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {audienceCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-brand-grad p-4 text-white shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <h3 className="text-base font-semibold">
                    Deine Mitgliedschaft hält VoiceOpenGov unabhängig
                  </h3>
                  <p className="opacity-90 text-sm">
                    Schon ab 5,63 € pro Monat finanzierst du Moderation, Faktenrecherche und Audit-Trails.
                  </p>
                </div>
                <Link
                  href="/mitglied-werden"
                  className="btn border border-white/60 bg-black/30 text-white hover:bg-black/40"
                >
                  Mehr erfahren
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[38%]">
            <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <div
                className="grid h-full w-full place-items-center"
                style={{
                  background: "linear-gradient(135deg,var(--panel-from),var(--panel-to))",
                }}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/85 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur"
                >
                  ▶︎ Video (90s)
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Direkte Demokratie in 90 Sekunden.</span>
              <Link href="/faq" className="font-medium text-slate-700 underline">
                Mehr erfahren →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {uspItems.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"
            >
              <div
                className="mb-3 h-0.5 w-16 rounded-full"
                style={{ background: "linear-gradient(90deg,var(--brand-accent-1),var(--brand-accent-2))" }}
              />
              <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Unser Qualitätsstandard</h2>
          <p className="mt-3 text-sm text-slate-700">
            Reproduzierbarkeit, offene Methoden, strenge Quellenarbeit, Fehlerkultur und öffentliche
            Audit-Trails – nicht als Versprechen, sondern als Betriebsprinzip. Öffentliche Impact-Dashboards
            und graphbasierte Vertrauensmaße machen jeden Schritt nachvollziehbar.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="btn border border-slate-300 bg-white/80 hover:bg-white"
            >
              Reports ansehen
            </Link>
            <Link href="/mitglied-werden" className="btn btn-primary bg-brand-grad text-white">
              Mitglied werden
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
