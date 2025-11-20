#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"
SRC="$WEB/src"

say(){ printf "\n\033[1;36m%s\033[0m\n" "$*"; }

say "🔎 Prüfe V3-Analyzer-Dateien"
V3_MAIN="$SRC/lib/contribution/analyzeContribution.ts"
V3_LLM="$SRC/lib/contribution/llm/analyzeWithGPT.ts"
USE_PATH=""
if [[ -f "$V3_MAIN" ]]; then
  USE_PATH='@/lib/contribution/analyzeContribution'
elif [[ -f "$V3_LLM" ]]; then
  USE_PATH='@/lib/contribution/llm/analyzeWithGPT'
else
  echo "❌ Kein V3-Analyzer gefunden (erwarte $V3_MAIN oder $V3_LLM). Abbruch."
  exit 1
fi
echo "➡️  Verwende Analyzer: $USE_PATH"

say "🧩 V3-Adapter (extractContributions) schreiben (Azure/Proxy-kompatibel)"
mkdir -p "$SRC/features/analysis"
cat > "$SRC/features/analysis/extract.ts" <<'TS'
import { z } from "zod";
// Hinweis: Wir importieren den V3-Analyzer dynamisch; er muss eine Funktion liefern,
// die aus Freitext strukturierte Aussagen erzeugt. Wir normalisieren das Ergebnis.

type AnyFn = (text: string) => Promise<any>;

// Versuche beide V3-Pfade – der Build ersetzt __V3_IMPORT__ unten auf den existierenden.
let v3AnalyzePromise: Promise<AnyFn> | null = null;
async function loadV3(): Promise<AnyFn> {
  if (!v3AnalyzePromise) {
    v3AnalyzePromise = (async () => {
      // __V3_IMPORT__ wird vom Skript unten gesetzt.
      const mod = await import("__V3_IMPORT__");
      const fn: any = mod.analyzeContribution || mod.extractContributions || mod.analyzeWithGPT || mod.default;
      if (typeof fn !== "function") throw new Error("V3 analyzer export not a function");
      return fn as AnyFn;
    })();
  }
  return v3AnalyzePromise;
}

// Ziel-Form
const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).optional().default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
});
const ResultSchema = z.object({
  language: z.string().min(2).max(5).default("de"),
  mainTopic: z.string().min(2).max(80).nullable().optional(),
  subTopics: z.array(z.string().min(2).max(80)).max(10).optional().default([]),
  regionHint: z.string().nullable().optional(),
  claims: z.array(ClaimSchema).min(1).max(20),
});
export type ExtractResult = z.infer<typeof ResultSchema>;

function normalizeLanguage(x:any){ const v=String(x||"de").slice(0,2).toLowerCase(); return ["de","en","fr","it","es","pl","uk","ru","tr","hi","zh","ar"].includes(v)?v:"de"; }

function coalesceClaims(raw:any): any[] {
  // Versuche gängige Schlüssel aus V3
  const candidates = [raw?.claims, raw?.items, raw?.statements, raw?.results];
  for (const c of candidates) if (Array.isArray(c) && c.length) return c;
  return [];
}

export async function extractContributions(text: string): Promise<ExtractResult>{
  const v3 = await loadV3();
  const out = await v3(String(text||"").slice(0,8000));

  const claimsRaw = coalesceClaims(out).map((c:any)=>({
    text: String(c?.text || c?.content || "").trim(),
    categoryMain: c?.categoryMain ?? c?.topic ?? null,
    categorySubs: Array.isArray(c?.categorySubs) ? c.categorySubs : Array.isArray(c?.subTopics) ? c.subTopics : [],
    region: c?.region ?? c?.regionHint ?? null,
    authority: c?.authority ?? c?.office ?? null,
  })).filter((c:any)=>c.text);

  const normalized = {
    language: normalizeLanguage(out?.language),
    mainTopic: out?.mainTopic ?? out?.topic ?? null,
    subTopics: Array.isArray(out?.subTopics) ? out.subTopics : [],
    regionHint: out?.regionHint ?? null,
    claims: claimsRaw.length ? claimsRaw : [{ text: String(text||"").trim() }],
  };

  const parsed = ResultSchema.safeParse(normalized);
  if (!parsed.success) throw new Error("Invalid extraction shape");
  return parsed.data;
}
TS

# __V3_IMPORT__ ersetzen
node - <<NODE
const fs=require('fs');
const p='$SRC/features/analysis/extract.ts';
let s=fs.readFileSync(p,'utf8');
s=s.replace('__V3_IMPORT__', '$USE_PATH');
fs.writeFileSync(p,s);
console.log('✔ Adapter import auf $USE_PATH gesetzt');
NODE

