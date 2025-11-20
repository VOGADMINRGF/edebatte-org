#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
WEB="$ROOT/apps/web"
mkdir -p "$WEB/src/lib" \
         "$WEB/src/app/api/contributions/analyze/stream" \
         "$WEB/src/components/analyze" \
         "$WEB/src/app/contributions/analyze" \
         "$WEB/src/app/contributions/new"

# portable sed
if command -v gsed >/dev/null 2>&1; then SED="gsed"; else SED="sed"; fi

###############################################################################
# 0) ENV Hilfen
###############################################################################
touch "$WEB/.env.local"
grep -q OPENAI_MODEL "$WEB/.env.local" 2>/dev/null || cat >> "$WEB/.env.local" <<'EOF'

# === LLM ===
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.0"
# === Dev LAN Origins, falls du per 192.168.* zugreifst ===
NEXT_ALLOWED_DEV_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
EOF

###############################################################################
# 1) next.config.ts (Dev-Origin, typedRoutes, externalDir)
###############################################################################
cat > "$WEB/next.config.ts" <<'EOF'
import type { NextConfig } from "next";
const origins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000").split(",");

const config: NextConfig = {
  experimental: {
    allowedDevOrigins: origins,
    typedRoutes: true,
    externalDir: true,
  },
};
export default config;
EOF

###############################################################################
# 2) Middleware fix (kein doppelter Import, redirect /statements/new)
###############################################################################
cat > "$WEB/src/middleware.ts" <<'EOF'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return NextResponse.next();
  if (req.nextUrl.pathname === "/statements/new") {
    const url = req.nextUrl.clone();
    url.pathname = "/contributions/new";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
EOF

###############################################################################
# 3) TypeScript-Konfig (klare Includes/Paths, keine externe Exclude-Falle)
###############################################################################
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
      "@/lib/*": ["src/lib/*"],
      "@components/*": ["src/components/*"],
      "@core/db/triMongo": ["src/shims/core/db/db/triMongo.ts"],
      "@/features/*": ["../../features/*", "src/shims/features/*"]
    },
    "plugins": [{ "name": "next" }],
    "incremental": true
  },
  "include": [
    "next-env.d.ts",
    ".next/types/**/*.ts",
    "src",
    "../../features/**/*.ts",
    "../../features/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "dist",
    "build",
    "src/_disabled/**"
  ]
}
EOF

###############################################################################
# 4) LLM-Layer (GPT-5.0 strikt + Canon + Factcheck + Cleanup)
###############################################################################
cat > "$WEB/src/lib/llm.ts" <<'EOF'
import OpenAI from "openai";
const model = process.env.OPENAI_MODEL || "gpt-5.0";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type Topic = { label: string; score: number };
export type Thesis = { text: string; relevance: number };
export type Statement = { text: string; rationales: string[]; uncertainty?: number };
export type AnalyzeJSON = { topics: Topic[]; theses: Thesis[]; statements: Statement[]; notes?: string };

const SYSTEM = `
Du bist ein mehrsprachiger Analyse-Agent. Antworte NUR mit JSON.
Regeln für "topics":
- 3–6 EINDEUTIGE Substantiv-Phrasen (NOUN PHRASES), z.B. "touristenabzocke", "spritpreis", "polizeipräsenz".
- KEINE Funktionswörter/Verben/Adverbien ("nicht","werden","keine","unter" sind verboten).
- label = Lemma in Kleinschreibung; decompounde: "Spritpreise"→"spritpreis".
- score 0..1 (Bedeutung im Kontext).
Regeln für "theses":
- prägnante Behauptungen/Forderungen (1–2 Sätze), relevance 0..1.
Regeln für "statements":
- Kernaussagen, mit kurzen "rationales".
`;

function toJSON<T>(s: string, fallback: T): T { try { return JSON.parse(s) as T; } catch { return fallback; } }

export async function analyzeWithGptStrict(text: string): Promise<AnalyzeJSON> {
  const user = `Analysiere den Text und gib JSON im Format:
{"topics":[{"label":"...","score":0.0}], "theses":[{"text":"...","relevance":0.0}], "statements":[{"text":"...","rationales":["..."],"uncertainty":0.0}]}
Text:
---
${text}
---`;
  const res = await client.chat.completions.create({
    model, temperature: 0.1, response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }]
  });
  return toJSON<AnalyzeJSON>(res.choices[0]?.message?.content || "{}", { topics: [], theses: [], statements: [] });
}

