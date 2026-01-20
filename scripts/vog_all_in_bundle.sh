#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
TS="$(date +%s)"

say() { printf "› %s\n" "$*"; }
mkd() { mkdir -p "$1"; }
backup_if_exists () { local f="$1"; if [ -f "$f" ]; then cp -p "$f" "$f.bak.$TS"; say "  · backup: $f → $f.bak.$TS"; fi; }

APP_WEB="apps/web"
APP_SRC="$APP_WEB/src"
UI_DIR="$APP_SRC/ui"
API_DIR="$APP_SRC/app/api"
PAGES_DIR="$APP_SRC/app"

FEATURES="features"
PROMPTS_DIR="$FEATURES/ai/prompts"
ROLES_DIR="$FEATURES/ai/roles"

mkd "$FEATURES/ai/providers"
mkd "$PROMPTS_DIR"
mkd "$ROLES_DIR"
mkd "$APP_SRC/shims/features"
mkd "$UI_DIR"
mkd "$API_DIR/claims/pipeline"
mkd "$APP_SRC/styles"

# ── Shims (belässt eure Top-Level `features/*`) ────────────────────────────────
SHIM_FILE="$APP_SRC/shims/features/index.ts"
backup_if_exists "$SHIM_FILE"
cat > "$SHIM_FILE" <<'TS'
export * as ai from "../../../../features/ai";
export * from "../../../../features/ai/providers/openai";
export * from "../../../../features/ai/orchestrator_claims";
export * from "../../../../features/analyze/analyzeContribution";
TS
say "✓ shim: $SHIM_FILE"

ANALYSIS_SHIM="$APP_SRC/shims/features/analysis/extract.ts"
mkd "$(dirname "$ANALYSIS_SHIM")"
backup_if_exists "$ANALYSIS_SHIM"
cat > "$ANALYSIS_SHIM" <<'TS'
// shim für ältere Importe
export { analyzeContribution } from "../../../../../features/analyze/analyzeContribution";
TS
say "✓ shim: $ANALYSIS_SHIM"

# ── Shared Types ───────────────────────────────────────────────────────────────
TYPES_FILE="$ROLES_DIR/shared_types.ts"
backup_if_exists "$TYPES_FILE"
cat > "$TYPES_FILE" <<'TS'
export type JurisdictionLevel = "EU" | "Bund" | "Land" | "Kommune";
export type SourceType = "amtlich" | "presse" | "forschung";

export type AtomicClaim = {
  id: string; text: string;
  sachverhalt?: string|null; zeitraum?: string|null; ort?: string|null;
  ebene?: JurisdictionLevel|null; betroffene?: string[]; messgroesse?: string|null; unsicherheiten?: string[];
};

export type EvidenceSlot = { source_type: SourceType; query: string; erwartete_kennzahl?: string|null; jahr?: string|null; };
export type Perspectives = { pro: string[]; contra: string[]; alternative: string[]; };
export type EditorialScore = {
  praezision:number; pruefbarkeit:number; relevanz:number; lesbarkeit:number; ausgewogenheit:number; gruende:string[]; total:number;
};

export type EnrichedClaim = AtomicClaim & {
  zustandigkeit?: { ebene: JurisdictionLevel, organ: string, begruendung: string } | null;
  evidence: EvidenceSlot[]; perspectives: Perspectives; editorial: EditorialScore;
};

export type OrchestratorResult = {
  claims: EnrichedClaim[];
  _meta: { ok:boolean; tookMs:number; model?:string|null; prompt_version?:string; orchestrator_commit?:string|null; fallbackUsed?:boolean;
           steps?: { name:string; ms:number; ok:boolean; note?:string }[]; }
};
TS
say "✓ types: $TYPES_FILE"

