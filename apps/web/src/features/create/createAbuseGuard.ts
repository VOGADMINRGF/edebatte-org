import "server-only";

import { stableHash } from "@core/utils/hash";

export type CreateAbuseEvaluation = {
  risk: "allow" | "cooldown" | "block";
  reason: string | null;
  fingerprint: string | null;
};
const MAX_FINGERPRINT_TEXT_LENGTH = 10_000;
const TECHNICAL_SENTINEL =
  /^(?:\[object Object\](?:\s*,\s*\[object Object\]){0,20}|undefined|null|nan)$/i;
const REPEATED_CHARACTER = /(.)\1{47,}/u;
const URL_PATTERN = /https?:\/\/[^\s]+/gi;
export function readCreateTextAlias(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const record = payload as Record<string, unknown>;
  for (const value of [
    record.textPrepared,
    record.textOriginal,
    record.text,
    record.sourceText,
    record.intakeText,
    record.input,
    record.evidenceInput,
  ]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function normalizeCreateAbuseText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, MAX_FINGERPRINT_TEXT_LENGTH);
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
    maxCount = Math.max(maxCount, count);
  }
  return { ratio: maxCount / tokens.length, maxCount };
}

function linkStats(text: string) {
  const links: string[] = text.match(URL_PATTERN) ?? [];
  const uniqueLinks = new Set(links.map((link) => link.toLowerCase()));
  return {
    count: links.length,
    duplicateCount: links.length - uniqueLinks.size,
    charRatio: text.length > 0
      ? links.reduce((sum, link) => sum + link.length, 0) / text.length
      : 0,
  };
}

export function evaluateCreateAbusePayload(payload: unknown): CreateAbuseEvaluation {
  const normalizedText = normalizeCreateAbuseText(readCreateTextAlias(payload));
  const fingerprint = normalizedText ? stableHash({ text: normalizedText }) : null;
  if (!normalizedText) return { risk: "allow", reason: null, fingerprint };

  if (
    TECHNICAL_SENTINEL.test(normalizedText) ||
    REPEATED_CHARACTER.test(normalizedText)
  ) {
    return {
      risk: "block",
      reason: "technical_or_machine_sentinel",
      fingerprint,
    };
  }

  const links = linkStats(normalizedText);
  if (links.count >= 12 || (links.count >= 7 && links.charRatio >= 0.55)) {
    return { risk: "block", reason: "extreme_link_flood", fingerprint };
  }
  if (
    links.count >= 5 ||
    links.duplicateCount >= 3 ||
    (links.count >= 3 && links.charRatio >= 0.45)
  ) {
    return { risk: "cooldown", reason: "link_density", fingerprint };
  }

  const repetition = repeatedTokenRatio(normalizedText);
  if (repetition.maxCount >= 24 && repetition.ratio >= 0.65) {
    return { risk: "cooldown", reason: "repetition_flood", fingerprint };
  }

  return { risk: "allow", reason: null, fingerprint };
}
