import Link from "next/link";

export type ComparisonRow = {
  dimension: string;
  platform: string;
  edebatte: string;
};

type ComparisonEvidenceSource = {
  label: string;
  href: string;
};

type ComparisonEvidence = {
  sources: ComparisonEvidenceSource[];
};

const REVIEWED_AT = "4. September 2026";

function resolveComparisonEvidence(platformName: string): ComparisonEvidence {
  const normalized = platformName.toLowerCase();

  if (normalized.includes("consul")) {
    return {
      sources: [
        { label: "CONSUL Democracy · Features", href: "https://consuldemocracy.org/features/" },
      ],
    };
  }
  if (normalized.includes("decidim")) {
    return {
      sources: [
        { label: "Decidim · Modules", href: "https://decidim.org/modules/" },
      ],
    };
  }
  if (normalized === "aula") {
    return {
      sources: [
        {
          label: "aula · Beteiligung mit aula",
          href: "https://www.aula.de/was-ist-aula/beteiligung-mit-aula/",
        },
      ],
    };
  }
  if (normalized.includes("adhocracy")) {
    return {
      sources: [
        { label: "adhocracy+ · Funktionen", href: "https://adhocracy.plus/info/features/" },
      ],
    };
  }
  if (normalized.includes("meinberlin")) {
    return {
      sources: [
        { label: "meinBerlin · Beteiligungsplattform", href: "https://mein.berlin.de/" },
      ],
    };
  }
  if (normalized.includes("go vocal") || normalized.includes("citizenlab")) {
    return {
      sources: [
        { label: "Go Vocal · Community Engagement Platform", href: "https://www.govocal.com/" },
      ],
    };
  }
  if (normalized.includes("make.org")) {
    return {
      sources: [
        {
          label: "Make.org · Consultation methodology",
          href: "https://about.make.org/en/start-a-project",
        },
      ],
    };
  }
  if (normalized.includes("polis")) {
    return {
      sources: [
        {
          label: "Computational Democracy Project · pol.is",
          href: "https://compdemocracy.org/pol.is/",
        },
      ],
    };
  }
  if (normalized.includes("your priorities") || normalized.includes("policy synth")) {
    return {
      sources: [
        { label: "Citizens Foundation · Your Priorities", href: "https://citizens.is/your-priorities/" },
        { label: "Citizens Foundation · Policy Synth", href: "https://www.citizens.is/policy-synth/" },
      ],
    };
  }
  if (normalized.includes("crowdinsights")) {
    return {
      sources: [
        {
          label: "CrowdInsights · Beteiligungswebsite",
          href: "https://crowdinsights.de/produkt/beteiligungswebsite",
        },
        {
          label: "CrowdInsights · Admin und Auswertung",
          href: "https://crowdinsights.de/produkt/crowdinsights-admin",
        },
        {
          label: "CrowdInsights · Nachvollziehbare KI-Auswertung",
          href: "https://crowdinsights.de/ressourcen/nachvollziehbare-ki-auswertung-beteiligung",
        },
      ],
    };
  }
  if (normalized.includes("wer|denkt|was") || normalized.includes("werdenktwas")) {
    return {
      sources: [
        {
          label: "wer|denkt|was · Dialog Digital",
          href: "https://werdenktwas.de/beteiligungsplattform-dialog-digital/",
        },
        { label: "wer|denkt|was · Leistungen", href: "https://werdenktwas.de/" },
      ],
    };
  }

  return { sources: [] };
}

type Props = {
  platformName: string;
  eyebrow: string;
  headline: string;
  intro: string;
  fairNote: string;
  rows: ComparisonRow[];
  coreQuestion: string;
  coreExplanation: string;
  closingHeadline: string;
  closingBody: string;
};