# ── Prompts ────────────────────────────────────────────────────────────────────
ATOMICIZER_PROMPT="$PROMPTS_DIR/atomicizer.ts"
backup_if_exists "$ATOMICIZER_PROMPT"
cat > "$ATOMICIZER_PROMPT" <<'TS'
export const ATOMICIZER_V1 = String.raw`You are eDebatte Atomicizer.
Task: Extract atomic political claims (German, B1/B2), one sentence each. Fill slots.

STRICT JSON:
{ "claims":[
 { "text": string, "sachverhalt": string|null, "zeitraum": string|null, "ort": string|null,
   "ebene": "EU"|"Bund"|"Land"|"Kommune"|null, "betroffene": string[], "messgroesse": string|null,
   "unsicherheiten": string[] }
]}

Rules: split multiple ideas (max 8), keep content, normalize tone, no censorship, unknown→null.
== TEXT ==
<<<TEXT>>>`;
TS
say "✓ prompt: atomicizer"

ASSIGNER_PROMPT="$PROMPTS_DIR/assigner.ts"
backup_if_exists "$ASSIGNER_PROMPT"
cat > "$ASSIGNER_PROMPT" <<'TS'
export const ASSIGNER_V1 = String.raw`You are eDebatte Assigner.
Map each claim to DE/EU responsibility (EU/Bund/Land/Kommune) + concrete organ with short reasoning.

STRICT JSON:
{ "map":[{ "claim": string, "zustandigkeit": { "ebene":"EU"|"Bund"|"Land"|"Kommune", "organ": string, "begruendung": string } }]}

If unsure, pick lowest plausible level and explain.
== CLAIMS ==
<<<CLAIMS>>>`;
TS
say "✓ prompt: assigner"

EVIDENCE_PROMPT="$PROMPTS_DIR/evidence.ts"
backup_if_exists "$EVIDENCE_PROMPT"
cat > "$EVIDENCE_PROMPT" <<'TS'
export const EVIDENCE_V1 = String.raw`You are eDebatte Evidence Planner.
Return short German queries per claim for amtlich/presse/forschung.

STRICT JSON:
{ "evidence":[{ "claim": string, "hints":[{"source_type":"amtlich"|"presse"|"forschung","query":string,"erwartete_kennzahl":string|null,"jahr":string|null}] }]}

== CLAIMS ==
<<<CLAIMS>>>`;
TS
say "✓ prompt: evidence"

PERSPECTIVES_PROMPT="$PROMPTS_DIR/perspectives.ts"
backup_if_exists "$PERSPECTIVES_PROMPT"
cat > "$PERSPECTIVES_PROMPT" <<'TS'
export const PERSPECTIVES_V1 = String.raw`You are eDebatte Perspective Editor.
For each claim: pro/contra/alternative (max 3 bullets each), balanced German.

STRICT JSON:
{ "views":[{ "claim":string, "pro":string[], "contra":string[], "alternative":string[] }]}
== CLAIMS ==
<<<CLAIMS>>>`;
TS
say "✓ prompt: perspectives"

RATER_PROMPT="$PROMPTS_DIR/editor_rater.ts"
backup_if_exists "$RATER_PROMPT"
cat > "$RATER_PROMPT" <<'TS'
export const EDITOR_RATER_V1 = String.raw`You are eDebatte Editorial Rater.
Score claims on 5 dims (0..1) + short reasons.

STRICT JSON:
{ "ratings":[{ "claim":string,"praezision":number,"pruefbarkeit":number,"relevanz":number,"lesbarkeit":number,"ausgewogenheit":number,"gruende":string[] }]}
== CLAIMS ==
<<<CLAIMS>>>`;
TS
say "✓ prompt: rater"

# ── Rollen (nutzen eure runOpenAI()) ───────────────────────────────────────────
ROLE_ATOMICIZER="$ROLES_DIR/atomicizer.ts"
backup_if_exists "$ROLE_ATOMICIZER"
cat > "$ROLE_ATOMICIZER" <<'TS'
import { runOpenAI } from "../../features/ai/providers/openai";
import { ATOMICIZER_V1 } from "../prompts/atomicizer";
import type { AtomicClaim } from "./shared_types";

function normalize(s:string){ return s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim(); }
function hashId(s:string){ const t=normalize(s).slice(0,512); let h=0; for(let i=0;i<t.length;i++) h=(h*31+t.charCodeAt(i))>>>0; return "clm-"+h.toString(16); }

