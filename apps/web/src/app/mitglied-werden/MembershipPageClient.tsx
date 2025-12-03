"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MEMBER_DISCOUNT, calcDiscountedPrice } from "@/config/pricing";
import type { EDebattePlan, VOGMembershipPlan } from "@/config/pricing";
import { useLocale } from "@/context/LocaleContext";
import { getMembershipStrings } from "./strings";

type Rhythm = "monthly" | "once";
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

function getPlanPrice(plan: EDebattePlan, interval: BillingInterval): number {
  const monthly = plan.listPrice.amount;
  if (interval === "monthly") return monthly;
  const yearlyBase = monthly * 12;
  // 8 % Skonto auf den App-Preis
  return Math.round(yearlyBase * 0.92 * 100) / 100;
}

export function MembershipPageClient({ membershipPlan, edebattePlans }: Props) {
  const { locale } = useLocale();
  const strings = getMembershipStrings(locale);
  const router = useRouter();

  // Auswahl: Mitgliedschaft + eDebatte
  const [withMembership, setWithMembership] = React.useState(true);
  const [withEdebate, setWithEdebate] = React.useState(true);
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
  const [amountPerPerson, setAmountPerPerson] = React.useState(
    membershipPlan.suggestedPerPersonPerMonth,
  );
  const [rhythm, setRhythm] = React.useState<Rhythm>("monthly");

  // Hinweis, wenn man am Betrag spielt, aber keine Mitgliedschaft gewählt ist
  const [membershipHint, setMembershipHint] = React.useState<string | null>(
    null,
  );

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
  const rawPerPerson = Math.max(
    membershipPlan.suggestedPerPersonPerMonth,
    amountPerPerson || 0,
  );

  // Nur wenn eine Mitgliedschaft gewählt ist, zählt der Betrag effektiv.
  const effectivePerPerson = withMembership ? rawPerPerson : 0;
  const membershipBaseTotal = effectivePerPerson * size; // Basisbetrag aus dem Rechner

  // Rabatt-Regel: laufende Mitgliedschaft ab Basisbetrag (gleiches Recht für alle)
  const minDiscountAmount = membershipPlan.suggestedPerPersonPerMonth;
  const eligibleForMemberDiscount =
    withMembership &&
    rhythm === "monthly" &&
    effectivePerPerson >= minDiscountAmount;
  const memberDiscountPercent = eligibleForMemberDiscount
    ? MEMBER_DISCOUNT.percent
    : 0;

  const hasApp = withEdebate && !!selectedPlan;

  const appListPrice =
    hasApp && selectedPlan ? getPlanPrice(selectedPlan, billingInterval) : 0;

  const appPriceAfterMember =
    hasApp && memberDiscountPercent > 0
      ? calcDiscountedPrice(appListPrice, memberDiscountPercent)
      : appListPrice;

  // Mitgliedschaft: laufend (für Monats-/Jahresdarstellung) vs. einmalig
  const membershipMonthly =
    withMembership && rhythm === "monthly" ? membershipBaseTotal : 0;
  const membershipYearly =
    withMembership && rhythm === "monthly" ? membershipBaseTotal * 12 : 0;
  const oneOffMembershipAmount =
    withMembership && rhythm === "once" ? membershipBaseTotal : 0;

  // Gesamtsumme für die Summary – orientiert sich an der App-Laufzeit,
  // bei reiner Mitgliedschaft nur am gewählten Rhythmus
  let totalAmountValue: number;
  let totalAmountLabel: string;

  if (!hasApp) {
    // Nur Mitgliedschaft
    if (!withMembership) {
      totalAmountValue = 0;
      totalAmountLabel = "kein laufender Beitrag";
    } else if (rhythm === "monthly") {
      totalAmountValue = membershipBaseTotal;
      totalAmountLabel = "pro Monat (Mitgliedschaft)";
    } else {
      totalAmountValue = membershipBaseTotal;
      totalAmountLabel = "einmalig (Mitgliedschaft)";
    }
  } else {
    // eDebatte ist gewählt – Anzeige orientiert sich am App-Intervall
    const appLabelBase =
      billingInterval === "monthly" ? "pro Monat" : "pro Jahr";

    const labelParts: string[] = [];
    if (withMembership && rhythm === "monthly") {
      labelParts.push("Mitgliedschaft");
    }
    labelParts.push("eDebatte");

    totalAmountValue =
      billingInterval === "monthly"
        ? membershipMonthly + appPriceAfterMember
        : membershipYearly + appPriceAfterMember;

    totalAmountLabel = `${appLabelBase} (${labelParts.join(" + ")})`;
  }

  const canContinue =
    withMembership || (withEdebate && selectedPlan !== null);

  function handleGotoAntrag() {
    const params = new URLSearchParams();

    const membershipAmountForAntrag = withMembership
      ? membershipBaseTotal
      : 0;

    params.set("betrag", membershipAmountForAntrag.toFixed(2));
    params.set("rhythm", rhythm === "monthly" ? "monatlich" : "einmalig");
    params.set("personen", String(size));

    params.set("mitgliedschaft", withMembership ? "1" : "0");
    params.set("edb", withEdebate ? "1" : "0");
    if (withEdebate && selectedPlan) {
      params.set("edbPlan", selectedPlan.id);
    }

    router.push(`/mitglied-antrag?${params.toString()}`);
  }

  // Hilfsfunktion: passenden Hinweistext bauen
  function buildMembershipHint(currentRhythm: Rhythm): string {
    if (currentRhythm === "monthly") {
      return "Hinweis: Damit dieser Betrag als laufende Mitgliedschaft zählt – und der Mitgliederrabatt für eDebatte greifen kann – aktiviere bitte oben die VoiceOpenGov-Mitgliedschaft.";
    }
    return "HDu hast eine einmalige Gutschrift ausgewählt – vielen Dank, dein Beitrag hilft uns sehr beim Aufbau von VoiceOpenGov. Diese Gutschrift zählt noch nicht als laufende Mitgliedschaft; wenn du später Mitglied werden möchtest, melde dich jederzeit unter members@voiceopengov.org"
;
  }

  // Hilfsfunktion: Betrag setzen + ggf. Hinweis anwerfen
  function applyAmount(newAmount: number) {
    setAmountPerPerson(newAmount);
    if (!withMembership && newAmount > 0) {
      setMembershipHint(buildMembershipHint(rhythm));
    } else if (withMembership) {
      setMembershipHint(null);
    }
  }

  // Anzeige-Wert für „Beitrag pro Person“ in der Summary
  const displayPerPerson = withMembership ? effectivePerPerson : 0;

  return (
    <>
      {/* Hero / Einordnung */}
      <section className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/50 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
        <div className="space-y-6 rounded-[36px] bg-white/95 p-6 md:p-8">
          <header className="space-y-3">
            <h1
              className="text-3xl font-extrabold leading-tight md:text-4xl"
              style={{
                backgroundImage:
                  "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
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
              active={withMembership}
              label="VoiceOpenGov-Mitgliedschaft"
              description={
                <>
                  Unterstützt den Aufbau und Betrieb der demokratischen
                  Infrastruktur. Mindestbeitrag{" "}
                  <strong>
                    {formatEuro(membershipPlan.suggestedPerPersonPerMonth)}
                  </strong>{" "}
                  pro Monat und Person – ab diesem Betrag gilt für alle der
                  gleiche VOG-Member-Goodie.
                </>
              }
              onClick={() =>
                setWithMembership((prev) => {
                  const next = !prev;
                  if (next) {
                    // Hinweis zurücksetzen, wenn Mitgliedschaft aktiv wird
                    setMembershipHint(null);
                  }
                  return next;
                })
              }
            />
            <ToggleCard
              active={withEdebate}
              label="eDebatte-App nutzen"
              description={
                <>
                  Zugang zur eDebatte-App mit Swipe-Interface,
                  Beitragsanalyse und Live-Formaten. Auch ohne Mitgliedschaft
                  möglich – als VOG-Member mit laufendem Beitrag ab
                  Basisbetrag erhältst du{" "}
                  <strong>{MEMBER_DISCOUNT.percent}% Rabatt</strong> auf dein
                  eDebatte-Paket.
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
                  const rawPrice = getPlanPrice(plan, billingInterval);
                  const hasMemberDiscount = memberDiscountPercent > 0;
                  const memberPrice = hasMemberDiscount
                    ? calcDiscountedPrice(rawPrice, memberDiscountPercent)
                    : null;
                  const showMemberPrice =
                    memberPrice !== null && memberPrice > 0.01;

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
                                    {rawPrice.toFixed(2)} € / Monat
                                  </span>
                                </>
                              ) : (
                                <>
                                  Listenpreis:{" "}
                                  <span className="font-medium">
                                    {rawPrice.toFixed(2)} € / Jahr
                                  </span>{" "}
                                  <span className="text-[11px] text-slate-500">
                                    (inkl. 8 % Skonto)
                                  </span>
                                </>
                              )}
                            </p>
                            {showMemberPrice && memberPrice !== null && (
                              <p className="text-emerald-700">
                                <span className="font-semibold">
                                  VOG Member −{memberDiscountPercent}%:{" "}
                                  {memberPrice.toFixed(2)} € /
                                  {billingInterval === "monthly"
                                    ? " Monat"
                                    : " Jahr"}
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
                    onClick={() => setBillingInterval("monthly")}
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
                    onClick={() => setBillingInterval("yearly")}
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
                          "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition " +
                          (Math.abs(amountPerPerson - amount) < 0.01
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300")
                        }
                      >
                        {formatEuro(amount)}
                      </button>
                    ),
                  )}
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-36 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      value={amountPerPerson.toString().replace(".", ",")}
                      onChange={(e) =>
                        applyAmount(
                          parseEuro(e.target.value) ??
                            membershipPlan.suggestedPerPersonPerMonth,
                        )
                      }
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                      {strings.perPersonCustomSuffix}
                    </span>
                  </div>
                </div>
                {membershipHint && !withMembership && (
                  <p className="mt-1 text-[11px] text-sky-800">
                    {membershipHint}
                  </p>
                )}
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
                      onClick={() => {
                        setRhythm("monthly");
                        if (!withMembership && amountPerPerson > 0) {
                          setMembershipHint(buildMembershipHint("monthly"));
                        }
                      }}
                      className={
                        "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                        (rhythm === "monthly"
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300")
                      }
                    >
                      {strings.rhythmMonthly}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRhythm("once");
                        if (!withMembership && amountPerPerson > 0) {
                          setMembershipHint(buildMembershipHint("once"));
                        }
                      }}
                      className={
                        "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                        (rhythm === "once"
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300")
                      }
                    >
                      {strings.rhythmOnce}
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
                    {withMembership &&
                      (rhythm === "monthly"
                        ? " · monatlich"
                        : " · einmalig")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{strings.summaryCount}</dt>
                  <dd className="font-medium">{size}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Mitgliedschaft:</dt>
                  <dd className="font-medium">
                    {withMembership
                      ? rhythm === "monthly"
                        ? "Ja, laufend"
                        : "Ja, einmalig"
                      : "Nein"}
                  </dd>
                </div>

                {withEdebate && selectedPlan ? (
                  <div className="flex justify-between gap-3">
                    <dt>eDebatte-Paket:</dt>
                    <dd className="text-right">
                      {selectedPlan.label}
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {billingInterval === "monthly"
                          ? "Abrechnung monatlich."
                          : "Abrechnung jährlich (inkl. 8 % Skonto auf den App-Preis)."}{" "}
                        {memberDiscountPercent > 0
                          ? `VOG Member-Rabatt (−${memberDiscountPercent} %) ist im Betrag berücksichtigt.`
                          : `VOG Member-Rabatt (−${MEMBER_DISCOUNT.percent} % auf den App-Preis) greift, wenn du eine laufende Mitgliedschaft ab Basisbetrag wählst.`}
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
                  {strings.summaryBoxLabel}
                </p>

                <p className="text-lg font-bold md:text-xl">
                  {formatEuro(totalAmountValue)}{" "}
                  <span className="text-xs font-medium">
                    {totalAmountLabel}
                  </span>
                </p>

                {oneOffMembershipAmount > 0 && (
                  <p className="mt-1 text-xs font-medium text-sky-900">
                    + {formatEuro(oneOffMembershipAmount)}{" "}
                    <span className="font-normal">
                      einmalige Gutschrift für VoiceOpenGov (ohne steuerliche
                      Absetzbarkeit)
                    </span>
                  </p>
                )}

                <p className="mt-1 text-[11px] text-sky-800">
                  {strings.summaryBoxNote}
                </p>
                {!withMembership && amountPerPerson > 0 && (
                  <p className="mt-2 text-[11px] text-sky-900">
                    {rhythm === "monthly"
                      ? strings.summaryMembershipHintMonthly
                      : strings.summaryMembershipHintOnce}
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
