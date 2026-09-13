import type { Metadata } from "next";
import Link from "next/link";
import EcosystemPositioning from "@/features/ecosystem/EcosystemPositioning";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

const TITLE = "eDebatte im internationalen Civic-Tech-Vergleich";
const DESCRIPTION =
  "CONSUL, Decidim, aula, adhocracy+, meinBerlin, CrowdInsights, Go Vocal, Polis, Make.org und weitere: Wo eDebatte im Feld von Civic Tech, Collective Intelligence und digitaler Demokratie ansetzt.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({ path: "/vergleich", title: TITLE, description: DESCRIPTION, ogType: "website" }),
  title: { absolute: TITLE },
};

const groups = [
  {
    title: "Participatory democracy frameworks",
    body: "Systeme, die demokratische Prozesse, Proposals, Initiativen, Ideenräume, Budgets oder Beteiligungsräume konfigurierbar machen.",
    links: [
      ["CONSUL Democracy", "/vergleich/consul"],
      ["Decidim", "/vergleich/decidim"],
      ["adhocracy+", "/vergleich/adhocracy-plus"],
      ["aula", "/vergleich/aula"],
    ],
  },
  {
    title: "Community & government engagement",
    body: "Plattformen, die Verwaltungen und Organisationen bei Konsultationen, Projekten, Ideen, Karten, Umfragen und Auswertung unterstützen.",
    links: [
      ["meinBerlin", "/vergleich/meinberlin"],
      ["Go Vocal / CitizenLab", "/vergleich/govocal"],
      ["CrowdInsights", "/vergleich/crowdinsights"],
      ["wer|denkt|was", "/vergleich/werdenktwas"],
    ],
  },
  {
    title: "Mass participation & computational deliberation",
    body: "Ansätze, die sehr große Mengen an Meinungen, Vorschlägen und Reaktionen strukturieren, Konsensfelder erkennen oder kollektive Prioritäten sichtbar machen.",
    links: [
      ["Polis", "/vergleich/polis"],
      ["Make.org", "/vergleich/make-org"],
    ],
  },
  {
    title: "AI + collective intelligence",
    body: "Systeme, die Problemdefinition, Recherche, Lösungsentwicklung und menschliche Bewertung mit KI-gestützten Workflows verbinden.",
    links: [["Your Priorities + Policy Synth", "/vergleich/your-priorities"]],
  },
] as const;

const layers = [
  ["Signal", "Ein Problem, eine Beobachtung, offene Frage, Erfahrung oder Quelle wird sichtbar."],
  ["Sensemaking", "Problem, Ursachen, Kontext, Evidenz, Gegenargumente und Unsicherheit werden nachvollziehbar."],
  ["Options", "Alternative Handlungswege, Folgen und Zielkonflikte werden entwickelt und vergleichbar."],
  ["Deliberation", "Menschen positionieren, priorisieren, ergänzen und widersprechen auf gemeinsamer Informationsbasis."],
  ["Institutional connection", "Ergebnisse können an Initiativen, Kommunen, Parlamente, Regierungen, Wissenschaft, Medien oder internationale Organisationen anschließen."],
  ["Memory", "Debattenstand, Quellen und Entscheidungen sollen über einzelne Projekte und Wahlperioden hinweg nachvollziehbar bleiben."],
] as const;

export default function ComparisonLandscapePage() {
  return (
    <main id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="border-b border-[color:var(--border)]"><div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Global civic tech landscape</p><h1 className="mt-4 max-w-6xl text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">eDebatte ist nicht einfach die nächste Bürgerbeteiligungsplattform.</h1><p className="mt-6 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">International gibt es starke Systeme für digitale Beteiligung, Deliberation, Collective Intelligence und KI-gestützte Politikentwicklung. Der relevante Vergleich ist deshalb nicht: „Wer hat Kommentare, Voting oder KI?“ – sondern: <strong className="text-[color:var(--foreground)]">Welchen Teil demokratischer Problemlösung macht ein System zum Produktkern?</strong></p><p className="mt-4 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">eDebatte zielt auf die verbindende Schicht vom ersten gesellschaftlichen Signal bis zum anschlussfähigen, nachvollziehbaren Debattenstand – über Institutionen, Regionen, Sprachen und einzelne Verfahren hinweg.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/warum-edebatte" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">Das Zielbild verstehen →</Link><Link href="/create" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 font-black">Anliegen einbringen</Link></div></div></section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Die internationale Landschaft</p><h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">Nicht ein Markt. Mehrere demokratische Technologieklassen.</h2><div className="mt-9 grid gap-5 md:grid-cols-2">{groups.map((group) => <article key={group.title} className="rounded-[1.6rem] border border-[color:var(--border)] p-6"><h3 className="text-2xl font-black">{group.title}</h3><p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{group.body}</p><div className="mt-5 flex flex-wrap gap-2">{group.links.map(([label, href]) => <Link key={href} href={href} className="rounded-full border border-cyan-500/40 px-4 py-2 text-sm font-black text-cyan-700 hover:border-cyan-500 dark:text-cyan-300">{label} →</Link>)}</div></article>)}</div></section>

      <section className="bg-slate-950 py-14 text-white sm:py-16"><div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Der größere eDebatte-Stack</p><h2 className="mt-3 max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">Vom Signal bis zum demokratischen Gedächtnis.</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{layers.map(([title, body]) => <article key={title} className="rounded-[1.5rem] border border-slate-700 p-6"><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{body}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Die strategische Kategorie</p><h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">Democratic problem-solving infrastructure.</h2></div><div className="space-y-4 text-base leading-7 text-[color:var(--muted)]"><p>„Digitale Bürgerbeteiligung“ bleibt ein wichtiger Such- und Verständlichkeitsbegriff. Er beschreibt das Zielbild aber nur teilweise. eDebatte soll auch dort beginnen, wo noch gar kein Beteiligungsverfahren existiert.</p><p>International anschlussfähige Nachbarkategorien sind deshalb <strong className="text-[color:var(--foreground)]">civic collective intelligence</strong>, <strong className="text-[color:var(--foreground)]">public reasoning</strong>, <strong className="text-[color:var(--foreground)]">deliberative democracy</strong> und <strong className="text-[color:var(--foreground)]">democratic problem-solving</strong>. eDebatte verbindet diese Logiken mit einer citizen-first Public Journey.</p></div></div></section>

      <EcosystemPositioning compact />
    </main>
  );
}