export async function atomicize(text:string, maxClaims=8, timeoutMs=15000){
  const prompt = ATOMICIZER_V1.replace("<<<TEXT>>>", text.slice(0,8000));
  const r = await runOpenAI(prompt, { json:true, timeoutMs });
  if (!r.ok) return { claims:[], ms:r.ms, fallbackUsed:true };

  let json:any=null; try{ json=JSON.parse(r.text||"{}"); }catch{ return { claims:[], ms:r.ms, fallbackUsed:true }; }
  const arr = Array.isArray(json?.claims)? json.claims : [];
  const claims: AtomicClaim[] = arr.slice(0,maxClaims).map((c:any)=>({
    id: hashId(String(c?.text||"").trim()),
    text: String(c?.text||"").trim(),
    sachverhalt: c?.sachverhalt??null, zeitraum:c?.zeitraum??null, ort:c?.ort??null,
    ebene:c?.ebene??null, betroffene: Array.isArray(c?.betroffene)? c.betroffene.filter((x:any)=>x&&String(x).trim()).slice(0,6):[],
    messgroesse:c?.messgroesse??null, unsicherheiten: Array.isArray(c?.unsicherheiten)? c.unsicherheiten.slice(0,6):[]
  })).filter(c=>c.text);
  return { claims, raw:r.raw, ms:r.ms, fallbackUsed:false };
}
TS
say "✓ role: atomicizer"

ROLE_ASSIGNER="$ROLES_DIR/assigner.ts"
backup_if_exists "$ROLE_ASSIGNER"
cat > "$ROLE_ASSIGNER" <<'TS'
import { runOpenAI } from "../../features/ai/providers/openai";
import { ASSIGNER_V1 } from "../prompts/assigner";
import type { AtomicClaim, JurisdictionLevel } from "./shared_types";

export async function assignZustaendigkeit(claims: AtomicClaim[], timeoutMs=12000){
  if (!claims.length) return { map:{} };
  const payload={ claims: claims.map(c=>({ text:c.text })) };
  const prompt = ASSIGNER_V1.replace("<<<CLAIMS>>>", JSON.stringify(payload,null,2));
  const r = await runOpenAI(prompt, { json:true, timeoutMs });
  if (!r.ok) return { map:{} };
  let json:any=null; try{ json=JSON.parse(r.text||"{}"); }catch{ return { map:{} }; }
  const out:Record<string,any> = {};
  for (const row of (Array.isArray(json?.map)? json.map:[])) {
    const t=String(row?.claim||"").trim(); if (!t) continue;
    out[t]={ ebene:(row?.zustandigkeit?.ebene as JurisdictionLevel)||"Bund",
             organ:String(row?.zustandigkeit?.organ||"").slice(0,120),
             begruendung:String(row?.zustandigkeit?.begruendung||"").slice(0,300) };
  }
  return { map: out };
}
TS
say "✓ role: assigner"

ROLE_EVIDENCE="$ROLES_DIR/evidence.ts"
backup_if_exists "$ROLE_EVIDENCE"
cat > "$ROLE_EVIDENCE" <<'TS'
import { runOpenAI } from "../../features/ai/providers/openai";
import { EVIDENCE_V1 } from "../prompts/evidence";
import type { AtomicClaim, EvidenceSlot } from "./shared_types";

export async function makeEvidence(claims: AtomicClaim[], timeoutMs=9000){
  if (!claims.length) return { hints:{} };
  const payload={ claims: claims.map(c=>({ text:c.text })) };
  const prompt = EVIDENCE_V1.replace("<<<CLAIMS>>>", JSON.stringify(payload,null,2));
  const r = await runOpenAI(prompt, { json:true, timeoutMs });
  if (!r.ok) return { hints:{} };
  let json:any=null; try{ json=JSON.parse(r.text||"{}"); }catch{ return { hints:{} }; }
  const out:Record<string,EvidenceSlot[]> = {};
  const arr = Array.isArray(json?.evidence)? json.evidence : [];
  for (const row of arr) {
    const t=String(row?.claim||"").trim(); if (!t) continue;
    const hs = Array.isArray(row?.hints)? row.hints : [];
    out[t]=hs.map((h:any)=>({ source_type:h?.source_type, query:String(h?.query||"").slice(0,240),
                              erwartete_kennzahl:h?.erwartete_kennzahl??null, jahr:h?.jahr??null }))
            .filter(h=>h.query);
  }
  return { hints: out };
}
TS
say "✓ role: evidence"

