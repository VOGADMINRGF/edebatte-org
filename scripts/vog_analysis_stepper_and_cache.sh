#!/usr/bin/env bash
set -euo pipefail
WEB="apps/web"

echo "▶ Ensure dirs"
mkdir -p "$WEB/src/lib" \
         "$WEB/src/types" \
         "$WEB/src/components/analyze" \
         "$WEB/src/app/contributions/analyze" \
         "$WEB/src/app/api/contributions/analyze/stream"

###############################################################################
# A) Cache-Layer (Mongo, TriMongo bereits vorhanden)
###############################################################################
cat > "$WEB/src/lib/cache.ts" <<'EOF'
import crypto from "crypto";
import { coreCol } from "@core/db/triMongo";

export function sha256(s: string){ return crypto.createHash("sha256").update(s).digest("hex"); }

type CacheDoc = {
  _id: string;               // key
  kind: string;              // e.g. "analysis:gpt"
  value: any;
  createdAt: Date;
  expireAt: Date;            // TTL
};

export async function cacheGet(key: string, kind: string){
  const col = await coreCol<CacheDoc>("ai_cache");
  return col.findOne({ _id: key, kind }, { projection: { value: 1 } });
}
export async function cacheSet(key: string, kind: string, value: any, ttlSec = 86400){
  const col = await coreCol<CacheDoc>("ai_cache");
  const now = new Date();
  const doc: CacheDoc = {
    _id: key, kind, value,
    createdAt: now,
    expireAt: new Date(now.getTime() + ttlSec*1000)
  };
  await col.updateOne({ _id: key, kind }, { $set: doc }, { upsert: true });
}

// Hinweis: Bitte einmalig TTL-Index setzen (dev reicht try/catch):
export async function ensureCacheIndexes(){
  try {
    const col = await coreCol<CacheDoc>("ai_cache");
    await col.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  } catch {}
}
EOF
echo "✔ cache.ts"

###############################################################################
# B) LLM-Client (schon vorhanden) – erweitere um Optionen
###############################################################################
cat > "$WEB/src/lib/llm.ts" <<'EOF'
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM = `Du bist eine analytische KI für eDebatte.
Antworte *ausschließlich* mit JSON:
{
 "topics":[{"topic":string,"score":number}],
 "theses":[{"text":string,"relevance":number}],
 "statements":[{"text":string,"rationales":string[]}],
 "summary":{"topics":number,"theses":number,"avgRelevance":number}
}`;

type LlmOpts = {
  model?: string;
  maxTokens?: number;
};

export async function analyzeWithGptStrict(text: string, opts: LlmOpts = {}) {
  const model = opts.model || process.env.VOG_GPT_MODEL || "gpt-5.0-mini";

  const user = `Analysiere (mehrsprachig möglich) und halte das Schema exakt ein.
Text:
---
${text}
---`;

  // Kein temperature setzen → kompatibel mit strikten Modellen
  const req: any = {
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user }
    ]
  };
  if (opts.maxTokens) req.max_tokens = opts.maxTokens;

  const res = await client.chat.completions.create(req);
  const raw = res.choices?.[0]?.message?.content ?? "{}";

  try { return JSON.parse(raw); }
  catch {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (m) return JSON.parse(m[0]);
    throw new Error("LLM lieferte kein valides JSON");
  }
}
EOF
echo "✔ llm.ts"

###############################################################################
# C) Input-Inflator (bestehend) – f:fast schaltet ihn ab; Token-Cap
###############################################################################
cat > "$WEB/src/lib/inflate.ts" <<'EOF'
export async function inflateTextOrUrl(input: string, fast=false, cap=8000): Promise<string> {
  const base = input.slice(0, cap);
  if (fast) return base;

  const urls = [...new Set(base.match(/\bhttps?:\/\/\S+/gi) ?? [])].slice(0, 3);
  if (!urls.length) return base;

  const fetchText = async (u: string) => {
    try {
      const r = await fetch(u, { headers: { "Accept": "text/html, text/plain" } });
      const html = await r.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return `\n\n[Quelle: ${u}]\n${text.slice(0, 12000)}`;
    } catch {
      return `\n\n[Quelle: ${u}] (Fehler beim Laden)`;
    }
  };

  const parts = await Promise.all(urls.map(fetchText));
  return `${base}\n${parts.join("\n")}`.slice(0, cap + 12000*urls.length);
}
EOF
echo "✔ inflate.ts"