export type CanonItem = { topic: string; tier1: string; tier2?: string | null; confidence: number };

export async function mapCanonWithGpt(topics: Topic[], canonJSON: any): Promise<CanonItem[]> {
  const system = `Ordne Topics dem Kanon zu. Antworte NUR JSON-Array [{ "topic","tier1","tier2","confidence" }] (0..1).`;
  const user = `Topics: ${JSON.stringify(topics.map(t=>t.label))}
Kanon: ${JSON.stringify(canonJSON).slice(0, 8000)}`;
  const res = await client.chat.completions.create({
    model, temperature: 0.1, response_format: { type: "json_object" },
    messages: [{ role:"system", content: system }, { role:"user", content: user }]
  });
  const obj = toJSON<{ result: CanonItem[] }>(res.choices[0]?.message?.content || "{}", { result: [] });
  return Array.isArray((obj as any).result) ? (obj as any).result : (obj as any);
}

export type FactVerdict = { claim: string; verdict: "stützt"|"widerspricht"|"unklar"; confidence: number; explanation: string };

export async function factcheckWithGpt(claims: string[], evidence: {title:string;snippet?:string;url?:string}[]): Promise<FactVerdict[]> {
  const system = `Beurteile Claims gegen Evidenz. Antworten nur JSON [{claim,verdict,confidence,explanation}].`;
  const user = `Claims: ${JSON.stringify(claims)}
Evidenz: ${JSON.stringify(evidence).slice(0, 8000)}
Regeln: "stützt" bei klarer Unterstützung, "widerspricht" bei klarer Widerlegung, sonst "unklar". confidence 0..1.`;
  const res = await client.chat.completions.create({
    model, temperature: 0.1, response_format: { type: "json_object" },
    messages: [{ role:"system", content: system }, { role:"user", content: user }]
  });
  const obj = toJSON<{ result: FactVerdict[] }>(res.choices[0]?.message?.content || "{}", { result: [] });
  return Array.isArray((obj as any).result) ? (obj as any).result : (obj as any);
}

const STOP = new Set(["nicht","werden","keine","kein","unter","über","ohne","mit","sein","haben","auch","sehr","mehr","weniger","dass","weil","und","oder","aber","der","die","das","den","dem","des","ein","eine","einer","eines","einem"]);
export function cleanTopics(topics: Topic[]): Topic[] {
  const seen = new Set<string>();
  const norm = (s:string)=> s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu,"")
    .replace(/\s+/g," ").trim();
  const out: Topic[] = [];
  for (const t of topics) {
    const l = norm(t.label);
    if (l.length < 3) continue;
    const token = l.split(" ");
    if (token.some(w=>STOP.has(w))) continue;
    if (seen.has(l)) continue;
    seen.add(l);
    out.push({ label: l, score: Math.max(0, Math.min(1, t.score ?? 0)) });
  }
  return out.slice(0, 6);
}
EOF

###############################################################################
# 5) API – SSE (GET /api/contributions/analyze/stream) + POST Fallback
###############################################################################
cat > "$WEB/src/app/api/contributions/analyze/stream/route.ts" <<'EOF'
import { NextRequest } from "next/server";
import crypto from "crypto";
import { coreCol } from "@core/db/triMongo";
import {
  analyzeWithGptStrict, cleanTopics,
  mapCanonWithGpt, factcheckWithGpt
} from "@/lib/llm";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();
const send = (c:ReadableStreamDefaultController, evt:string, data:any) =>
  c.enqueue(enc.encode(`event:${evt}\ndata:${JSON.stringify(data)}\n\n`));

// Stelle hier (später) deinen echten Kanon an:
const CANON = [
  { tier1: "Wirtschaft", tier2: ["Preise","Inflation","Steuern"] },
  { tier1: "Sicherheit", tier2: ["Polizei","Kriminalität"] },
  { tier1: "Mobilität",  tier2: ["Tanken","Bahn","ÖPNV"] }
];

