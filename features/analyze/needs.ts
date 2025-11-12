// features/analyze/needs.ts
import type { Claim } from "./schemas";

export function detectNeeds(claims: Claim[]) {
  const missingZust = claims.some(c => (c.zustaendigkeit ?? "-") === "-");
  if (missingZust) {
    return {
      field: "zustaendigkeit" as const,
      question: "Welche Ebene ist hier zuständig?",
      options: ["EU","Bund","Land","Kommune","Unsicher"],
    };
  }
  return null;
}
