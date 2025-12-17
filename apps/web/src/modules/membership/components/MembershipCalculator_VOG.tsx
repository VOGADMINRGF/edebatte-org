"use client";

import { useEffect, useMemo, useState } from "react";
import { MEMBERSHIP_PLANS } from "../config";
import { calcSuggestedPerPerson, calcTotal } from "../calculator";
import type { Rhythm } from "../types";

const plan = MEMBERSHIP_PLANS.VOG_PRIVATE;

const RHYTHM_OPTIONS: Rhythm[] = ["monthly", "once"];

const formatEuro = (value: number) =>
  value.toLocaleString("de-DE", { minimumFractionDigits: 2 });

export function MembershipCalculator_VOG() {
  const [netIncome, setNetIncome] = useState("");
  const [rent, setRent] = useState("");
  const [household, setHousehold] = useState(1);
  const [amount, setAmount] = useState(plan.minPerPerson);
  const [rhythm, setRhythm] = useState<Rhythm>("monthly");
  const [skills, setSkills] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);

  const suggestion = useMemo(() => {
    const net = Number(netIncome.replace(",", ".")) || 0;
    const rentNumber = Number(rent.replace(",", ".")) || 0;
    return calcSuggestedPerPerson({
      netIncome: net,
      rent: rentNumber,
      minPerPerson: plan.minPerPerson,
    });
  }, [netIncome, rent]);

  const total = useMemo(
    () => calcTotal(amount, household),
    [amount, household]
  );

  useEffect(() => {
    setMemberEmails((prev) => {
      const need = Math.max(1, household);
      const next = [...prev];
      while (next.length < need) next.push("");
      return next.slice(0, need);
    });
  }, [household]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">
          Beitrag berechnen – VoiceOpenGov
        </h2>
        <p className="text-sm text-slate-600">
          Empfehlung: 1 % von (Haushaltsnetto – Miete), mindestens 5,63 € pro
          Person ab 16 Jahren – dieser Betrag entspricht dem sozial verträglichen Minimum (ALG&nbsp;II/Bürgergeld).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Haushaltsnetto (€)
          <input
            type="number"
            min={0}
            step="0.01"
            value={netIncome}
            onChange={(e) => setNetIncome(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="z. B. 2400"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Warmmiete (€)
          <input
            type="number"
            min={0}
            step="0.01"
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="z. B. 900"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-slate-700">Vorschlag</div>
          <p className="text-2xl font-semibold text-emerald-600 mt-1">
            {formatEuro(suggestion)} €
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-emerald-700 underline"
            onClick={() => setAmount(suggestion)}
          >
            Vorschlag übernehmen
          </button>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-700">Rhythmus</div>
          <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {RHYTHM_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRhythm(option)}
                className={`rounded-full px-3 py-1 text-sm ${
                  rhythm === option
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600"
                }`}
              >
                {option === "monthly" ? "monatlich" : "einmalig"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-slate-700">Betrag pro Person / Mitglied</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {plan.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`rounded-full border px-3 py-1 text-sm ${
                amount === preset
                  ? "border-emerald-500 text-emerald-600"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {formatEuro(preset)} €
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="w-28 rounded-full border border-slate-300 px-3 py-1.5"
            />
            <span className="text-sm text-slate-600">€</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Haushaltsgröße (≥ 16 Jahre)
          <input
            type="number"
            min={1}
            step={1}
            value={household}
            onChange={(e) =>
              setHousehold(Math.max(1, Math.floor(Number(e.target.value)) || 1))
            }
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Fähigkeiten (optional)
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Moderation, Design, Tech ..."
          />
        </label>
      </div>

      {household > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
          <div className="text-sm font-semibold text-slate-800">
            E-Mail je Mitglied (≥ 16 Jahre)
          </div>
          <p className="text-xs text-slate-500">
            Damit jede Person ihre eigene Bestätigung erhält.
          </p>
          <div className="mt-3 space-y-2">
            {memberEmails.map((email, idx) => (
              <input
                key={idx}
                type="email"
                placeholder={`E-Mail Mitglied ${idx + 1}`}
                value={email}
                onChange={(e) =>
                  setMemberEmails((prev) => {
                    const next = [...prev];
                    next[idx] = e.target.value;
                    return next;
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            ))}
          </div>
        </div>
      )}

      <footer className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <div>
          Beitrag gesamt:{" "}
          <strong>{formatEuro(total)} €</strong>{" "}
          {rhythm === "monthly" ? "/ Monat" : "einmalig"}
        </div>
        <div className="text-slate-600">
          Der Rechner setzt beim späteren Support-Intent den vorgeschlagenen Betrag & Haushaltsgröße.
        </div>
      </footer>
    </section>
  );
}
