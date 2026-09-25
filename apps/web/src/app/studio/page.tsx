import Link from "next/link";
import { buildCanonicalDossierHref } from "@/components/dossier/runtimeTruth";

const PRODUCT_AREAS = [
  {
    href: buildCanonicalDossierHref(null, { allowIndexFallback: true }) ?? "/dossier",
    title: "Dossier",
    lead: "Akte, Evidenz, offene Fragen und Entscheidungsraum.",
  },
  {
    href: "/abstimmungen",
    title: "Abstimmungen",
    lead: "Optionen, Mehrheiten und Status in einer klaren Surface.",
  },
  {
    href: "/mandat",
    title: "Mandat",
    lead: "Zuständigkeit, Umsetzungsstand, Wirkung und Risiken.",
  },
  {
    href: "/factcheck",
    title: "Factcheck",
    lead: "Mehrkanal-Intake und prüfbare Interventionen.",
  },
  {
    href: "/swipes",
    title: "Swipes",
    lead: "Schnell bewerten und in Tiefe übergehen.",
  },
  {
    href: "/mitwirken",
    title: "Mitwirken",
    lead: "Einheitlicher Einstieg für Quelle, Frage, Perspektive und Widerspruch.",
  },
] as const;

export default function StudioPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Studio</p>
        <h1 className="text-3xl font-semibold text-[rgb(var(--fg))]">Produktbereiche als Primärmodell</h1>
        <p className="text-sm text-[rgb(var(--muted))]">
          Diese Route ist der kanonische Einstieg in die Fachbereiche. Demo bleibt ein kuratierter
          Layer, nicht eine zweite Architektur.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {PRODUCT_AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">{area.title}</h2>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{area.lead}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">
        Demo-Portal: <Link href="/demo" className="underline">/demo</Link> ·
        Journalismus: <Link href="/demo/journalist" className="underline"> /demo/journalist</Link> ·
        Verwaltung: <Link href="/demo/verwaltung" className="underline"> /demo/verwaltung</Link> ·
        Bürger: <Link href="/demo/buerger" className="underline"> /demo/buerger</Link>
      </section>
    </main>
  );
}
