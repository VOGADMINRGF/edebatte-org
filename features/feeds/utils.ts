import crypto from "node:crypto";
import { normalizeRegionCode } from "@core/regions/types";
import type { FeedItemInput, StatementCandidate } from "./types";
import { safeRandomId } from "@core/utils/random";

export function buildCanonicalHash(item: FeedItemInput): string {
  const canonical = [
    item.url?.trim() ?? "",
    item.title?.trim() ?? "",
    item.publishedAt?.trim() ?? "",
  ].join("|");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function buildStatementCandidate(
  item: FeedItemInput,
  canonicalHash: string,
): StatementCandidate {
  const normalizedRegion = normalizeRegionCode(item.regionCode ?? item.region ?? null);
  const normalizedLocale = normalizeLocale(item.sourceLocale);
  const now = new Date();

  return {
    id: safeRandomId(),
    sourceUrl: item.url.trim(),
    sourceTitle: item.title?.trim() ?? "(ohne Titel)",
    sourceSummary: item.summary ?? null,
    sourceContent: item.content ?? null,
    sourceName: item.sourceName ?? null,
    sourceType: item.sourceType ?? null,
    region: item.region ?? null,
    regionCode: normalizedRegion,
    sourceLocale: normalizedLocale,
    topic: item.topicHint ?? null,
    canonicalHash,
    createdAt: now.toISOString(),
    publishedAt: item.publishedAt ?? null,
    analyzeStatus: "pending",
    analyzeRequestedAt: now,
    analyzeStartedAt: undefined,
    analyzeCompletedAt: undefined,
    analyzeError: null,
    analyzeLocale: null,
    analyzeResultId: null,
    priority: "normal",
    extractedClaims: [],
    pipelineMeta: { analyzed: false, analyzeError: null },
  };
}

export function normalizeLocale(locale?: string | null): string | null {
  if (!locale) return null;
  const trimmed = locale.trim();
  if (!trimmed) return null;
  const [primary] = trimmed.split(/[-_]/);
  if (!primary) return null;
  return primary.toLowerCase();
}
