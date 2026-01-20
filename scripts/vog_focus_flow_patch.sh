#!/usr/bin/env bash
set -euo pipefail

ts=$(date +%s)

root="apps/web/src"

backup () {
  local f="$1"
  if [ -f "$f" ]; then cp "$f" "${f}.bak.${ts}"; fi
  mkdir -p "$(dirname "$f")"
}

echo "› Patch startet …"

# 1) API: analyze – schnellere Orchestrierung + JSON-Fallback & Hints
f1="$root/app/api/contributions/analyze/route.ts"
backup "$f1"
cat >"$f1" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
import { orchestrateContribution as analyzeMulti } from "@/features/ai/orchestrator_contrib";
import { runOpenAI } from "@/features/ai/providers/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJson<T=any>(s:string){ try{ return JSON.parse(s) as T }catch{ return null } }
const sleep = (ms:number)=> new Promise(r=>setTimeout(r,ms));

async function jsonFallback(text:string, maxClaims=3){
  const sys=`Extrahiere bis zu ${maxClaims} prägnante Claims in JSON.
Antwortformat STRICT:
{ "claims": [ { "text": string } ] }`;
  const r=await runOpenAI(
    `Text:\n"""${text.slice(0,6000)}"""\n\nGib NUR das JSON-Objekt zurück.`,
    { json:true, system:sys, timeoutMs:12000 }
  );
  if(!r.ok) return { claims:[], _meta:{ fallback:true, error:r.error??null, ms:r.ms } };
  const j=safeJson<{claims?:Array<{text:string}>}>(r.text?.trim()||"");
  const claims=(Array.isArray(j?.claims)?j!.claims:[]).filter(c=>c?.text && String(c.text).trim());
  return { claims, _meta:{ fallback:true, ms:r.ms, usage:r.usage } };
}

function stable(out:any, ms:number, note?:string){
  const base={ _meta:{ mode:"error", errors:note?[note]:[], tookMs:ms }, claims:[] as any[] };
  if(!out || typeof out!=="object") return base;
  if(!("_meta" in out)) return { ...base, result:out };
  if(!("claims" in out)) return { ...out, claims:[] };
  return out;
}

async function runOrchestrated(text:string, maxClaims:number){
  // Begrenze Orchestrierung hart – Race + Timeout
  const timeoutMs = 12000;
  const p = analyzeMulti(text, { maxClaims }).catch(()=>null) as Promise<any>;
  const o = await Promise.race([p, sleep(timeoutMs).then(()=>null)]);
  const bestText = String(o?.best?.text ?? text);
  let extracted = await analyzeContribution(bestText, { maxClaims }).catch(()=>({claims:[], _meta:{}}));

  if(!Array.isArray(extracted?.claims) || extracted.claims.length===0){
    const fb = await jsonFallback(bestText, maxClaims);
    extracted = { ...(extracted||{}), claims: fb.claims, _meta: { ...(extracted?._meta ?? {}), fallbackUsed:true } };
  }
  extracted._meta = {
    ...(extracted._meta ?? {}),
    mode: "multi+extract",
    provider: o?.best?.provider ?? null,
  };
  return extracted;
}