export default function ComparisonPage({
  platformName,
  eyebrow,
  headline,
  intro,
  fairNote,
  rows,
  coreQuestion,
  coreExplanation,
  closingHeadline,
  closingBody,
}: Props) {
  const evidence = resolveComparisonEvidence(platformName);
  const evidenceId = `comparison-evidence-${platformName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <main id="main-content" className="min-h-[100svh] bg-[color:var(--background)] text-[color:var(--foreground)]">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{eyebrow}</p>
          <h1 className="mt-4 max-w-6xl text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">{headline}</h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-[color:var(--muted)] sm:text-xl">{intro}</p>
          <div className="mt-6 max-w-4xl rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--surface)]/35 p-5 text-sm leading-6 text-[color:var(--muted)]">
            <strong className="text-[color:var(--foreground)]">Fairer Vergleich:</strong> {fairNote}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/warum-edebatte" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">
              Warum eDebatte? →
            </Link>
            <Link href="/vergleich" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 font-black">
              Internationale Landschaft
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Der entscheidende Prüfpunkt</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-5xl">{coreQuestion}</h2>
          </div>
          <p className="text-base leading-7 text-[color:var(--muted)]">{coreExplanation}</p>
        </div>
      </section>

      <section className="bg-slate-950 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-[76rem] px-5 sm:px-8 lg:px-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Vergleich im Kern</p>
          <div className="mt-7 overflow-x-auto rounded-[1.5rem] border border-slate-700">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-4 font-black">Dimension</th>
                  <th className="p-4 font-black">{platformName}</th>
                  <th className="p-4 font-black text-cyan-300">eDebatte-Zielbild</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.dimension} className="border-t border-slate-800 align-top">
                    <th className="p-4 font-black text-white">{row.dimension}</th>
                    <td className="p-4 leading-6 text-slate-300">{row.platform}</td>
                    <td className="p-4 leading-6 text-slate-300">{row.edebatte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-12 sm:px-8 sm:py-14 lg:px-10" aria-labelledby={evidenceId}>
        <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--surface)]/35 p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Quellen & Methodik</p>
          <h2 id={evidenceId} className="mt-2 text-2xl font-black tracking-[-0.02em]">
            Nachprüfbar statt Feature-Behauptung
          </h2>
          <div className="mt-4 max-w-5xl space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            <p>
              <strong className="text-[color:var(--foreground)]">Stand der Recherche: {REVIEWED_AT}.</strong>{" "}
              Der Vergleich stützt sich auf öffentlich zugängliche, offizielle Produkt-, Projekt- oder Betreiberinformationen. Wir vergleichen dokumentierte Fähigkeiten und den öffentlich beschriebenen Produktfokus – nicht jede denkbare individuelle Konfiguration oder interne Roadmap.
            </p>
            <p>
              Wenn eine Fähigkeit hier als „nicht Produktkern“ oder ähnlich eingeordnet wird, bedeutet das ausschließlich: Sie wird in den unten verlinkten, von uns geprüften öffentlichen Unterlagen nicht als eigenständiger zentraler Produktkern beschrieben. Das ist keine Behauptung, dass sie technisch unmöglich ist oder in keinem Projekt existiert.
            </p>
            <p>
              Die eDebatte-Spalte ist ausdrücklich als <strong className="text-[color:var(--foreground)]">Zielbild</strong> gekennzeichnet. Geplante Fähigkeiten werden nicht als bereits vollständig produktiv dargestellt.
            </p>
          </div>

          {evidence.sources.length > 0 ? (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {evidence.sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-11 w-full items-center rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-bold hover:bg-[color:var(--surface)]"
                  >
                    {source.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 border-t border-[color:var(--border)] pt-4 text-xs leading-5 text-[color:var(--muted)]">
            <p>
              Die Nennung fremder Produkt- und Markennamen dient ausschließlich der sachlichen Einordnung. Soweit nicht ausdrücklich anders angegeben, besteht keine geschäftliche Verbindung oder Empfehlung. Marken und Produktnamen verbleiben bei ihren jeweiligen Inhabern.
            </p>
            <p className="mt-2">
              Sachliche Korrekturen oder Hinweise auf geänderte Produktfunktionen:{" "}
              <a className="font-bold text-[color:var(--foreground)] underline underline-offset-2" href="mailto:support@edebatte.org">
                support@edebatte.org
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--border)] px-5 py-14 text-center sm:py-16">
        <h2 className="mx-auto max-w-5xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">{closingHeadline}</h2>
        <p className="mx-auto mt-5 max-w-4xl text-base leading-7 text-[color:var(--muted)]">{closingBody}</p>
        <div className="mt-7">
          <Link href="/create" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 font-black text-slate-950">
            Anliegen einbringen →
          </Link>
        </div>
      </section>
    </main>
  );
}
