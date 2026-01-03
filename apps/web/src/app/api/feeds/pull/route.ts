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
 *   "dryRun": false
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

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
import { normalizeRegionCode } from "@core/regions/types";
import { requireAdminOrEditor } from "../_auth";

type CivicFeedsFile = {
  version?: number;
  regions?: Record<string, Record<string, string[]>>; // region -> topic -> urls[]
  feeds?: CivicFeedEntry[];
  notes?: string[];
};

type CivicFeedEntry =
  | string
  | {
      url?: string;
      feedUrl?: string;
      region?: string;
      regionCode?: string;
      topic?: string;
      topicHint?: string;
      source_type?: string;
      sourceType?: string;
    };

type FeedRef = { feedUrl: string; regionCode?: string | null; topicHint?: string | null };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_FEED_CONCURRENCY = 4;
const MAX_FEED_CONCURRENCY = 8;

/* ---------------------------------------------
 * Config Loader
 * -------------------------------------------- */

function getFeedConfigPaths(scope: string): string[] {
  const fileName = `civic_feeds.${scope}.json`;
  const candidates = [
    path.join(process.cwd(), "core", "feeds", fileName),
    path.join(process.cwd(), "..", "core", "feeds", fileName),
    path.join(process.cwd(), "apps", "web", "core", "feeds", fileName),
  ];
  return Array.from(new Set(candidates.map((p) => path.resolve(p))));
}

async function loadFeeds(scope: string): Promise<{
  config: CivicFeedsFile | null;
  searched: string[];
  source?: string | null;
}> {
  const searched = getFeedConfigPaths(scope);
  for (const file of searched) {
    try {
      const raw = await fs.readFile(file, "utf8");
      return { config: JSON.parse(raw) as CivicFeedsFile, searched, source: file };
    } catch {
      // try next
    }
  }
  return { config: null, searched };
}

function collectFeedRefs(cfg: CivicFeedsFile): FeedRef[] {
  const out: FeedRef[] = [];
  const seen = new Set<string>();

  const pushRef = (url?: string | null, regionCode?: string | null, topicHint?: string | null) => {
    const feedUrl = typeof url === "string" ? url.trim() : "";
    if (!feedUrl) return;
    const key = feedUrl.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      feedUrl,
      regionCode: regionCode ?? null,
      topicHint: topicHint ?? null,
    });
  };

  for (const [regionCode, topics] of Object.entries(cfg.regions ?? {})) {
    for (const [topic, urls] of Object.entries(topics ?? {})) {
      for (const feedUrl of urls ?? []) {
        pushRef(feedUrl, regionCode, topic);
      }
    }
  }

  if (Array.isArray(cfg.feeds)) {
    for (const entry of cfg.feeds) {
      if (!entry) continue;
      if (typeof entry === "string") {
        pushRef(entry, null, null);
        continue;
      }
      const url = entry.url ?? entry.feedUrl ?? null;
      const region = entry.regionCode ?? entry.region ?? null;
      const topicHint = entry.topicHint ?? entry.topic ?? entry.source_type ?? entry.sourceType ?? null;
      pushRef(url, region, topicHint);
    }
  }

  return out;
}

/* ---------------------------------------------
 * RSS / Atom Parsing (leichtgewichtig; Regex)
 * -------------------------------------------- */

type ParsedArticle = {
  title: string;
  url: string;
  summary?: string | null;
  publishedAt?: string | null;
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

async function fetchAndParseFeed(feedUrl: string, timeoutMs: number): Promise<ParsedArticle[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(feedUrl, {
      headers: { "user-agent": "VoiceOpenGov/feeds-pull (+https://edebatte.eu)" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`feed_fetch_failed ${res.status}`);
    const xml = await res.text();
    const lower = xml.toLowerCase();
    if (lower.includes("<feed") && lower.includes("http://www.w3.org/2005/atom")) {
      return parseAtom(xml);
    }
    return parseRss(xml);
  } finally {
    clearTimeout(timeout);
  }
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
    const items = (await fetchAndParseFeed(ref.feedUrl, opts.fetchTimeoutMs)).slice(0, opts.maxItemsPerFeed);
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
        topicHint: ref.topicHint ?? null,
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
      errors,
    };
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? `feed_timeout ${opts.fetchTimeoutMs}`
        : e?.message ?? String(e);
    return {
      feedUrl: ref.feedUrl,
      fetched: false,
      fetchedItems: 0,
      inserted: 0,
      skippedExisting: 0,
      errors: [msg],
    };
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrEditor(req);
  if (gate) return gate;

  const body = await req.json().catch(() => ({} as any));
  const scope = (body?.scope === "global" ? "global" : "de") as "de" | "global";
  const maxFeeds = Math.max(1, Math.min(100, Number(body?.maxFeeds ?? 20) || 20));
  const maxItemsPerFeed = Math.max(1, Math.min(50, Number(body?.maxItemsPerFeed ?? 12) || 12));
  const dryRun = Boolean(body?.dryRun);
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
    const payload: Record<string, any> = { ok: false, error: "feeds_config_missing", scope };
    if (process.env.NODE_ENV !== "production") payload.searched = searched;
    return NextResponse.json(payload, { status: 500, headers: JSON_HEADERS });
  }

  const feedRefs = collectFeedRefs(cfg).slice(0, maxFeeds);
  if (feedRefs.length === 0) {
    const payload: Record<string, any> = { ok: false, error: "feeds_config_empty", scope };
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
  const errors: Array<{ feedUrl: string; error: string }> = [];

  const results = await mapWithConcurrency(feedRefs, feedConcurrency, (ref) =>
    processFeed(ref, { maxItemsPerFeed, dryRun, scope, fetchTimeoutMs }),
  );

  for (const result of results) {
    if (result.fetched) fetchedFeeds += 1;
    fetchedItems += result.fetchedItems;
    inserted += result.inserted;
    skippedExisting += result.skippedExisting;
    for (const err of result.errors) {
      errors.push({ feedUrl: result.feedUrl, error: err });
    }
  }

  const debug =
    process.env.NODE_ENV !== "production"
      ? {
          configSource: source ?? null,
          feedRefs: feedRefs.length,
        }
      : {};

  return NextResponse.json(
    {
      ok: true,
      scope,
      dryRun,
      maxFeeds,
      maxItemsPerFeed,
      feedConcurrency,
      fetchTimeoutMs,
      fetchedFeeds,
      fetchedItems,
      inserted,
      skippedExisting,
      errors,
      ...debug,
    },
    { headers: JSON_HEADERS },
  );
}
