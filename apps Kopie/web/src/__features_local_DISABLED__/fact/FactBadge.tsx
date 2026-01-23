import React from "react";

export type FactState = "verified" | "disputed" | "unverified";
export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5; // 5 = highest

export function FactBadge({ state, trust, source }: { state: FactState; trust: TrustLevel; source?: string }) {
  const label = state === "verified" ? "Geprüft" : state === "disputed" ? "Umstritten" : "Ungeprüft";
  return (
    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full border text-xs"
          title={source ? `Quelle: ${source}` : undefined}
          style={{ borderColor: "var(--chip-border)" }}>
      <span className="w-2 h-2 rounded-full brand-gradient" />
      <strong>{label}</strong>
      <span className="opacity-70">Trust {trust}/5</span>
    </span>
  );
}
