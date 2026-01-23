import crypto from "crypto";
import Parser from "rss-parser";
import { adminConfig } from "@config/admin-config";

export type FeedItem = { id: string; title: string; link: string; isoDate?: string; contentSnippet?: string; regionKey?: string };

const parser = new Parser();

const DEFAULT_FEEDS: Array<{ url: string; regionKey?: string }> = [
  { url: "https://www.bundestag.de/static/aktuell/rss", regionKey: "DE" },
  { url: "https://www.tagesschau.de/xml/rss2", regionKey: "DE" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", regionKey: "GLOBAL" },
];

export async function fetchFeeds(limit = adminConfig.limits.newsfeedMaxPerRun, regionKey = adminConfig.region.defaultRegionKey) {
  const out: FeedItem[] = [];
  for (const f of DEFAULT_FEEDS) {
    try {
      const feed = await parser.parseURL(f.url);
      for (const it of feed.items.slice(0, limit)) {
        const id = crypto.createHash("sha256").update((it.link || it.title || "")).digest("hex");
        out.push({ id, title: it.title || "", link: it.link || "", isoDate: it.isoDate, contentSnippet: it.contentSnippet, regionKey: f.regionKey });
      }
    } catch (e) {
      // ignore/continue
    }
  }
  // de-dup by id
  const byId = new Map<string, FeedItem>();
  for (const i of out) if (!byId.has(i.id)) byId.set(i.id, i);
  return Array.from(byId.values()).slice(0, limit);
}

// Placeholder trust score (to be replaced by KI pipeline)
export function naiveTrustScore(item: FeedItem): number {
  // Simple heuristic as placeholder
  const host = new URL(item.link).hostname;
  const known = ["bundestag.de","tagesschau.de","bbc.co.uk"];
  return known.some(k=>host.endsWith(k)) ? 5 : 3;
}

export async function toDraftVotes(items: FeedItem[]) {
  // Integrate with triMongo/Prisma later. For now return mapped drafts.
  return items.map(i => ({
    title: i.title,
    link: i.link,
    regionKey: i.regionKey,
    trust: naiveTrustScore(i),
    factState: "unverified" as const
  }));
}