export async function POST(req:NextRequest){
  const t0 = Date.now();
  let ok=false, err: string|null = null, model: string|null=null, totalTokens: number|null=null;

  try{
    const u = new URL(req.url);
    const mode = u.searchParams.get("mode") || process.env.VOG_ANALYZE_MODE || "gpt";
    const body = await req.json().catch(()=> ({}));
    const text = String(body?.text ?? "").trim().slice(0,8000);
    const maxClaims = Number(body?.maxClaims ?? 4);
    const _hints = body?.hints ?? null;

    if(!text){
      const ms=Date.now()-t0;
      return NextResponse.json(stable(null, ms, "no-text"), { status:200 });
    }

    let out:any;
    if(mode==="multi"){
      out = await runOrchestrated(text, maxClaims);
    }else{
      out = await analyzeContribution(text, { maxClaims }).catch(()=>({claims:[], _meta:{}}));
      if(!Array.isArray(out?.claims) || out.claims.length===0){
        const fb = await jsonFallback(text, maxClaims);
        out = { ...(out || {}), claims: fb.claims, _meta: { ...(out?._meta ?? {}), fallbackUsed:true } };
      }
      out._meta = { ...(out._meta ?? {}), mode:"gpt" };
    }

    // Meta auffüllen
    out._meta = { ...(out._meta ?? {}), tookMs: Date.now()-t0, hints:_hints ?? null };
    model = (out?._meta?.model ?? process.env.OPENAI_MODEL ?? null) as any;
    totalTokens = (out?._meta?.usage?.total_tokens ?? null) as any;
    ok=true;

    return NextResponse.json(stable(out, out._meta.tookMs), { status:200 });

  }catch(e:any){
    err=String(e?.message||e);
    const ms=Date.now()-t0;
    return NextResponse.json(stable(null, ms, err), { status:200 });

  }finally{
    try{
      const m = await import("@/lib/metrics/usage");
      const fn = (m as any)?.recordUsage;
      if(typeof fn==="function"){
        await fn({ ts:Date.now(), route:"/api/contributions/analyze", ok, err, ms:Date.now()-t0, model, totalTokens });
      }
    }catch{}
  }
}
TS
echo "✓ API analyze aktualisiert"

# 2) Admin Usage – GET & POST verfügbar
f2="$root/app/api/admin/usage/summary/route.ts"
backup "$f2"
cat >"$f2" <<'TS'
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { ts:number, route:string, ms:number, ok:boolean, err?:string|null, model?:string|null, totalTokens?:number|null };

function summarize(rows:Row[]){
  const total = rows.length;
  const byRoute: Record<string,{c:number,avgMs:number,ok:number,err:number}> = {};
  let cost = 0;
  for(const r of rows){
    byRoute[r.route] ??= { c:0, avgMs:0, ok:0, err:0 };
    const b = byRoute[r.route];
    b.c++; b.avgMs += r.ms; if(r.ok) b.ok++; else b.err++;
    // simple Schätzer (anpassbar)
    if(/analy/.test(r.route) && (r.totalTokens??0)>0) cost += (r.totalTokens!/1000)*0.002;
  }
  for(const k of Object.keys(byRoute)){ byRoute[k].avgMs = +(byRoute[k].avgMs / byRoute[k].c).toFixed(1); }
  return { total, byRoute, estCostUSD:+cost.toFixed(4) };
}

async function readRows():Promise<Row[]>{
  // 1) bevorzugt aus Metrics-Modul
  try{
    const m = await import("@/lib/metrics/usage");
    const fn = (m as any)?.readAll;
    if(typeof fn==="function"){ const rows = await fn(); if(Array.isArray(rows)) return rows; }
  }catch{}
  // 2) globaler Fallback
  const g:any = globalThis as any;
  return Array.isArray(g.__VOG_USAGE) ? g.__VOG_USAGE as Row[] : [];
}

export async function GET(){
  const rows = await readRows();
  return NextResponse.json({ ok:true, summary:summarize(rows), rows: rows.slice(-200) }, { status:200 });
}
export async function POST(req:NextRequest){
  return GET();
}
TS
echo "✓ Admin usage summary bereit (GET/POST)"

# 3) ClarifyPanel – Auto-Vorschlag, Mehrfachwahl, Sonstiges als Freitext
f3="$root/ui/ClarifyPanel.tsx"
backup "$f3"
cat >"$f3" <<'TSX'
"use client";
import React from "react";

export type Hints = {
  level?: "eu"|"bund"|"land"|"kommune"|null;
  regions?: string[];              // Mehrfach
  timeframe?: "aktuell"|"letzte12"|"letzte5"|"seit1990"|"unsicher"|null;
  audience?: string[];             // Mehrfach (buerger, unternehmen, staat, kinder, rentner)
  stance?: "pro"|"neutral"|"contra"|"unsicher"|null;
  other?: string;
};

function toggle(list:string[], v:string){ return list.includes(v) ? list.filter(x=>x!==v) : [...list, v]; }
const chip = (active:boolean)=>"vog-chip " + (active ? "ring-2 ring-sky-400" : "");

