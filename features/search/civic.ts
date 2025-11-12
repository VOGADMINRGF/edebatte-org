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
    const res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent":"VOG-CivicSearch/1.0" } });
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
