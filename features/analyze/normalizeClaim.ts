import type { StatementRecord } from "./schemas";

const pickString = (val: unknown): string | null => {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Normalize raw Claim-Knoten aus der KI-Antwort in ein StatementRecord.
 * Konsumiert jede Claim-Variante (auch mit ``meta``) und trimmt Strings.
 */
export function normalizeStatementRecord(
  raw: any,
  opts?: { fallbackId?: string }
): StatementRecord | null {
  if (!raw || typeof raw.text !== "string") return null;
  const text = raw.text.trim();
  if (!text) return null;

  const id =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : opts?.fallbackId;

  if (!id) return null;

  const meta =
    raw && typeof raw.meta === "object" && raw.meta !== null ? raw.meta : {};

  const responsibility =
    pickString(raw.responsibility) ?? pickString(meta.responsibility);
  const title = pickString(raw.title) ?? pickString(meta.title);
  const topic = pickString(raw.topic);
  const domain = pickString(raw.domain);

  let importance: number | undefined;
  if (
    typeof raw.importance === "number" &&
    Number.isFinite(raw.importance)
  ) {
    importance = Math.min(5, Math.max(1, Math.round(raw.importance)));
  }

  let stance: "pro" | "neutral" | "contra" | null = null;
  if (
    raw.stance === "pro" ||
    raw.stance === "neutral" ||
    raw.stance === "contra"
  ) {
    stance = raw.stance;
  }

  const record: StatementRecord = {
    id,
    text,
    title: title ?? undefined,
    responsibility: responsibility ?? undefined,
    importance,
    topic: topic ?? undefined,
    domain: domain ?? undefined,
    stance: stance ?? undefined,
  };

  return record;
}