say "🛠️  API: /api/contributions/analyze (V3) bereitstellen/aktualisieren"
mkdir -p "$SRC/app/api/contributions/analyze"
cat > "$SRC/app/api/contributions/analyze/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { extractContributions } from "@/features/analysis/extract";
export const runtime = "nodejs";
export async function POST(req: NextRequest){
  let body:any; try{ body = await req.json(); } catch{ return NextResponse.json({ok:false,error:"invalid_json"},{status:400}); }
  const text = String(body?.text||"").trim();
  if(!text) return NextResponse.json({ok:false,error:"text_required"},{status:400});
  try{
    const data = await extractContributions(text);
    return NextResponse.json({ ok:true, data });
  }catch(err:any){
    return NextResponse.json({ ok:false, error: String(err?.message||err) }, { status: 500 });
  }
}
TS

say "🛠️  API: /api/contributions/ingest (Batch-Save) bereitstellen/aktualisieren"
mkdir -p "$SRC/app/api/contributions/ingest"
cat > "$SRC/app/api/contributions/ingest/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { coreCol } from "@core/db/triMongo";
import { readSession } from "src/utils/session";

function safeLang(v:any){ const ok=new Set(["de","en","fr","it","es","pl","uk","ru","tr","hi","zh","ar"]); const x=typeof v==="string"?v.slice(0,2).toLowerCase():"de"; return ok.has(x)?x:"de"; }
async function isCsrfValid(){ const c=(await cookies()).get("csrf-token")?.value; const h=(await headers()).get("x-csrf-token"); return !!c && !!h && c===h; }
function bad(msg:string,status=400){ return NextResponse.json({ok:false,error:msg},{status}); }

export async function POST(req: NextRequest){
  if(!(await isCsrfValid())) return bad("forbidden_csrf",403);
  let body:any; try{ body=await req.json(); }catch{ return bad("invalid_json"); }
  const items = Array.isArray(body?.items)?body.items:[];
  if(!items.length) return bad("items_required");

  const sess = readSession();
  const now = new Date();
  const docs = items.map((it:any)=>({
    title: String(it.title||"").slice(0,200) || (String(it.text||"").split(/\n+/).find(Boolean)||"Beitrag").slice(0,120),
    text: String(it.text||"").slice(0,4000),
    category: String(it.categoryMain||"Allgemein").slice(0,80),
    subcategories: Array.isArray(it.categorySubs)?it.categorySubs.slice(0,6):[],
    language: safeLang(it.language||"de"),
    region: it.region||null,
    authority: it.authority||null,
    analysis: it.analysis||null,
    createdAt: now, updatedAt: now,
    userId: (sess as any)?.uid ?? null,
    factcheckStatus: "queued",
    stats: { views:0, votesAgree:0, votesNeutral:0, votesDisagree:0, votesTotal:0 }
  })).filter(d => d.text);

  if(!docs.length) return bad("no_valid_texts");
  const col = await coreCol("statements");
  const res = await col.insertMany(docs);
  const ids = Object.values(res.insertedIds).map(String);
  return NextResponse.json({ ok:true, ids }, { status:201 });
}
TS

