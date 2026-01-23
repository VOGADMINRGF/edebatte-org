// apps/web/src/core/factcheck/triage.ts
export type ExtractedUnit = any;

/**
 * Markiert Einheiten für die Watchlist, wenn
 *  - es sich um einen Claim handelt und die Confidence ≥ 0.7 ist, ODER
 *  - der Text bestimmte aktuelle/brisante Stichwörter enthält.
 */
export function shouldWatchlist(
  u: Pick<ExtractedUnit, "kind" | "confidence" | "text">,
): boolean {
  const hotKeywords = [
    /miete|mietendeckel/i,
    /wahl|wahlrecht/i,
    /gesundheit|krankenhaus/i,
  ];
  const topical = hotKeywords.some((re) => re.test(u.text));
  return (u.kind === "claim" && u.confidence >= 0.7) || topical;
}

/**
 * Mappt ein (externes) Factcheck-Outcome auf unseren internen Status.
 */
export function mapOutcomeToStatus(outcome: string) {
  switch (outcome) {
    case "LIKELY_TRUE":
      return "VERIFIED";
    case "LIKELY_FALSE":
      return "REFUTED";
    case "MIXED":
      return "MIXED";
    default:
      return "OPEN";
  }
}
