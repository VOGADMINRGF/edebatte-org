import { PricingWidget_eDbtt } from "@/features/pricing/components/PricingWidget_eDbtt";
import { MEMBERSHIP_PLANS } from "@/features/membership/config";

const MEMBER_PLAN = MEMBERSHIP_PLANS.VOG_PRIVATE;

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">eDebatte</div>
      <h1 className="headline-grad mt-2 text-4xl font-extrabold">Preise & Mitgliedschaft</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">
        Wir sind in Gründung. Aktuell sind Beispiele und Preview-Daten sichtbar. Mit Vorbestellung oder Mitgliedschaft
        hilfst du, eDebatte als Werkzeug zügig in den Live-Betrieb zu bringen.
      </p>

      <section className="mt-8">
        <PricingWidget_eDbtt />
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bewegung & Mitgliedschaft</div>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{MEMBER_PLAN.label}</h2>
        <p className="mt-2 text-sm text-slate-600">{MEMBER_PLAN.description}</p>
        <p className="mt-2 text-sm text-slate-600">
          Einstieg ab {MEMBER_PLAN.minPerPerson} € / Monat pro Person.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <a className="btn btn-primary" href="/mitglied-werden">
            Mitglied werden
          </a>
          <a className="btn btn-ghost" href="/kontakt">
            Kontakt / Demo-Liste
          </a>
          <a className="btn btn-ghost" href="/howtoworks/edebatte">
            Aktuelle Homepage
          </a>
        </div>
      </section>
    </main>
  );
}