say "🖥️  Review-UI /contributions/analyze erzeugen (leichtgewichtig)"
mkdir -p "$SRC/app/contributions/analyze"
cat > "$SRC/app/contributions/analyze/page.tsx" <<'TSX'
"use client";
import { useState } from "react";
type Claim = { text: string; categoryMain?: string|null; categorySubs?: string[]; region?: string|null; authority?: string|null; };
type ExtractResult = { language: string; mainTopic?: string|null; subTopics?: string[]; regionHint?: string|null; claims: Claim[]; };
export default function AnalyzeContributionsPage(){
  const [text,setText]=useState(""); const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string>(""); const [res,setRes]=useState<ExtractResult|null>(null);
  const [ids,setIds]=useState<string[]|null>(null);
  async function runAnalyze(){
    setBusy(true); setErr(""); setRes(null); setIds(null);
    try{
      const r = await fetch("/api/contributions/analyze",{method:"POST",headers:{"Content-Type":"application/json"}, body:JSON.stringify({text})});
      const j = await r.json(); if(!r.ok||!j?.ok) throw new Error(j?.error||r.statusText);
      setRes(j.data);
    }catch(e:any){ setErr(e?.message||String(e)); } finally{ setBusy(false); }
  }
  async function ingest(){
    if(!res) return; setBusy(true); setErr(""); setIds(null);
    try{
      const csrf = await fetch("/api/csrf",{cache:"no-store"}).then(r=>r.json()).then(j=>j.token||"");
      const items = res.claims.map(c => ({
        text: c.text,
        categoryMain: c.categoryMain || res.mainTopic || "Allgemein",
        categorySubs: c.categorySubs || res.subTopics || [],
        region: c.region || res.regionHint || null,
        authority: c.authority || null,
        language: res.language,
        analysis: { source: "v3_adapter", res }
      }));
      const r = await fetch("/api/contributions/ingest",{method:"POST", headers:{"Content-Type":"application/json","x-csrf-token":csrf}, body:JSON.stringify({items})});
      const j = await r.json(); if(!r.ok||!j?.ok) throw new Error(j?.error||r.statusText);
      setIds(j.ids||[]);
    }catch(e:any){ setErr(e?.message||String(e)); } finally{ setBusy(false); }
  }
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Aussagen-Analyse (V3)</h1>
      <textarea className="w-full h-48 border rounded px-3 py-2" placeholder="Freitext hier einfügen…" value={text} onChange={e=>setText(e.target.value)} />
      <div className="flex gap-2">
        <button className="border rounded px-4 py-2" disabled={busy||!text.trim()} onClick={runAnalyze}>{busy?"Analysiere…":"Analysieren"}</button>
        {res && <button className="border rounded px-4 py-2" disabled={busy} onClick={ingest}>Vorschläge übernehmen</button>}
      </div>
      {err && <div className="text-red-700 text-sm">❌ {err}</div>}
      {res && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">Sprache: <b>{res.language}</b>, Hauptthema: <b>{res.mainTopic||"—"}</b>, Subthemen: {(res.subTopics||[]).join(", ")||"—"}, Region-Hinweis: <b>{res.regionHint||"—"}</b></div>
          <div className="grid gap-3">
            {res.claims.map((c, i)=>(
              <div key={i} className="border rounded p-3">
                <div className="font-semibold mb-1">Aussage {i+1}</div>
                <div className="whitespace-pre-wrap">{c.text}</div>
                <div className="text-sm mt-2">Vorschläge: Thema <b>{c.categoryMain||"—"}</b>; Sub: {(c.categorySubs||[]).join(", ")||"—"}; Region <b>{c.region||"—"}</b>; Amt <b>{c.authority||"—"}</b></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {ids && (<div className="text-green-700">✅ {ids.length} Beiträge gespeichert. IDs: {ids.join(", ")}</div>)}
    </div>
  );
}
TSX

say "🧹 Analyzer-Imports konsolidieren (repo-weit) & temperature/top_p entfernen"
node - <<'NODE'
const fs=require('fs'), path=require('path');
const root='apps/web/src';
const unifyImports = [
  { from:/["@']core\/gpt\/analyzeContribution["@']/g, to:'"@/features/analysis/extract"' },
  { from:/["@']features\/analyze\/analyzeContribution["@']/g, to:'"@/features/analysis/extract"' },
  { from:/["@']src\/lib\/contribution\/analyzeContribution["@']/g, to:'"@/features/analysis/extract"' },
  { from:/["@']@\/lib\/contribution\/analyzeContribution["@']/g, to:'"@/features/analysis/extract"' },
];
let files=0, changed=0, cleaned=0;
function walk(d){
  for(const f of fs.readdirSync(d)){
    const p=path.join(d,f); const st=fs.statSync(p);
    if(st.isDirectory()) walk(p);
    else if(/\.(ts|tsx|js|mjs)$/.test(f)){
      files++;
      let t=fs.readFileSync(p,'utf8'), t0=t;
      // imports umschreiben
      for(const r of unifyImports){ t=t.replace(r.from, r.to); }
      // temperature/top_p hart entfernen
      t=t.replace(/,\s*temperature\s*:\s*[^,}\n]+/g,'')
         .replace(/\btemperature\s*:\s*[^,}\n]+,?/g,'')
         .replace(/,\s*top_p\s*:\s*[^,}\n]+/g,'')
         .replace(/\btop_p\s*:\s*[^,}\n]+,?/g,'');
      if(t!==t0){ fs.writeFileSync(p,t); changed++; cleaned++; }
    }
  }
}
walk(root);
console.log('✅ Dateien gescannt:', files, ' geändert:', changed);
NODE

say "🧷 Statements-POST: bleibt unverändert. Neuer Flow: /contributions/analyze → ingest."
say "✅ Fertig."
