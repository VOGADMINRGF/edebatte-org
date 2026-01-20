#!/usr/bin/env bash
set -euo pipefail

# LEGACY_KEEP: R&D-Vorlage für künftige Provider-Erweiterungen (ARI/You.com etc.),
# nicht produktiv verdrahtet. Bitte nur manuell und bewusst anpassen.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
FEAT="$ROOT/features"
CORE="$ROOT/core"

mkdir -p "$FEAT/search" "$CORE/feeds" \
         "$WEB/src/app/api/search/civic" \
         "$WEB/src/app/pipeline/steps"

echo "→ Schreibe Feed-Config (DE)…"
cat > "$CORE/feeds/civic_feeds.de.json" <<'JSON'
{
  "$schema": "https://edebatte.org/schemas/civic_feeds_v1.json",
  "version": 1,
  "regions": {
    "DE": {
      "default": [
        "https://www.tagesschau.de/xml/rss2"
      ],
      "verkehr": [
        "https://www.tagesschau.de/xml/rss2"
      ],
      "berlin": [
        "https://www.rbb24.de/content/rbb/r24/de/service/RSS/rbb24.xml"
      ]
    }
  },
  "notes": [
    "Nur verifizierte, öffentlich erreichbare Feeds eintragen.",
    "Für Berlin/ÖPNV sind weitere Fachfeeds möglich – bitte bewusst ergänzen (Presseportale, Stadt, Senat, Verbünde)."
  ]
}
JSON

echo "→ Recherche: ARI-Stubs (optional)…"
cat > "$FEAT/search/ari.ts" <<'TS'
export type AriResult = { ok: boolean; items?: any[]; error?: string; skipped?: boolean; ms?: number; logs?: string[] };

// Minimal-Stub: Wenn KEY fehlt → sauber 'skipped'. Ansonsten: hier später echten ARI-Call einhängen.
export async function searchWithAriStrict(query: string, opts: { region?: string; limit?: number; timeoutMs?: number } = {}): Promise<AriResult> {
  const key = process.env.YOUCOM_ARI_API_KEY;
  if (!key) return { ok:false, skipped:true, error:"YOUCOM_ARI_API_KEY missing" };
  // TODO: echten Endpunkt/Schema einbauen, sobald Zugang vorliegt.
  return { ok:false, error:"ARI not wired yet (placeholder)", ms: 0, logs:["ari: placeholder"] };
}
TS

echo "→ Recherche: Civic RSS/Atom (strict)…"
cat > "$FEAT/search/civic.ts" <<'TS'
import fs from "node:fs/promises";

export type CivicItem = {
  title: string; url: string; published?: string; summary?: string; source?: string;
  score?: number; // simple relevance
};
export type CivicOut = { ok: true; items: CivicItem[]; logs: string[] } | { ok: false; error: string; logs: string[] };

function text(x:any){return typeof x==="string"?x:"";}
function clip(s:string,n=280){return s.length>n?s.slice(0,n-1)+"…":s;}
function norm(s:string){return String(s||"").toLowerCase();}

function parseRss(xml: string): CivicItem[] {
  const items: CivicItem[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of chunks) {
    const title = (raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").trim();
    const link  = (raw.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1]||"").trim();
    const desc  = (raw.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1]||"").trim();
    const date  = (raw.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]||"").trim();
    if (title && link) items.push({ title, url: link, summary: clip(desc), published: date });
  }
  return items;
}

function parseAtom(xml: string): CivicItem[] {
  const items: CivicItem[] = [];
  const chunks = xml.split(/<entry[\s>]/i).slice(1);
  for (const raw of chunks) {
    const title = (raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").trim();
    const link  = (raw.match(/<link\b[^>]*href="([^"]+)"/i)?.[1]||"").trim();
    const summ  = (raw.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1]||"").trim() ||
                  (raw.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)?.[1]||"").trim();
    const date  = (raw.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i)?.[1]||"").trim() ||
                  (raw.match(/<published\b[^>]*>([\s\S]*?)<\/published>/i)?.[1]||"").trim();
    if (title && link) items.push({ title, url: link, summary: clip(summ), published: date });
  }
  return items;
}

