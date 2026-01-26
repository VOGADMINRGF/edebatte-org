import { EDEBATTE_PLANS, MEMBER_DISCOUNT, calcDiscountedPrice } from "@/config/pricing";
import { MEMBERSHIP_PLANS } from "@/features/membership/config";

const MEMBER_PLAN = MEMBERSHIP_PLANS.VOG_PRIVATE;
const PREORDER_DISCOUNT = 15;
const PREPAY_BONUS = 10;
const TWO_YEAR_BONUS = 5;

function preorderHref(planId: string) {
  const normalized = planId.replace(/^edb-/, "");
  const next = `/account?preorder=1&edbPlan=${encodeURIComponent(normalized)}&source=pricing`;
  return `/register?next=${encodeURIComponent(next)}`;
}

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-50 pb-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_45%_at_80%_15%,rgba(168,85,247,0.16),transparent_55%),radial-gradient(55%_45%_at_20%_15%,rgba(34,197,94,0.10),transparent_55%)]" />
      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">eDebatte</div>
        <h1 className="headline-grad mt-2 text-4xl font-extrabold">Preise & Mitgliedschaft</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Wir sind in Gründung. Aktuell sind Beispiele und Preview-Daten sichtbar. Mit Vorbestellung oder Mitgliedschaft
          hilfst du, eDebatte als Werkzeug zügig in den Live-Betrieb zu bringen.
        </p>

        <section className="mt-8 space-y-6">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">eDebatte‑Pakete (Vorbestellung)</h2>
            <p className="text-sm text-slate-600">
              Drei Pakete, klar und vergleichbar. Vorbestellung jetzt möglich – mit Staffel‑Rabatten für frühe
              Unterstützer:innen.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
              Vorbestellung: −{PREORDER_DISCOUNT}% · Vorkasse: +{PREPAY_BONUS}% · 2 Jahre: +{TWO_YEAR_BONUS}% (max.
              {PREORDER_DISCOUNT + PREPAY_BONUS + TWO_YEAR_BONUS}%)
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {EDEBATTE_PLANS.map((plan) => {
              const list = plan.listPrice.amount;
              const member = calcDiscountedPrice(list, MEMBER_DISCOUNT.percent);
              const preorder = list > 0 ? Math.round(list * (1 - PREORDER_DISCOUNT / 100) * 100) / 100 : 0;
              return (
                <article
                  key={plan.id}
                  className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm flex flex-col"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{plan.label}</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
                  <div className="mt-4 space-y-2">
                    {plan.isFree ? (
                      <div className="text-xl font-bold text-emerald-600">Kostenfrei</div>
                    ) : (
                      <>
                        <div className="text-sm text-slate-500">Listenpreis</div>
                        <div className="text-xl font-bold text-slate-900">
                          {list.toFixed(2).replace(".", ",")} € <span className="text-sm font-normal">/ Monat</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Mitgliedspreis: {member.toFixed(2).replace(".", ",")} € / Monat (−{MEMBER_DISCOUNT.percent}%)
                        </div>
                        <div className="text-xs text-slate-500">
                          Vorbestellung ab: {preorder.toFixed(2).replace(".", ",")} € / Monat (−{PREORDER_DISCOUNT}%)
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.isFree ? (
                      <a className="btn btn-ghost" href="/start">
                        Kostenfrei starten
                      </a>
                    ) : (
                      <a className="btn btn-primary" href={preorderHref(plan.id)}>
                        Vorbestellen
                      </a>
                    )}
                    <a className="btn btn-ghost" href="/howtoworks/edebatte">
                      So funktioniert’s
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Vorbestellung für Unternehmen</h3>
            <p className="mt-1 text-sm text-slate-600">
              Kommunen, Verbände, Medienhäuser oder Unternehmen: Wir bieten Vorbestellungen inklusive Onboarding,
              Einrichtung und Daten‑Begleitung. Schreib uns – wir klären das Setup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn btn-primary" href="/kontakt?topic=enterprise-preorder">
                Unternehmens‑Vorbestellung anfragen
              </a>
              <a className="btn btn-ghost" href="/team?focus=politik">
                Für Politik & Verbände
              </a>
            </div>
          </article>
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
      </section>
    </main>
  );
}
