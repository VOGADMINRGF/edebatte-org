import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Archiv – eDebatte",
};

const archiveBlocks = [
  {
    title: "Dossiers & Faktencheck",
    body: "Geprüfte Quellen, Pro/Contra, Unsicherheiten – alles nachvollziehbar dokumentiert.",
    href: "/howtoworks/edebatte/dossier",
    cta: "Dossier ansehen",
  },
  {
    title: "Statements & Themen",
    body: "Öffentliche Anliegen, sauber strukturiert und bereit für die nächste Prüfphase.",
    href: "/statements",
    cta: "Statements öffnen",
  },
  {
    title: "Abstimmungen & Ergebnisse",
    body: "Entscheidungen mit klaren Mehrheiten, nachvollziehbaren Begründungen und Mandaten.",
    href: "/howtoworks/edebatte/abstimmen",
    cta: "Ergebnisse ansehen",
  },
];

const archiveNotes = [
  "Archiviert werden bestätigte Dossiers, abgestimmte Entscheidungen und überprüfte Statements.",
  "Minderheitenpositionen und Korrekturen bleiben sichtbar.",
  "Qualitätsstandards: Quellenpflicht, Transparenz und offene Prüfprotokolle.",
];

export default function ArchivPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Archiv
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
            Nachvollziehbare Entscheidungen – dauerhaft archiviert
          </h1>
          <p className="text-base md:text-lg text-slate-700 leading-relaxed">
            Das Archiv bündelt geprüfte Themen, Dossiers und Entscheidungen. Es
            ist die öffentliche Wissensbasis für direkte Demokratie – klar
            strukturiert, versioniert und dauerhaft einsehbar.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {archiveBlocks.map((block) => (
            <article
              key={block.title}
              className="rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-sm"
            >
              <h2 className="text-base font-semibold text-slate-900">
                {block.title}
              </h2>
              <p className="mt-2 text-sm text-slate-700">{block.body}</p>
              <Link
                href={block.href}
                className="mt-3 inline-flex text-sm font-semibold text-sky-700 underline underline-offset-2"
              >
                {block.cta} →
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Was ins Archiv kommt
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {archiveNotes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Reports für Organisationen
            </h2>
            <p className="text-sm text-slate-700">
              Detaillierte Reports sind ein Angebot für Organisationen und
              Redaktionen im geschlossenen Bereich. Im Archiv findest du die
              öffentliche, nachvollziehbare Übersicht.
            </p>
            <Link
              href="/kontakt"
              className="text-sm font-semibold text-sky-700 underline underline-offset-2"
            >
              Zugang anfragen →
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/95 p-6 md:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Thema einreichen oder mitentscheiden
              </h2>
              <p className="text-sm text-slate-700">
                Du kannst jederzeit neue Themen einbringen oder laufende
                Abstimmungen begleiten.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/statements/new"
                className="btn btn-primary bg-brand-grad text-white"
              >
                Statement erstellen
              </Link>
              <Link
                href="/abstimmungen"
                className="btn border border-slate-300 bg-white/80 hover:bg-white"
              >
                Abstimmungen ansehen
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
