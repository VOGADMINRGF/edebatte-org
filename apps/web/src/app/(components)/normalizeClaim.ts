import { normalizeStatementRecord } from "@features/analyze/normalizeClaim";

export type NormalizedClaim = {
  id: string;
  index: number;
  text: string;
  title?: string;
  responsibility?: string;
  topic?: string;
  stance?: "pro" | "neutral" | "contra";
  importance?: number;
};

/**
 * Wrapper um den shared normalizeStatementRecord-Helper.
 * UI ergänzt Index + berechnete Topic-Felder.
 */
export function normalizeClaim(raw: any, idx: number): NormalizedClaim | null {
  const base = normalizeStatementRecord(raw, {
    fallbackId: `claim-${idx + 1}`,
  });
  if (!base) return null;

  const topic = base.topic ?? base.domain ?? undefined;

  return {
    id: base.id,
    index: idx,
    text: base.text,
    title: base.title ?? undefined,
    responsibility: base.responsibility ?? undefined,
    topic,
    stance: base.stance ?? undefined,
    importance: base.importance ?? undefined,
  };
}
