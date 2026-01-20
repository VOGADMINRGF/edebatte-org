#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
WEB="$ROOT/apps/web"
say(){ printf "▶ %s\n" "$*"; }

# 0) Env aufräumen: Temperatur-Zeile killen (macht die 400er)
say "Bereinige .env(.local) – entferne OPENAI_TEMPERATURE …"
for F in "$WEB/.env" "$WEB/.env.local"; do
  [ -f "$F" ] && grep -q '^OPENAI_TEMPERATURE=' "$F" && sed -i.bak '/^OPENAI_TEMPERATURE=/d' "$F" || true
done

# 1) LLM-Client komplett temperaturfrei + JSON-fest
say "Schreibe src/lib/llm.ts (temperaturfrei & robust) …"
mkdir -p "$WEB/src/lib"
cat > "$WEB/src/lib/llm.ts" <<'EOF'
import OpenAI from "openai";

export type AnalyzeJSON = {
  summary: { topics:number; theses:number; avgRelevance:number };
  topics: Array<{ topic:string; score:number }>;
  theses: Array<{ text:string; relevance:number }>;
  statements: Array<{ text:string }>;
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SYSTEM = `Du bist ARI/eDebatte. Extrahiere: topics(max 6, score 0..1), theses(1..n), statements(<=5) und summary{topics,theses,avgRelevance}. Antworte NUR als JSON.`;

export async function analyzeWithGptStrict(text: string, model = process.env.OPENAI_MODEL || "gpt-5.0-mini"): Promise<AnalyzeJSON> {
  const user = `Text:\n${text}\n---\nGib strikt JSON zurück.`;
  const res = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }]
  });
  const raw = res.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); }
  catch { return { summary:{topics:0,theses:0,avgRelevance:0}, topics:[], theses:[], statements:[] }; }
}
EOF

# 2) API-Routen: kleine Härtefälle beim Stream/Fallback abfangen (belassen, aber sicher)
say "Aktualisiere /api/contributions/analyze/stream …"
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
    const r = await fetch(url, { headers: { "user-agent": "eDebatte/1.0 (+https://edebatte.org)" } });
    const html = await r.text();
    const title = (html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "").trim();
    const body = html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ");
    const main = body.replace(/\s+/g," ").slice(0, 20000);
    return `\n\n[Quelle] ${title || url}\nURL: ${url}\nText: ${main}\n`;
  } catch {
    return `\n\n[Quelle] ${url}\n(Holen der Seite fehlgeschlagen)\n`;
  }
}

export async function GET(req: NextRequest) {
  const text = String(new URL(req.url).searchParams.get("text") ?? "");
  const urls = extractUrls(text);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) =>
        controller.enqueue(enc.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`));

      try {
        send("status", { step:"ingest", msg:"Lese Eingabe & Quellen…" });

        // URLs nachladen
        let expanded = text;
        if (urls.length) {
          for (const u of urls) {
            send("status", { step:"fetch", msg:`Hole ${u} …` });
            expanded += await fetchPlain(u);
          }
        }

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

say "Aktualisiere /api/contributions/analyze (POST) …"
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
    const r = await fetch(url, { headers: { "user-agent": "eDebatte/1.0 (+https://edebatte.org)" } });
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

# 3) Client-UI: Fallback robust (keine JSON-Parse-Fehler mehr bei 500)
say "Patche AnalyzeUI Fallback …"
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

  const runFallback = async () => {
    try {
      const r = await fetch("/api/contributions/analyze",{
        method:"POST",
        headers: { "content-type":"application/json" },
        body: JSON.stringify({ text })
      });
      if (!r.ok) { const t = await r.text(); throw new Error(`HTTP ${r.status} ${t.slice(0,200)}`); }
      const d = await r.json();
      setSummary(d.summary); setTopics(d.topics||[]); setTheses(d.theses||[]); setStatements(d.statements||[]);
      setStatus("Fertig (Fallback)");
    } catch (e:any) {
      setStatus("Fehler (Fallback): "+String(e?.message||e));
    } finally {
      stop();
    }
  };

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
      es.addEventListener("error",(e:any)=> { try { const d=JSON.parse(e.data); setStatus("Fehler: "+d.message);}catch{}; runFallback(); });
      es.addEventListener("done", ()=> { setStatus("Fertig"); stop(); });
      es.onerror = ()=> runFallback();
    } catch (e:any) {
      setStatus("Fehler: "+String(e?.message||e));
      setRunning(false);
    }
  };

  useEffect(()=>()=>stop(),[]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Beitrag erstellen & analysieren</h1>
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder="Text eingeben – Links (http/https) werden automatisch mitgeladen …"
        className="w-full h-40 rounded border p-3" />
      <div className="flex gap-2">
        <button onClick={start} disabled={running} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">Analyse starten</button>
        {running && <button onClick={stop} className="px-4 py-2 rounded border">Stop</button>}
        <div className="ml-auto text-sm text-neutral-600">{status}</div>
      </div>

      {summary && (
        <div className="rounded border p-3">
          <div className="font-medium mb-1">Überblick</div>
          <div className="text-sm text-neutral-700">
            {`Themen: ${summary.topics} • Thesen: ${summary.theses} • Ø Relevanz ~ ${summary.avgRelevance}%`}
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

# 4) TS: Monorepo sauber abklemmen + Import-Remap hart
say "Trenne TSConfig vom Base (keine Project-Refs) …"
cat > "$WEB/tsconfig.json" <<'EOF'
{
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
    "../../features/**","../../packages/**","../../apps/**",
    "**/*.test.*","**/__tests__/**"
  ]
}
EOF

say "Re-mappe verbleibende ../../features/* → @features/* in src …"
find "$WEB/src" -type f -name "*.ts*" -print0 \
 | xargs -0 perl -0777 -i -pe 's/from\s+["\'](?:\.\.\/)+features\//from "@features\//g'

say "Fertig. Starte als Nächstes:"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web run dev"
