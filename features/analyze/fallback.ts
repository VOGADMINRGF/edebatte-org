// features/analyze/fallback.ts
import type { StatementRecord } from "./schemas";
import { ensureDebateFrame } from "./debateFrame";

/**
 * Fallback-Claim, falls das Modell gar nichts liefert
 * – nutzt den Originaltext als einen großen Claim
 */
export function buildFallbackClaim(
  sourceText: string,
  language: string
): StatementRecord {
  const record: StatementRecord = {
    id: "fallback-claim-1",
    text:
      sourceText.length > 2000
        ? sourceText.slice(0, 2000) + " …"
        : sourceText,
    title:
      language === "de"
        ? "Gesamt-Aussage (Fallback)"
        : "Overall statement (fallback)",
    importance: 3,
    topic: null,
    domain: null,
    stance: "neutral",
    meta: {
      kind: "fallback",
      reason: "no_claims_from_model",
    },
  };
  return {
    ...record,
    debateFrame: ensureDebateFrame(record),
  };
}