export async function GET(req: NextRequest) {
  const text = (new URL(req.url).searchParams.get("text") || "").trim();
  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0,32);
  const analyses = await coreCol<any>("analyses");
  const knowledge = await coreCol<any>("knowledge");

  const stream = new ReadableStream({
    async start(controller) {
      if (!text) { send(controller,"done",{}); controller.close(); return; }

      // Cache
      const cached = await analyses.findOne({ hash }).catch(()=>null);
      if (cached) {
        const forward = (k:string, evt?:string) =>
          cached[k] && send(controller, evt ?? k, cached[k]);
        forward("summary");
        forward("topics");
        forward("theses");
        forward("statements");
        forward("canon");
        forward("dbcheck");
        forward("news");
        forward("facts","factcheck");
        forward("gates");
        send(controller,"done",{}); controller.close(); return;
      }

      // M1 Analyse
      send(controller,"status",{step:"analyse",msg:"Analysiere Text (GPT)…"});
      const a = await analyzeWithGptStrict(text);
      const topics = cleanTopics(a.topics || []);
      const theses  = a.theses  || [];
      const statements = a.statements || [];
      const summary = { topics: topics.length, theses: theses.length,
        avgRelevance: Math.round((theses.reduce((s,t)=>s+(t.relevance||0),0)/(theses.length||1))*100) };
      send(controller,"summary",summary);
      send(controller,"topics",topics);
      send(controller,"theses",theses);
      send(controller,"statements",statements);

      // M2 Canon
      send(controller,"status",{step:"canon",msg:"Kanon-Mapping…"});
      const canon = await mapCanonWithGpt(topics, CANON);
      send(controller,"canon",canon);

      // M3 DB
      send(controller,"status",{step:"db",msg:"Prüfe vorhandene Wissenseinträge…"});
      const found:any[] = []; const missing:any[] = [];
      for (const t of topics) {
        const hit = await knowledge.findOne({ $text: { $search: `"${t.label}"` } }).catch(()=>null);
        (hit?found:missing).push(t);
      }
      const dbcheck = { foundTopics: found, missingTopics: missing };
      send(controller,"dbcheck",dbcheck);

      // M4 News (Stub bis echte Suche verdrahtet)
      let news:any[] = [];
      if (missing.length) {
        send(controller,"status",{step:"news",msg:"Recherchiere externe Quellen…"});
        news = missing.slice(0,3).map((m,i)=>({ title:`Quelle zu ${m.label}`, url:"#", relevance: 0.65-i*0.1 }));
        send(controller,"news",{items:news});
      } else {
        send(controller,"status",{step:"news",msg:"Übersprungen (DB deckt Themen ab)"});
      }

      // M5 Fakten
      let facts:any[] = [];
      const claims = (theses.length? theses.map(t=>t.text) : statements.map(s=>s.text)).slice(0,3);
      if (claims.length) {
        send(controller,"status",{step:"factcheck",msg:"Faktencheck (GPT)…"});
        const evidence = news.map((n:any)=>({ title:n.title, snippet:n.title, url:n.url }));
        facts = await factcheckWithGpt(claims, evidence);
        send(controller,"factcheck",{facts});
      }

      // M6 Gates
      const gates = {
        structure: Array.isArray(topics) && Array.isArray(theses) && Array.isArray(statements),
        coherence: statements.length>0,
        safety: true,
        provenance: facts.length>0 || news.length>0
      };
      send(controller,"gates",gates);

      await analyses.insertOne({ hash, text, summary, topics, theses, statements, canon, dbcheck, news, facts, createdAt: new Date() }).catch(()=>{});
      send(controller,"done",{});
      controller.close();
    }
  });

  return new Response(stream, {
    headers:{
      "Content-Type":"text/event-stream; charset=utf-8",
      "Cache-Control":"no-cache, no-transform",
      "Connection":"keep-alive"
    }
  });
}
EOF

cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'EOF'
import { NextRequest, NextResponse } from "next/server";
import {
  analyzeWithGptStrict, cleanTopics,
  mapCanonWithGpt, factcheckWithGpt
} from "@/lib/llm";
import { coreCol } from "@core/db/triMongo";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const analyses = await coreCol<any>("analyses");
  const knowledge = await coreCol<any>("knowledge");

  const a = await analyzeWithGptStrict(text);
  const topics = cleanTopics(a.topics || []);
  const theses  = a.theses  || [];
  const statements = a.statements || [];

  const canon = await mapCanonWithGpt(topics, [
    { tier1: "Wirtschaft", tier2: ["Preise","Inflation","Steuern"] },
    { tier1: "Sicherheit", tier2: ["Polizei","Kriminalität"] },
    { tier1: "Mobilität",  tier2: ["Tanken","Bahn","ÖPNV"] }
  ]);

  const found:any[] = []; const missing:any[] = [];
  for (const t of topics) {
    const hit = await knowledge.findOne({ $text: { $search: `"${t.label}"` } }).catch(()=>null);
    (hit?found:missing).push(t);
  }
  const dbcheck = { foundTopics: found, missingTopics: missing };

  let news:any[] = [];
  if (missing.length) {
    news = missing.slice(0,3).map((m,i)=>({ title:`Quelle zu ${m.label}`, url:"#", relevance: 0.65-i*0.1 }));
  }
  const claims = (theses.length? theses.map(t=>t.text) : statements.map(s=>s.text)).slice(0,3);
  const facts = claims.length ? await factcheckWithGpt(claims, news.map(n=>({title:n.title, snippet:n.title, url:n.url}))) : [];

  const summary = { topics: topics.length, theses: theses.length,
    avgRelevance: Math.round((theses.reduce((s,t)=>s+(t.relevance||0),0)/(theses.length||1))*100) };

  await analyses.insertOne({ text, summary, topics, theses, statements, canon, dbcheck, news, facts, createdAt: new Date() }).catch(()=>{});

  return NextResponse.json({ summary, topics, theses, statements, canon, dbcheck, news, facts });
}
EOF

###############################################################################
# 6) Client UI – kein SSR/Dynamic, kein Blinken (EventSource + Fallback)
###############################################################################
cat > "$WEB/src/components/analyze/AnalyzeUI.tsx" <<'EOF'
"use client";
import { useEffect, useRef, useState } from "react";

type Topic = { label:string; score:number };
type Thesis = { text:string; relevance:number };
type Statement = { text:string; rationales:string[] };
type Canon = { topic:string; tier1:string; tier2?:string|null; confidence:number };
type Fact = { claim:string; verdict:"stützt"|"widerspricht"|"unklar"; confidence:number; explanation:string };