###############################################################################
# D) Stream-Route: Fast-Mode, Cache, Progress, Review/Gate, optional Auto-Fact
###############################################################################
cat > "$WEB/src/app/api/contributions/analyze/stream/route.ts" <<'EOF'
import { NextRequest } from "next/server";
import { analyzeWithGptStrict } from "@/lib/llm";
import { inflateTextOrUrl } from "@/lib/inflate";
import { cacheGet, cacheSet, sha256, ensureCacheIndexes } from "@/lib/cache";

export const dynamic = "force-dynamic";
const enc = new TextEncoder();

function pct(p:number){ return Math.max(1, Math.min(99, Math.round(p))); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("text") ?? "").trim();
  const fast = searchParams.get("fast") === "1";
  const autoFact = searchParams.get("autoFact") === "1";
  const model = searchParams.get("model") || undefined;

  if (!raw) return new Response("Missing ?text", { status: 400 });
  await ensureCacheIndexes();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) =>
        controller.enqueue(enc.encode(`event:${event}\ndata:${JSON.stringify(data)}\n\n`));
      const heartbeat = setInterval(()=>controller.enqueue(enc.encode(":\n\n")), 15000);

      try {
        send("status", { step: "start", msg: fast ? "Fast-Analyse (ohne Link-Expand)…" : "Analysiere Text (mit Link-Expand)…", progress: pct(5) });

        // 0) Cache-Key
        const norm = raw.slice(0, 8000);
        const key = sha256(`${model||""}|${fast?"fast":"full"}|${norm}`);
        const hit = await cacheGet(key, "analysis:gpt");
        if (hit?.value) {
          send("status", { step: "cache", msg: "Cache-Treffer → sofort laden", progress: pct(25) });
          const r = hit.value;
          send("summary", r.summary ?? {});
          send("topics", r.topics ?? []);
          send("theses", r.theses ?? []);
          send("statements", r.statements ?? []);
          const review = makeReview(r);
          send("review", review);
          send("status", { step: "ready", msg: "Bereit für Faktencheck", progress: pct(70) });
          if (autoFact && review.plausible) {
            send("status", { step: "fact", msg: "Faktencheck (stub)…", progress: pct(85) });
            send("factcheck", { results: stubFactcheck(r.theses || r.statements || []) });
          }
          send("done", {});
          return;
        }

        // 1) Input inflaten (optional)
        const text = await inflateTextOrUrl(raw, fast, 8000);
        send("status", { step: "inflate", msg: fast ? "Übersprungen" : "Links eingebunden", progress: pct(20) });

        // 2) LLM
        send("status", { step: "llm", msg: `LLM (${model||"auto"}) läuft…`, progress: pct(35) });
        const r = await analyzeWithGptStrict(text, { model, maxTokens: 800 });
        send("summary", r?.summary ?? {});
        send("topics", r?.topics ?? []);
        send("theses", r?.theses ?? []);
        send("statements", r?.statements ?? []);
        send("status", { step: "parse", msg: "Ergebnis geparst", progress: pct(55) });

        // 3) Review/Gate
        const review = makeReview(r);
        send("review", review);
        send("status", { step: "gate", msg: review.plausible ? "OK – Faktencheck möglich" : "Unplausibel – bitte Text/Schlagwörter prüfen", progress: pct(70) });

        // 4) optional: Auto-Fact
        if (autoFact && review.plausible) {
          send("status", { step: "fact", msg: "Faktencheck (stub)…", progress: pct(85) });
          send("factcheck", { results: stubFactcheck(r.theses || r.statements || []) });
        }

        // 5) Cache
        await cacheSet(key, "analysis:gpt", r, 86400);
        send("status", { step: "cache", msg: "Ergebnis gecacht (24h)", progress: pct(95) });

        send("done", {});
      } catch (e: any) {
        send("error", { message: e?.message || String(e) });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}

