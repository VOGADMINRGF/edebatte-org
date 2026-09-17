import Link from "next/link";
import {
  PROFESSIONAL_SERVICES,
  formatProfessionalServicePrice,
  type ProfessionalServiceId,
} from "@features/pricing/professionalServices";

type Props = {
  serviceId: ProfessionalServiceId;
  eyebrow: string;
  headline: string;
  intro: string;
  bullets: string[];
  useCases: string[];
};

export default function ProfessionalServiceDetail({
  serviceId,
  eyebrow,
  headline,
  intro,
  bullets,
  useCases,
}: Props) {
  const service = PROFESSIONAL_SERVICES.find((entry) => entry.id === serviceId);
  if (!service) return null;

  return (
    <main id="main-content" className="min-h-screen">
      <section className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{eyebrow}</p>
            <h1 className="mt-4 text-balance text-4xl font-black tracking-[-0.04em] sm:text-6xl">{headline}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[color:var(--muted)]">{intro}</p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-black text-cyan-700 dark:text-cyan-300">
                {formatProfessionalServicePrice(service, "de")}
              </span>
              <Link href={service.inquiryHref} className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950">
                Pilot anfragen →
              </Link>
            </div>
            <p className="mt-4 text-sm font-semibold text-[color:var(--muted)]">
              Individuelle Beauftragung, menschliche Prüfung, kein automatischer Checkout.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[76rem] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:px-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Was enthalten ist</p>
          <h2 className="mt-3 text-3xl font-black">Strukturiert statt überladen.</h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            {bullets.map((item) => (
              <li key={item} className="rounded-2xl border border-[color:var(--border)] p-4">{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Typische Einsatzfälle</p>
          <h2 className="mt-3 text-3xl font-black">Für Entscheidungen mit Kontext.</h2>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            {useCases.map((item) => (
              <li key={item} className="rounded-2xl border border-[color:var(--border)] p-4">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-[color:var(--surface)]/35">
        <div className="mx-auto max-w-[76rem] px-5 py-12 sm:px-8 lg:px-10">
          <h2 className="text-2xl font-black">Was eDebatte nicht verkauft</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-[color:var(--muted)]">
            Keine gewünschte politische Schlussfolgerung und keinen besseren Faktenstatus gegen Aufpreis. Bezahlt werden Umfang,
            Strukturierung, Monitoring, Reporting, Team-Workflow und Begleitung. Quellen, Gegenpositionen, Widersprüche und
            Unsicherheiten bleiben sichtbar.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[76rem] px-5 py-14 sm:px-8 lg:px-10">
        <div className="flex flex-wrap gap-3">
          <Link href={service.inquiryHref} className="inline-flex min-h-12 items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-sm font-black text-slate-950">
            Gespräch anfragen →
          </Link>
          <Link href="/leistungen" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[color:var(--border)] px-6 py-3 text-sm font-black">
            Alle Leistungen
          </Link>
        </div>
      </section>
    </main>
  );
}