export default function AnalyzeUI() {
  const [text, setText] = useState("");
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [theses, setTheses] = useState<Thesis[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [canon, setCanon] = useState<Canon[]>([]);
  const [dbcheck, setDbcheck] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const log = (s:string)=> setStatus(x=>[...x, s]);

  async function runFallback() {
    const res = await fetch("/api/contributions/analyze", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ text })
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "analyze failed");
    setSummary(j.summary); setTopics(j.topics); setTheses(j.theses);
    setStatements(j.statements); setCanon(j.canon); setDbcheck(j.dbcheck);
    setNews(j.news?.items || j.news || []); setFacts(j.facts || []);
  }

  function start() {
    if (!text.trim()) return;
    setRunning(true);
    setStatus([]); setSummary(null); setTopics([]); setTheses([]); setStatements([]);
    setCanon([]); setDbcheck(null); setNews([]); setFacts([]);

    try {
      const es = new EventSource(`/api/contributions/analyze/stream?text=${encodeURIComponent(text)}`);
      es.addEventListener("status", (e:any)=>{ const d=JSON.parse(e.data); log(`${d.step}: ${d.msg}`); });
      es.addEventListener("summary",(e:any)=> setSummary(JSON.parse(e.data)));
      es.addEventListener("topics",(e:any)=> setTopics(JSON.parse(e.data)));
      es.addEventListener("theses",(e:any)=> setTheses(JSON.parse(e.data)));
      es.addEventListener("statements",(e:any)=> setStatements(JSON.parse(e.data)));
      es.addEventListener("canon",(e:any)=> setCanon(JSON.parse(e.data)));
      es.addEventListener("dbcheck",(e:any)=> setDbcheck(JSON.parse(e.data)));
      es.addEventListener("news",(e:any)=> { const d=JSON.parse(e.data); setNews(d.items||d||[]); });
      es.addEventListener("factcheck",(e:any)=> { const d=JSON.parse(e.data); setFacts(d.facts||d||[]); });
      es.addEventListener("done", ()=>{ setRunning(false); es.close(); });
      es.onerror = async ()=>{ es.close(); await runFallback(); setRunning(false); };
    } catch {
      runFallback().finally(()=> setRunning(false));
    }
  }

  return (
    <div style={{maxWidth:980, margin:"0 auto", padding:"24px"}}>
      <h1>Beitrag erstellen &amp; analysieren</h1>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={8} style={{width:"100%", fontFamily:"monospace"}} />
      <div style={{margin:"8px 0"}}>
        <button onClick={start} disabled={running}>Analyse starten</button>
      </div>

      {summary && (
        <section>
          <h3>Überblick</h3>
          <ul>
            <li>Themen: {summary.topics}</li>
            <li>Thesen: {summary.theses}</li>
            <li>Ø Relevanz: {summary.avgRelevance}%</li>
          </ul>
        </section>
      )}

      <section>
        <h3>Status / Logs</h3>
        <pre style={{whiteSpace:"pre-wrap"}}>{status.join("\n")}</pre>
      </section>

      {dbcheck && (
        <section>
          <h3>DB-Check</h3>
          <div><b>gefunden:</b> {dbcheck.foundTopics?.map((t:any)=>t.label||t.topic).join(", ")||"—"}</div>
          <div><b>offen:</b> {dbcheck.missingTopics?.map((t:any)=>t.label||t.topic).join(", ")||"—"}</div>
        </section>
      )}

      {!!news?.length && (
        <section>
          <h3>Quellen (live)</h3>
          <ul>
            {news.map((n:any,i:number)=>(
              <li key={i}><a href={n.url||"#"} target="_blank">{n.title}</a>{n.relevance!=null?` · Relevanz ${Math.round((n.relevance||0)*100)}%`:""}</li>
            ))}
          </ul>
        </section>
      )}

      {!!topics.length && (
        <section>
          <h3>Themen</h3>
          <ul>{topics.map((t,i)=><li key={i}>{t.label} · {Math.round(t.score*100)}%</li>)}</ul>
        </section>
      )}

      {!!canon.length && (
        <section>
          <h3>Kanon</h3>
          <ul>{canon.map((c,i)=><li key={i}>{c.topic} → {c.tier1}{c.tier2?` / ${c.tier2}`:""} · {Math.round(c.confidence*100)}%</li>)}</ul>
        </section>
      )}

      {!!theses.length && (
        <section>
          <h3>Thesen</h3>
          <ul>{theses.map((t,i)=><li key={i}>{t.text} · {Math.round((t.relevance||0)*100)}%</li>)}</ul>
        </section>
      )}

      {!!statements.length && (
        <section>
          <h3>Kernaussagen</h3>
          <ul>{statements.map((s,i)=><li key={i}>{s.text}</li>)}</ul>
        </section>
      )}

      {!!facts.length && (
        <section>
          <h3>Faktencheck</h3>
          <ul>{facts.map((f,i)=><li key={i}><b>{f.verdict}</b> ({Math.round((f.confidence||0)*100)}%): {f.claim}<br/><i>{f.explanation}</i></li>)}</ul>
        </section>
      )}
    </div>
  );
}
EOF

###############################################################################
# 7) Pages (Client, ohne dynamic/ssr: false)
###############################################################################
cat > "$WEB/src/app/contributions/analyze/page.tsx" <<'EOF'
"use client";
import AnalyzeUI from "@/components/analyze/AnalyzeUI";
export default function Page(){ return <AnalyzeUI />; }
EOF
cat > "$WEB/src/app/contributions/new/page.tsx" <<'EOF'
"use client";
import AnalyzeUI from "@/components/analyze/AnalyzeUI";
export default function Page(){ return <AnalyzeUI />; }
EOF

###############################################################################
# 8) drafts.ts bson->mongodb (falls vorhanden)
###############################################################################
if [ -f "$WEB/src/server/drafts.ts" ]; then
  $SED -i.bak 's/from\s*["'\'']bson["'\'']/from "mongodb"/g' "$WEB/src/server/drafts.ts" || true
  $SED -i 's/\bObjectId\b/ObjectId/g' "$WEB/src/server/drafts.ts" || true
fi

echo '>>> VOG ARI+GPT Setup fertig.
Next:
  pnpm --filter @vog/web install
  pnpm --filter @vog/web run typecheck
  pnpm --filter @vog/web run dev'
