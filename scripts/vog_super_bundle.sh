#!/usr/bin/env bash
# scripts/vog_super_bundle.sh
set -euo pipefail

say(){ printf "• %s\n" "$*"; }
warn(){ printf "‼ %s\n" "$*" >&2; }
ok(){ printf "✓ %s\n" "$*"; }

ROOT="$(pwd)"
APP_DIR="apps/web"
SRC_DIR="$APP_DIR/src"
API_DIR="$SRC_DIR/app/api"
UI_DIR="$SRC_DIR/ui"
SHIMS_DIR="$SRC_DIR/shims/features"
USAGE_FILE_DEFAULT=".next/vog_usage.jsonl"

[ -d "$APP_DIR" ] || { warn "apps/web fehlt — bitte im Repo-Root starten."; exit 1; }
[ -d "$SRC_DIR" ] || { warn "$SRC_DIR fehlt."; exit 1; }

# --- features-Pfad ermitteln -------------------------------------------------
FEAT_DIR_A="$SRC_DIR/features"
FEAT_DIR_B="$ROOT/features"
FEAT_DIR=""
if [ -d "$FEAT_DIR_A" ]; then FEAT_DIR="$FEAT_DIR_A"; fi
if [ -z "$FEAT_DIR" ] && [ -d "$FEAT_DIR_B" ]; then FEAT_DIR="$FEAT_DIR_B"; fi
if [ -z "$FEAT_DIR" ]; then
  warn "Kein features/-Ordner gefunden. Lege $SRC_DIR/features an."
  FEAT_DIR="$FEAT_DIR_A"
  mkdir -p "$FEAT_DIR"
fi
ok "features: $FEAT_DIR"

mkdir -p "$FEAT_DIR/ai/providers" "$UI_DIR" "$API_DIR" "$SRC_DIR/lib/metrics"

backup(){ [ -f "$1" ] && cp -n "$1" "$1.bak.$(date +%s)" || true; }

# --- 0) Shims, falls features im Repo-Root liegt -----------------------------
if [ "$FEAT_DIR" = "$FEAT_DIR_B" ]; then
  say "Erzeuge Shims unter $SHIMS_DIR (features liegt im Repo-Root)…"
  mkdir -p "$SHIMS_DIR/ai/providers"
  cat >"$SHIMS_DIR/ai/providers/openai.ts" <<'TS'
export { runOpenAI, callOpenAI } from "../../../../features/ai/providers/openai";
TS
  ok "Shim: @/shims/features/ai/providers/openai.ts"
fi

# --- 1) OpenAI Provider (Responses API, lazy client) -------------------------
PROV_PATH="$FEAT_DIR/ai/providers/openai.ts"
backup "$PROV_PATH"
cat >"$PROV_PATH" <<'TS'
import OpenAI from "openai";

export type OpenAIOptions = {
  timeoutMs?: number;
  forceJsonMode?: boolean;
  system?: string;
};

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  if (!_client) _client = new OpenAI({ apiKey: key });
  return _client;
}

function toInt(v: any, defVal: number): number {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : defVal;
}

// einfache, direkte Nutzung
export async function callOpenAI(prompt: string, opts: OpenAIOptions = {}): Promise<{ text: string; raw: any }> {
  const client = getClient();
  const model = process.env.OPENAI_MODEL || "gpt-5-2025-08-07";
  const timeout = toInt(opts.timeoutMs ?? process.env.OPENAI_TIMEOUT_MS ?? 18000, 18000);
  const body: any = {
    model,
    input: prompt,
    ...(opts.system ? { instructions: String(opts.system) } : {}),
    ...(opts.forceJsonMode ? { text: { format: { type: "json_object" } } } : {}),
  };
  const res = await client.responses.create(body, { timeout });
  const data: any = res;
  let text = "";
  if (typeof data?.text === "string" && data.text.trim()) text = data.text;
  else if (typeof data?.output_text === "string" && data.output_text.trim()) text = data.output_text;
  else if (Array.isArray(data?.output)) {
    const parts = data.output
      .flatMap((it: any) => (Array.isArray(it?.content) ? it.content : []))
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .filter(Boolean);
    if (parts.length) text = parts.join("\n");
  }
  return { text: text || "", raw: data };
}