ROLE_PERSPECTIVES="$ROLES_DIR/perspectives.ts"
backup_if_exists "$ROLE_PERSPECTIVES"
cat > "$ROLE_PERSPECTIVES" <<'TS'
import { runOpenAI } from "../../features/ai/providers/openai";
import { PERSPECTIVES_V1 } from "../prompts/perspectives";
import type { AtomicClaim, Perspectives } from "./shared_types";

export async function makePerspectives(claims: AtomicClaim[], timeoutMs=9000){
  if (!claims.length) return { views:{} };
  const payload={ claims: claims.map(c=>({ text:c.text })) };
  const prompt = PERSPECTIVES_V1.replace("<<<CLAIMS>>>", JSON.stringify(payload,null,2));
  const r = await runOpenAI(prompt, { json:true, timeoutMs });
  if (!r.ok) return { views:{} };
  let json:any=null; try{ json=JSON.parse(r.text||"{}"); }catch{ return { views:{} }; }
  const out:Record<string,Perspectives> = {};
  const arr = Array.isArray(json?.views)? json.views : [];
  for (const row of arr) {
    const t=String(row?.claim||"").trim(); if (!t) continue;
    out[t]={ pro:Array.isArray(row?.pro)? row.pro.slice(0,3):[],
             contra:Array.isArray(row?.contra)? row.contra.slice(0,3):[],
             alternative:Array.isArray(row?.alternative)? row.alternative.slice(0,3):[] };
  }
  return { views: out };
}
TS
say "✓ role: perspectives"

ROLE_RATER="$ROLES_DIR/editor_rater.ts"
backup_if_exists "$ROLE_RATER"
cat > "$ROLE_RATER" <<'TS'
import { runOpenAI } from "../../features/ai/providers/openai";
import { EDITOR_RATER_V1 } from "../prompts/editor_rater";
import type { AtomicClaim, EditorialScore } from "./shared_types";

export async function rateEditorial(claims: AtomicClaim[], timeoutMs=8000){
  if (!claims.length) return { ratings:{} };
  const payload={ claims: claims.map(c=>({ text:c.text })) };
  const prompt = EDITOR_RATER_V1.replace("<<<CLAIMS>>>", JSON.stringify(payload,null,2));
  const r = await runOpenAI(prompt, { json:true, timeoutMs });
  if (!r.ok) return { ratings:{} };
  let json:any=null; try{ json=JSON.parse(r.text||"{}"); }catch{ return { ratings:{} }; }
  const out:Record<string,EditorialScore> = {};
  const arr = Array.isArray(json?.ratings)? json.ratings : [];
  for (const row of arr) {
    const t=String(row?.claim||"").trim(); if (!t) continue;
    const s:EditorialScore = {
      praezision:Number(row?.praezision??0), pruefbarkeit:Number(row?.pruefbarkeit??0),
      relevanz:Number(row?.relevanz??0), lesbarkeit:Number(row?.lesbarkeit??0),
      ausgewogenheit:Number(row?.ausgewogenheit??0), gruende:Array.isArray(row?.gruende)? row.gruende.slice(0,5):[], total:0
    };
    s.total = Math.max(0, Math.min(1, (s.praezision+s.pruefbarkeit+s.relevanz+s.lesbarkeit+s.ausgewogenheit)/5));
    out[t]=s;
  }
  return { ratings: out };
}
TS
say "✓ role: rater"

# ── Orchestrator ───────────────────────────────────────────────────────────────
ORCH_FILE="$FEATURES/ai/orchestrator_claims.ts"
backup_if_exists "$ORCH_FILE"
cat > "$ORCH_FILE" <<'TS'
import type { OrchestratorResult, EnrichedClaim, AtomicClaim } from "./roles/shared_types";
import { atomicize } from "./roles/atomicizer";
import { assignZustaendigkeit } from "./roles/assigner";
import { makeEvidence } from "./roles/evidence";
import { makePerspectives } from "./roles/perspectives";
import { rateEditorial } from "./roles/editor_rater";

