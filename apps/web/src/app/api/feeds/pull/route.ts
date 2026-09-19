export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/feeds/pull
 * Pullt RSS/Atom Feeds aus core/feeds/civic_feeds.<scope>.json und speichert
 * als StatementCandidates (triMongo core -> statement_candidates).
 *
 * Ziel: "Intro → Feeds-Abruf → Analyze-Pending → Drafts → Publish → Swipe" end-to-end.
 *
 * POST Body (optional):
 * {
 *   "scope": "de" | "global",
 *   "maxFeeds": 20,
 *   "maxItemsPerFeed": 12,
 *   "dryRun": false,
 *   "regionCode": "DE" | "DE:BE" | "DE:BE:11000"
 * }
 */
import { NextRequest, NextResponse } from "next/server";

import type { FeedItemInput } from "@features/feeds/types";
import {
  buildCanonicalHash,
  buildStatementCandidate,
  normalizeLocale,
} from "@features/feeds/utils";
import {
  findCandidateHashes,
  saveFeedItemsRaw,
  upsertStatementCandidates,
} from "@features/feeds/storage";
import {
  collectFeedRefs,
  loadFeeds,
  type FeedRef,
} from "@features/feeds/feedConfig";
import { recordFeedRuntimeRun } from "@features/feeds/runtimeLog";
import {
  buildFeedSourceAutomationId,
  recordFeedSourceAutomationEvent,
} from "@features/feeds/sourceAutomation";
import { sourceRefFromFeedRef } from "@features/feeds/sourceRef";
import { fetchSourceWithSnapshot } from "@features/feeds/sourceFetchRuntime";
import { normalizeRegionCode } from "@core/regions/types";
import { filterFeedRefsByRegion } from "@/lib/region/filters";
import { requireAdminOrEditor } from "../_auth";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_FEED_CONCURRENCY = 4;
const MAX_FEED_CONCURRENCY = 8;

/* ---------------------------------------------
 * RSS / Atom Parsing (leichtgewichtig; Regex)
 * -------------------------------------------- */

type ParsedArticle = {
  title: string;
  url: string;
  summary?: string | null;
  publishedAt?: string | null;
};

type ParsedFeedFetch = {
  items: ParsedArticle[];
  notModified: boolean;
  snapshotId: string | null;
  snapshotVersion: number | null;
  snapshotPersisted: boolean;
};

function unescapeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickFirst(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return null;
}

function toIsoDate(input?: string | null): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function safeHostname(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return null;
  }
}

function parseRss(xml: string): ParsedArticle[] {
  const items = Array.from(xml.matchAll(/<item[\s\S]*?<\/item>/gi)).map(m => m[0]);
  const out: ParsedArticle[] = [];

  for (const item of items) {
    const title = pickFirst(
      item.match(/<title>([\s\S]*?)<\/title>/i)?.[1],
    );
    const link = pickFirst(
      item.match(/<link>([\s\S]*?)<\/link>/i)?.[1],
      item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1],
    );
    const desc = pickFirst(
      item.match(/<description>([\s\S]*?)<\/description>/i)?.[1],
      item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1],
    );
    const pubDate = pickFirst(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]);

    if (!title || !link) continue;
    out.push({
      title: unescapeXml(title).trim(),
      url: unescapeXml(link).trim(),
      summary: desc ? unescapeXml(desc).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800) : null,
      publishedAt: toIsoDate(pubDate),
    });
  }
  return out;
}

function parseAtom(xml: string): ParsedArticle[] {
  const entries = Array.from(xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)).map(m => m[0]);
  const out: ParsedArticle[] = [];

  for (const entry of entries) {
    const title = pickFirst(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const link = pickFirst(
      entry.match(/<link[^>]+href="([^"]+)"[^>]*\/?\s*>/i)?.[1],
    );
    const summary = pickFirst(
      entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1],
      entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1],
    );
    const updated = pickFirst(
      entry.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1],
      entry.match(/<published>([\s\S]*?)<\/published>/i)?.[1],
    );

    if (!title || !link) continue;
    out.push({
      title: unescapeXml(title).trim(),
      url: unescapeXml(link).trim(),
      summary: summary ? unescapeXml(summary).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 800) : null,
      publishedAt: toIsoDate(updated),
    });
  }
  return out;
}