// ---- helpers ---------------------------------------------------------------
function makeReview(r: any){
  const topics = (r?.topics ?? []).length;
  const theses = (r?.theses ?? []).length;
  const statements = (r?.statements ?? []).length;
  const plausible = topics >= 2 && (theses >= 1 || statements >= 1);
  return {
    topics, theses, statements,
    plausible,
    note: plausible ? "Themen/Thesen erkannt – weiter mit Faktencheck"
                    : "Bitte Text präzisieren (fehlende Thesen oder zu wenig Themen)."
  };
}

function stubFactcheck(items: any[]){
  // Minimal: markiere alle Claims als „prüfbedarf“
  return (items||[]).slice(0,5).map((c:any)=>({
    claim: c?.text || c?.topic || "—",
    verdict: "prüfbedarf",
    confidence: 50
  }));
}
EOF
echo "✔ analyze/stream route"

###############################################################################
# E) UI – Progress, Gate, NaN-Fix, CTA
###############################################################################
cat > "$WEB/src/components/analyze/AnalyzeUI.tsx" <<'EOF'
"use client";
import React from "react";

export default function AnalyzeUI(){
  const [text, setText] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState(0);
  const [summary, setSummary] = React.useState<any>({});
  const [topics, setTopics] = React.useState<any[]>([]);
  const [theses, setTheses] = React.useState<any[]>([]);
  const [statements, setStatements] = React.useState<any[]>([]);
  const [review, setReview] = React.useState<any>(null);
  const [fact, setFact] = React.useState<any>(null);

  const append = (s:string)=>setLog(x=>[...x, s]);

  function start(autoFact=false){
    if (!text.trim()) return;
    setRunning(true);
    setLog([]);
    setProgress(1);
    setSummary({});
    setTopics([]); setTheses([]); setStatements([]); setReview(null); setFact(null);

    const url = `/api/contributions/analyze/stream?fast=1${autoFact?"&autoFact=1":""}&text=`+encodeURIComponent(text);
    const es = new EventSource(url);

    es.addEventListener("status", (e:any)=>{
      const data = JSON.parse(e.data);
      if (typeof data.progress === "number") setProgress(data.progress);
      append(`${data.step}: ${data.msg}`);
    });
    es.addEventListener("summary", (e:any)=> setSummary(JSON.parse(e.data)));
    es.addEventListener("topics", (e:any)=> setTopics(JSON.parse(e.data)));
    es.addEventListener("theses", (e:any)=> setTheses(JSON.parse(e.data)));
    es.addEventListener("statements", (e:any)=> setStatements(JSON.parse(e.data)));
    es.addEventListener("review", (e:any)=> setReview(JSON.parse(e.data)));
    es.addEventListener("factcheck", (e:any)=> setFact(JSON.parse(e.data)));
    es.addEventListener("error", (e:any)=> append("Fehler: "+(JSON.parse(e.data)?.message||"unbekannt")));
    es.addEventListener("done", ()=>{
      setProgress(100); setRunning(false); es.close();
    });
    es.onerror = ()=>{ setRunning(false); es.close(); };
  }

  const scorePct = (v:any)=> {
    const n = typeof v === "number" ? v : 0;
    const clamped = isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
    return Math.round(clamped*100);
  };

  return (
    <div style={{padding:"1rem"}}>
      <h1 style={{fontSize:"2.2rem", fontWeight:800}}>Beitrag erstellen & analysieren</h1>

      <textarea style={{width:"100%", height:180, marginTop:12}}
        placeholder="Text oder Links einfügen…"
        value={text} onChange={e=>setText(e.target.value)} />

      <div style={{marginTop:8, display:"flex", gap:8}}>
        <button disabled={running} onClick={()=>start(false)}>Analyse starten</button>
        <button disabled={running || !review?.plausible} onClick={()=>start(true)}>Faktencheck starten</button>
      </div>

      <div style={{marginTop:10, height:8, background:"#eee", borderRadius:4, overflow:"hidden"}}>
        <div style={{width:`${progress}%`, height:"100%", background:"#3b82f6", transition:"width .2s"}}/>
      </div>

      <details open style={{marginTop:12}}>
        <summary><b>Überblick</b> {running? "…": "Fertig"}</summary>
        <div style={{border:"1px solid #ccc", padding:"8px"}}>
          <div>
            <b>Themen:</b> {topics.map(t=>t.topic).join(", ")} • <b>Thesen:</b> {theses.length} • <b>Ø Relevanz ~</b> {summary?.avgRelevance ?? 0}%
          </div>
        </div>
      </details>

      <div style={{display:"grid", gridTemplateColumns:"1fr", gap:12, marginTop:12}}>
        <section style={{border:"1px solid #ccc"}}>
          <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Themen</b></div>
          <div style={{padding:"8px"}}>
            <ul>
              {topics.map((t,i)=>(
                <li key={i}>• {t.topic} ({scorePct(t.score ?? t.relevance ?? 0.5)}%)</li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{border:"1px solid #ccc"}}>
          <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Thesen</b></div>
          <div style={{padding:"8px"}}>
            <ul>
              {(theses.length?theses:new Array(0)).map((th:any,i:number)=>(
                <li key={i}>• {th.text} ({scorePct(th.relevance ?? 0.5)}%)</li>
              ))}
              {!theses.length && <li style={{opacity:.6}}>– keine expliziten Thesen erkannt –</li>}
            </ul>
          </div>
        </section>

        <section style={{border:"1px solid #ccc"}}>
          <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Kernaussagen</b></div>
          <div style={{padding:"8px"}}>
            <ul>
              {(statements||[]).map((s:any,i:number)=>(
                <li key={i}>• {s.text || s}</li>
              ))}
              {!statements?.length && <li style={{opacity:.6}}>– (noch) keine –</li>}
            </ul>
          </div>
        </section>

        <section style={{border:"1px solid #ccc"}}>
          <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Review/Gate</b></div>
          <div style={{padding:"8px"}}>
            {review ? (
              <>
                <div>Erkannte Themen: <b>{review.topics}</b> • Thesen: <b>{review.theses}</b> • Kernaussagen: <b>{review.statements}</b></div>
                <div style={{marginTop:6}}>
                  Status: <b style={{color: review.plausible ? "#059669" : "#b91c1c"}}>
                    {review.plausible ? "Plausibel – Faktencheck möglich" : "Unplausibel – Text nachschärfen"}
                  </b>
                </div>
                <div style={{marginTop:8, display:"flex", gap:8}}>
                  <button disabled={!review.plausible || running} onClick={()=>start(true)}>Faktencheck starten</button>
                  <button disabled={running} onClick={()=>alert("An Redaktion gemeldet (demo)")}>An Redaktion melden</button>
                </div>
              </>
            ) : <div style={{opacity:.6}}>– ausstehend –</div>}
          </div>
        </section>

        <section style={{border:"1px solid #ccc"}}>
          <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Status / Logs</b></div>
          <div style={{padding:"8px", fontFamily:"monospace", whiteSpace:"pre-wrap"}}>
            {log.map((l,i)=><div key={i}>{l}</div>)}
          </div>
        </section>

        {fact && (
          <section style={{border:"1px solid #ccc"}}>
            <div style={{padding:"6px 8px", borderBottom:"1px solid #ddd"}}><b>Faktencheck</b></div>
            <div style={{padding:"8px"}}>
              <ul>
                {(fact.results||[]).map((f:any,i:number)=>(
                  <li key={i}>• {f.claim} → <i>{f.verdict}</i> ({f.confidence}%)</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
EOF
echo "✔ AnalyzeUI.tsx"

###############################################################################
# F) Page (falls noch nicht vorhanden oder minimal)
###############################################################################
cat > "$WEB/src/app/contributions/analyze/page.tsx" <<'EOF'
import dynamic from "next/dynamic";
const AnalyzeUI = dynamic(()=>import("@/components/analyze/AnalyzeUI"), { ssr:false });

export const dynamic = "force-dynamic";

export default function Page(){
  return <AnalyzeUI />;
}
EOF
echo "✔ analyze/page.tsx"

echo "✅ Done. Jetzt ausführen:"
echo "   pnpm --filter @vog/web run typecheck"
echo "   pnpm --filter @vog/web run dev"
