#!/usr/bin/env ts-node
/**
 * tools/feeds/import_rss.ts
 *
 * Simple RSS/Atom fetcher that normalizes feed items to FeedItemInput
 * and POSTs batches to /api/feeds/batch. Intended for ad-hoc imports or cron jobs.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";
import { summariseForEvidence } from "../../features/evidence/summariseForEvidence";

type FeedSource = {
  name: string;
  url: string;
  locale?: string;
  regionCode?: string;
};

type FeedItem = {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  description?: string;
  summary?: string;
  content?: string;
  pubDate?: string;
  published?: string;
  updated?: string;
};

type FeedItemInput = {
  externalId?: string;
  url: string;
  title?: string;
  summary?: string | null;
  content?: string | null;
  publishedAt?: string | null;
  sourceLocale?: string | null;
  regionCode?: string | null;
  sourceName?: string | null;
  sourceType?: string | null;
};

const DEFAULT_FEEDS: FeedSource[] = [
  { name: "Tagesschau", url: "https://www.tagesschau.de/xml/rss2", locale: "de", regionCode: "DE" },
  { name: "dpa-Topthemen", url: "https://www.dpa.com/de/unternehmen/dpa-in-der-corona-pandemie/rss" },
  { name: "Reuters DE", url: "https://www.reuters.com/rssFeed/worldNews", locale: "en", regionCode: "EU" },
];

async function main() {
  const apiUrl = process.env.FEEDS_API_URL || "http://localhost:3000/api/feeds/batch";
  const token = process.env.FEEDS_API_TOKEN || "";
  const feedListPath = process.argv[2];

  let feeds: FeedSource[] = DEFAULT_FEEDS;
  if (feedListPath) {
    const abs = resolve(process.cwd(), feedListPath);
    const cfg = JSON.parse(readFileSync(abs, "utf-8"));
    if (Array.isArray(cfg.feeds)) feeds = cfg.feeds;
  }

  console.log(`Loading ${feeds.length} feeds → ${apiUrl}`);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const batch: FeedItemInput[] = [];
  const dedupe = new Set<string>();

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "eDbtt-feed-importer/1.0" } });
      if (!res.ok) {
        console.warn(`[WARN] ${feed.name} (${feed.url}) -> ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const doc = parser.parse(xml);
      const items = extractItems(doc);
      for (const item of items) {
        const normalized = await mapToFeedItemInput(item, feed);
        if (!normalized.url) continue;
        const key = normalized.externalId || normalized.url;
        if (dedupe.has(key)) continue;
        dedupe.add(key);
        batch.push(normalized);
      }
      console.log(`[INFO] ${feed.name}: ${items.length} entries (batch size ${batch.length})`);
    } catch (err) {
      console.error(`[ERROR] ${feed.name}:`, err);
    }
  }

  if (!batch.length) {
    console.log("Nothing to send.");
    return;
  }

  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ items: batch }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error("[ERROR] API returned", resp.status, data);
    process.exit(1);
  }

  console.log("[OK]", data);
}

function extractItems(doc: any): FeedItem[] {
  if (doc?.rss?.channel?.item) {
    return Array.isArray(doc.rss.channel.item) ? doc.rss.channel.item : [doc.rss.channel.item];
  }
  if (doc?.feed?.entry) {
    return Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry];
  }
  return [];
}

async function mapToFeedItemInput(item: FeedItem, feed: FeedSource): Promise<FeedItemInput> {
  const link = item.link || (Array.isArray(item.link) ? item.link[0] : undefined);
  const url =
    typeof link === "string"
      ? link
      : typeof link === "object" && link?.href
      ? link.href
      : undefined;
  const published =
    item.pubDate ||
    item.published ||
    item.updated ||
    (item as any)?.["dc:date"] ||
    null;
  const rawSummary =
    (item as any)?.["content:encoded"] ||
    item.description ||
    item.summary ||
    item.content ||
    "";
  const summary = await summariseForEvidence(rawSummary || item.title || "", 800);
  const content = null;
  const externalId = item.guid || item.id || (url ? hash(url) : undefined);

  return {
    externalId,
    url: url || "",
    title: item.title ?? undefined,
    summary,
    content,
    publishedAt: published ? new Date(published).toISOString() : null,
    sourceLocale: feed.locale ?? null,
    regionCode: feed.regionCode ?? null,
    sourceName: feed.name,
    sourceType: "news_article",
  };
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 32);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
