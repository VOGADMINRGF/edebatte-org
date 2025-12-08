// apps/web/src/app/ueber-ricky/page.tsx
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Über Ricky G. Fleischer – VoiceOpenGov",
  description:
    "Initiator von VoiceOpenGov / eDebatte. Persönliche Einordnung, Motivation und Fragen & Antworten rund um das Projekt.",
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
              VoiceOpenGov · Initiator
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Über <span className="text-cyan-300">Ricky G. Fleischer</span>
              </h1>
              <p className="max-w-xl text-sm text-slate-200 sm:text-base">
                Ich baue mit VoiceOpenGov eine offene, digitale Infrastruktur
                für demokratische Beteiligung – damit Bürger:innen komplexe
                Entscheidungen besser verstehen, mitgestalten und nachvollziehen
                können. Nicht als neue Partei, sondern als System, das
                Entscheidungen transparent macht.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {["Initiator", "Civic Tech", "Unabhängig", "Berlin"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-slate-200"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-300"
              >
                VoiceOpenGov entdecken
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
                Portrait von Ricky G. Fleischer, Initiator von VoiceOpenGov /
                eDebatte.
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
              <h2 className="text-lg font-semibold text-slate-50">
                Fragen &amp; Antworten
              </h2>
              <p className="text-sm leading-relaxed text-slate-200">
                Statt eines klassischen Lebenslaufs beantworte ich hier die
                Fragen, die mir zu VoiceOpenGov und meiner Rolle am häufigsten
                gestellt werden.
              </p>
            </section>

            <section className="space-y-6 text-sm text-slate-200">
              <div>
                <h3 className="font-semibold text-slate-50">
                  Ist VoiceOpenGov eine Partei?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Nein. VoiceOpenGov ist keine Partei und soll auch keine
                  werden. Ich sehe das Projekt als demokratische Infrastruktur:
                  eine Art &quot;Betriebssystem&quot; für Beteiligung, das von
                  Bürger:innen, Gemeinden, Initiativen und später auch
                  Verwaltungen genutzt werden kann – unabhängig davon, welche
                  Parteien gerade an der Macht sind.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Was passiert mit den Ergebnissen von Abstimmungen und
                  Debatten?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Die Ergebnisse sollen nicht in der Schublade verschwinden.
                  Unsere Auswertungen sollen offen dokumentiert werden und als
                  Grundlage für Berichte, Handlungsoptionen und klare
                  Rückmeldungen an Politik, Verwaltung und Öffentlichkeit
                  dienen. Aus deiner Stimme soll mehr werden als ein einmaliges
                  &quot;Ja/Nein&quot;.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Für welche Gemeinden und Ebenen ist VoiceOpenGov gedacht?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Grundsätzlich für alle Ebenen, auf denen Entscheidungen
                  Bürger:innen betreffen: Gemeinden und Städte, Länder und Bund,
                  aber auch europäische Themen. Starten werden wir dort, wo es
                  am meisten Sinn macht: mit Gemeinden, Regionen und
                  Themenräumen, die bereit sind, Beteiligung ernst zu nehmen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Was kann ich als Bürger:in konkret bewegen?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Du kannst Themen setzen, Beiträge schreiben, Fragen stellen,
                  abstimmen und andere mobilisieren. Je mehr Menschen strukturiert
                  mitmachen, desto schwerer wird es, die Ergebnisse zu
                  ignorieren. Das Ziel ist, dass Beteiligung nicht nur Symbolik
                  ist, sondern spürbare Folgen für Entscheidungen hat.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Wie kann ich mich aktiv beteiligen?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Aktiv heißt: du greifst ein. Du kannst Themen einreichen,
                  Statements schreiben, Fragen formulieren, Tests mitfahren oder
                  dich als Fachperson (z.B. in Recht, Verwaltung, Daten, UX)
                  einbringen. Langfristig soll es Rollen wie Moderator:in,
                  Fact-Checker:in oder Community-Host geben – mit klaren
                  Spielregeln und Verantwortung.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Wie kann ich mich passiv beteiligen?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Passiv heißt: du hältst das System am Laufen, auch wenn du
                  nicht täglich diskutierst. Das geht über Mitgliedschaften,
                  einmalige Gutschriften, frühzeitige eDebatte-Nutzung oder
                  einfach, indem du das Projekt mit anderen teilst. Ohne diese
                  Art von Unterstützung kann die Infrastruktur langfristig nicht
                  bestehen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Woher kam dein Antrieb, Ricky?
                </h3>
                <p className="mt-1 leading-relaxed">
                  Ein Teil ist sehr persönlich: Als ich Vater wurde, hat sich
                  die Frage verschärft, in welche politische und gesellschaftliche
                  Struktur ich mein Kind eigentlich hineinschicke. Parallel dazu
                  habe ich jahrelang erlebt, wie Beteiligung oft als
                  Pflichtübung abgehandelt wird und viele Menschen das Gefühl
                  haben: &quot;Es bringt eh nichts.&quot; VoiceOpenGov /
                  eDebatte ist mein Versuch, das nicht einfach so zu
                  akzeptieren.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Wie finanziert ihr euch – und warum nicht klassisch über
                  Fördermittel?
                </h3>
                <p className="mt-1 leading-relaxed">
  VoiceOpenGov ist eine Initiative im Aufbau; die Gründung einer
  UG (haftungsbeschränkt) ist in Vorbereitung. Wir finanzieren uns
  bewusst über viele kleinere Beiträge statt über wenige Großzahler:innen
  und gehen mit klassischer Dauerförderung sehr vorsichtig um.
  Um unabhängig von Stadt, Land und EU zu bleiben, verzichten wir
  derzeit auf öffentliche Förderprogramme – eine Lösung aus der
  Gesellschaft für die Gesellschaft.
</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Wie setzt ihr KI ein? Entscheidet am Ende eine Maschine?
                </h3>
                <p className="mt-1 leading-relaxed">
                  KI ist bei VoiceOpenGov ein Werkzeug, kein Entscheider. Sie
                  hilft, Texte in Aussagen, Fragen und Belege zu zerlegen,
                  Themen zu clustern und Widersprüche sichtbar zu machen. Die
                  Entscheidungen treffen aber Menschen – nachvollziehbar und
                  dokumentiert.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-50">
                  Was ist deine Vision für VoiceOpenGov?
                </h3>
                <p className="mt-1 leading-relaxed">
                  In ein paar Jahren soll es normal sein, vor großen
                  Entscheidungen eine strukturierte eDebatte zu fahren. Bürger:innen
                  sollen einen klaren Ort haben, um Themen einzubringen und zu
                  verfolgen. Und Politik wie Verwaltung sollen sich nicht nur
                  auf Stimmungen verlassen, sondern auf offene,
                  nachvollziehbare Beteiligungsprozesse.
                </p>
              </div>
            </section>
          </div>

          {/* Rechte Spalte */}
          <aside className="space-y-8">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">
                Kurz zu meiner Rolle
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Ich bin Initiator und Produktverantwortlicher von VoiceOpenGov /
                eDebatte. Mein Schwerpunkt liegt darauf, Beteiligung so zu
                bauen, dass sie alltagstauglich ist – technisch robust,
                inhaltlich fair und möglichst transparent.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">
                Rechtlicher Rahmen
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                VoiceOpenGov ist eine Initiative im Aufbau mit Sitz in Berlin.
                Die Gründung einer UG (haftungsbeschränkt) wird vorbereitet, um
                Betrieb, Verantwortung und Zusammenarbeit auf eine klare
                rechtliche Basis zu stellen.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/70">
              <h3 className="text-sm font-semibold text-slate-50">
                Mitmachen &amp; unterstützen
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">
                Du möchtest das Projekt verfolgen, dich einbringen oder
                unterstützen? Schau dir die Mitgliedschafts- und
                Beteiligungsmöglichkeiten an.
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
