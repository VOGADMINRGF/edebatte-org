"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import {
  PROFESSIONAL_SERVICES,
  PROFESSIONAL_SERVICE_PACKAGING,
  formatProfessionalServicePrice,
} from "@features/pricing/professionalServices";

export default function ProfessionalServicesSection() {
  const { locale } = useLocale();
  const language = locale === "de" ? "de" : "en";
  const de = language === "de";

  return (
    <section className="border-t border-[color:var(--border)] bg-[color:var(--surface)]/35">
      <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
            {de ? "Professionelle Entscheidungsaufbereitung" : "Professional decision intelligence"}
          </p>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            {de ? "Vom komplexen Thema zur belastbaren Entscheidungsgrundlage." : "From a complex topic to a traceable decision brief."}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[color:var(--muted)]">
            {de
              ? "Für Verbände, Redaktionen, NGOs, Beratungen, Public Affairs und Organisationen bereitet eDebatte Themen strukturiert auf oder begleitet sie fortlaufend. Die Pilotangebote werden menschlich geprüft und individuell beauftragt – es gibt noch keinen automatischen Checkout."
              : "For associations, newsrooms, NGOs, consultancies, public affairs and organisations, eDebatte structures complex topics or monitors them over time. Pilot services are human-reviewed and commissioned individually; automated checkout is not yet available."}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {PROFESSIONAL_SERVICES.map((service) => (
            <article
              key={service.id}
              className={`flex h-full flex-col rounded-[1.75rem] border p-6 ${
                service.featured
                  ? "border-cyan-500/60 bg-cyan-500/8 shadow-[0_18px_45px_rgba(6,182,212,0.12)]"
                  : "border-[color:var(--border)] bg-[color:var(--background)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {service.featured ? (
                    <span className="inline-flex rounded-full bg-cyan-500/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
                      {de ? "Empfohlener Pilot" : "Recommended pilot"}
                    </span>
                  ) : null}
                  <h3 className="mt-3 text-2xl font-black">{service.name[language]}</h3>
                </div>
                <p className="shrink-0 text-right text-lg font-black text-cyan-700 dark:text-cyan-300">
                  {formatProfessionalServicePrice(service, language)}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{service.shortDescription[language]}</p>
              <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/35 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  {de ? "Ergebnis" : "Outcome"}
                </p>
                <p className="mt-2 text-sm leading-6">{service.outcome[language]}</p>
              </div>
              <p className="mt-4 text-xs font-semibold leading-5 text-[color:var(--muted)]">
                {de ? "Geeignet für: " : "Best for: "}
                {service.bestFor[language]}
              </p>

              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Link
                  href={service.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] px-5 py-2.5 text-sm font-black transition hover:border-cyan-500/60"
                >
                  {de ? "Leistung ansehen" : "View service"}
                </Link>
                <Link
                  href={service.inquiryHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5"
                >
                  {de ? "Pilot anfragen" : "Request pilot"} →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--background)] p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-lg font-black">
              {de ? "Der Evidenzstandard ist nicht käuflich." : "The evidence standard is not for sale."}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
              {de
                ? "Du bezahlst für Umfang, Aufbereitung, Monitoring, Team-Workflow, Exporte und Begleitung – nicht für ‚bessere Fakten‘ oder eine gewünschte politische Schlussfolgerung. Quellen, Widersprüche und Unsicherheiten bleiben sichtbar."
                : "You pay for scope, preparation, monitoring, team workflow, exports and support — not for ‘better facts’ or a preferred political conclusion. Sources, contradictions and uncertainty remain visible."}
            </p>
          </div>
          <div className="text-xs font-bold text-[color:var(--muted)]">
            {PROFESSIONAL_SERVICE_PACKAGING.checkoutIsAvailable
              ? de
                ? "Online bestellbar"
                : "Available online"
              : de
                ? "Individuelle Beauftragung"
                : "Commissioned individually"}
          </div>
        </div>

        <div className="mt-7 text-center">
          <Link href="/leistungen" className="text-sm font-black text-cyan-700 hover:underline dark:text-cyan-300">
            {de ? "Alle professionellen Leistungen und Einsatzbeispiele" : "All professional services and use cases"} →
          </Link>
        </div>
      </div>
    </section>
  );
}
