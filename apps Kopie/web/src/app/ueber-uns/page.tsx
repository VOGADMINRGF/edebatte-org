import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Über eDebatte – Ricky G. Fleischer",
  description: `${BRAND.name}: ${BRAND.tagline_de} Ricky Fleischer entwickelt die Methode Check → Dossier → Beteiligung weiter und beantwortet häufige Fragen.`,
};

export default function AboutRickyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Hero */}
      <section className="relative border-b border-slate-800 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-slate-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-slate-950/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              eDebatte · Initiator
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Über <span className="text-cyan-300">Ricky G. Fleischer</span>
              </h1>
              <p className="max-w-xl text-sm text-slate-200 sm:text-base">
                Ich entwickle eDebatte als neutrale Infrastruktur für Beteiligung. Ziel ist, dass jede Behauptung über Check → Dossier → Beteiligung nachvollziehbar geprüft wird – ohne Parteibuch, dafür mit klarer Methodik.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {["Initiator", "Civic Tech", "Unabhängig", "Berlin"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-200"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300"
              >
                eDebatte entdecken
              </a>
              <a
                href="/mitglied-werden"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
              >
                Mitmachen &amp; unterstützen
              </a>
            </div>
          </div>

          {/* Portrait */}
          <div className="mt-8 flex justify-center lg:mt-0 lg:w-64">
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <Image
                  src="/ricky-portrait.jpg"
                  alt="Ricky G. Fleischer"
                  width={192}
                  height={192}
                  className="h-40 w-40 rounded-full border border-cyan-400/40 bg-slate-900/80 object-cover shadow-xl shadow-cyan-500/30 sm:h-48 sm:w-48"
                />
                <span className="pointer-events-none absolute inset-0 rounded-full border border-cyan-400/20" />
              </div>
              <p className="mt-4 max-w-xs text-center text-xs text-slate-400">
                Portrait von Ricky G. Fleischer, Initiator von eDebatte.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* Linke Spalte: Q&A */}
          <div className="space-y-8">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-50">Fragen &amp; Antworten</h2>
              <p className="text-sm leading-relaxed text-slate-200">
                Statt eines klassischen Lebenslaufs beantworte ich hier die Fragen, die mir zu eDebatte und meiner Rolle am häufigsten gestellt werden.
              </p>
            </section>

            <section className="space-y-6 text-sm text-slate-200">
              <div>
                <h3 className="font-semibold text-slate-50">Ist eDebatte eine Partei?</h3>
                <p className="mt-1 leading-relaxed">
                  Nein. eDebatte ist eine Infrastruktur und Methode, kein Verein und keine Partei. Wir stellen die drei Stufen Check → Dossier → Beteiligung bereit, damit Gemeinden, Initiativen, Medien oder Verwaltungen Debatten nachvollziehbar führen können.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Was passiert mit den Ergebnissen von Abstimmungen?</h3>
                <p className="mt-1 leading-relaxed">
                  Ergebnisse, Quellen und Gegenargumente werden offen dokumentiert. Daraus entstehen Dossiers, Berichte und Handlungspfade, die sich gegenüber Politik, Verwaltung und Öffentlichkeit belegen lassen. Aus Stimmen sollen belastbare Mandate werden.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Für welche Ebenen ist eDebatte gedacht?</h3>
                <p className="mt-1 leading-relaxed">
                  Für jede Ebene, auf der Entscheidungen Bürger:innen betreffen: Gemeinden und Städte, Länder, Bund und Themenräume. Gestartet wird dort, wo Beteiligung ernst genommen wird und Teams bereit sind, die Methode anzuwenden.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Was kann ich als Bürger:in konkret bewegen?</h3>
                <p className="mt-1 leading-relaxed">
                  Themen setzen, Beiträge schreiben, Fragen stellen, abstimmen, andere mobilisieren. Je mehr Menschen strukturiert mitmachen, desto sichtbarer werden Mehrheiten und fehlende Perspektiven – und desto schwerer lassen sich Ergebnisse ignorieren.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Wie kann ich mich aktiv beteiligen?</h3>
                <p className="mt-1 leading-relaxed">
                  Du kannst Anliegen einreichen, Statements schreiben, Kontextkarten anlegen oder Tests mitfahren. Fachliche Rollen wie Moderation, Fact-Checking oder Community-Hosting werden Schritt für Schritt aufgebaut – mit klaren Spielregeln.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Wie kann ich mich passiv beteiligen?</h3>
                <p className="mt-1 leading-relaxed">
                  Mitgliedschaften und Beteiligungsguthaben finanzieren den Betrieb, auch wenn du nicht täglich debattierst. Frühzeitige Nutzung, Feedback und Teilen helfen, die Infrastruktur stabil und unabhängig zu halten.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Woher kam dein Antrieb, Ricky?</h3>
                <p className="mt-1 leading-relaxed">
                  Als Vater beschäftigt mich, in welche gesellschaftliche Struktur ich mein Kind schicke. Gleichzeitig sehe ich, wie Beteiligung oft zur Pflichtübung verkommt. eDebatte ist mein Versuch, Verfahren transparent zu machen, damit Entscheidungen besser begründet werden.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Wie finanziert ihr euch – warum nicht nur Fördermittel?</h3>
                <p className="mt-1 leading-relaxed">
                  Unabhängigkeit braucht breite Basisfinanzierung: viele kleine Beiträge statt weniger große. Förderungen werden gezielt geprüft, dürfen aber die methodische Neutralität nicht gefährden. Details zu Trägerschaft und Anschrift findest du im{" "}
                  <Link href="/impressum" className="font-semibold text-cyan-300 underline underline-offset-2">
                    Impressum
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Wie setzt ihr KI ein? Entscheidet am Ende eine Maschine?</h3>
                <p className="mt-1 leading-relaxed">
                  KI ist bei eDebatte ein Werkzeug: Sie hilft, Texte in Aussagen, Fragen und Belege zu zerlegen, Themen zu clustern und Widersprüche sichtbar zu machen. Entscheidungen treffen Menschen – abgesichert durch Regeln, Logs und offene Verfahren.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">Was ist deine Vision für eDebatte?</h3>
                <p className="mt-1 leading-relaxed">
                  Vor großen Entscheidungen soll es normal sein, eine strukturierte eDebatte zu fahren. Bürger:innen brauchen einen klaren Ort, um Themen einzubringen und zu verfolgen. Politik und Verwaltung sollen sich auf dokumentierte Verfahren stützen können – statt auf Stimmungen.
                </p>
              </div>
            </section>
          </div>

          {/* Rechte Spalte */}
          <aside className="space-y-8">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">Kurz zu meiner Rolle</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Ich bin Initiator und Produktverantwortlicher von eDebatte. Mein Fokus: Verfahren so bauen, dass sie alltagstauglich sind – technisch robust, inhaltlich fair und transparent dokumentiert.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">Rechtlicher Rahmen</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Rechtliche Angaben und die ladungsfähige Anschrift findest du im{" "}
                <Link href="/impressum" className="font-semibold text-cyan-300 underline underline-offset-2">
                  Impressum
                </Link>
                . eDebatte wird als Infrastruktur mit klaren Verantwortlichkeiten aufgebaut.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">Mitmachen &amp; unterstützen</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Du möchtest das Projekt verfolgen, dich einbringen oder unterstützen? Schau dir die Mitgliedschafts- und Beteiligungsmöglichkeiten an.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a
                  href="/mitglied-werden"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-xs font-medium text-slate-950 hover:bg-cyan-300"
                >
                  Mitmachen
                </a>
                <a
                  href="/kontakt"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-xs font-medium text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
                >
                  Kontakt
                </a>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
