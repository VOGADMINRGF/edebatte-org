import "server-only";

import { stableHash } from "@core/utils/hash";

export type CreateAbuseRisk = "allow" | "cooldown" | "block";

export type CreateAbuseEvaluation = {
  risk: CreateAbuseRisk;
  reason: string | null;
  normalizedText: string;
  fingerprint: string | null;
};

const TECHNICAL_SENTINEL = /^(?:\[object Object\](?:\s*,\s*\[object Object\]){0,20}|undefined|null|nan)$/i;
const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const REPEATED_CHAR_PATTERN = /(.)\1{47,}/u;

export function readCreateTextAlias(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.textPrepared,
    record.textOriginal,
    record.text,
    record.sourceText,
    record.intakeText,
    record.input,
    record.evidenceInput,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

export function normalizeCreateAbuseText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function repeatedTokenRatio(text: string) {
  const tokens = text
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter((token) => token.length >= 2);
  if (tokens.length < 20) return { ratio: 0, maxCount: 0 };
  const counts = new Map<string, number>();
  let maxCount = 0;
  for (const token of tokens) {
    const count = (counts.get(token) ?? 0) + 1;
    counts.set(token, count);
    if (count > maxCount) maxCount = count;
  }
  return { ratio: maxCount / tokens.length, maxCount };
}

function linkStats(text: string) {
  const links: string[] = text.match(URL_PATTERN) ?? [];
  const linkChars = links.reduce((sum, link) => sum + link.length, 0);
  const unique = new Set(links.map((link) => link.toLowerCase()));
  return {
    count: links.length,
    duplicateCount: links.length - unique.size,
    charRatio: text.length > 0 ? linkChars / text.length : 0,
  };
}

export function evaluateCreateAbusePayload(payload: unknown): CreateAbuseEvaluation {
  const sourceText = readCreateTextAlias(payload);
  const normalizedText = normalizeCreateAbuseText(sourceText);
  const fingerprint = normalizedText ? stableHash({ text: normalizedText }) : null;

  if (!normalizedText) {
    return { risk: "allow", reason: null, normalizedText, fingerprint };
  }

  if (TECHNICAL_SENTINEL.test(normalizedText) || REPEATED_CHAR_PATTERN.test(normalizedText)) {
    return {
      risk: "block",
      reason: "technical_or_machine_sentinel",
      normalizedText,
      fingerprint,
    };
  }

  const links = linkStats(normalizedText);
  if (links.count >= 12 || (links.count >= 7 && links.charRatio >= 0.55)) {
    return {
      risk: "block",
      reason: "extreme_link_flood",
      normalizedText,
      fingerprint,
    };
  }
  if (
    links.count >= 5 ||
    links.duplicateCount >= 3 ||
    (links.count >= 3 && links.charRatio >= 0.45)
  ) {
    return {
      risk: "cooldown",
      reason: "link_density",
      normalizedText,
      fingerprint,
    };
  }

  const repetition = repeatedTokenRatio(normalizedText);
  if (repetition.maxCount >= 24 && repetition.ratio >= 0.65) {
    return {
      risk: "cooldown",
      reason: "repetition_flood",
      normalizedText,
      fingerprint,
    };
  }

  return { risk: "allow", reason: null, normalizedText, fingerprint };
}
