"use client";

import { ACCESS_TIER_CONFIG } from "../config";
import type { AccessTier } from "../types";

const CURRENCY = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const ORDER: AccessTier[] = [
  "public",
  "citizenBasic",
  "citizenPremium",
  "institutionBasic",
  "institutionPremium",
];

export function PricingWidget_eDbtt() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          Nutzungsmodell eDbtt
        </h2>
        <p className="text-sm text-slate-600">
          Lesen & Swipen bleiben frei. Wer viele eigene Beiträge einreichen will,
          kann zwischen Kontingenten, Abos oder Earned Credits wählen.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ORDER.map((tier) => {
          const cfg = ACCESS_TIER_CONFIG[tier];
          return (
            <article
              key={tier}
              className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm flex flex-col"
            >
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {cfg.label}
                </h3>
                <p className="text-sm text-slate-600">{cfg.description}</p>
              </div>

              {cfg.monthlyFeeCents ? (
                <div className="text-xl font-bold text-indigo-600">
                  {CURRENCY.format(cfg.monthlyFeeCents / 100)}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    / Monat
                  </span>
                </div>
              ) : (
                <div className="text-xl font-bold text-emerald-600">
                  Kostenlos
                </div>
              )}

              <ul className="mt-3 space-y-1 text-sm text-slate-700 flex-1">
                <li>
                  <strong>Beiträge inkl./Monat:</strong>{" "}
                  {renderIncluded(cfg.includedPerMonth.level1, cfg.includedPerMonth.level2)}
                </li>
                <li>
                  <strong>Earn-Regeln:</strong>{" "}
                  {cfg.earnRules
                    ?.map(
                      (rule) =>
                        `${rule.swipesPerCredit} Swipes → 1 ${rule.level.toUpperCase()}`
                    )
                    .join(", ") || "keine"}
                </li>
                <li>
                  <strong>Swipes & Lesen:</strong> immer kostenlos
                </li>
                {cfg.notes && (
                  <li className="text-slate-500 text-xs">{cfg.notes}</li>
                )}
              </ul>
            </article>
          );
        })}
      </div>

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>
          Du kannst zusätzlich Bundles kaufen oder über Aktivität Credits
          verdienen. Beispiel: Nach 100 Swipes erhältst du automatisch einen
          weiteren Level‑1-Beitrag. Nach 500 Swipes eine Level‑2-Freischaltung.
        </p>
      </footer>
    </section>
  );
}

function renderIncluded(level1?: number, level2?: number): string {
  const parts: string[] = [];
  if (level1 != null) parts.push(`${level1} × Level 1`);
  if (level2 != null && level2 > 0) parts.push(`${level2} × Level 2`);
  return parts.length ? parts.join(", ") : "0";
}
