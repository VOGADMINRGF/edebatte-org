#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
WEB="$ROOT/apps/web"

say(){ printf "▶ %s\n" "$*"; }

say "Ordnerstruktur anlegen …"
mkdir -p "$WEB/src/lib" \
         "$WEB/src/components/analyze" \
         "$WEB/src/app/api/contributions/analyze/stream" \
         "$WEB/src/app/api/contributions/analyze" \
         "$WEB/src/app/contributions/analyze" \
         "$WEB/src/app/contributions/new" \
         "$WEB/src/config" \
         "$WEB/src/shims" \
         "$WEB/src/shims/core/db" \
         "$WEB/src/shims/features/analyze" \
         "$WEB/src/shims/features/utils/ai" \
         "$WEB/src/shims/features/stream/data" \
         "$WEB/src/shims/features/stream/utils" \
         "$WEB/src/shims/features/auth/hooks" \
         "$WEB/src/shims/packages/config"

###############################################################################
# 0) Admin-Config lokal (statt @packages/config/admin-config)
###############################################################################
say "Schreibe src/config/admin-config.ts …"
cat > "$WEB/src/config/admin-config.ts" <<'EOF'
export interface PricingConfig { membershipMonthlyEUR: number; postImmediateEUR: number; swipeToPostThresholds: number[]; }
export interface PipelineLimits { newsfeedMaxPerRun: number; factcheckMaxPerItemTokens: number; enableAutoPost: boolean; }
export interface RegionPilot { defaultRegionKey: string; }
export interface AdminConfig { pricing: PricingConfig; limits: PipelineLimits; region: RegionPilot; }
export const adminConfig: AdminConfig = {
  pricing: {
    membershipMonthlyEUR: Number(process.env.VOG_PRICE_MEMBERSHIP ?? 5),
    postImmediateEUR: Number(process.env.VOG_PRICE_POST_IMMEDIATE ?? 1.99),
    swipeToPostThresholds: (process.env.VOG_SWIPE_THRESHOLDS ?? "100,500,1000")
      .split(",").map(x=>Number(x.trim())).filter(Boolean),
  },
  limits: {
    newsfeedMaxPerRun: Number(process.env.VOG_NEWSFEED_MAX_PER_RUN ?? 50),
    factcheckMaxPerItemTokens: Number(process.env.VOG_FACTCHECK_TOKENS ?? 4096),
    enableAutoPost: String(process.env.VOG_PIPELINE_AUTODRAFT ?? "true")==="true",
  },
  region: { defaultRegionKey: String(process.env.VOG_DEFAULT_REGION ?? "DE:BE:11000000") }
};
export default adminConfig;
EOF

# Kompatible Weiterleitungen für @packages/config/*
cat > "$WEB/src/shims/packages/config/admin-config.ts" <<'EOF'
export * from "../../config/admin-config";
export { default } from "../../config/admin-config";
EOF

###############################################################################
# 1) DB-Shims (@db/web, @db/core)
###############################################################################
say "Schreibe DB-Shims …"
cat > "$WEB/src/shims/db-web.ts" <<'EOF'
// Minimaler Prisma/Web-Shim – reicht für Typen & dev
export type PublishStatus = "draft" | "published" | "archived";
export type ContentKind = "report" | "statement" | "stream" | "item";
export const prisma: any = {};
export default prisma;
EOF

cat > "$WEB/src/shims/db-core.ts" <<'EOF'
export type Prisma = any;
export const prisma: any = {};
export default prisma;
EOF