function timeout<T>(p:Promise<T>, ms:number, name:string): Promise<{ok:boolean; val?:T; ms:number; note?:string}> {
  const t0=Date.now();
  return new Promise((resolve)=>{
    const to=setTimeout(()=>resolve({ok:false,ms:Date.now()-t0,note:name+" timeout"}), ms);
    p.then(v=>{clearTimeout(to); resolve({ok:true,val:v,ms:Date.now()-t0});})
     .catch(()=>{clearTimeout(to); resolve({ok:false,ms:Date.now()-t0,note:name+" error"});});
  });
}

export async function orchestrateClaims(text:string, maxClaims=6): Promise<OrchestratorResult> {
  const t0=Date.now(); const steps:OrchestratorResult["_meta"]["steps"]=[];
  const a = await timeout(atomicize(text,maxClaims,15000),16000,"atomicizer");
  steps.push({name:"atomicizer",ms:a.ms,ok:a.ok,note:a.note});
  const claims:AtomicClaim[] = a.ok ? (a.val?.claims??[]) : [];
  if (!claims.length) return { claims:[], _meta:{ ok:false, tookMs:Date.now()-t0, fallbackUsed:true, steps } };

  const [asg,ev,pv,rt] = await Promise.all([
    timeout(assignZustaendigkeit(claims,12000),13000,"assigner"),
    timeout(makeEvidence(claims,9000),10000,"evidence"),
    timeout(makePerspectives(claims,9000),10000,"perspectives"),
    timeout(rateEditorial(claims,8000),9000,"editor_rater"),
  ]);
  steps.push({name:"assigner",ms:asg.ms,ok:asg.ok,note:asg.note},
             {name:"evidence",ms:ev.ms,ok:ev.ok,note:ev.note},
             {name:"perspectives",ms:pv.ms,ok:pv.ok,note:pv.note},
             {name:"editor_rater",ms:rt.ms,ok:rt.ok,note:rt.note});

  const map = asg.ok ? (asg.val?.map??{}) : {};
  const hints = ev.ok ? (ev.val?.hints??{}) : {};
  const views = pv.ok ? (pv.val?.views??{}) : {};
  const ratings = rt.ok ? (rt.val?.ratings??{}) : {};

  const enriched:EnrichedClaim[] = claims.map(c=>{
    const z=map[c.text]??null;
    return {
      ...c,
      zustandigkeit: z? { ebene:z.ebene, organ:z.organ, begruendung:z.begruendung }: null,
      evidence: hints[c.text]??[],
      perspectives: views[c.text]??{ pro:[], contra:[], alternative:[] },
      editorial: ratings[c.text]??{ praezision:0, pruefbarkeit:0, relevanz:0, lesbarkeit:0, ausgewogenheit:0, gruende:[], total:0 }
    };
  });

  return { claims: enriched, _meta:{ ok:true, tookMs:Date.now()-t0, prompt_version:"v1", orchestrator_commit:null, steps } };
}
TS
say "✓ orchestrator: $ORCH_FILE"

# ── API: POST /api/claims/pipeline ─────────────────────────────────────────────
PIPE_ROUTE="$API_DIR/claims/pipeline/route.ts"
backup_if_exists "$PIPE_ROUTE"
cat > "$PIPE_ROUTE" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { orchestrateClaims } from "@/features/ai/orchestrator_claims";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req: NextRequest){
  const t0=Date.now();
  try{
    const body = await req.json().catch(()=> ({}));
    const text = String(body?.text??"").trim();
    const maxClaims = Math.max(1, Math.min(8, Number(body?.maxClaims?? 20)));
    if (!text) return NextResponse.json({ claims:[], _meta:{ ok:false, tookMs:Date.now()-t0, errors:["no-text"] } }, { status:200 });
    const out = await orchestrateClaims(text, maxClaims);
    return NextResponse.json(out, { status:200 });
  }catch(e:any){
    return NextResponse.json({ claims:[], _meta:{ ok:false, tookMs:Date.now()-t0, errors:[String(e?.message||e)] } }, { status:200 });
  }
}
TS
say "✓ route: POST /api/claims/pipeline"

