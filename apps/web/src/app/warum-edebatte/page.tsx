import type { Metadata } from "next";
import Link from "next/link";
import EcosystemPositioning from "@/features/ecosystem/EcosystemPositioning";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "Warum eDebatte? Gesellschaftliche Willensbildung vor dem Verfahren";
const DESCRIPTION =
  "eDebatte beginnt vor institutionell gesetzten Agenden: Anliegen klären, Evidenz verbinden, Optionen entwickeln und gesellschaftliche Entscheidungen vorbereiten – lokal bis global.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/warum-edebatte",
    title: TITLE,
    description: DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

const journey = [
  { number: "01", title: "Anliegen", body: "Noch keine fertige Forderung nötig: Ein Problem, eine Beobachtung, eine offene Frage, Erfahrung oder Quelle kann der Anfang sein." },
  { number: "02", title: "Problem verstehen", body: "Worum geht es wirklich? Welche Menschen, Orte und politischen Ebenen sind betroffen? Was wissen wir – und was ist noch unklar?" },
  { number: "03", title: "Wissen verbinden", body: "Quellen, Evidenzen, Erfahrungen, Perspektiven, Gegenargumente, Widersprüche und Unsicherheiten bleiben unterscheidbar und nachvollziehbar." },
  { number: "04", title: "Optionen entwickeln", body: "Aus dem Problemverständnis können unterschiedliche Handlungswege, Folgen, Kosten, Chancen und Zielkonflikte sichtbar werden." },
  { number: "05", title: "Priorisieren", body: "Erst auf dieser Grundlage werden Positionen, Prioritäten, Bewertungen und mögliche Lösungen zur Beteiligung gestellt." },
  { number: "06", title: "Wirkung anschließen", body: "Initiativen, Kommunen, Parlamente, Regierungen, Wissenschaft, Medien, NGOs und internationale Organisationen können Wissen beitragen, Ergebnisse aufnehmen und Umsetzung ermöglichen." },
];

const differences = [
  ["Nicht erst bei der fertigen Frage", "Viele Beteiligungsangebote beginnen, wenn ein Projekt, eine Konsultation, eine Fragestellung oder ein Vorschlag bereits benannt ist. eDebatte soll schon beim ungeklärten gesellschaftlichen Signal beginnen können."],
  ["Nicht nur Beteiligung – öffentliches Reasoning", "Positionen stehen nicht isoliert. Aussagen, Quellen, Evidenzen, Widersprüche und Unsicherheiten sollen über den Lebenszyklus einer Debatte nachvollziehbar verbunden bleiben."],
  ["Nicht nur Ja oder Nein", "Vor einer Abstimmung können Problemdefinition, Ursachen, Handlungsoptionen und Zielkonflikte sichtbar werden. Über Fakten oder Wahrheit wird nicht abgestimmt."],
  ["Nicht an eine Institution gebunden", "Citizen-first bedeutet nicht citizen-only. Institutionen sind wichtige Wissens-, Verfahrens- und Umsetzungspartner – aber gesellschaftliche Problemklärung muss nicht auf ihre Einladung warten."],
  ["Nicht nur ein Projekt", "Das Ziel ist ein persistenter, nachvollziehbarer Debatten- und Wissensstand, der über einzelne Kampagnen, Verfahren, Organisationen und Wahlperioden hinaus anschlussfähig bleibt."],
  ["Nicht nur lokal", "Ein Anliegen kann in einer Straße beginnen und kommunal, regional, national, europäisch oder global relevant werden. Die sachliche Ebene folgt dem Gegenstand, nicht dem Vertriebsgebiet einer Plattform."],
] as const;

const scales = [
  ["Lokal", "Straße, Quartier, Kommune, Region"],
  ["National", "Landes- und Bundespolitik, öffentliche Institutionen"],
  ["Europäisch", "grenzüberschreitende Fragen, EU-Politik und europäische Öffentlichkeit"],
  ["Global", "Themen, die Staaten, Wissenschaft, Zivilgesellschaft und internationale Organisationen verbinden"],
] as const;

