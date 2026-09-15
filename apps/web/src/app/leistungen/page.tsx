import type { Metadata } from "next";
import Link from "next/link";
import ProfessionalServicesSection from "@/features/home/ProfessionalServicesSection";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";
import { BRAND } from "@/lib/brand";
import { PROFESSIONAL_SERVICES } from "@features/pricing/professionalServices";

const TITLE = "Politische Themenanalyse & Decision Intelligence für Organisationen | eDebatte";
const DESCRIPTION =
  "Decision Dossiers, Themenmonitoring und strukturierte Entscheidungsaufbereitung für Verbände, Redaktionen, NGOs, Beratungen und Organisationen.";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/leistungen",
  title: TITLE,
  description: DESCRIPTION,
});

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Professionelle Leistungen von eDebatte",
  itemListElement: PROFESSIONAL_SERVICES.map((service, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: {
      "@type": "Service",
      name: service.name.de,
      description: service.shortDescription.de,
      url: new URL(service.href, BRAND.baseUrl).toString(),
      provider: {
        "@type": "Organization",
        name: BRAND.name,
        url: BRAND.baseUrl,
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: String(service.price.amountEur),
        url: new URL(service.inquiryHref, BRAND.baseUrl).toString(),
      },
    },
  })),
};

export default function LeistungenPage() {
  return (
    <main id="main-content" className="min-h-screen">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="mx-auto max-w-[76rem] px-5 pb-4 pt-14 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
        <div className="max-w-4xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            Für professionelle Teams
          </p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            Komplexe Themen verstehen, bevor Entscheidungen fallen.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[color:var(--muted)]">
            eDebatte strukturiert politische und gesellschaftliche Themen so, dass Quellen, Positionen, Alternativen,
            Auswirkungen, Widersprüche und Unsicherheiten gemeinsam sichtbar werden. Für einzelne Entscheidungen als
            Decision Dossier oder fortlaufend als Topic Intelligence.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/kontakt?channel=team&source=leistungen-hero" className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950">
              Pilot anfragen →
            </Link>
            <Link href="/leistungen/decision-dossier" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-black">
              Decision Dossier ansehen
            </Link>
          </div>
        </div>
      </section>

      <ProfessionalServicesSection />

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 lg:px-10">
        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-[color:var(--border)] p-6">
            <h2 className="text-xl font-black">Für Redaktionen</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Themenstand, Gegenpositionen und belastbare Quellen für Briefings, Hintergrund und redaktionelle Vorbereitung.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[color:var(--border)] p-6">
            <h2 className="text-xl font-black">Für Verbände & NGOs</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Entwicklungen, Interessenlagen und Handlungsoptionen nachvollziehbar ordnen, ohne eine gewünschte Position als Ergebnis vorzugeben.
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-[color:var(--border)] p-6">
            <h2 className="text-xl font-black">Für Public Affairs & Beratung</h2>
            <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
              Relevante politische und gesellschaftliche Veränderungen kontinuierlich beobachten und entscheidungsrelevant verdichten.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