# ── UI: InlineClarify (eine Frage, „Unsicher“/„Sonstiges“) ─────────────────────
CLARIFY_UI="$UI_DIR/InlineClarify.tsx"
backup_if_exists "$CLARIFY_UI"
cat > "$CLARIFY_UI" <<'TS'
"use client";
import React from "react";
type Props={ missing:Array<"ebene"|"zeitraum"|"ort">; onSubmit:(p:{ebene?:string|null;zeitraum?:string|null;ort?:string|null})=>void; };
export default function InlineClarify({missing,onSubmit}:Props){
  const [open,setOpen]=React.useState(true);
  const [other,setOther]=React.useState<{ebene?:string,zeitraum?:string,ort?:string}>({});
  if (!missing?.length || !open) return null;
  function submit(p:{ebene?:string|null;zeitraum?:string|null;ort?:string|null}){ onSubmit(p); setOpen(false); }
  const seg=(k:"ebene"|"zeitraum"|"ort")=>missing.includes(k);
  return (
    <div className="mt-3 rounded-xl border bg-white/70 p-3 text-sm">
      <div className="font-medium mb-2">Kurze Präzisierung (optional)</div>
      {seg("ebene")&&(<div className="mb-2">
        <div className="text-xs text-slate-500 mb-1">Welche Ebene passt am ehesten?</div>
        <div className="flex flex-wrap gap-2">
          {["Bund","Land","Kommune","EU","Unsicher"].map(l=>(
            <button key={l} className="px-2 py-1 rounded-full border hover:bg-slate-50" onClick={()=>submit({ebene:l==="Unsicher"?null:l})}>{l}</button>
          ))}
          <button className="px-2 py-1 rounded-full border">Sonstiges</button>
        </div>
        <div className="mt-2">
          <input className="w-full rounded-md border px-2 py-1 text-xs" placeholder="Sonstiges (frei ausfüllen)…"
            value={other.ebene||""} onChange={e=>setOther(s=>({...s,ebene:e.target.value}))}
            onBlur={()=> other.ebene?.trim() && submit({ ebene: other.ebene.trim() })}/>
        </div>
      </div>)}
      {seg("ort")&&(<div className="mb-2"><div className="text-xs text-slate-500 mb-1">Ort/Region?</div>
        <input className="w-full rounded-md border px-2 py-1 text-xs" placeholder="z. B. Berlin, Deutschland"
          onBlur={e=>submit({ ort: e.target.value.trim()||null })}/></div>)}
      {seg("zeitraum")&&(<div className="mb-2"><div className="text-xs text-slate-500 mb-1">Zeitraum?</div>
        <input className="w-full rounded-md border px-2 py-1 text-xs" placeholder="z. B. 2015–2024 oder Q1/2025"
          onBlur={e=>submit({ zeitraum: e.target.value.trim()||null })}/></div>)}
    </div>
  );
}
TS
say "✓ ui: InlineClarify"

# ── UI: InPlaceHUD (Schritt 1–4, nicht „Level“) ───────────────────────────────
HUD_FILE="$UI_DIR/InPlaceHUD.tsx"
backup_if_exists "$HUD_FILE"
cat > "$HUD_FILE" <<'TS'
"use client";
import React from "react";
export default function InPlaceHUD({ log, analyzing }:{ log:string[]; analyzing:boolean }){
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2 text-xs">
        {["Schritt 1: Extrahieren","Schritt 2: Zuständigkeit","Schritt 3: Evidenz","Schritt 4: Perspektiven"].map((t,i)=>(
          <div key={i} className={"px-2 py-0.5 rounded-full border "+(analyzing?"bg-sky-50":"bg-emerald-50")}>{t}</div>
        ))}
      </div>
      {log?.length>0 && <ul className="text-xs text-slate-600 list-disc ml-5">{log.slice(-7).map((l,i)=><li key={i}>{l}</li>)}</ul>}
    </div>
  );
}
TS
say "✓ ui: InPlaceHUD"

# ── ClaimPanelsGate (Guard) ────────────────────────────────────────────────────
CPG="$UI_DIR/ClaimPanelsGate.tsx"
if [ ! -f "$CPG" ]; then
  cat > "$CPG" <<'TS'