export default function WhyEDebattePage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Participation before the process · Vom Anliegen zur gemeinsamen Agenda</p>
          <h1 className="mt-4 max-w-6xl text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">Nicht erst mitreden, wenn die Frage schon feststeht.</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">eDebatte setzt beim Menschen und seinem Anliegen an – auch dann, wenn Problem, Forderung oder Lösung noch nicht fertig formuliert sind. Aus einem gesellschaftlichen Signal kann Schritt für Schritt ein nachvollziehbarer Debattenstand mit Evidenz, Perspektiven, offenen Fragen und möglichen Handlungswegen entstehen.</p>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">Das Ziel ist größer als eine weitere Beteiligungsplattform: <strong className="text-[color:var(--foreground)]">eine öffentliche Infrastruktur für demokratische Problemklärung, kollektive Intelligenz und gesellschaftliche Willensbildung – lokal bis global.</strong></p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">Anliegen einbringen →</Link>
            <Link href="/vergleich" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 font-black">Internationale Landschaft vergleichen</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Der eigentliche Unterschied</p><h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">Vom Anliegen zur gemeinsamen Agenda.</h2></div>
          <div className="space-y-4 text-base leading-7 text-[color:var(--muted)]"><p>Die erste demokratische Frage ist nicht immer „Welche Option wählst du?“. Oft lautet sie vorher: „Was ist eigentlich das Problem, das wir gemeinsam lösen sollten?“</p><p>Zwischen einem gesellschaftlichen Signal und einem formellen Verfahren liegt ein wichtiger Raum: Problemdefinition, Agenda-Setting, Evidenz, Perspektiven, Widersprüche, Alternativen und Zielkonflikte. eDebatte macht diesen Raum selbst zum Teil demokratischer Beteiligung.</p></div>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{journey.map((step) => <article key={step.number} className="rounded-[1.5rem] border border-[color:var(--border)] p-6"><span className="text-xs font-black text-cyan-700 dark:text-cyan-300">{step.number}</span><h3 className="mt-3 text-xl font-black">{step.title}</h3><p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{step.body}</p></article>)}</div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35"><div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Citizen-first, institution-connected</p><h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">Institutionen sind Partner. Aber nicht zwingend der Startknopf.</h2><p className="mt-5 max-w-4xl text-base leading-7 text-[color:var(--muted)]">Kommunen, Parlamente, Regierungen, Wissenschaft, Medien, NGOs, Unternehmen und internationale Organisationen können Fachwissen, Daten, Verfahren, Reichweite und Umsetzungskraft einbringen. eDebatte verändert die Reihenfolge: Ein gesellschaftliches Anliegen darf bereits sichtbar, strukturiert und gemeinsam weiterentwickelt werden, bevor eine Institution dafür ein eigenes Verfahren eröffnet.</p></div></section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Eine Infrastruktur, mehrere Ebenen</p><h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">Die Frage bestimmt die Ebene – nicht die Plattform.</h2><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{scales.map(([title, body]) => <article key={title} className="rounded-[1.5rem] border border-[color:var(--border)] p-6"><h3 className="text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{body}</p></article>)}</div></section>

      <EcosystemPositioning />

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{differences.map(([title, body]) => <article key={title} className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--background)] p-6"><h2 className="text-2xl font-black">{title}</h2><p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{body}</p></article>)}</div></section>

      <section className="bg-slate-950 py-14 text-white sm:py-16"><div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Die größere Kategorie</p><h2 className="mt-3 max-w-5xl text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">Democratic problem-solving. Civic collective intelligence. Public reasoning infrastructure.</h2><p className="mt-5 max-w-4xl text-base leading-7 text-slate-300">Diese Begriffe ersetzen nicht die verständliche Sprache für Bürgerinnen und Bürger. Sie beschreiben aber, wohin eDebatte als Infrastruktur wachsen soll: gesellschaftliche Probleme sichtbar machen, Wissen zusammenführen, Alternativen entwickeln, Positionen nachvollziehbar machen und Ergebnisse an reale demokratische Institutionen anschließen.</p></div></section>
    </main>
  );
}