###############################################################################
# 2) triMongo – direkt MongoDB (deine Variante)
###############################################################################
say "Schreibe triMongo (falls fehlt) …"
cat > "$WEB/src/shims/core/db/db/triMongo.ts" <<'EOF'
import { MongoClient, Db, Collection, Document } from "mongodb";
let coreClient: MongoClient | null = null;
let votesClient: MongoClient | null = null;
let piiClient: MongoClient | null = null;
async function getClient(uri: string){ const c=new MongoClient(uri); try{await c.connect();}catch{} return c; }
export async function coreDb():Promise<Db>{
  const uri = process.env.CORE_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  coreClient = coreClient ?? await getClient(uri);
  const name = process.env.CORE_DB_NAME || process.env.DB_NAME || "core";
  return coreClient.db(name);
}
export async function votesDb():Promise<Db>{
  const uri = process.env.VOTES_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  votesClient = votesClient ?? await getClient(uri);
  const name = process.env.VOTES_DB_NAME || process.env.DB_NAME || "votes";
  return votesClient.db(name);
}
export async function piiDb():Promise<Db>{
  const uri = process.env.PII_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  piiClient = piiClient ?? await getClient(uri);
  const name = process.env.PII_DB_NAME || process.env.DB_NAME || "pii";
  return piiClient.db(name);
}
export async function getDb(dbName: "core"|"votes"|"pii"="core"){ if(dbName==="core")return coreDb(); if(dbName==="votes")return votesDb(); return piiDb(); }
export async function coreCol<T extends Document=Document>(name:string){ return (await coreDb()).collection<T>(name); }
export async function votesCol<T extends Document=Document>(name:string){ return (await votesDb()).collection<T>(name); }
export async function piiCol<T extends Document=Document>(name:string){ return (await piiDb()).collection<T>(name); }
export async function getCol<T extends Document=Document>(a:any,b?:any){ if(typeof b==="string"){ const db=await getDb(a as any); return db.collection<T>(b);} return coreCol<T>(a as string); }
export default { coreDb, votesDb, piiDb, getDb, coreCol, votesCol, piiCol, getCol };
EOF

###############################################################################
# 3) Feature-Shims (breit, aber leichtgewichtig)
###############################################################################
say "Schreibe Feature-Shims …"
cat > "$WEB/src/shims/features/analyze/analyzeContribution.ts" <<'EOF'
export type AnalyzeInput = any;
export type AnalyzeResult = any;
export async function analyzeContribution(_: any): Promise<any> {
  return { topics: [], theses: [], statements: [], summary: { topics:0, theses:0, avgRelevance:0 } };
}
export default analyzeContribution;
EOF

cat > "$WEB/src/shims/features/utils/ai/youClient.ts" <<'EOF'
export async function youQuery(_: { q: string, region?: string, lang?: string }) {
  return { results: [] as Array<{ title:string; url:string; source?:string; time?:string }>, provider: "shim" };
}
EOF

cat > "$WEB/src/shims/features/stream/data/streamData.ts" <<'EOF'
export const streamData: Array<any> = [];
export default streamData;
EOF

cat > "$WEB/src/shims/features/stream/utils/nationalFlag.ts" <<'EOF'
export function getNationalFlag(_code: string){ return "🇪🇺"; }
export function getLanguageName(_code: string){ return "Deutsch"; }
EOF

cat > "$WEB/src/shims/features/auth/hooks/useRouteGuard.ts" <<'EOF'
export function useRouteGuard(){ return { allow: true, reason: null as string|null }; }
export default useRouteGuard;
EOF

###############################################################################
# 4) Middleware fix (sauber & typsicher)
###############################################################################
say "Schreibe Middleware …"
cat > "$WEB/src/middleware.ts" <<'EOF'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.nextUrl.pathname === "/statements/new") {
    return NextResponse.redirect(new URL("/contributions/new", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
EOF

###############################################################################
# 5) tsconfig – schlank (keine externen Features)
###############################################################################
say "Schreibe tsconfig.json …"
cat > "$WEB/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022","DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@config/*": ["src/config/*"],
      "@db/web": ["src/shims/db-web.ts"],
      "@db/core": ["src/shims/db-core.ts"],
      "@core/db/triMongo": ["src/shims/core/db/db/triMongo.ts"],
      "@features/*": ["src/shims/features/*"],
      "@packages/*": ["src/shims/packages/*"]
    },
    "plugins": [{ "name": "next" }],
    "incremental": true
  },
  "include": ["next-env.d.ts","src/**/*",".next/types/**/*.ts"],
  "exclude": [
    "node_modules",".next","dist","build",
    "src/_disabled/**",
    "src/__features_local_DISABLED__/**",
    "../../features/**","../../packages/**"
  ]
}
EOF

