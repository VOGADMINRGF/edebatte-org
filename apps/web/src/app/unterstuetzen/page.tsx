import { MembershipCalculator_VOG } from "@/features/membership";
import Link from "next/link";

export default function UnterstuetzenPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-4xl px-4 pt-20 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
          <h1 className="text-4xl font-extrabold text-slate-900 text-center">
            Unterstützen
          </h1>
          <p className="mt-3 text-center text-lg text-slate-700">
            VoiceOpenGov ist eine gemeinwohlorientierte Plattform – unabhängig, datensicher und
            demokratisch. Deine Unterstützung macht politische Teilhabe möglich.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-emerald-50/80 p-4">
              <h2 className="text-base font-semibold text-emerald-700">Warum unterstützen?</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>Barrierefreie Weiterentwicklung</li>
                <li>Redaktionelle Aufarbeitung & Moderation</li>
                <li>Unabhängige Infrastruktur (DSGVO-konform)</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-rose-50/80 p-4">
              <h2 className="text-base font-semibold text-rose-700">Mitgliedschaften</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>10 €/Monat – Zugang zu Reports & Beteiligungsformaten</li>
                <li>25 €/Monat – Engagiert, inkl. Community-Formate</li>
                <li>50 €/Monat – Fördermitgliedschaft</li>
              </ul>
            </article>
          </div>
        </div>

        <MembershipCalculator_VOG />

        <p className="text-center text-sm text-slate-600">
          Für Plattform-Kontingente (Beiträge, Swipes, Bundles) siehe{" "}
          <Link href="/nutzungsmodell" className="text-emerald-600 underline">
            /nutzungsmodell
          </Link>
          . Die VoG-Mitgliedschaft bleibt davon getrennt.
        </p>

        <div className="text-center">
          <a href="/mitglied-werden" className="btn bg-brand-grad text-white shadow-soft">
            Jetzt unterstützen
          </a>
        </div>
      </section>
    </main>
  );
}