async function fetchAndParseFeed(
  ref: FeedRef,
  timeoutMs: number,
  dryRun: boolean,
): Promise<ParsedFeedFetch> {
  const source = sourceRefFromFeedRef(ref);
  const result = await fetchSourceWithSnapshot({
    source,
    timeoutMs,
    persist: !dryRun,
    userAgent: "eDebatte/feeds-pull (+https://edebatte.eu)",
  });

  if (result.status === "failed") {
    throw new Error(result.reason);
  }
  if (result.status === "not_modified") {
    return {
      items: [],
      notModified: true,
      snapshotId: result.snapshot?.snapshotId ?? null,
      snapshotVersion: result.snapshot?.version ?? null,
      snapshotPersisted: false,
    };
  }

  const xml = result.body;
  const lower = xml.toLowerCase();
  const items =
    lower.includes("<feed") && lower.includes("http://www.w3.org/2005/atom")
      ? parseAtom(xml)
      : parseRss(xml);
  return {
    items,
    notModified: false,
    snapshotId: result.snapshot.snapshotId,
    snapshotVersion: result.snapshot.version,
    snapshotPersisted: result.persistence === "inserted",
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

/* ---------------------------------------------
 * Main
 * -------------------------------------------- */

function applyFeedDefaults(
  item: FeedItemInput & { locale?: string | null; scope?: string | null },
): FeedItemInput {
  const sourceLocale = normalizeLocale(item.sourceLocale ?? item.locale ?? item.scope ?? null);
  const regionCode = normalizeRegionCode(item.regionCode ?? item.region ?? null);
  return { ...item, sourceLocale, regionCode };
}

type FeedProcessResult = {
  feedUrl: string;
  fetched: boolean;
  fetchedItems: number;
  inserted: number;
  skippedExisting: number;
  notModified: boolean;
  snapshotId: string | null;
  snapshotVersion: number | null;
  snapshotPersisted: boolean;
  errors: string[];
};

async function processFeed(
  ref: FeedRef,
  opts: {
    maxItemsPerFeed: number;
    dryRun: boolean;
    scope: "de" | "global";
    fetchTimeoutMs: number;
  },
): Promise<FeedProcessResult> {
  const errors: string[] = [];
  try {
    const fetched = await fetchAndParseFeed(ref, opts.fetchTimeoutMs, opts.dryRun);
    const items = fetched.items.slice(0, opts.maxItemsPerFeed);
    const sourceName = safeHostname(ref.feedUrl);
    const deduped: Array<FeedItemInput & { canonicalHash: string }> = [];
    const seen = new Set<string>();

    for (const a of items) {
      const feedItem: FeedItemInput = applyFeedDefaults({
        url: a.url,
        title: a.title,
        summary: a.summary ?? null,
        content: null,
        publishedAt: a.publishedAt ?? null,
        sourceName,
        sourceType: "rss",
        regionCode: ref.regionCode ?? null,
        sourceLocale: opts.scope === "de" ? "de" : null,
        topicHint: ref.topicHints[0] ?? null,
      });

      const canonicalHash = buildCanonicalHash(feedItem);
      if (seen.has(canonicalHash)) continue;
      seen.add(canonicalHash);
      deduped.push({ ...feedItem, canonicalHash });
    }

    if (!deduped.length) {
      return {
        feedUrl: ref.feedUrl,
        fetched: true,
        fetchedItems: items.length,
        inserted: 0,
        skippedExisting: 0,
        notModified: fetched.notModified,
        snapshotId: fetched.snapshotId,
        snapshotVersion: fetched.snapshotVersion,
        snapshotPersisted: fetched.snapshotPersisted,
        errors,
      };
    }

    const existingHashes = await findCandidateHashes(deduped.map((i) => i.canonicalHash));
    const newItems = deduped.filter((i) => !existingHashes.has(i.canonicalHash));
    const newCandidates = newItems.map((i) => buildStatementCandidate(i, i.canonicalHash));

    let inserted = 0;
    if (opts.dryRun) {
      inserted = newCandidates.length;
    } else {
      if (newItems.length) {
        try {
          await saveFeedItemsRaw(newItems);
        } catch (e: any) {
          errors.push(`feed_items_save_failed ${e?.message ?? String(e)}`);
        }
        const res = await upsertStatementCandidates(newCandidates);
        inserted = res.inserted;
      }
    }

    return {
      feedUrl: ref.feedUrl,
      fetched: true,
      fetchedItems: items.length,
      inserted,
      skippedExisting: deduped.length - newItems.length,
      notModified: fetched.notModified,
      snapshotId: fetched.snapshotId,
      snapshotVersion: fetched.snapshotVersion,
      snapshotPersisted: fetched.snapshotPersisted,
      errors,
    };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return {
      feedUrl: ref.feedUrl,
      fetched: false,
      fetchedItems: 0,
      inserted: 0,
      skippedExisting: 0,
      notModified: false,
      snapshotId: null,
      snapshotVersion: null,
      snapshotPersisted: false,
      errors: [msg],
    };
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;
  const requestedAt = new Date();

  const body = await req.json().catch(() => ({} as any));
  const scope = (body?.scope === "global" ? "global" : "de") as "de" | "global";
  const maxFeeds = Math.max(1, Math.min(100, Number(body?.maxFeeds ?? 20) || 20));
  const maxItemsPerFeed = Math.max(1, Math.min(50, Number(body?.maxItemsPerFeed ?? 12) || 12));
  const dryRun = Boolean(body?.dryRun);
  const regionCode =
    typeof body?.regionCode === "string" && body.regionCode.trim()
      ? body.regionCode.trim()
      : null;
  const fetchTimeoutMs = Math.max(
    2_000,
    Math.min(30_000, Number(process.env.FEEDS_PULL_TIMEOUT_MS ?? DEFAULT_FETCH_TIMEOUT_MS) || DEFAULT_FETCH_TIMEOUT_MS),
  );
  const feedConcurrency = Math.max(
    1,
    Math.min(MAX_FEED_CONCURRENCY, Number(process.env.FEEDS_PULL_CONCURRENCY ?? DEFAULT_FEED_CONCURRENCY) || DEFAULT_FEED_CONCURRENCY),
  );

  const { config: cfg, searched, source } = await loadFeeds(scope);
  if (!cfg) {
    await recordFeedRuntimeRun({
      runType: "pull",
      status: "error",
      requestedAt,
      completedAt: new Date(),
      scope,
      regionCode,
      error: "feeds_config_missing",
    });
    const payload: Record<string, any> = { ok: false, error: "feeds_config_missing", scope };
    if (process.env.NODE_ENV !== "production") payload.searched = searched;
    return NextResponse.json(payload, { status: 500, headers: JSON_HEADERS });
  }

  const { feedRefs: collected, invalidFeedUrls } = collectFeedRefs(cfg);
  const regionFilter = filterFeedRefsByRegion(collected, regionCode);
  const feedRefs = (regionCode && !regionFilter.isGlobal ? regionFilter.feedRefs : collected).slice(0, maxFeeds);
  if (regionCode && !regionFilter.isValid) {
    await recordFeedRuntimeRun({
      runType: "pull",
      status: "error",
      requestedAt,
      completedAt: new Date(),
      scope,
      regionCode,
      error: "invalid_region",
    });
    return NextResponse.json(
      { ok: false, error: "invalid_region", regionCode },
      { status: 400, headers: JSON_HEADERS },
    );
  }
  if (feedRefs.length === 0) {
    await recordFeedRuntimeRun({
      runType: "pull",
      status: "error",
      requestedAt,
      completedAt: new Date(),
      scope,
      regionCode,
      error: "feeds_config_empty",
    });
    const payload: Record<string, any> = { ok: false, error: "feeds_config_empty", scope };
    if (regionCode) payload.regionCode = regionCode;
    if (process.env.NODE_ENV !== "production") {
      payload.searched = searched;
      payload.configSource = source ?? null;
      payload.configKeys = Object.keys(cfg ?? {});
    }
    return NextResponse.json(payload, { status: 500, headers: JSON_HEADERS });
  }

  let fetchedFeeds = 0;
  let fetchedItems = 0;
  let inserted = 0;
  let skippedExisting = 0;
  let notModifiedFeeds = 0;
  let snapshotRevisions = 0;
  const errors: Array<{ feedUrl: string; error: string }> = [];

  const results = await mapWithConcurrency(feedRefs, feedConcurrency, (ref) =>
    processFeed(ref, { maxItemsPerFeed, dryRun, scope, fetchTimeoutMs }),
  );

  for (const result of results) {
    if (result.fetched) fetchedFeeds += 1;
    if (result.notModified) notModifiedFeeds += 1;
    if (result.snapshotPersisted) snapshotRevisions += 1;
    fetchedItems += result.fetchedItems;
    inserted += result.inserted;
    skippedExisting += result.skippedExisting;
    for (const err of result.errors) {
      errors.push({ feedUrl: result.feedUrl, error: err });
    }
  }

  await Promise.all(
    results.map((result, index) =>
      recordFeedSourceAutomationEvent({
        sourceId: buildFeedSourceAutomationId({
          feedUrl: feedRefs[index]?.feedUrl ?? result.feedUrl,
          regionId: feedRefs[index]?.regionCode ?? regionCode,
        }),
        regionId: feedRefs[index]?.regionCode ?? regionCode,
        sourceType: "rss_feed",
        sourceLabel: (() => {
          try {
            return new URL(feedRefs[index]?.feedUrl ?? result.feedUrl).hostname.replace(/^www\./, "");
          } catch {
            return feedRefs[index]?.feedUrl ?? result.feedUrl;
          }
        })(),
        sourceHref: feedRefs[index]?.feedUrl ?? result.feedUrl,
        automationMode: "cron_ready",
        runStatus: dryRun ? "dry_run" : result.errors.length > 0 ? "error" : "success",
        completedAt: new Date(),
        fetchedItems: result.fetchedItems,
        insertedSignals: result.inserted,
        reviewCandidateCount: result.inserted,
        error: result.errors[0] ?? null,
      }),
    ),
  );

  const debug =
    process.env.NODE_ENV !== "production"
      ? {
          configSource: source ?? null,
          feedRefs: feedRefs.length,
          invalidFeedUrls: invalidFeedUrls.slice(0, 20),
          snapshots: results.map((result) => ({
            feedUrl: result.feedUrl,
            snapshotId: result.snapshotId,
            snapshotVersion: result.snapshotVersion,
            notModified: result.notModified,
          })),
        }
      : {};

  await recordFeedRuntimeRun({
    runType: "pull",
    status: dryRun ? "dry_run" : errors.length > 0 ? "error" : "success",
    requestedAt,
    completedAt: new Date(),
    scope,
    regionCode,
    counts: {
      fetchedFeeds,
      fetchedItems,
      inserted,
      skippedExisting,
      skippedInvalidFeeds: invalidFeedUrls.length,
      errors: errors.length,
    },
    error: errors.length > 0 ? errors[0]?.error ?? "feed_pull_partial_error" : null,
    notes: [
      `source_snapshots_created=${snapshotRevisions}`,
      `source_snapshots_not_modified=${notModifiedFeeds}`,
      ...(errors.length > 0
        ? errors.slice(0, 3).map((entry) => `${entry.feedUrl}: ${entry.error}`)
        : []),
    ],
  });

  return NextResponse.json(
    {
      ok: true,
      scope,
      dryRun,
      regionCode: regionCode ?? null,
      regionKey: regionFilter.regionKey ?? null,
      maxFeeds,
      maxItemsPerFeed,
      feedConcurrency,
      fetchTimeoutMs,
      fetchedFeeds,
      fetchedItems,
      inserted,
      skippedExisting,
      notModifiedFeeds,
      snapshotRevisions,
      skippedInvalidFeeds: invalidFeedUrls.length,
      errors,
      ...debug,
    },
    { headers: JSON_HEADERS },
  );
}