###############################################################################
# 6) next.config.ts – minimal & gültig
###############################################################################
say "Schreibe next.config.ts …"
cat > "$WEB/next.config.ts" <<'EOF'
import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: { typedRoutes: true, externalDir: true }
};
export default config;
EOF

###############################################################################
# 7) bson -> mongodb in drafts.ts (falls vorhanden)
###############################################################################
DRAFTS="$WEB/src/server/drafts.ts"
if [ -f "$DRAFTS" ]; then
  say "Patches in src/server/drafts.ts (bson->mongodb) …"
  perl -0777 -pe 's/from\s+["\']bson["\']/from "mongodb"/g' -i.bak "$DRAFTS" || true
fi

###############################################################################
# 8) Optionale Altlasten umbenennen & relative ../../features/* -> @features/*
###############################################################################
if [ -d "$WEB/src/__features_local_DISABLED__" ]; then
  say "Verschiebe __features_local_DISABLED__ → src/_disabled/ …"
  mkdir -p "$WEB/src/_disabled"
  mv "$WEB/src/__features_local_DISABLED__" "$WEB/src/_disabled/__features_local_DISABLED__" || true
fi

say "Re-mappe relative ../../features/*-Imports (falls vorhanden) …"
# Ersetzt z.B. ../../features/ai/orchestrator → @features/ai/orchestrator
find "$WEB/src" -type f -name "*.ts*" -print0 | xargs -0 perl -0777 -i -pe 's/from\s+["\'](?:\.\.\/)+features\//from "@features\//g'

###############################################################################
# 9) LLM-Client (temperatur-sicher) + Analyse (SSE + POST) inkl. URL-Fetch
###############################################################################
say "Schreibe lib/llm.ts …"
cat > "$WEB/src/lib/llm.ts" <<'EOF'
import OpenAI from "openai";
export type AnalyzeJSON = {
  summary: { topics:number; theses:number; avgRelevance:number };
  topics: Array<{ topic:string; score:number }>;
  theses: Array<{ text:string; relevance:number }>;
  statements: Array<{ text:string }>;
};
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SYSTEM = `Du bist ARI/VOG. Extrahiere: topics(max 6, score 0..1), theses(1..n), statements(<=5) und summary{topics,theses,avgRelevance}. Antworte NUR als JSON.`;

export async function analyzeWithGptStrict(text: string, model = process.env.OPENAI_MODEL ?? "gpt-5.0-mini"): Promise<AnalyzeJSON> {
  const user = `Text:\n${text}\n---\nGib strikt JSON zurück.`;
  const base = { model, response_format: { type: "json_object" as const }, messages: [{ role:"system", content:SYSTEM }, { role:"user", content:user }] };
  try {
    const res = await client.chat.completions.create({
      ...base,
      ...(process.env.OPENAI_TEMPERATURE ? { temperature: Number(process.env.OPENAI_TEMPERATURE) } : {})
    });
    const raw = res.choices?.[0]?.message?.content ?? "{}";
    return JSON.parse(raw);
  } catch (e:any) {
    const msg = String(e?.error?.message || e?.message || "");
    if (e?.code === "unsupported_value" || /Unsupported value:\s*'temperature'/i.test(msg)) {
      const res = await client.chat.completions.create(base);
      const raw = res.choices?.[0]?.message?.content ?? "{}";
      return JSON.parse(raw);
    }
    throw e;
  }
}
EOF

say "Schreibe /api/contributions/analyze/stream …"
cat > "$WEB/src/app/api/contributions/analyze/stream/route.ts" <<'EOF'
import { NextRequest } from "next/server";
import { analyzeWithGptStrict } from "@/lib/llm";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

function extractUrls(t: string): string[] {
  const m = t.match(/https?:\/\/[^\s)]+/g) || [];
  return [...new Set(m.map(u=>u.replace(/[),.]+$/,"")))];
}
async function fetchPlain(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "VOG/1.0 (+https://voiceopengov.org)" } });
    const html = await r.text();
    const title = (html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "").trim();
    const body = html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ");
    const main = body.replace(/\s+/g," ").slice(0, 20000);
    return `\n\n[Quelle] ${title || url}\nURL: ${url}\nText: ${main}\n`;
  } catch { return `\n\n[Quelle] ${url}\n(Holen der Seite fehlgeschlagen)\n`; }
}

