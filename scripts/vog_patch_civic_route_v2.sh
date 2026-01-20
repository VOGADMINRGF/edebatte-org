#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"

ROUTE_SEARCH="$WEB/src/app/api/search/civic/route.ts"
ROUTE_ANALYZE="$WEB/src/app/api/contributions/analyze/route.ts"
FEED_DIR="$WEB/core/feeds"
FEED_FILE="$FEED_DIR/civic_feeds.de.json"

echo "→ Lege Feed-Ordner an…"
mkdir -p "$FEED_DIR"

if [[ ! -f "$FEED_FILE" ]]; then
  echo "→ Seed-Feeds schreiben: $FEED_FILE"
  cat > "$FEED_FILE" <<'JSON'
{
  "feeds": [
    { "url": "https://www.tagesschau.de/xml/rss2", "region": "DE", "kind": "news", "trust": 0.9 },
    { "url": "https://www.berlin.de/presse/mitteilungen/index/feed", "region": "DE:BE", "kind": "gov", "trust": 0.9 },
    { "url": "https://www.rbb24.de/feed/index.xml", "region": "DE:BE", "kind": "news", "trust": 0.8 },
    { "url": "https://unternehmen.bvg.de/newsroom/feed/", "region": "DE:BE", "kind": "operator", "trust": 0.7 }
  ]
}
JSON
else
  echo "→ Feeds existieren: $FEED_FILE"
fi

echo "→ Civic-Search Route schreiben: $ROUTE_SEARCH"
mkdir -p "$(dirname "$ROUTE_SEARCH")"
cat > "$ROUTE_SEARCH" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal-toleranter RSS/Atom-Parser (ohne extra deps)
function textBetween(s:string, a:string, b:string) {
  const i = s.indexOf(a); if (i<0) return "";
  const j = s.indexOf(b, i + a.length); if (j<0) return "";
  return s.slice(i + a.length, j);
}
function unescape(html:string) {
  return html
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
function parseRss(xml:string) {
  const items: any[] = [];
  const rss = xml.includes("<rss") || xml.includes("<rdf");
  const atom = xml.includes("<feed");
  if (rss) {
    const parts = xml.split(/<item[\s>]/g).slice(1);
    for (const p of parts) {
      const chunk = "<item" + p;
      const title = unescape(textBetween(chunk, "<title>", "</title>")).trim();
      let link = unescape(textBetween(chunk, "<link>", "</link>")).trim();
      // Manche RSS haben <guid isPermaLink="true">…</guid>
      if (!link) link = unescape(textBetween(chunk, "<guid>", "</guid>")).trim();
      const desc = unescape(textBetween(chunk, "<description>", "</description>")).trim();
      const pubDate = unescape(textBetween(chunk, "<pubDate>", "</pubDate>")).trim();
      if (title || link) items.push({ title, url: link, summary: desc, date: pubDate });
    }
  } else if (atom) {
    const parts = xml.split(/<entry[\s>]/g).slice(1);
    for (const p of parts) {
      const chunk = "<entry" + p;
      const title = unescape(textBetween(chunk, "<title>", "</title>")).trim();
      // <link href="..."/> oder <link>…</link>
      let link = ""; 
      const hrefMatch = chunk.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (hrefMatch) link = unescape(hrefMatch[1]);
      if (!link) link = unescape(textBetween(chunk, "<link>", "</link>")).trim();
      const summary = unescape(textBetween(chunk, "<summary>", "</summary>")).trim()
        || unescape(textBetween(chunk, "<content>", "</content>")).trim();
      const updated = unescape(textBetween(chunk, "<updated>", "</updated>")).trim()
        || unescape(textBetween(chunk, "<published>", "</published>")).trim();
      if (title || link) items.push({ title, url: link, summary, date: updated });
    }
  }
  return items;
}

async function fetchText(url:string, timeoutMs=8000) {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "eDebatte/1.0 (+civic-search)" },
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally { clearTimeout(t); }
}

// simple score: trust * keywordMatch * recency
function scoreOf(item:any, trust=0.5, keywords:string[]=[]): number {
  const hay = (item.title+" "+(item.summary||"")).toLowerCase();
  const kwHits = keywords.reduce((n,kw)=> n + (hay.includes(String(kw).toLowerCase())?1:0), 0);
  const kwFactor = kwHits === 0 ? 0.6 : Math.min(1, 0.6 + 0.2*kwHits);
  let recency = 0.8;
  if (item.date) {
    const dt = new Date(item.date);
    const ageDays = Math.max(0, (Date.now()-dt.getTime())/86400000);
    recency = Math.exp(-ageDays/14); // 2 Wochen Halbwert
  }
  return +(trust * kwFactor * recency).toFixed(4);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json().catch(()=> ({}));
    const topic = String(body.topic || "").trim();
    const region = String(body.region || "").trim();  // z.B. "DE:BE"
    const limit = Math.max(1, Math.min(50, Number(body.limit ?? 10)));
    const keywords: string[] = Array.isArray(body.keywords) ? body.keywords.map(String) : [];

    const FEEDS_PATH = path.join(process.cwd(), "core", "feeds", "civic_feeds.de.json");
    if (!fs.existsSync(FEEDS_PATH)) {
      return NextResponse.json({ ok:false, error:`feeds file not found: ${FEEDS_PATH}`, items:[], tookMs: Date.now()-t0 });
    }
    const cfg = JSON.parse(fs.readFileSync(FEEDS_PATH, "utf8"));
    const feeds: Array<{url:string; region?:string; trust?:number; kind?:string}> = Array.isArray(cfg?.feeds) ? cfg.feeds : [];

    const selected = feeds.filter(f => {
      if (!f?.url) return false;
      if (region && f.region && !f.region.startsWith(region)) return false;
      return true;
    });

    const allItems: any[] = [];
    const errors: string[] = [];
    // parallel mit sanfter Fehlerbehandlung
    await Promise.all(selected.map(async (f) => {
      try {
        const xml = await fetchText(f.url, 9000);
        const items = parseRss(xml).slice(0, 50).map(it => ({
          ...it,
          score: scoreOf(it, Number(f.trust ?? 0.5), keywords.length? keywords : (topic? [topic] : [])),
          source: f.url,
          region: f.region ?? null,
          kind: f.kind ?? null
        }));
        allItems.push(...items);
      } catch (e:any) {
        errors.push(`${f.url} → ${e?.message||String(e)}`);
      }
    }));

    allItems.sort((a,b)=> (b.score||0)-(a.score||0));
    const items = allItems.slice(0, limit);

    return NextResponse.json({
      ok: true,
      items,
      errors: errors.length? errors : null,
      tookMs: Date.now()-t0
    });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e), items:[], tookMs: Date.now()-t0 });
  }
}
TS

echo "→ (Optional) Analyze-Import normalisieren…"
if [[ -f "$ROUTE_ANALYZE" ]]; then
  sed -i '' 's#@/apps/web/src/app/pipeline/steps/analyze_multi_llm#@/app/pipeline/steps/analyze_multi_llm#g' "$ROUTE_ANALYZE" || true
  sed -i '' 's#@/apps/web/src/app/pipeline/steps/analyze_multi_llm.ts#@/app/pipeline/steps/analyze_multi_llm#g' "$ROUTE_ANALYZE" || true
fi

echo "→ Next.js Cache leeren…"
rm -rf "$WEB/.next" 2>/dev/null || true

echo "✓ Patch fertig. Jetzt dev starten:"
echo "pnpm --filter @vog/web dev"
