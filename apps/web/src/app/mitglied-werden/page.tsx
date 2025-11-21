"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { getMembershipStrings } from "./strings";

type Rhythm = "monthly" | "once";

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

export default function MitgliedWerdenPage() {
  const { locale } = useLocale();
  const strings = getMembershipStrings(locale);
  const [householdNet, setHouseholdNet] = React.useState("2400");
  const [warmRent, setWarmRent] = React.useState("900");
  const [householdSize, setHouseholdSize] = React.useState(1);
  const [amountPerPerson, setAmountPerPerson] = React.useState(5.63);
  const [rhythm, setRhythm] = React.useState<Rhythm>("monthly");
  const [skills, setSkills] = React.useState("");

  const net = parseEuro(householdNet) ?? 0;
  const rent = parseEuro(warmRent) ?? 0;
  const available = Math.max(0, net - rent);
  const size = Number.isFinite(householdSize) && householdSize > 0 ? householdSize : 1;

  const suggestedRaw = available > 0 ? (available * 0.01) / size : 5.63; // 1 % vom frei verfügbaren Einkommen
  const suggestedPerPerson = Math.max(5.63, Math.round(suggestedRaw * 100) / 100);

  const effectivePerPerson = Math.max(5.63, amountPerPerson || 0);
  const total = effectivePerPerson * size;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        {/* Hero / Einordnung */}
        <section className="rounded-[40px] border border-transparent bg-gradient-to-br from-sky-50 via-white to-emerald-50/50 p-1 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="rounded-[36px] bg-white/95 p-6 md:p-8 space-y-6">
            <header className="space-y-3">
              <h1
                className="text-3xl md:text-4xl font-extrabold leading-tight"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg,var(--brand-cyan),var(--brand-blue))",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {strings.heroTitle}
              </h1>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                {strings.heroIntro}
              </p>
            </header>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs md:text-sm text-amber-900">
              <p className="font-semibold">{strings.transparencyTitle}</p>
              <p
                className="mt-1"
                dangerouslySetInnerHTML={{ __html: strings.transparencyBody }}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Was du ermöglichst */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  {strings.enableTitle}
                </h2>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs md:text-sm text-slate-700">
                  {strings.enableList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Mitgliedsstufen */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <h2 className="text-sm font-semibold text-slate-900">{strings.tiersTitle}</h2>
                <p className="text-xs md:text-sm text-slate-700">{strings.tiersIntro}</p>
                <ul className="mt-2 space-y-1 text-xs md:text-sm text-slate-700">
                  {strings.tiersList.map((item) => (
                    <li key={item} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Beitrag berechnen */}
        <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] p-6 md:p-8 space-y-6">
          <header className="space-y-1">
            <h2 className="text-lg md:text-xl font-semibold text-slate-900">
              {strings.calculatorTitle}
            </h2>
            <p className="text-xs md:text-sm text-slate-600">
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
                    {strings.suggestionNote}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAmountPerPerson(suggestedPerPerson)}
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
                  {[5.63, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setAmountPerPerson(amount)}
                      className={
                        "rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition " +
                        (Math.abs(amountPerPerson - amount) < 0.01
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sky-300")
                      }
                    >
                      {formatEuro(amount)}
                    </button>
                  ))}
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-24 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      value={amountPerPerson.toString().replace(".", ",")}
                    onChange={(e) =>
                      setAmountPerPerson(parseEuro(e.target.value) ?? 5.63)
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                    {strings.perPersonCustomSuffix}
                  </span>
                </div>
              </div>
              </div>

              {/* Haushaltsgröße & Rhythmus + Skills */}
              <div className="grid gap-4 md:grid-cols-3">
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
                      setHouseholdSize(Math.max(1, Number(e.target.value) || 1))
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
                      onClick={() => setRhythm("monthly")}
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
                      onClick={() => setRhythm("once")}
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
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    {strings.skillsLabel}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    placeholder={strings.skillsPlaceholder}
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Rechte Spalte: Zusammenfassung */}
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 md:p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                {strings.summaryTitle}
              </h3>
              <dl className="space-y-1 text-xs md:text-sm text-slate-700">
                <div className="flex justify-between gap-3">
                  <dt>{strings.summaryPerPerson}</dt>
                  <dd className="font-medium">
                    {formatEuro(effectivePerPerson)}{" "}
                    {rhythm === "monthly" ? "· monatlich" : "· einmalig"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{strings.summaryCount}</dt>
                  <dd className="font-medium">{size}</dd>
                </div>
                {skills.trim() && (
                  <div className="flex justify-between gap-3">
                    <dt>{strings.summarySkills}</dt>
                    <dd className="truncate max-w-[12rem] text-right">{skills}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs md:text-sm text-sky-900">
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  {strings.summaryBoxLabel}
                </p>
                <p className="text-lg md:text-xl font-bold">
                  {formatEuro(total)}{" "}
                  <span className="text-xs font-medium">
                    {rhythm === "monthly" ? "pro Monat" : "einmalig"}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-sky-800">
                  {strings.summaryBoxNote}
                </p>
              </div>

              {/* Link zum Antrag – mit Übergabe der wichtigsten Daten */}
              <Link
                href={{
                  pathname: "/mitglied-antrag",
                  query: {
                    betrag: total.toFixed(2),
                    rhythm: rhythm === "monthly" ? "monatlich" : "einmalig",
                    personen: String(size),
                  },
                }}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:brightness-105"
              >
                {strings.summaryButton}
              </Link>
            </div>
          </div>
        </section>

        {/* Abschluss-CTA: Bürger:innen / Politik & Verbände / Journalist:innen */}
        <section className="rounded-3xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] p-6 md:p-8 space-y-4">
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] items-center">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {strings.finalTitle}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {strings.finalIntro}
              </p>
              <ul className="list-disc space-y-2 pl-5 text-xs md:text-sm text-slate-700">
                {strings.finalList.map((item) => (
                  <li key={item.label}>
                    <span className="font-semibold text-slate-900">{item.label}</span> {item.body}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex">
              <div className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
                <p className="text-xs md:text-sm text-slate-700">{strings.creatorBox}</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {strings.creatorButtons.map((btn) => (
                    <a
                      key={btn.href}
                      href={btn.href}
                      className={
                        btn.variant === "primary"
                          ? "btn bg-brand-grad text-white shadow-soft text-xs md:text-sm"
                          : "btn border border-slate-300 bg-white text-xs md:text-sm"
                      }
                    >
                      {btn.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
