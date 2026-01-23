import { statementCandidatesCol } from "@features/feeds/db";
import {
  getRegionEvidenceSummary,
  type RegionEvidenceSummary,
} from "@features/report/evidenceAggregates";
import {
  buildRegionFallbackChain,
  buildRegionMatchClauses,
  parseRegionSelector,
} from "@/lib/region/filters";

export type RegionFeedItem = {
  id: string;
  title: string;
  url?: string | null;
  source?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
};

export type RegionSummary = {
  regionKey: string | null;
  feedItems: RegionFeedItem[];
  topics: RegionEvidenceSummary["topics"];
  lastUpdated: string | null;
  claimCount: number;
  decisionCount: number;
  newsSourceCount: number;
};

function emptySummary(regionKey: string | null): RegionSummary {
  return {
    regionKey,
    feedItems: [],
    topics: [],
    lastUpdated: null,
    claimCount: 0,
    decisionCount: 0,
    newsSourceCount: 0,
  };
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function pickLatestDate(items: RegionFeedItem[]): string | null {
  let latest: Date | null = null;
  for (const item of items) {
    const published = parseDate(item.publishedAt);
    if (published && (!latest || published > latest)) latest = published;
    const created = parseDate(item.createdAt);
    if (created && (!latest || created > latest)) latest = created;
  }
  return latest ? latest.toISOString() : null;
}

export async function getRegionSummary({
  regionCode,
  limit = 5,
  locale,
  dateFrom,
  dateTo,
}: {
  regionCode?: string | null;
  limit?: number;
  locale?: string | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
}): Promise<RegionSummary> {
  const selector = parseRegionSelector(regionCode ?? null);
  if (!selector.isValid) return emptySummary(null);
  const regionKey = selector.regionKey;

  let feedItems: RegionFeedItem[] = [];
  try {
    const candidates = await statementCandidatesCol();
    const match = selector.isGlobal
      ? { regionCode: { $exists: true } }
      : { $or: buildRegionMatchClauses(regionKey as string) };
    const rows = await candidates
      .find(match, {
        projection: {
          sourceTitle: 1,
          sourceUrl: 1,
          sourceName: 1,
          sourceSummary: 1,
          publishedAt: 1,
          createdAt: 1,
          id: 1,
        },
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(1, Math.min(20, limit)))
      .toArray();

    feedItems = rows.map((row: any, idx: number) => ({
      id: row._id ? String(row._id) : String(row.id ?? `row-${idx}`),
      title: row.sourceTitle ?? "(ohne Titel)",
      url: row.sourceUrl ?? null,
      source: row.sourceName ?? null,
      summary: row.sourceSummary ?? null,
      publishedAt: row.publishedAt ?? null,
      createdAt: row.createdAt ?? null,
    }));
  } catch {
    feedItems = [];
  }

  let evidenceSummary: RegionEvidenceSummary | null = null;
  try {
    evidenceSummary = await getRegionEvidenceSummary({
      regionCode: selector.isGlobal ? "all" : regionKey,
      locale,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
    });
  } catch {
    evidenceSummary = null;
  }

  const lastUpdated =
    evidenceSummary?.lastUpdated?.toISOString() ?? pickLatestDate(feedItems);

  return {
    regionKey,
    feedItems,
    topics: evidenceSummary?.topics ?? [],
    lastUpdated,
    claimCount: evidenceSummary?.claimCount ?? 0,
    decisionCount: evidenceSummary?.decisionCount ?? 0,
    newsSourceCount: evidenceSummary?.newsSourceCount ?? 0,
  };
}

export function isRegionSummaryEmpty(summary: RegionSummary): boolean {
  return summary.claimCount === 0 && summary.feedItems.length === 0 && summary.topics.length === 0;
}

export async function getRegionSummaryWithFallback({
  regionCode,
  limit = 5,
  locale,
  dateFrom,
  dateTo,
}: {
  regionCode?: string | null;
  limit?: number;
  locale?: string | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
}): Promise<{
  summary: RegionSummary;
  requestedRegionKey: string | null;
  usedRegionKey: string | null;
  fallbackUsed: boolean;
  fallbackChain: string[];
}> {
  const chain = buildRegionFallbackChain(regionCode ?? null);
  if (!chain.length) {
    const empty = emptySummary(null);
    return {
      summary: empty,
      requestedRegionKey: null,
      usedRegionKey: null,
      fallbackUsed: false,
      fallbackChain: [],
    };
  }

  let summary = emptySummary(chain[0] ?? null);
  let usedKey = chain[0] ?? null;

  for (const key of chain) {
    summary = await getRegionSummary({
      regionCode: key,
      limit,
      locale,
      dateFrom,
      dateTo,
    });
    usedKey = key;
    if (!isRegionSummaryEmpty(summary)) break;
  }

  return {
    summary,
    requestedRegionKey: chain[0] ?? null,
    usedRegionKey: usedKey,
    fallbackUsed: usedKey !== (chain[0] ?? null),
    fallbackChain: chain,
  };
}