"use client";
import React from "react";
export default function ClaimPanelsGate({ show, children }:{ show:boolean; children:React.ReactNode }){
  if (!show) return null;
  return <>{children}</>;
}
TS
  say "✓ ui: ClaimPanelsGate"
fi

# ── Page: /contributions/new (Chat-artig, Panels gated) ───────────────────────
PAGE_FILE="$PAGES_DIR/contributions/new/page.tsx"
backup_if_exists "$PAGE_FILE"
cat > "$PAGE_FILE" <<'TS'
"use client";
import React from "react";
import InPlaceHUD from "@/ui/InPlaceHUD";
import InlineClarify from "@/ui/InlineClarify";
import StanceSpectrum from "@/components/analyze/StanceSpectrum";
import ObjectionCollector from "@/components/analyze/ObjectionCollector";
import CounterSynth from "@/components/analyze/CounterSynth";
import NewsFeedPanel from "@/components/analyze/NewsFeedPanel";
import ClaimPanelsGate from "@/ui/ClaimPanelsGate";

type Claim = { id:string; text:string; ebene?: "EU"|"Bund"|"Land"|"Kommune"|null; ort?:string|null; zeitraum?:string|null; };

export default function ContributionNewPage(){
  const [text,setText]=React.useState<string>(typeof window!=="undefined" ? (new URLSearchParams(window.location.search).get("text")||"") : "");
  const [analyzing,setAnalyzing]=React.useState(false);
  const [hud,setHud]=React.useState<string[]>([]);
  const [claims,setClaims]=React.useState<Claim[]>([]);
  const [activeIdx,setActiveIdx]=React.useState(0);
  const [showPanels,setShowPanels]=React.useState(false);
  const [missing,setMissing]=React.useState<Array<"ebene"|"zeitraum"|"ort">>([]);

  const activeClaim = claims[activeIdx] ?? null;
  const canShowPanels = showPanels && !!activeClaim?.text && !analyzing;

  function pushHud(s:string){ setHud(h=>[...h.slice(-6), s]); }

  async function run(){
    setAnalyzing(true); setHud([]); setClaims([]); setActiveIdx(0); setShowPanels(false);
    pushHud("Vorprüfung…");
    const payload={ text:String(text||"").slice(0,8000), maxClaims:6 };

    pushHud("Analyse: Extraktion & Anreicherung…");
    const r=await fetch("/api/claims/pipeline",{ method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    const j=await r.json().catch(()=>({}));

    const found:Claim[] = Array.isArray(j?.claims) ? j.claims.map((c:any)=>({
      id: c?.id||"", text: String(c?.text||"").trim(),
      ebene: c?.zustandigkeit?.ebene ?? c?.ebene ?? null,
      ort: c?.ort ?? null, zeitraum: c?.zeitraum ?? null
    })) : [];

    if (!found.length && text.trim()) found.push({ id:"local", text:text.trim() });
    setClaims(found); setActiveIdx(0);

    const a=found[0]; const miss:Array<"ebene"|"zeitraum"|"ort">=[];
    if (!a?.ebene) miss.push("ebene"); if (!a?.ort) miss.push("ort"); if (!a?.zeitraum) miss.push("zeitraum");
    setMissing(miss);

    pushHud(`Fertig: ${found.length} Claim(s) · ${((j?._meta?.tookMs||0)/1000).toFixed(1)}s`);
    setAnalyzing(false);
  }

  function patchMissing(p:{ebene?:string|null; zeitraum?:string|null; ort?:string|null}){
    setClaims(cs=>{ if (!cs.length) return cs; const x=[...cs]; const c={...x[0]};
      if (p.ebene!==undefined) c.ebene=p.ebene as any;
      if (p.zeitraum!==undefined) c.zeitraum=p.zeitraum??null;
      if (p.ort!==undefined) c.ort=p.ort??null; x[0]=c; return x; });
    setMissing(m=>{ const s=new Set(m); if (p.ebene!==undefined) s.delete("ebene"); if (p.zeitraum!==undefined) s.delete("zeitraum"); if (p.ort!==undefined) s.delete("ort"); return Array.from(s); });
  }

  function goQuick(){
    const t=(activeClaim?.text||text||"").slice(0,500);
    const u=new URL("/statements/new", window.location.origin); if (t) u.searchParams.set("text", t); window.location.href=u.toString();
  }

  // Klemme: falls sich claim-Länge ändert
  React.useEffect(()=>{ if (activeIdx>claims.length-1) setActiveIdx(Math.max(0,claims.length-1)); },[claims.length,activeIdx]);

  return (
    <div className="container-vog">
      <h1 className="vog-head mb-4">Beitrag erstellen &amp; analysieren</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="vog-card p-4 space-y-3">
            <textarea className="w-full min-h-[220px] rounded-2xl border p-3"
              placeholder="Schreibe deinen Beitrag/These…" value={text} onChange={e=>setText(e.target.value)} />
            <InPlaceHUD log={hud} analyzing={analyzing} />
            {activeClaim && !!missing.length && (<InlineClarify missing={missing} onSubmit={patchMissing}/>)}
            <div className="flex gap-2 items-center">
              <button className="vog-btn-pri" onClick={run} disabled={!text||analyzing}>{analyzing?"Analysiere…":"Analyse starten"}</button>
              <button className="vog-btn" onClick={goQuick} disabled={!text}>Schnell-Flow</button>
              {claims.length>0 && !showPanels && (<button className="vog-btn" onClick={()=>setShowPanels(true)}>Weiter: Alternativen & Einwände</button>)}
            </div>
            {claims.length>1 && (
              <div className="pt-2">
                <div className="text-xs text-slate-500 mb-1">Gefundene Claims</div>
                <div className="flex flex-wrap gap-2">
                  {claims.map((c,i)=>(
                    <button key={c.id||i} className={"vog-chip "+(i===activeIdx?"ring-2 ring-sky-400":"")}
                      onClick={()=>setActiveIdx(i)} title={c.text}>Claim {i+1}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <ClaimPanelsGate show={canShowPanels}>
            <>
              <StanceSpectrum claimText={activeClaim!.text}/>
              <ObjectionCollector/>
              <CounterSynth text={activeClaim!.text}/>
            </>
          </ClaimPanelsGate>
        </div>
        <div className="space-y-3">
          <NewsFeedPanel topic={"Allgemein"} region={null} keywords={activeClaim?.text?[activeClaim.text]:(text?[text]:[])} />
          <div className="vog-card p-4 text-sm">
            <div className="font-semibold mb-1">Hinweis</div>
            Wir bereiten Aussagen neutral auf; Belege werden vorgeschlagen und können geprüft werden.
          </div>
        </div>
      </div>
    </div>
  );
}
TS
say "✓ page: /contributions/new"

# ── Styles (Tailwind utility Klassen) ──────────────────────────────────────────
STYLES="$APP_SRC/styles/vog-steps.css"
backup_if_exists "$STYLES"
cat > "$STYLES" <<'CSS'
.vog-chip{ @apply px-2 py-1 rounded-full border text-xs bg-white hover:bg-slate-50; }
.vog-btn{ @apply px-3 py-2 rounded-xl border bg-white hover:bg-slate-50; }
.vog-btn-pri{ @apply px-3 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700; }
.vog-card{ @apply rounded-2xl border bg-white; }
.vog-head{ @apply text-2xl font-semibold; }
.vog-skeleton{ @apply animate-pulse bg-slate-200 rounded; }
CSS
say "✓ styles: $STYLES (globally importieren)"

# ── Admin Stub, um 405 zu vermeiden ───────────────────────────────────────────
ADMIN_USAGE="$API_DIR/admin/usage/summary/route.ts"
backup_if_exists "$ADMIN_USAGE"
cat > "$ADMIN_USAGE" <<'TS'
import { NextResponse } from "next/server";
export async function GET(){ return NextResponse.json({ ok:false, reason:"not-implemented" }, { status:501 }); }
TS
say "✓ route: GET /api/admin/usage/summary (stub)"

say "✓ ALL DONE."
say "Hinweis: Importiere Styles in apps/web/src/app/globals.css -> @import \"../styles/vog-steps.css\";"