async function fetchText(url: string, timeoutMs=8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent":"eDebatte-CivicSearch/1.0" } });
    if (!res.ok) throw new Error("HTTP "+res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}

async function loadFeeds(country="DE"): Promise<any> {
  const p = process.cwd()+"/core/feeds/civic_feeds."+country.toLowerCase()+".json";
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

function pickFeeds(config:any, region?: string, topic?: string): string[] {
  const out = new Set<string>();
  const de = config?.regions?.DE;
  if (!de) return [];
  // default
  (de.default||[]).forEach((u:string)=>out.add(u));
  // topic
  if (topic && de[norm(topic)]) (de[norm(topic)]||[]).forEach((u:string)=>out.add(u));
  // region (z.B. "berlin")
  if (region) {
    const key = norm(region).includes("berlin") ? "berlin" : null;
    if (key && de[key]) (de[key]||[]).forEach((u:string)=>out.add(u));
  }
  return Array.from(out);
}

export async function civicSearchStrict(params: {
  topic?: string; region?: string; keywords?: string[]; limit?: number; timeoutMs?: number
}): Promise<CivicOut> {
  const logs: string[] = [];
  try {
    const cfg = await loadFeeds("DE");
    const feeds = pickFeeds(cfg, params.region, params.topic);
    if (!feeds.length) return { ok:false, error:"no-feeds-configured", logs:[...logs, "feeds: 0"] };

    const xmls = await Promise.allSettled(
      feeds.map(u => fetchText(u, params.timeoutMs ?? 20000).then(t => ({u,t})))
    );
    const items: CivicItem[] = [];
    for (const r of xmls) {
      if (r.status !== "fulfilled") { logs.push("fetch-fail"); continue; }
      const {u,t} = r.value;
      const parsed = /<rss\b/i.test(t) ? parseRss(t) : /<feed\b/i.test(t) ? parseAtom(t) : [];
      parsed.forEach(it => { it.source = u; });
      items.push(...parsed);
    }
    if (!items.length) return { ok:false, error:"no-items", logs:[...logs, "parse: 0"] };

    // Filtern: nur Treffer mit einem Keyword (strict)
    const kws = (params.keywords||[]).map(norm).filter(Boolean);
    const filtered = kws.length
      ? items.filter(it => {
          const s = norm(it.title+" "+(it.summary||""));
          return kws.some(k => s.includes(k));
        })
      : items;

    if (!filtered.length) return { ok:false, error:"no-match", logs:[...logs, `kws:${kws.length}`] };

    // simple scoring: keyword hits + recency bias (ohne Heuristik = deterministisch)
    const now = Date.now();
    const scored = filtered.map(it => {
      const s = norm(it.title+" "+(it.summary||""));
      const hits = kws.reduce((n,k)=> n + (s.includes(k)?1:0), 0);
      const ts = it.published ? Date.parse(it.published) : NaN;
      const rec = Number.isFinite(ts) ? Math.max(0, 1 - Math.min(1, (now - ts) / (1000*60*60*24*14))) : 0; // bis 14 Tage
      return { ...it, score: hits + rec };
    }).sort((a,b)=> (b.score||0)-(a.score||0));

    const limit = Math.max(1, Math.min(50, params.limit ?? 12));
    return { ok:true, items: scored.slice(0, limit), logs };
  } catch (e:any) {
    return { ok:false, error:String(e?.message||e), logs:[...[], "exception"] };
  }
}
TS

echo "→ Civic API-Route…"
cat > "$WEB/src/app/api/search/civic/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { civicSearchStrict } from "@/features/search/civic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, region, keywords, limit } = body || {};
    const out = await civicSearchStrict({
      topic: String(topic||"") || undefined,
      region: String(region||"") || undefined,
      keywords: Array.isArray(keywords)? keywords.map(String) : undefined,
      limit: Number(limit||12)
    });
    if (!out.ok) {
      return NextResponse.json({ ok:false, error: out.error, logs: out.logs }, { status: 200 });
    }
    return NextResponse.json({ ok:true, items: out.items, logs: out.logs }, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
TS

echo "→ Analyse-Step (Multi-LLM) *anreichern*…"
cat > "$WEB/src/app/pipeline/steps/analyze_multi_llm.ts" <<'TS'
import { orchestrateContribution } from "@/features/ai/orchestrator_contrib";
import { civicSearchStrict } from "@/features/search/civic";
import type { AnalyzeResult } from "@/features/analyze/analyzeContribution";

export async function step_analyze_multi_llm(text: string, { maxClaims = 5 }: { maxClaims?: number } = {}) {
  const prompt = [
    "Analysiere den Bürgertext und gib NUR gültiges JSON (RFC8259) zurück.",
    "Schema: {",
    '  "language": "de"|"en"|null,',
    '  "mainTopic": string|null,',
    '  "subTopics": string[],',
    '  "regionHint": string|null,',
    '  "claims": [ { "text": string, "categoryMain": string|null, "categorySubs": string[], "region": string|null, "authority": string|null } ],',
    '  "news": [], "scoreHints": { "baseWeight": number, "reasons": string[] }, "cta": null',
    "}",
    "Beachte: maximal " + maxClaims + " prägnante Claims; keine Erklärtexte.",
    "Text:",
    text,
  ].join("\n");

  const { runs, best } = await orchestrateContribution(prompt, { json: true });
  let parsed: any = {};
  let parseErr: string | null = null;
  try { parsed = JSON.parse(String(best?.text || "{}")); }
  catch (e:any) { parseErr = "json-parse-failed"; parsed = {}; }

  const result: Omit<AnalyzeResult, "_meta"> = {
    language: parsed?.language ?? null,
    mainTopic: parsed?.mainTopic ?? null,
    subTopics: Array.isArray(parsed?.subTopics) ? parsed.subTopics : [],
    regionHint: parsed?.regionHint ?? null,
    claims: Array.isArray(parsed?.claims) ? parsed.claims : [],
    news: [],
    scoreHints: parsed?.scoreHints ?? null,
    cta: null,
  };

  // STRICT civic search (fallback wenn ARI später greift) — nur wenn mainTopic/claims vorhanden
  const kw = new Set<string>();
  if (typeof result.mainTopic === "string") kw.add(result.mainTopic);
  (result.subTopics||[]).forEach((s:string)=> kw.add(s));
  (result.claims||[]).slice(0,3).forEach((c:any)=>{
    String(c?.text||"").split(/[^A-Za-zÄÖÜäöüß0-9\-]+/).forEach(w=>{
      if (w.length>3) kw.add(w);
    });
  });

  let civic = await civicSearchStrict({
    topic: result.mainTopic || undefined,
    region: result.regionHint || undefined,
    keywords: Array.from(kw).slice(0,12),
    limit: 10
  });

  const news = civic.ok ? civic.items : [];
  const logs: string[] = [];
  logs.push(civic.ok ? `civic:${news.length}` : `civic-error:${civic.error}`);

  return {
    ...result,
    news,
    _meta: {
      mode: "multi",
      errors: parseErr ? [parseErr] : null,
      tookMs: 0,
      gptText: best?.text || null,
      runs,
      picked: best ? runs.find(r=>r.text===best.text)?.provider : null,
      logs
    } as any
  };
}
TS

echo "→ API: contributions/analyze an orchestrated Step anbinden…"
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
import { step_analyze_multi_llm } from "@/apps/web/src/app/pipeline/steps/analyze_multi_llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || (process.env.VOG_ANALYZE_MODE || "gpt");
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const maxClaims = body?.maxClaims ?? 3;

    if (!text) {
      return NextResponse.json({ error: "Kein Text übergeben.", status: 400 }, { status: 200 });
    }

    const result = mode === "multi"
      ? await step_analyze_multi_llm(text, { maxClaims })
      : await analyzeContribution(text, { maxClaims });

    return NextResponse.json(result, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ _meta:{ mode:"error", errors:[String(e?.message||e)], tookMs:0 } }, { status: 200 });
  }
}
TS

echo "→ Smoke-Skripte…"
cat > "$ROOT/scripts/smoke_civic_search.sh" <<'BASH'
#!/usr/bin/env bash
set -e
curl -sS -X POST 'http://127.0.0.1:3000/api/search/civic' \
  -H 'content-type: application/json' \
  -d '{"topic":"ÖPNV","region":"Berlin","keywords":["Straßenbahn","Nahverkehr","BVG","Tarif"],"limit":6}' \
| jq .
BASH
chmod +x "$ROOT/scripts/smoke_civic_search.sh"

echo "→ Fertig. Starte ggf. dev neu:"
echo "   rm -rf apps/web/.next && pnpm --filter @vog/web dev"
