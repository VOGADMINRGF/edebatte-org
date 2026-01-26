"use client";

import { useMemo } from "react";
import { EDEBATTE_PLANS } from "@/config/pricing";
import { MEMBERSHIP_PLANS } from "@/features/membership/config";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

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
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "pricing" });
  const plans = useMemo(() => {
    if (locale === "de" || locale === "en") return EDEBATTE_PLANS;
    return EDEBATTE_PLANS.map((plan) => ({
      ...plan,
      label: t(plan.label, `plan.${plan.id}.label`),
      description: t(plan.description, `plan.${plan.id}.description`),
    }));
  }, [locale, t]);
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-slate-50 pb-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(56,189,248,0.18),transparent_60%),radial-gradient(55%_45%_at_80%_15%,rgba(168,85,247,0.16),transparent_55%),radial-gradient(55%_45%_at_20%_15%,rgba(34,197,94,0.10),transparent_55%)]" />
      <section className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">
          {t("eDebatte", "hero.brand")}
        </div>
        <h1 className="headline-grad mt-2 text-4xl font-extrabold">
          {t("Preise & Mitgliedschaft", "hero.title")}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          {t(
            "Wir sind in Gründung. Aktuell sind Beispiele und Preview-Daten sichtbar. Mit Vorbestellung oder Mitgliedschaft hilfst du, eDebatte als Werkzeug zügig in den Live-Betrieb zu bringen.",
            "hero.lead",
          )}
        </p>

        <section className="mt-8 space-y-6">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">
              {t("eDebatte‑Pakete (Vorbestellung)", "plans.title")}
            </h2>
            <p className="text-sm text-slate-600">
              {t(
                "Drei Pakete, klar und vergleichbar. Vorbestellung jetzt möglich – mit Staffel‑Rabatten für frühe Unterstützer:innen.",
                "plans.lead",
              )}
            </p>
            <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
              {t("Vorbestellung:", "plans.discount.prefix")} −{PREORDER_DISCOUNT}% ·{" "}
              {t("Vorkasse:", "plans.discount.prepay")} +{PREPAY_BONUS}% ·{" "}
              {t("2 Jahre:", "plans.discount.twoYears")} +{TWO_YEAR_BONUS}% ({t("max.", "plans.discount.max")}{" "}
              {PREORDER_DISCOUNT + PREPAY_BONUS + TWO_YEAR_BONUS}%)
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const list = plan.listPrice.amount;
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
                      <div className="text-xl font-bold text-emerald-600">
                        {t("Kostenfrei", `plan.${plan.id}.free`)}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-slate-500">
                          {t("Listenpreis", `plan.${plan.id}.listLabel`)}
                        </div>
                        <div className="text-xl font-bold text-slate-900">
                          <span className="mr-2 text-slate-400 line-through">
                            {list.toFixed(2).replace(".", ",")} € / {t("Monat", "plan.unitMonth")}
                          </span>
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                            −{PREORDER_DISCOUNT}% {t("Vorbestellung", "plan.preorderBadge")}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {t("Vorbestellung ab:", "plan.preorderFrom")}{" "}
                          <span className="font-semibold text-slate-700">
                            {preorder.toFixed(2).replace(".", ",")} €
                          </span>{" "}
                          / {t("Monat", "plan.unitMonth")}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.isFree ? (
                      <a className="btn btn-ghost" href="/start">
                        {t("Kostenfrei starten", `plan.${plan.id}.ctaFree`)}
                      </a>
                    ) : (
                      <a className="btn btn-primary" href={preorderHref(plan.id)}>
                        {t("Vorbestellen", `plan.${plan.id}.ctaPreorder`)}
                      </a>
                    )}
                    <a className="btn btn-ghost" href="/howtoworks/edebatte">
                      {t("So funktioniert’s", "plan.ctaHowItWorks")}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              {t("Vorbestellung für Unternehmen", "enterprise.title")}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t(
                "Kommunen, Verbände, Medienhäuser oder Unternehmen: Wir bieten Vorbestellungen inklusive Onboarding, Einrichtung und Daten‑Begleitung. Schreib uns – wir klären das Setup.",
                "enterprise.lead",
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn btn-primary" href="/kontakt?topic=enterprise-preorder">
                {t("Unternehmens‑Vorbestellung anfragen", "enterprise.ctaPrimary")}
              </a>
              <a className="btn btn-ghost" href="/team?focus=politik">
                {t("Für Politik & Verbände", "enterprise.ctaSecondary")}
              </a>
            </div>
          </article>
        </section>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {t("Bewegung & Mitgliedschaft", "membership.overline")}
          </div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            {locale === "de" || locale === "en"
              ? MEMBER_PLAN.label
              : t(MEMBER_PLAN.label, "membership.label")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {locale === "de" || locale === "en"
              ? MEMBER_PLAN.description
              : t(MEMBER_PLAN.description, "membership.description")}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {t("Einstieg ab", "membership.entryPrefix")} {MEMBER_PLAN.minPerPerson} € / {t("Monat", "membership.unitMonth")}{" "}
            {t("pro Person.", "membership.perPerson")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <a className="btn btn-primary" href="/mitglied-werden">
              {t("Mitglied werden", "membership.ctaPrimary")}
            </a>
            <a className="btn btn-ghost" href="/kontakt">
              {t("Kontakt / Demo-Liste", "membership.ctaContact")}
            </a>
            <a className="btn btn-ghost" href="/howtoworks/edebatte">
              {t("Aktuelle Homepage", "membership.ctaHome")}
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