export async function GET(req: NextRequest) {
  const text = String(new URL(req.url).searchParams.get("text") ?? "");
  const urls = extractUrls(text);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) =>
        controller.enqueue(enc.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`));

      send("status", { step:"ingest", msg:"Lese Eingabe & Quellen…" });

      // URLs nachladen
      let expanded = text;
      if (urls.length) {
        for (const u of urls) {
          send("status", { step:"fetch", msg:`Hole ${u} …` });
          expanded += await fetchPlain(u);
        }
      }

      try {
        send("status", { step:"analyze", msg:"Analysiere mit GPT…" });
        const res = await analyzeWithGptStrict(expanded);
        if (res.summary) send("summary", res.summary);
        if (res.topics) send("topics", res.topics);
        if (res.theses) send("theses", res.theses);
        if (res.statements) send("statements", res.statements);
        if (urls.length) send("news", { items: urls.map((u,i)=>({ title:`Quelle ${i+1}`, url:u, relevance:0.6 - i*0.05 })) });
        send("done", {});
      } catch (e:any) {
        send("error", { message: String(e?.error?.message || e?.message || e) });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { "Content-Type":"text/event-stream; charset=utf-8", "Cache-Control":"no-cache, no-transform", "Connection":"keep-alive" }
  });
}
EOF

say "Schreibe /api/contributions/analyze (POST) …"
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'EOF'
import { NextRequest } from "next/server";
import { analyzeWithGptStrict } from "@/lib/llm";
export const dynamic = "force-dynamic";

function extractUrls(t: string): string[] {
  const m = t.match(/https?:\/\/[^\s)]+/g) || [];
  return [...new Set(m.map(u=>u.replace(/[),.]+$/,"")))];
}
async function fetchPlain(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { "user-agent": "VOG/1.0 (+https://voiceopengov.org)" } });
    const html = await r.text();
    const title = (html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "").trim();
    const body = html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ");
    const main = body.replace(/\s+/g," ").slice(0, 20000);
    return `\n\n[Quelle] ${title || url}\nURL: ${url}\nText: ${main}\n`;
  } catch { return `\n\n[Quelle] ${url}\n(Holen der Seite fehlgeschlagen)\n`; }
}

export async function POST(req: NextRequest) {
  const { text = "" } = await req.json().catch(()=>({}));
  const urls = extractUrls(text);
  let expanded = text;
  for (const u of urls) expanded += await fetchPlain(u);
  const res = await analyzeWithGptStrict(expanded);
  return Response.json(res);
}
EOF

###############################################################################
# 10) Minimale UI: AnalyzeUI (Client) + zwei Seiten ohne next/dynamic
###############################################################################
say "Schreibe AnalyzeUI …"
cat > "$WEB/src/components/analyze/AnalyzeUI.tsx" <<'EOF'
"use client";
import { useEffect, useRef, useState } from "react";

type Topic = { topic:string; score:number };
type Thesis = { text:string; relevance:number };
type Statement = { text:string };
type Summary = { topics:number; theses:number; avgRelevance:number };

export default function AnalyzeUI(){
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<string>("Bereit");
  const [summary, setSummary] = useState<Summary| null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [news, setNews] = useState<Array<{title:string;url:string;relevance:number}>>([]);
  const [running, setRunning] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const stop = () => { esRef.current?.close(); esRef.current = null; setRunning(false); };

  const start = () => {
    if (!text.trim()) return;
    setRunning(true);
    setStatus("Verbinde…");
    setSummary(null); setTopics([]); setTheses([]); setStatements([]); setNews([]);

    try {
      const url = "/api/contributions/analyze/stream?text=" + encodeURIComponent(text);
      const es = new EventSource(url);
      esRef.current = es;
      es.addEventListener("status", (e:any)=> { try { const d=JSON.parse(e.data); setStatus(`${d.step}: ${d.msg}`);}catch{} });
      es.addEventListener("summary",(e:any)=> { try { setSummary(JSON.parse(e.data)); } catch{} });
      es.addEventListener("topics",(e:any)=> { try { setTopics(JSON.parse(e.data)); } catch{} });
      es.addEventListener("theses",(e:any)=> { try { setTheses(JSON.parse(e.data)); } catch{} });
      es.addEventListener("statements",(e:any)=> { try { setStatements(JSON.parse(e.data)); } catch{} });
      es.addEventListener("news",(e:any)=> { try { setNews(JSON.parse(e.data).items||[]); } catch{} });
      es.addEventListener("error",(e:any)=> { try { const d=JSON.parse(e.data); setStatus("Fehler: "+d.message);}catch{}; stop(); });
      es.addEventListener("done", ()=> { setStatus("Fertig"); stop(); });
      es.onerror = ()=>{ /* Fallback → POST */ fetch("/api/contributions/analyze",{ method:"POST", body: JSON.stringify({ text }), headers: { "content-type":"application/json" }})
        .then(r=>r.json()).then(d=>{ setSummary(d.summary); setTopics(d.topics||[]); setTheses(d.theses||[]); setStatements(d.statements||[]); setStatus("Fertig (Fallback)"); }).finally(stop); };
    } catch (e:any) {
      setStatus("Fehler: "+String(e?.message||e));
      setRunning(false);
    }
  };

  useEffect(()=>()=>stop(),[]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Analyse</h1>
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder="Text eingeben – Links (http/https) werden automatisch mitgeladen …"
        className="w-full h-40 rounded border p-3" />
      <div className="flex gap-2">
        <button onClick={start} disabled={running} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">Analysieren</button>
        {running && <button onClick={stop} className="px-4 py-2 rounded border">Stop</button>}
        <div className="ml-auto text-sm text-neutral-600">{status}</div>
      </div>

      {summary && (
        <div className="rounded border p-3">
          <div className="font-medium mb-1">Ergebnis-Überblick</div>
          <div className="text-sm text-neutral-700">
            {`Themen: ${summary.topics} • Thesen: ${summary.theses} • Relevanz ~ ${summary.avgRelevance}%`}
          </div>
        </div>
      )}

      {!!topics.length && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Themen</div>
          <ul className="list-disc pl-5 space-y-1">
            {topics.map((t,i)=><li key={i}>{t.topic} <span className="text-xs text-neutral-500">({Math.round(t.score*100)}%)</span></li>)}
          </ul>
        </div>
      )}

      {!!theses.length && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Thesen</div>
          <ul className="list-disc pl-5 space-y-1">
            {theses.map((t,i)=><li key={i}>{t.text} <span className="text-xs text-neutral-500">({Math.round(t.relevance*100)}%)</span></li>)}
          </ul>
        </div>
      )}

      {!!statements.length && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Kernaussagen</div>
          <ul className="list-disc pl-5 space-y-1">
            {statements.map((s,i)=><li key={i}>{s.text}</li>)}
          </ul>
        </div>
      )}

      {!!news.length && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Quellen</div>
          <ul className="list-disc pl-5 space-y-1">
            {news.map((n,i)=><li key={i}><a className="underline" href={n.url} target="_blank" rel="noreferrer">{n.title}</a> <span className="text-xs text-neutral-500">({Math.round((n.relevance||0)*100)}%)</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
EOF

say "Schreibe Pages /contributions/analyze & /contributions/new …"
cat > "$WEB/src/app/contributions/analyze/page.tsx" <<'EOF'
import AnalyzeUI from "@/components/analyze/AnalyzeUI";
export default function Page(){ return <AnalyzeUI />; }
EOF
cat > "$WEB/src/app/contributions/new/page.tsx" <<'EOF'
import AnalyzeUI from "@/components/analyze/AnalyzeUI";
export default function Page(){ return <AnalyzeUI />; }
EOF

say "Alles geschrieben."
echo
echo "Next steps:"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web run dev"
echo
echo "ENV-Hinweise:"
echo "  OPENAI_API_KEY=… (Pflicht), optional OPENAI_MODEL=gpt-5.0-mini, OPENAI_TEMPERATURE=…"
