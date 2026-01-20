import type { StatementRecord } from "./schemas";
import { normalizeDomains } from "./schemas";

const pickString = (val: unknown): string | null => {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const RESPONSIBILITY_LEVELS = new Set([
  "EU",
  "Bund",
  "Land",
  "Kommune",
  "privat",
  "unbestimmt",
  "unknown",
]);

function normalizeResponsibility(val: unknown): string | undefined {
  const s = pickString(val);
  if (!s) return undefined;
  const canonical = s.trim();
  if (RESPONSIBILITY_LEVELS.has(canonical)) return canonical;
  const lower = canonical.toLowerCase();
  if (lower === "federal" || lower === "bund") return "Bund";
  if (lower === "state" || lower === "land") return "Land";
  if (lower === "municipality" || lower === "kommune") return "Kommune";
  if (lower === "private" || lower === "privat") return "privat";
  if (lower === "eu") return "EU";
  return "unknown";
}

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
    normalizeResponsibility(raw.responsibility) ??
    normalizeResponsibility(meta.responsibility);
  const title = pickString(raw.title) ?? pickString(meta.title);
  const topic = pickString(raw.topic);
  const { domain, domains } = normalizeDomains(raw.domain, raw.domains ?? meta.domains);
  const debateFrame = raw.debateFrame ?? meta.debateFrame;

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
    domains: domains ?? undefined,
    stance: stance ?? undefined,
    debateFrame: debateFrame ?? undefined,
  };

  return record;
}
