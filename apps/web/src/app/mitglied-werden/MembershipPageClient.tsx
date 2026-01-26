"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MEMBER_DISCOUNT } from "@/config/pricing";
import type { EDebattePlan, VOGMembershipPlan } from "@/config/pricing";
import { useLocale } from "@/context/LocaleContext";
import { getMembershipStrings } from "./strings";
import {
  loadMembershipDraft,
  saveMembershipDraft,
  type MembershipDraft,
} from "@features/membership/draftStorage";

type Rhythm = "monthly" | "once" | "yearly";
type RhythmState = Rhythm | null;
type BillingInterval = "monthly" | "yearly";

type Props = {
  membershipPlan: VOGMembershipPlan;
  edebattePlans: EDebattePlan[];
};

function parseEuro(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const num = parseFloat(normalized);
  return Number.isFinite(num) ? num : null;
}

function formatEuro(amount: number): string {
  const fixed = amount.toFixed(2);
  return fixed.replace(".", ",") + " €";
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
      {children}
    </span>
  );
}

export function MembershipPageClient({ membershipPlan, edebattePlans }: Props) {
  const { locale } = useLocale();
  const strings = getMembershipStrings(locale);
  const router = useRouter();

  // Auswahl: Mitgliedschaft + eDebatte
  const [withEdebate, setWithEdebate] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState<
    EDebattePlan["id"] | null
  >(edebattePlans[0]?.id ?? null);
  const [billingInterval, setBillingInterval] =
    React.useState<BillingInterval>("monthly");

  const selectedPlan =
    edebattePlans.find((p) => p.id === selectedPlanId) ?? null;

  // Rechner-States
  const [householdNet, setHouseholdNet] = React.useState("2400");
  const [warmRent, setWarmRent] = React.useState("900");
  const [householdSize, setHouseholdSize] = React.useState(1);
  const [amountPerPerson, setAmountPerPerson] = React.useState<number | null>(null);
  const [rhythm, setRhythm] = React.useState<RhythmState>(null);
  const draftLoaded = React.useRef(false);

  // Draft laden
  React.useEffect(() => {
    if (draftLoaded.current) return;
    const draft = loadMembershipDraft();
    if (draft) {
      setAmountPerPerson(
        Number.isFinite(draft.contributionPerPerson) && draft.contributionPerPerson > 0
          ? draft.contributionPerPerson
          : null,
      );
      setHouseholdSize(draft.householdSize || 1);
      setRhythm(draft.rhythm || null);
      setWithEdebate(draft.withEdebate);
      if (draft.edebattePlanKey) setSelectedPlanId(draft.edebattePlanKey as EDebattePlan["id"]);
      if (draft.edebatteBillingMode) setBillingInterval(draft.edebatteBillingMode);
    }
    draftLoaded.current = true;
  }, [membershipPlan.suggestedPerPersonPerMonth]);

  // Wenn Rhythmus auf jährlich wechselt, Billing-Interval (eDebatte) mitziehen
  React.useEffect(() => {
    if (rhythm === "yearly" && billingInterval !== "yearly") {
      setBillingInterval("yearly");
    }
  }, [rhythm, billingInterval]);

  // Draft speichern
  React.useEffect(() => {
    if (!draftLoaded.current) return;
    const contribution = amountPerPerson ?? 0;
    const rhythmValue: Rhythm = rhythm ?? "once";
    const draft: MembershipDraft = {
      contributionPerPerson: contribution,
      householdSize,
      rhythm: rhythmValue,
      withMembership: (contribution > 0 && (rhythm === "monthly" || rhythm === "yearly")) || false,
      withEdebate,
      edebattePlanKey: selectedPlanId ?? undefined,
      edebatteBillingMode: billingInterval,
    };
    saveMembershipDraft(draft);
  }, [amountPerPerson, householdSize, rhythm, withEdebate, selectedPlanId, billingInterval]);

  const removeMembership = () => {
    setAmountPerPerson(null);
    setRhythm(null);
  };

  const removeEdebate = () => {
    setWithEdebate(false);
    setSelectedPlanId(null);
  };

  const net = parseEuro(householdNet) ?? 0;
  const rent = parseEuro(warmRent) ?? 0;
  const available = Math.max(0, net - rent);
  const size =
    Number.isFinite(householdSize) && householdSize > 0 ? householdSize : 1;

  // 1 % vom frei verfügbaren Einkommen pro Person
  const suggestedRaw =
    available > 0
      ? (available * 0.01) / size
      : membershipPlan.suggestedPerPersonPerMonth;

  const suggestedPerPerson = Math.max(
    membershipPlan.suggestedPerPersonPerMonth,
    Math.round(suggestedRaw * 100) / 100,
  );

  // Rohbetrag pro Person (unabhängig davon, ob Mitgliedschaft gewählt ist)
  const hasAmount = amountPerPerson !== null && amountPerPerson > 0;
  const rawPerPerson =
    hasAmount && amountPerPerson !== null
      ? Math.max(membershipPlan.suggestedPerPersonPerMonth, amountPerPerson)
      : 0;

  const membershipActive =
    hasAmount && (rhythm === "monthly" || rhythm === "yearly");
  const oneTimeActive = hasAmount && rhythm === "once";

  // Beitrag zählt nur, wenn überhaupt ein Betrag eingetragen ist.
  const effectivePerPerson = hasAmount ? rawPerPerson : 0;
  const membershipBaseTotal = effectivePerPerson * size; // Basisbetrag aus dem Rechner

  // Rabatt-Regel: laufende Mitgliedschaft ab Basisbetrag (monatlich oder jährlich)
  const minDiscountAmount = membershipPlan.suggestedPerPersonPerMonth;
  const eligibleForMemberDiscount =
    membershipActive &&
    effectivePerPerson >= minDiscountAmount;
  const memberDiscountPercent = eligibleForMemberDiscount ? MEMBER_DISCOUNT.percent : 0;

  const hasApp = withEdebate && !!selectedPlan;

  // App-Preise: Basis-Listenpreis pro Monat, abgeleitet Jahrespreis (8 % Skonto), Member-Preis (25 %)
  const appListMonthly =
    hasApp && selectedPlan ? Number(selectedPlan.listPrice.amount) : 0;
  const appListYearly = hasApp ? Math.round(appListMonthly * 12 * 0.92 * 100) / 100 : 0;
  const appVogMonthly = Math.round(appListMonthly * (eligibleForMemberDiscount ? 0.75 : 1) * 100) / 100;
  const appVogYearly = Math.round(appListYearly * (eligibleForMemberDiscount ? 0.75 : 1) * 100) / 100;

  const edebatteMonthly =
    hasApp && billingInterval === "monthly"
      ? appVogMonthly
      : hasApp
        ? Math.round((appVogYearly / 12) * 100) / 100
        : 0;
  const edebatteYearly =
    hasApp && billingInterval === "monthly" ? appVogMonthly * 12 : hasApp ? appVogYearly : 0;

  // Mitgliedschaft: laufend (monatlich/jährlich) vs. einmalig
  const membershipMonthly = membershipActive ? membershipBaseTotal : 0;
  const membershipYearly = membershipActive ? membershipBaseTotal * 12 : 0;
  const oneOffMembershipAmount = oneTimeActive ? membershipBaseTotal : 0;

  // Gesamtbeträge
  const totalMonthly = membershipMonthly + edebatteMonthly;

  const canContinue =
    membershipActive || oneTimeActive || (withEdebate && selectedPlan !== null);

  function handleGotoAntrag() {
    const params = new URLSearchParams();

    const membershipAmountForAntrag = membershipActive ? membershipMonthly : 0;
    const edbAmount = edebatteMonthly;
    const totalPerMonth = membershipAmountForAntrag + edbAmount;
    const rhythmLabel =
      rhythm === "monthly"
        ? "monatlich"
        : rhythm === "yearly"
          ? "jährlich"
          : rhythm === "once"
            ? "einmalig"
            : "offen";

    params.set("betrag", totalPerMonth.toFixed(2));
    params.set("membershipAmountPerMonth", membershipAmountForAntrag.toFixed(2));
    params.set("rhythm", rhythmLabel);
    params.set("personen", String(size));
    params.set("totalPerMonth", totalPerMonth.toFixed(2));
    params.set("contributionPerPerson", rawPerPerson.toFixed(2));

    params.set("mitgliedschaft", membershipActive || oneTimeActive ? "1" : "0");
    params.set("edb", withEdebate ? "1" : "0");
    if (withEdebate && selectedPlan) {
      params.set("edbPlan", selectedPlan.id);
      params.set("edbFinalPerMonth", edbAmount.toFixed(2));
      params.set("edbListPricePerMonth", appListMonthly.toFixed(2));
      params.set("edbDiscountPercent", String(memberDiscountPercent || 0));
      params.set("edbBilling", billingInterval);
    }

    router.push(`/mitglied-antrag?${params.toString()}`);
  }

  // Hilfsfunktion: Betrag setzen (erneuter Klick auf denselben Wert = deselect)
  function applyAmount(newAmount: number) {
    setAmountPerPerson((current) => {
      const same =
        current !== null && Math.abs(current - newAmount) < 0.0001;
      return same ? null : newAmount;
    });
  }

  function setRhythmChoice(next: Rhythm) {
    setRhythm((current) => (current === next ? null : next));
  }

  // Anzeige-Wert für „Beitrag pro Person“ in der Summary
  const displayPerPerson = effectivePerPerson;

  // Zahlungsfluss: sauber zwischen monatlichen und jährlichen Komponenten unterscheiden
  const membershipMonthlyCharge = rhythm === "monthly" ? membershipMonthly : 0;
  const membershipYearlyCharge = rhythm === "yearly" ? membershipYearly : 0;
  const monthlyComponents =
    membershipMonthlyCharge +
    (hasApp && billingInterval === "monthly" ? edebatteMonthly : 0);
  const yearlyComponents =
    membershipYearlyCharge +
    (hasApp && billingInterval === "yearly" ? edebatteYearly : 0);
  const oneOffComponent = oneOffMembershipAmount;
  const hasOnlyMonthly =
    monthlyComponents > 0 && yearlyComponents === 0 && oneOffComponent === 0;
  const hasOnlyYearly =
    yearlyComponents > 0 && monthlyComponents === 0 && oneOffComponent === 0;
  const showSplitSchedule = !hasOnlyMonthly && !hasOnlyYearly;
  const firstPayment = monthlyComponents + yearlyComponents + oneOffComponent;

  return (
    <>
      {/* Hero / Einordnung */}
      <section className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/50 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <div className="space-y-6 rounded-[36px] bg-white/95 p-6 md:p-8">
          <header className="space-y-3">
            <h1 className="headline-grad text-3xl font-extrabold leading-tight md:text-4xl">
              {strings.heroTitle}
            </h1>
            <p className="text-sm leading-relaxed text-slate-700 md:text-base">
              {strings.heroIntro}
            </p>
          </header>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900 md:text-sm">
            <p className="font-semibold">{strings.transparencyTitle}</p>
            <p
              className="mt-1 whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: strings.transparencyBody }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Was du ermöglichst */}
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {strings.enableTitle}
              </h2>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-700 md:text-sm">
                {strings.enableList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Mitgliedsstufen */}
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {strings.tiersTitle}
              </h2>
              <p className="text-xs text-slate-700 md:text-sm">
                {strings.tiersIntro}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700 md:text-sm">
                {strings.tiersList.map((item) => (
                  <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            </div>
          </div>

          {/* Auswahl: Mitgliedschaft + eDebatte */}
          <div className="grid gap-4 md:grid-cols-2">
            <ToggleCard
              active={membershipActive || oneTimeActive}
              label="eDebatte-Beitrag"
              description={
                <>
                  Unterstützt die direktdemokratische Bewegung und den Aufbau
                  der digitalen Infrastruktur mit eDebatte. Mindestbeitrag{" "}
                  <strong>
                    {formatEuro(membershipPlan.suggestedPerPersonPerMonth)}
                  </strong>{" "}
                  pro Monat und Person – ab diesem Betrag gilt für alle der
                  gleiche Mitgliedsvorteile.
                </>
              }
              onClick={() =>
                setAmountPerPerson((current) => {
                  if (current && current > 0) {
                    setRhythm(null);
                    return null;
                  }
                  setRhythm("monthly");
                  return membershipPlan.suggestedPerPersonPerMonth;
                })
              }
            />
            <ToggleCard
              active={withEdebate}
              label="eDebatte-App nutzen"
              description={
                <>
                  eDebatte ist unser eigens entwickeltes Werkzeug für digitale
                  Teilhabe. Zugang zur App mit Swipe-Interface, Beitragsanalyse
                  und Live-Formaten. Auch ohne Mitgliedschaft möglich – als
                  Mitglied mit laufendem Beitrag ab Basisbetrag erhältst du{" "}
                  <strong>{MEMBER_DISCOUNT.percent}% Rabatt</strong> auf dein
                  eDebatte-Paket.
                  <br />
                  <span className="text-[11px] text-slate-600">
                    Empfehlung: pro Haushalt mindestens eDebatte Start oder Pro; jedes
                    Haushaltsmitglied kann später Basis nutzen und individuell upgraden.
                  </span>
                </>
              }
              onClick={() => setWithEdebate((v) => !v)}
            />
          </div>

          {/* Klickbare eDebatte-Pakete */}
          {withEdebate && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  eDebatte-Paket wählen (Vorbestellung!)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Preise sind Richtwerte während der Pilotphase.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {edebattePlans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  const listMonthly = Number(plan.listPrice.amount);
                  const listYearly =
                    Math.round(listMonthly * 12 * 0.92 * 100) / 100;
                  const memberPriceMonthly =
                    Math.round(listMonthly * (eligibleForMemberDiscount ? 0.75 : 1) * 100) / 100;
                  const memberPriceYearly =
                    Math.round(listYearly * (eligibleForMemberDiscount ? 0.75 : 1) * 100) / 100;
                  const showMemberLine = plan.listPrice.amount > 0;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="text-left"
                    >
                      <div
                        className={
                          "rounded-2xl p-[1.5px] shadow-[0_18px_45px_rgba(15,23,42,0.08)] " +
                          (isSelected
                            ? "bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
                            : "bg-slate-100/80")
                        }
                      >
                        <article className="flex h-full flex-col rounded-[15px] border border-white/80 bg-white/95 p-4 text-sm text-slate-800">
                          {isSelected && (
                            <div className="mb-2 flex justify-end">
                              <StatusBadge>Ausgewählt</StatusBadge>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              {plan.label}
                            </h3>
                          </div>
                          <p className="mt-1 text-xs text-slate-700">
                            {plan.description}
                          </p>
                          <div className="mt-3 space-y-1 text-xs">
                            <p className="text-slate-700">
                              {billingInterval === "monthly" ? (
                                <>
                                  Listenpreis:{" "}
                                  <span className="font-medium">
                                    {listMonthly.toFixed(2)} € / Monat
                                  </span>
                                </>
                              ) : (
                                <>
                                  Listenpreis:{" "}
                                  <span className="font-medium">
                                    {listYearly.toFixed(2)} € / Jahr
                                  </span>{" "}
                                  <span className="text-[11px] text-slate-500">
                                    (inkl. 8 % Skonto)
                                  </span>
                                  <span className="block text-[11px] text-slate-500">
                                    Basis: {listMonthly.toFixed(2)} € / Monat
                                  </span>
                                </>
                              )}
                            </p>
                            {showMemberLine && (
                              <p className="text-emerald-700">
                                <span className="font-semibold">
                                  Mitgliedsrabatt −{memberDiscountPercent}%:{" "}
                                  {billingInterval === "monthly"
                                    ? `${memberPriceMonthly.toFixed(2)} € / Monat`
                                    : `${memberPriceYearly.toFixed(2)} € / Jahr (~${(memberPriceYearly / 12).toFixed(2)} € / Monat)`}
                                  {billingInterval === "monthly"
                                    ? ""
                                    : ""}
                                </span>
                              </p>
                            )}
                          </div>
                        </article>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Billing-Interval-Toggle */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-slate-600">
                  Bei jährlicher Zahlung gibt es{" "}
                  <span className="font-semibold">8 % Skonto</span> auf den
                  App-Preis.
                </p>
                <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setBillingInterval("monthly");
                      if (rhythm === "yearly" || rhythm === null) setRhythm("monthly");
                    }}
                    className={
                      "rounded-full px-3 py-1 " +
                      (billingInterval === "monthly"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500")
                    }
                  >
                    monatlich
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingInterval("yearly");
                      if (rhythm !== "once") setRhythm("yearly");
                    }}
                    className={
                      "rounded-full px-3 py-1 " +
                      (billingInterval === "yearly"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500")
                    }
                  >
                    jährlich (−8 %)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Beitrag berechnen */}
      <section className="mt-6 rounded-[32px] bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 p-[1.5px] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="space-y-6 rounded-[28px] border border-white/70 bg-white/95 p-6 md:p-8">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
              {strings.calculatorTitle}
            </h2>
            <p className="text-xs text-slate-600 md:text-sm">
              {strings.calculatorIntro}
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {/* Linke Spalte: Eingaben */}
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {strings.householdNetLabel}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder={strings.householdNetPlaceholder}
                    value={householdNet}
                    onChange={(e) => setHouseholdNet(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {strings.warmRentLabel}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder={strings.warmRentPlaceholder}
                    value={warmRent}
                    onChange={(e) => setWarmRent(e.target.value)}
                  />
                </div>
              </div>

              {/* Vorschlag */}
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {strings.suggestionTitle}
                  </p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {formatEuro(suggestedPerPerson)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {strings.suggestionNote} (
                    {formatEuro(
                      membershipPlan.suggestedPerPersonPerMonth,
                    )}
                    )
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyAmount(suggestedPerPerson)}
                  className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm hover:bg-sky-100"
                >
                  {strings.suggestionButton}
                </button>
              </div>

              {/* Beitrag pro Person */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700">
                  {strings.perPersonLabel}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[membershipPlan.suggestedPerPersonPerMonth, 10, 25, 50].map(
                    (amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => applyAmount(amount)}
                        className={
                          (() => {
                            const isActive =
                              amountPerPerson !== null &&
                              Math.abs(amountPerPerson - amount) < 0.01;
                            const isSuggested =
                              !hasAmount &&
                              amount === membershipPlan.suggestedPerPersonPerMonth;
                            if (isActive) {
                              return "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition border-sky-500 bg-sky-500 text-white";
                            }
                            if (isSuggested) {
                              return "rounded-full border px-[1px] py-[1px] text-xs font-semibold shadow-sm transition border-transparent bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400";
                            }
                            return "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition border-slate-200 bg-white text-slate-700 hover:border-sky-300";
                          })()
                        }
                      >
                        <span
                          className={
                            !hasAmount &&
                            amount === membershipPlan.suggestedPerPersonPerMonth
                              ? "block rounded-full bg-white px-2 py-0.5 text-slate-900"
                              : ""
                          }
                        >
                          {formatEuro(amount)}
                        </span>
                      </button>
                    ),
                  )}
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      className="w-36 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      value={amountPerPerson ?? ""}
                      onChange={(e) =>
                        setAmountPerPerson(parseEuro(e.target.value))
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                      {strings.perPersonCustomSuffix}
                    </span>
                  </div>
                </div>
              </div>

              {/* Haushaltsgröße & Rhythmus */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {strings.householdSizeLabel}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={householdSize}
                    onChange={(e) =>
                      setHouseholdSize(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {strings.rhythmLabel}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRhythmChoice("monthly")}
                      className={(() => {
                        const isActive = rhythm === "monthly";
                        if (isActive) {
                          return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-sky-500 bg-sky-500 text-white";
                        }
                        return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:border-sky-300";
                      })()}
                    >
                      {strings.rhythmMonthly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRhythmChoice("yearly")}
                      className={(() => {
                        const isActive = rhythm === "yearly";
                        if (isActive) {
                          return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-sky-500 bg-sky-500 text-white";
                        }
                        return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:border-sky-300";
                      })()}
                    >
                      {strings.rhythmYearly}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRhythmChoice("once")}
                      className={(() => {
                        const isActive = rhythm === "once";
                        const isSuggested = rhythm === null;
                        if (isActive) {
                          return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-sky-500 bg-sky-500 text-white";
                        }
                        if (isSuggested) {
                          return "flex-1 rounded-full border px-[1px] py-[1px] text-xs font-semibold border-transparent bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400";
                        }
                        return "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:border-sky-300";
                      })()}
                    >
                      <span
                        className={
                          rhythm === null
                            ? "block rounded-full bg-white px-1.5 py-0.5 text-slate-900"
                            : ""
                        }
                      >
                        {strings.rhythmOnce}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rechte Spalte: Zusammenfassung */}
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                {strings.summaryTitle}
              </h3>
              <dl className="space-y-1 text-xs text-slate-700 md:text-sm">
                <div className="flex justify-between gap-3">
                  <dt>{strings.summaryPerPerson}</dt>
                  <dd className="font-medium">
                    {formatEuro(displayPerPerson)}
                    {displayPerPerson > 0 && rhythm
                      ? rhythm === "monthly"
                        ? " · monatlich"
                        : rhythm === "yearly"
                          ? " · jährlich"
                          : " · einmalig"
                      : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{strings.summaryCount}</dt>
                  <dd className="font-medium">{size}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Mitgliedsbeitrag (laufend):</dt>
                  <dd className="font-medium">
                    {membershipActive
                      ? rhythm === "monthly"
                        ? "Ja, monatlich"
                        : "Ja, jährlich"
                      : "Nicht gewählt"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Einmalige Unterstützung:</dt>
                  <dd className="font-medium">
                    {oneTimeActive ? "Ja" : "Nicht gewählt"}
                  </dd>
                </div>

                {withEdebate && selectedPlan ? (
                  <div className="flex justify-between gap-3">
                    <dt>eDebatte-Paket:</dt>
                    <dd className="text-right">
                      {`eDebatte ${selectedPlan.label.replace(/^eDebatte\s+/i, "")}`}
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {billingInterval === "monthly"
                          ? "Abrechnung monatlich."
                          : "Abrechnung jährlich (inkl. 8 % Skonto auf den App-Preis)."}{" "}
                        {memberDiscountPercent > 0
                          ? `Mitgliedsrabatt (−${memberDiscountPercent} %) ist im Betrag berücksichtigt.`
                          : `Mitgliedsrabatt (−${MEMBER_DISCOUNT.percent} % auf den App-Preis) greift, wenn du eine laufende Mitgliedschaft ab Basisbetrag wählst.`}
                      </span>
                    </dd>
                  </div>
                ) : (
                  <div className="flex justify-between gap-3">
                    <dt>eDebatte:</dt>
                    <dd className="font-medium">
                      {withEdebate ? "Ja, Paket bitte noch wählen" : "Nein"}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-900 md:text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Beitrag Gesamt – Übersicht
                </p>

                {/* Mitgliedschaft / Beitrag */}
                {membershipActive || oneTimeActive ? (
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">
                        {membershipActive
                          ? `Mitgliedsbeitrag: ${formatEuro(membershipMonthly)} ${
                              rhythm === "yearly" ? "/ Jahr" : "/ Monat"
                            }`
                          : `Einmalige Unterstützung: ${formatEuro(oneOffMembershipAmount)}`}
                        <br />
                        {size} Person(en){" "}
                        {membershipActive
                          ? rhythm === "yearly"
                            ? "(laufend, jährliche Zahlung)"
                            : "(laufend, monatlich)"
                          : "(einmalige Unterstützung)"}
                      </p>
                      <button
                        type="button"
                        aria-label="Beitrag entfernen"
                        onClick={removeMembership}
                        className="rounded-full px-2 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </div>
                    {membershipActive && (
                      <p className="text-[11px] text-sky-800">
                        = {formatEuro(membershipYearly)} / Jahr
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1">Kein Beitrag ausgewählt.</p>
                )}

                {/* eDebatte */}
                {hasApp && selectedPlan ? (
                  <div className="mt-2 space-y-0.5">
                    {(() => {
                      const planLabel = selectedPlan.label.replace(/^eDebatte\s+/i, "");
                      return (
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">
                            {`eDebatte ${planLabel}`}:{" "}
                            {billingInterval === "monthly"
                              ? `${formatEuro(appVogMonthly)} / Monat`
                              : `${formatEuro(appVogYearly)} / Jahr`}
                          </p>
                          <button
                            type="button"
                            aria-label="eDebatte-Paket entfernen"
                            onClick={removeEdebate}
                            className="rounded-full px-2 text-[11px] font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })()}
                    {billingInterval === "yearly" && (
                      <p className="text-[11px] text-sky-800">
                        entspricht ca. {formatEuro(edebatteMonthly)} / Monat
                      </p>
                    )}
                    {memberDiscountPercent > 0 && selectedPlan.listPrice.amount > 0 && (
                      <p className="text-[11px] text-emerald-700">
                        Mitgliedsrabatt −{memberDiscountPercent}% auf den App-Preis
                      </p>
                    )}
                    {billingInterval === "yearly" && (
                      <p className="text-[11px] text-slate-700">
                        Jährliche Zahlung inkl. 8 % Skonto auf den App-Preis
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2">eDebatte-App: nicht ausgewählt.</p>
                )}

                {/* Gesamt */}
                <div className="mt-3 border-t border-sky-100 pt-2">
                  {showSplitSchedule ? (
                    <>
                      <p className="text-lg font-bold md:text-xl">
                        Erste Zahlung: {formatEuro(firstPayment)}
                      </p>
                      {monthlyComponents > 0 && (
                        <p className="text-[11px] text-sky-800">
                          Danach ca. alle 4 Wochen: {formatEuro(monthlyComponents)}
                        </p>
                      )}
                      {yearlyComponents > 0 && (
                        <p className="text-[11px] text-sky-800">
                          Jährlich fällig (erste Zahlung enthält diesen Betrag): {formatEuro(yearlyComponents)}
                        </p>
                      )}
                      {yearlyComponents > 0 && monthlyComponents > 0 && (
                        <p className="text-[11px] text-slate-700">
                          Richtwert umgelegt: {formatEuro(totalMonthly)} pro Monat.
                        </p>
                      )}
                      {oneOffComponent > 0 && yearlyComponents === 0 && monthlyComponents === 0 && (
                        <p className="text-[11px] text-sky-800">
                          Einmalige Gutschrift, keine Folgezahlungen.
                        </p>
                      )}
                    </>
                  ) : hasOnlyMonthly ? (
                    <p className="text-lg font-bold md:text-xl">
                      {formatEuro(monthlyComponents)} <span className="text-xs font-medium">pro Monat</span>
                    </p>
                  ) : (
                    <>
                      <p className="text-lg font-bold md:text-xl">
                        {formatEuro(yearlyComponents)} <span className="text-xs font-medium">pro Jahr</span>
                      </p>
                      {monthlyComponents > 0 && (
                        <p className="text-[11px] text-sky-800">
                          entspricht ca. {formatEuro(monthlyComponents)} pro Monat
                        </p>
                      )}
                    </>
                  )}
                </div>

                <p className="mt-1 text-[11px] text-sky-800">
                  {strings.summaryBoxNote}
                </p>
                {hasAmount && !membershipActive && rhythm === "once" && (
                  <p className="mt-2 text-[11px] text-sky-900">
                    {strings.summaryMembershipHintOnce}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleGotoAntrag}
                disabled={!canContinue}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {strings.summaryButton}
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

type ToggleCardProps = {
  active: boolean;
  label: string;
  description: React.ReactNode;
  onClick: () => void;
};

function ToggleCard({ active, label, description, onClick }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col rounded-2xl border bg-white p-4 text-left text-sm shadow-sm transition",
        active
          ? "border-emerald-500 ring-2 ring-emerald-200"
          : "border-slate-200 hover:border-emerald-300 hover:shadow-md",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-900">{label}</span>
        {active ? (
          <StatusBadge>Aktiv</StatusBadge>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Optional
          </span>
        )}
      </div>
      <p className="text-xs text-slate-700">{description}</p>
    </button>
  );
}
