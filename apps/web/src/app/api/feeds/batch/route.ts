// apps/web/src/app/api/feeds/batch/route.ts
import { NextRequest } from "next/server";
import crypto from "crypto";

// --- einfache Validatoren (bewusst ohne zod, damit 1-File läuft) ---
type InItem = {
  url: string;
  title?: string;
  text?: string;
  summary?: string;
  html?: string;
  lang?: "de" | "en";
  publishedAt?: string;
};
type InPayload = {
  items: InItem[];
  opts?: {
    maxClaims?: number;                  // default 8
    minGate?: number;                    // später: min. statement-Score
    locale?: "de" | "en";                // fallback: 'de'
    upsert?: boolean;                    // später: DB upsert
    batchSize?: number;                  // default 6
  };
};

type AnalyzeOut = {
  ok: true;
  degraded?: boolean;
  claims: Array<{
    text: string;
    sachverhalt: string;
    zeitraum: string;
    ort: string;
    zustaendigkeit: "EU" | "Bund" | "Land" | "Kommune" | "-";
    betroffene: string[];
    messgroesse: string;
    unsicherheiten: string;
    sources: string[];
  }>;
  frames?: any;
  clusters?: any;
  statements?: any;
};

const JSON_HEADERS = { "content-type": "application/json" } as const;
const BASE =
  (process.env.INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:3000")
    .replace(/\/+$/, "");

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function stripHtml(html?: string) {
  if (!html) return "";
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
             .replace(/<style[\s\S]*?<\/style>/gi, "")
             .replace(/<[^>]+>/g, " ")
             .replace(/\s+/g, " ")
             .trim();
}
function buildText(it: InItem) {
  // Priorität: explizites text -> html -> title+summary
  const html = stripHtml(it.html);
  const t = (it.text && it.text.trim()) ||
            (html && html.trim()) ||
            [it.title, it.summary].filter(Boolean).join(". ");
  return (t || "").trim();
}

async function analyze(text: string, maxClaims: number, locale: "de" | "en"): Promise<AnalyzeOut | null> {
  const res = await fetch(`${BASE}/api/contributions/analyze`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text, maxClaims, locale }),
  });
  if (!res.ok) return null;
  return res.json();
}

type PyrNode = {
  role: "main" | "support" | "counter" | "context";
  kind: "policy" | "fact" | "value" | "concern" | "question";
  text: string;
  zust?: string;
};
function classifyKind(t: string): PyrNode["kind"] {
  const s = t.toLowerCase();
  if (/(soll(en)?|muss|einführen|abschaffen|umsetzen)\b/.test(s)) return "policy";
  if (/(ist|war|beträgt|gibt es|hat sich.*(erhöht|verringert)|wurde)\b/.test(s)) return "fact";
  if (/(gerecht|ungerecht|gut|schlecht|wünschenswert)/.test(s)) return "value";
  if (/(gefahr|risiko|belastung|nachteil)/.test(s)) return "concern";
  if (/(\?|warum|wie|wer|wieviel|welche)\b/.test(s)) return "question";
  return "fact";
}
function toPyramid(a: AnalyzeOut) {
  const nodes: PyrNode[] = (a.claims || []).map((c, i) => ({
    role: i === 0 ? "main" : "support",
    kind: classifyKind(c.text),
    text: c.text,
    zust: c.zustaendigkeit,
  }));
  const main = nodes.find(n => n.role === "main");
  const support = nodes.filter(n => n.role === "support" && n.kind !== "concern");
  const counter = nodes.filter(n => n.kind === "concern");
  const context = [] as PyrNode[]; // Platzhalter (z. B. Quellen/Metadaten)
  return { main, support, counter, context, raw: nodes };
}

async function* pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const executing: Promise<R>[] = [];
  for (const item of items) {
    const p = fn(item);
    executing.push(p);
    if (executing.length >= limit) yield await Promise.race(executing);
    while (executing.length >= limit) {
      const idx = executing.findIndex(e => e.status === "fulfilled" || e.status === "rejected");
      if (idx === -1) break;
      executing.splice(idx, 1);
    }
  }
  // Rest
  for (const p of executing) yield await p;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as InPayload | null;
    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "INVALID_PAYLOAD" }), { status: 400, headers: JSON_HEADERS });
    }

    const maxClaims = Math.max(1, Math.min(body.opts?.maxClaims ?? 8, 20));
    const batchSize = Math.max(1, Math.min(body.opts?.batchSize ?? 6, 12));
    const fallbackLocale: "de" | "en" = body.opts?.locale === "en" ? "en" : "de";

    // Dedupe by canonical URL
    const seen = new Set<string>();
    const queue = body.items
      .map(it => ({ ...it, canonicalId: sha256((it.url || "").trim()) }))
      .filter(it => {
        if (!it.url) return false;
        if (seen.has(it.canonicalId)) return false;
        seen.add(it.canonicalId);
        return true;
      });

    const results: any[] = [];
    const work = async (it: (typeof queue)[number]) => {
      const text = buildText(it);
      if (!text) {
        return {
          url: it.url,
          canonicalId: it.canonicalId,
          status: "skipped",
          reason: "empty_text",
        };
      }
      const locale = (it.lang === "en" ? "en" : it.lang === "de" ? "de" : fallbackLocale);
      const out = await analyze(text, maxClaims, locale);
      if (!out?.ok) {
        return {
          url: it.url,
          canonicalId: it.canonicalId,
          status: "error",
          reason: "analyze_failed",
        };
      }
      const pyr = toPyramid(out);
      // Draft-Candidate (Composer kann das später zu „Vote“ heben)
      const candidate = {
        title: it.title || (pyr.main?.text ?? "Unbetitelter Entwurf"),
        canonicalId: it.canonicalId,
        url: it.url,
        lang: locale,
        publishedAt: it.publishedAt || null,
        degraded: !!out.degraded,
        pyramid: pyr,
        claims: out.claims,
        frames: out.frames ?? null,
      };

      // TODO (Phase B/C): gateScore + Redaktionsranking, DB upsert etc.
      return { url: it.url, canonicalId: it.canonicalId, status: "ok", candidate };
    };

    // Simple pool
    const running: Promise<any>[] = [];
    for (const it of queue) {
      const job = work(it);
      running.push(job);
      if (running.length >= batchSize) {
        const r = await Promise.race(running);
        results.push(r);
        running.splice(running.indexOf(r), 1);
      }
    }
    // flush
    for (const p of running) results.push(await p);

    const n_ok = results.filter(r => r.status === "ok").length;
    return new Response(JSON.stringify({ ok: true, n_in: body.items.length, n_after_dedupe: queue.length, n_ok, results }), { headers: JSON_HEADERS });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "INTERNAL_ERROR" }), { status: 500, headers: JSON_HEADERS });
  }
}
