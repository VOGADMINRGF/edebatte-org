import Link from "next/link";
import { ECOSYSTEM_BRANDS, getEcosystemHref } from "@/config/ecosystem";

type Props = {
  compact?: boolean;
};

export default function EcosystemPositioning({ compact = false }: Props) {
  return (
    <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35">
      <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              Ein Ökosystem, klare Rollen
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Infrastruktur, Bewegung, Denkwerkstatt und Begleitung bleiben unterscheidbar.
            </h2>
          </div>
          <div className="space-y-4 text-base leading-7 text-[color:var(--muted)]">
            <p>
              eDebatte ist die offene Infrastruktur für gesellschaftliche Problemklärung, Evidenz, Debatte und Beteiligung. VoiceOpenGov ist die internationale Mitgliederbewegung, die Menschen organisiert und demokratische Zusammenarbeit in die Gesellschaft trägt.
            </p>
            <p>
              Diese Trennung ist Absicht: <strong className="text-[color:var(--foreground)]">VoiceOpenGov nutzt eDebatte, besitzt eDebatte aber nicht.</strong> Öffentliche Ergebnisse auf eDebatte sollen deshalb nicht wie vorbestimmte Positionen einer Bewegung erscheinen.
            </p>
          </div>
        </div>

        <div className={`mt-9 grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4"}`}>
          {ECOSYSTEM_BRANDS.map((brand) => {
            const href = getEcosystemHref(brand);
            const card = (
              <article className="h-full rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--background)] p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">{brand.canonicalRole}</p>
                <h3 className="mt-3 text-2xl font-black">{brand.displayName}</h3>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{brand.description}</p>
                <p className="mt-4 border-t border-[color:var(--border)] pt-4 text-xs leading-5 text-[color:var(--muted)]">{brand.relationshipToEDebatte}</p>
                {href ? <span className="mt-5 inline-block text-sm font-black text-cyan-700 dark:text-cyan-300">Mehr erfahren →</span> : null}
              </article>
            );

            if (!href) return <div key={brand.id}>{card}</div>;
            if (brand.target.status === "available" && brand.target.kind === "external") {
              return (
                <a key={brand.id} href={href} target="_blank" rel="noreferrer" className="block transition hover:-translate-y-0.5">
                  {card}
                </a>
              );
            }
            return (
              <Link key={brand.id} href={href} className="block transition hover:-translate-y-0.5">
                {card}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}