export default function ClarifyPanel({
  text, value, onChange,
}: { text:string; value:Hints; onChange:(v:Hints)=>void }){
  const [othersOpen,setOthersOpen]=React.useState(false);

  // Auto-Vorschlag (debounced)
  React.useEffect(()=>{
    if(!text.trim()) return;
    const ac = new AbortController();
    const t = setTimeout(async()=>{
      try{
        const r = await fetch("/api/quality/clarify",{
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({ text }),
          signal: ac.signal
        });
        const j = await r.json().catch(()=>null);
        if(j?.ok && j?.hints){
          const next:Hints = { ...(value||{}) };
          next.level ??= j.hints.level ?? null;
          if((!next.regions || next.regions.length===0) && j.hints.region){ next.regions=[j.hints.region]; }
          next.timeframe ??= j.hints.timeframe ?? null;
          next.stance ??= j.hints.stance ?? null;
          if((!next.audience || next.audience.length===0) && j.hints.audience){ next.audience=[j.hints.audience]; }
          onChange(next);
        }
      }catch{}
    }, 350);
    return ()=>{ clearTimeout(t); ac.abort(); };
  }, [text]);

  const v:Hints = { regions:[], audience:[], ...value };

  return (
    <div className="space-y-3">
      <div className="text-slate-500 text-sm">Optional präzisieren (für bessere Ergebnisse):</div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">EBENE/ZUSTÄNDIGKEIT <span className="text-slate-400">(Mehrfach möglich)</span></div>
        {["eu","bund","land","kommune"].map(k=>(
          <button key={k} className={chip(v.level===k)} onClick={()=>onChange({ ...v, level: v.level===k ? null : (k as any) })}>
            {k==="eu"?"EU":k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
        <button className={chip(v.level===null)} onClick={()=>onChange({ ...v, level:null })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ORT/REGION <span className="text-slate-400">(Mehrfach möglich)</span></div>
        <button className={chip(v.regions!.includes("bundesweit"))}
          onClick={()=>onChange({ ...v, regions: toggle(v.regions!, "bundesweit") })}>Bundesweit</button>
        <button className={chip(v.regions!.some(x=>x!=="bundesweit"))}
          onClick={()=>{ const r = prompt("Stadt/Region angeben:")?.trim(); if(r){ onChange({ ...v, regions: Array.from(new Set([...(v.regions||[]).filter(x=>x!=="bundesweit"), r])) }); }}}>Stadt/Region…</button>
        <button className={chip(v.regions!.length===0)} onClick={()=>onChange({ ...v, regions: [] })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ZEITRAUM</div>
        {[
          ["aktuell","Aktuell"],
          ["letzte12","Letzte 12 Monate"],
          ["letzte5","Letzte 5 Jahre"],
          ["seit1990","Seit 1990"],
          ["unsicher","Unsicher"],
        ].map(([k,lab])=>(
          <button key={k} className={chip(v.timeframe===k)} onClick={()=>onChange({ ...v, timeframe:k as any })}>{lab}</button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">BETROFFENE</div>
        {[
          ["buerger","Bürger*innen"],
          ["unternehmen","Unternehmen"],
          ["staat","Staat/Verwaltung"],
          ["kinder","Kinder/Jugendliche"],
          ["rentner","Rentner*innen"],
        ].map(([k,lab])=>(
          <button key={k} className={chip(v.audience!.includes(k))}
            onClick={()=>onChange({ ...v, audience: toggle(v.audience!, k) })}>{lab}</button>
        ))}
        <button className={chip((v.audience||[]).length===0)} onClick={()=>onChange({ ...v, audience: [] })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">HALTUNG (optional)</div>
        {["pro","neutral","contra","unsicher"].map(k=>(
          <button key={k} className={chip(v.stance===k)} onClick={()=>onChange({ ...v, stance: v.stance===k ? null : (k as any) })}>
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <button className={chip(!!v.other || othersOpen)} onClick={()=>setOthersOpen(s=>!s)}>Sonstiges…</button>
        {othersOpen && (
          <input className="border rounded-xl px-3 py-2 w-full" placeholder="Optional ergänzen …"
            value={v.other ?? ""} onChange={e=>onChange({ ...v, other:e.target.value })}/>
        )}
      </div>
    </div>
  );
}
TSX
echo "✓ ClarifyPanel modernisiert"

# 4) InPlaceHUD – dezentes Inline-„Denken“ (ohne Toast)
f4="$root/ui/InPlaceHUD.tsx"
backup "$f4"
cat >"$f4" <<'TSX'
"use client";
import React from "react";

export default function InPlaceHUD({ log, analyzing }: { log:string[]; analyzing:boolean }){
  if(!analyzing && log.length===0) return null;
  return (
    <div className="mt-2 p-3 rounded-xl border bg-white/60">
      <div className="font-semibold mb-1">{analyzing ? "Analyse läuft…" : "Analyse"}</div>
      <ul className="list-disc ml-5 space-y-1 text-sm">
        {log.map((l,i)=>(<li key={i} className="text-slate-600">{l}</li>))}
      </ul>
      {analyzing && <div className="h-2 w-24 bg-slate-200 animate-pulse rounded mt-2" />}
      <style jsx global>{`
        /* Schaltet globale eDebatte Toasts aus, falls aktiv */
        .vog-toast, [data-vog-toast], .fetch-instrument { display: none !important; }
      `}</style>
    </div>
  );
}
TSX
echo "✓ InPlaceHUD angepasst (schaltet Popups aus)"

# 5) Contributions/New – Claims sichtbar, Step 3 kompakt, Advanced optional
f5="$root/app/contributions/new/page.tsx"
backup "$f5"
cat >"$f5" <<'TSX'
"use client";

import React from "react";
import InPlaceHUD from "@/ui/InPlaceHUD";
import ClarifyPanel, { Hints } from "@/ui/ClarifyPanel";
// Advanced (standardmäßig ausgeblendet)
import StanceSpectrum from "@/components/analyze/StanceSpectrum";
import ObjectionCollector from "@/components/analyze/ObjectionCollector";
import CounterSynth from "@/components/analyze/CounterSynth";

type Claim = { text: string; confidence?: number; meta?: any };

export default function ContributionNewPage() {
  const [text, setText] = React.useState<string>(
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("text") ?? "")
      : ""
  );

  const [hints, setHints] = React.useState<Hints>({});
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [activeClaimIdx, setActiveClaimIdx] = React.useState<number>(0);

  const [analyzing, setAnalyzing] = React.useState<boolean>(false);
  const [hud, setHud] = React.useState<string[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false);

  const activeClaim = claims[activeClaimIdx] ?? null;
  const canShowSummary = !!activeClaim && !analyzing;

  function pushHud(line: string) {
    setHud((h) => [...h.slice(-6), line]);
  }

  async function runAnalysis() {
    const t0 = Date.now();
    setAnalyzing(true); setErrorMsg(null); setClaims([]); setActiveClaimIdx(0); setHud([]); setShowAdvanced(false);

    try {
      pushHud("Schritt 1 → Text prüfen …");
      const payload = { text: String(text || "").slice(0,8000), maxClaims: 4, hints };

      pushHud("Schritt 2 → Modelle orchestrieren & Claims extrahieren …");
      const res = await fetch("/api/contributions/analyze?mode=multi&clarify=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(()=>({}));

      const apiClaims: Claim[] = Array.isArray(j?.claims) ? j.claims : [];
      const cleaned = apiClaims
        .map((c:any)=>({ text:String(c?.text??"").trim(), confidence:c?.confidence, meta:c?.meta }))
        .filter((c:Claim)=>c.text.length>0);

      if(cleaned.length===0){
        if(text.trim()){
          cleaned.push({ text: text.trim() });
          pushHud("Hinweis: Kein strukturierter Claim gefunden – Fallback verwendet.");
        }else{
          pushHud("Hinweis: Kein Inhalt – bitte Text eingeben.");
        }
      }

      setClaims(cleaned);
      setActiveClaimIdx(0);

      pushHud(`Fertig: ${cleaned.length} Claim(s) erkannt · ${((Date.now()-t0)/1000).toFixed(1)}s`);
    } catch(e:any){
      const msg = String(e?.message||e);
      setErrorMsg(msg); pushHud("Fehler: "+msg);
    } finally {
      setAnalyzing(false);
    }
  }

  function goQuick() {
    const claimText = (activeClaim?.text || text || "").slice(0, 500);
    const u = new URL("/statements/new", window.location.origin);
    if (claimText) u.searchParams.set("text", claimText);
    window.location.href = u.toString();
  }

  return (
    <div className="container-vog">
      <h1 className="vog-head mb-4">Beitrag erstellen &amp; analysieren</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Schritt 1 – Beitrag */}
          <div className="vog-card p-4 space-y-3">
            <div className="text-slate-500 text-sm">Schritt 1: Beitrag</div>
            <textarea
              className="w-full min-h-[220px] rounded-2xl border p-3"
              placeholder="Schreibe deinen Beitrag/These…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <ClarifyPanel text={text} value={hints} onChange={setHints} />
            <InPlaceHUD log={hud} analyzing={analyzing} />

            <div className="flex gap-2 items-center">
              <button className="vog-btn-pri" onClick={runAnalysis} disabled={!text || analyzing}>
                {analyzing ? "Analysiere…" : "Analyse starten"}
              </button>
              <button className="vog-btn" onClick={goQuick} disabled={!text} title="Direkt mit dem ersten Claim weiter">
                Schnell-Flow
              </button>
            </div>

            {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

            {/* Claims sichtbar mit Vorschau */}
            {claims.length>0 && (
              <div className="pt-3 space-y-2">
                <div className="text-xs text-slate-500">Gefundene Claims</div>
                <div className="space-y-2">
                  {claims.map((c, i)=>(
                    <button key={i} onClick={()=>setActiveClaimIdx(i)}
                      className={"w-full text-left vog-chip !justify-start " + (i===activeClaimIdx ? "ring-2 ring-sky-400" : "")}>
                      <span className="font-semibold mr-2">Claim {i+1}</span>
                      <span className="truncate">{c.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schritt 2 – Zusammenfassung & Nächste Schritte */}
          {canShowSummary && (
            <div className="vog-card p-4 space-y-3">
              <div className="text-slate-500 text-sm">Schritt 2: Zusammenfassung</div>
              <div>
                <div className="font-semibold mb-1">Ausgewählter Claim</div>
                <div className="text-slate-700">{activeClaim!.text}</div>
              </div>

              {/* Kurze Lückenprüfung */}
              <div className="text-sm text-slate-600">
                {(!hints.level || (hints.regions||[]).length===0 || !hints.timeframe) ? (
                  <>Fehlen Angaben? Ebene/Region/Zeitraum kannst du oben ergänzen. Alles freiwillig.</>
                ) : <>Danke – Angaben vollständig.</>}
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="vog-btn-pri" onClick={goQuick}>Weiter: Statement erstellen</button>
                <button className="vog-btn" onClick={()=>setShowAdvanced(s=>!s)}>
                  {showAdvanced ? "Erweiterte Analyse ausblenden" : "Erweiterte Analyse öffnen"}
                </button>
              </div>
            </div>
          )}

          {/* Schritt 3 – Erweiterte Analyse (optional) */}
          {showAdvanced && activeClaim && !analyzing && (
            <div className="space-y-4">
              <div className="vog-card p-4"><StanceSpectrum claimText={activeClaim.text} /></div>
              <div className="vog-card p-4"><ObjectionCollector /></div>
              <div className="vog-card p-4"><CounterSynth text={activeClaim.text} /></div>
            </div>
          )}
        </div>

        {/* Rechte Spalte leer gehalten – die frühere „Aktuelle Recherche“ ist bewusst entfernt */}
        <div className="space-y-3">
          <div className="vog-card p-4 text-sm">
            <div className="font-semibold mb-1">Hinweis</div>
            Du kannst jederzeit abbrechen – <b>eDebatte</b> übernimmt auf Wunsch Redaktion &amp; Belege.
            Präzisierungen sind freiwillig.
          </div>
        </div>
      </div>
    </div>
  );
}
TSX
echo "✓ contributions/new – klares Flow, Claims sichtbar, Advanced optional"

echo "✅ Patch fertig. Bitte dev-Server neu laden und /contributions/new öffnen."