// universeller Runner (fetch) für harte Fallbacks
export async function runOpenAI(
  prompt: string,
  opts: { json?: boolean; maxOutputTokens?: number; system?: string; timeoutMs?: number } = {}
): Promise<{ ok: boolean; text: string; raw?: any; usage?: any; ms?: number; error?: string; skipped?: boolean }> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-2025-08-07";
  if (!key) return { ok: false, text: "", skipped: true, error: "OPENAI_API_KEY missing" };
  const body: any = {
    model,
    input: String(prompt || ""),
    ...(opts.system ? { instructions: String(opts.system) } : {}),
    ...(opts.json ? { text: { format: { type: "json_object" } } } : {}),
  };
  const t0 = Date.now();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    return { ok: false, text: "", error: `OpenAI ${res.status} – ${msg}`, ms: Date.now() - t0 };
  }
  const data = await res.json();
  let out = "";
  if (typeof data?.text === "string") out = data.text;
  else if (Array.isArray(data?.output)) {
    const parts = data.output
      .flatMap((it: any) => (Array.isArray(it?.content) ? it.content : []))
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .filter(Boolean);
    if (parts.length) out = parts.join("\n");
  }
  return { ok: true, text: out || "", raw: data, usage: data?.usage, ms: Date.now() - t0 };
}
TS
ok "Provider: $PROV_PATH"

# --- 2) recordUsage (crasht nie; schreibt JSONL, wenn möglich) --------------
USAGE_PATH="$SRC_DIR/lib/metrics/usage.ts"
backup "$USAGE_PATH"
cat >"$USAGE_PATH" <<TS
import fs from "node:fs";
import path from "node:path";

export type UsageEvent = {
  ts: number;
  route: string;
  userId: string | null;
  model: string | null;
  totalTokens: number | null;
  ms: number;
  ok: boolean;
  err: string | null;
  meta?: any;
};

export async function recordUsage(e: UsageEvent){
  try{
    const base = process.env.VOG_USAGE_FILE || "${USAGE_FILE_DEFAULT}";
    const f = path.isAbsolute(base) ? base : path.join(process.cwd(), base);
    const line = JSON.stringify(e) + "\\n";
    await fs.promises.mkdir(path.dirname(f), { recursive: true }).catch(()=>{});
    await fs.promises.appendFile(f, line).catch(()=>{});
  }catch{ /* niemals crashen */ }
}
TS
ok "Usage: $USAGE_PATH"

# --- 3) /api/debug/env (absichtlich nicht öffentlich verfügbar) -------------
DBG_DIR="$API_DIR/debug/env"
mkdir -p "$DBG_DIR"
backup "$DBG_DIR/route.ts"
cat >"$DBG_DIR/route.ts" <<'TS'
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(){
  return new NextResponse(null, { status: 404, headers: { "cache-control": "no-store" } });
}
TS
ok "/api/debug/env"

# --- 4) /api/contributions/analyze (failsafe, mit Fallback) ------------------
ANZ_DIR="$API_DIR/contributions/analyze"
mkdir -p "$ANZ_DIR"
backup "$ANZ_DIR/route.ts"

# Import-Pfad zu runOpenAI wählen
PROV_IMPORT="@/features/ai/providers/openai"
if [ "$FEAT_DIR" = "$FEAT_DIR_B" ]; then
  PROV_IMPORT="@/shims/features/ai/providers/openai"
fi

cat >"$ANZ_DIR/route.ts" <<TS
import { NextRequest, NextResponse } from "next/server";
import { recordUsage } from "@/lib/metrics/usage";

// optionaler Analyzer aus deinem features-Paket (wenn vorhanden)
let analyzeContribution: any = null;
try{ analyzeContribution = (await import("@/features/analyze/analyzeContribution")).analyzeContribution; }catch{}
let orchestrateContribution: any = null;
try{ orchestrateContribution = (await import("@/features/ai/orchestrator_contrib")).orchestrateContribution; }catch{}

// Fallback-Runner (Responses API)
import { runOpenAI } from "${PROV_IMPORT}";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJson<T=any>(s:string): T|null { try{ return JSON.parse(s) as T; }catch{ return null; } }

async function extractClaimsFallback(text: string, maxClaims=3){
  const sys = \`Extrahiere bis zu \${maxClaims} prägnante, abstimm-bare Claims als JSON.
Jeder Claim kurz, eindeutig, neutral formulierbar. 
Antwortformat STRICT:
{ "claims": [ { "text": string } ] }\`;
  const prompt = \`Text:
\"\"\"\${text.slice(0,6000)}\"\"\"\n\nGib NUR das JSON-Objekt zurück.\`;
  const r = await runOpenAI(prompt, { json: true, system: sys, timeoutMs: 15000 });
  if(!r.ok) return { claims: [], _meta:{ fallback:true, error:r.error ?? null, ms:r.ms } };
  const j = safeJson<{claims?: Array<{text:string}>}>(r.text.trim());
  const claims = Array.isArray(j?.claims) ? j!.claims.filter(c=>typeof c?.text==="string" && c.text.trim()) : [];
  return { claims, _meta:{ fallback:true, ms:r.ms, usage:r.usage, model: process.env.OPENAI_MODEL ?? null } };
}

function forceStable(out:any, ms:number, note?:string){
  const base = { _meta:{ mode:"error", errors: note? [note] : [], tookMs: ms }, claims: [] as any[] };
  if(!out || typeof out!=="object") return base;
  if(!("_meta" in out)) return { ...base, result: out };
  if(!("claims" in out)) return { ...out, claims: [] };
  return out;
}

export async function POST(req: NextRequest){
  const t0 = Date.now();
  let ok=false, err:string|null=null, model:string|null=null, totalTokens:number|null=null;

  try{
    const u = new URL(req.url);
    const mode = u.searchParams.get("mode") || process.env.VOG_ANALYZE_MODE || "gpt";
    const body = await req.json().catch(()=> ({}));
    const text = String(body?.text ?? "").trim().slice(0,8000);
    const maxClaims = Number(body?.maxClaims ?? 3);

    if(!text){
      const ms=Date.now()-t0; ok=true;
      return NextResponse.json(forceStable(null, ms, "no-text"), { status:200 });
    }

    // MULTI: orchestrator + extract (falls verfügbar)
    if(mode==="multi" && orchestrateContribution){
      const orches = await orchestrateContribution(text, { maxClaims }).catch(()=>null);
      const bestText = String(orches?.best?.text ?? text);

      let out = analyzeContribution
        ? await analyzeContribution(bestText, { maxClaims }).catch(()=> ({ claims:[], _meta:{} as any }))
        : { claims:[], _meta:{} as any };

      if(!Array.isArray(out?.claims) || out.claims.length===0){
        const fb = await extractClaimsFallback(bestText, maxClaims);
        out = { ...(out||{}), claims: fb.claims, _meta: { ...(out?._meta??{}), fallbackUsed:true } };
      }

      out._meta = { ...(out._meta??{}), mode: "multi+extract", tookMs: Date.now()-t0, provider: orches?.best?.provider ?? null };
      model = (out?._meta?.model ?? process.env.OPENAI_MODEL ?? null) as any;
      totalTokens = (out?._meta?.usage?.total_tokens ?? null) as any;
      ok=true;
      return NextResponse.json(forceStable(out, out._meta.tookMs), { status:200 });
    }

    // Standard: direkte Claim-Extraktion (präferiere vorhandenen Analyzer)
    let out = analyzeContribution
      ? await analyzeContribution(text, { maxClaims }).catch(()=> ({ claims:[], _meta:{} as any }))
      : { claims:[], _meta:{} as any };

    if(!Array.isArray(out?.claims) || out.claims.length===0){
      const fb = await extractClaimsFallback(text, maxClaims);
      out = { ...(out||{}), claims: fb.claims, _meta: { ...(out?._meta??{}), fallbackUsed:true } };
    }

    out._meta = { ...(out._meta??{}), mode:"gpt", tookMs: Date.now()-t0 };
    model = (out?._meta?.model ?? process.env.OPENAI_MODEL ?? null) as any;
    totalTokens = (out?._meta?.usage?.total_tokens ?? null) as any;
    ok=true;
    return NextResponse.json(forceStable(out, out._meta.tookMs), { status:200 });

  }catch(e:any){
    err = String(e?.message || e);
    const ms = Date.now()-t0;
    return NextResponse.json(forceStable(null, ms, err), { status:200 });
  }finally{
    await recordUsage({
      ts: Date.now(),
      route: "/api/contributions/analyze",
      userId: null,
      model, totalTokens,
      ms: Date.now()-t0, ok, err,
      meta: { source: "super_bundle" }
    });
  }
}
TS
ok "/api/contributions/analyze"

# --- 5) UI: ClaimPanelsGate, InPlaceHUD, LueckenCheck ------------------------
backup "$UI_DIR/ClaimPanelsGate.tsx"
cat >"$UI_DIR/ClaimPanelsGate.tsx" <<'TS'
"use client";
import React from "react";
export default function ClaimPanelsGate({
  show, children
}:{ show:boolean; children:React.ReactNode }){
  if(!show) return null;
  return <>{children}</>;
}
TS
ok "UI: ClaimPanelsGate"

backup "$UI_DIR/InPlaceHUD.tsx"
cat >"$UI_DIR/InPlaceHUD.tsx" <<'TS'
"use client";
import React from "react";
export default function InPlaceHUD({ log, analyzing }:{ log:string[]; analyzing:boolean }){
  if(!analyzing && log.length===0) return null;
  return (
    <div className="bg-slate-50 border rounded-xl p-3 text-sm space-y-2">
      <div className="font-semibold">Analyse läuft …</div>
      <ul className="list-disc ml-5 space-y-1">{log.map((l,i)=><li key={i} className="text-slate-600">{l}</li>)}</ul>
      {analyzing && <div className="vog-skeleton h-2 w-24" />}
    </div>
  );
}
TS
ok "UI: InPlaceHUD"

backup "$UI_DIR/LueckenCheck.tsx"
cat >"$UI_DIR/LueckenCheck.tsx" <<'TS'
"use client";
import React from "react";
type Missing = { region?:boolean; level?:boolean; timeframe?:boolean; actors?:boolean; metrics?:string[] };
type Q = { id:string; text:string; kind:"chips"|"single"|"text"; options?:string[] };
export default function LueckenCheck({ missing, questions, onAnswer }:{
  missing?: Missing; questions?: Q[]; onAnswer:(id:string,val:string)=>void;
}){
  if(!missing && !questions?.length) return null;
  return (
    <div className="vog-card p-4 space-y-3">
      <div className="font-semibold">Noch hilfreiche Details?</div>
      {questions?.map(q=>(
        <div key={q.id} className="space-y-1">
          <div className="text-sm">{q.text}</div>
          {q.kind!=="text" ? (
            <div className="flex flex-wrap gap-2">
              {q.options?.map(opt=>(
                <button key={opt} className="vog-chip" onClick={()=>onAnswer(q.id,opt)}>{opt}</button>
              ))}
              <button className="vog-chip" onClick={()=>onAnswer(q.id,"Überspringen")}>Überspringen</button>
            </div>
          ):(
            <input className="vog-input" placeholder="Kurz eintragen (optional)" onBlur={e=>onAnswer(q.id, e.target.value||"")} />
          )}
        </div>
      ))}
    </div>
  );
}
TS
ok "UI: LueckenCheck"

# --- 6) Marker-Hinweis für deine page.tsx (keine harte Überschreibung) ------
CN_PAGE="$SRC_DIR/app/contributions/new/page.tsx"
if [ -f "$CN_PAGE" ]; then
  if ! grep -q "BEGIN:VOG_UI_GATING" "$CN_PAGE" >/dev/null 2>&1; then
    say "Hinweis: Bitte folgende Marker an geeigneter Stelle in $CN_PAGE ergänzen:"
    cat <<'TXT'
/* BEGIN:VOG_UI_GATING
  <InPlaceHUD log={hud} analyzing={analyzing} />
  {claims.length > 0 && !showPanels && (
    <div className="pt-2"><button className="vog-btn" onClick={()=>setShowPanels(true)}>
      Weiter: Alternativen, Einwände & Essenz anzeigen
    </button></div>
  )}
  <ClaimPanelsGate show={showPanels && !!activeClaim && !analyzing}>
    <> 
      <StanceSpectrum claimText={activeClaim!.text} />
      <ObjectionCollector />
      <CounterSynth text={activeClaim!.text} />
    </>
  </ClaimPanelsGate>
END:VOG_UI_GATING */
TXT
  else
    ok "UI-Gating Marker bereits vorhanden."
  fi
else
  warn "$CN_PAGE nicht gefunden – UI-Marker übersprungen."
fi

# --- 7) Smoke-Tests (Hinweis) ------------------------------------------------
cat <<'TESTS'

== Smoke-Tests ==
A) ENV/Health:
  curl -s http://127.0.0.1:3000/api/health | jq .

B) Analyze – Fallback erlaubt, NIE 500:
  curl -s -X POST -H 'content-type: application/json' \
    -d '{"text":"Ich bin gegen Preiserhöhungen.","maxClaims":4}' \
    'http://127.0.0.1:3000/api/contributions/analyze?mode=multi&clarify=1' | jq '{_meta,claims:(.claims|map(.text))}'
TESTS

ok "Fertig. Starte dev-server neu, falls bereits laufend."
