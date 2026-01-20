#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
WEB="$ROOT/apps/web"
FEAT="$ROOT/features"

ts() { date +%s; }
bak() { [ -f "$1" ] && cp "$1" "$1.bak.$(ts)" || true; }
ensure_dir() { mkdir -p "$1"; }

echo "▶ eDebatte Patch: Analyzer + API + UI + Diag"

# 0) Aliases sicherstellen (nur wenn tsconfig existiert)
if [ -f "$WEB/tsconfig.json" ]; then
  node - <<'NODE'
const fs=require('fs'); const p=process.argv[1];
let t=fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');
t=t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:])\/\/.*$/gm,'$1');
const j=JSON.parse(t); j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.baseUrl = j.compilerOptions.baseUrl || ".";
j.compilerOptions.paths = Object.assign({}, j.compilerOptions.paths||{}, {
  "@/*": ["src/*"],
  "@features/*": ["../../features/*"],
  "@/features/*": ["../../features/*"],
  "@core/*": ["../../core/*"],
  "@/core/*": ["../../core/*"]
});
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✓ tsconfig aliases ok");
NODE
fi "$WEB/tsconfig.json"
echo

# 1) Minimaler OpenAI-Provider (Responses API, JSON-Text)
ensure_dir "$FEAT/ai"
cat > "$FEAT/ai/providers.ts.new" <<'TS'
/**
 * Minimal-Provider für OpenAI Responses API.
 * - KEIN response_format/temperature
 * - text.format: { type: "json_object" }
 * - Liefert { text, raw }
 */
export async function callOpenAIJson(prompt: string, maxOutputTokens = 1600): Promise<{text:string, raw:any}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model  = process.env.OPENAI_MODEL || process.env.OPENAI_DEFAULT_MODEL || "gpt-5-2025-08-07";
  if(!apiKey) throw new Error("OPENAI_API_KEY missing");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "authorization": `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: maxOutputTokens,
      text: { format: { type: "json_object" } }
    })
  });

  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error("OpenAI "+res.status+" – "+(data?.error?.message || res.statusText));

  // robustes output_text / output[0].content[0].text
  const fromOutputArray = (() => {
    const item = Array.isArray(data?.output) ? data.output[0] : null;
    const first = item && Array.isArray(item.content) ? item.content[0] : null;
    return (first && typeof first.text === "string") ? first.text : undefined;
  })();

  const text =
    (typeof data?.output_text === "string" ? data.output_text : undefined) ??
    fromOutputArray ??
    "";

  return { text, raw: data };
}
TS
if [ -f "$FEAT/ai/providers.ts" ]; then bak "$FEAT/ai/providers.ts"; fi
mv "$FEAT/ai/providers.ts.new" "$FEAT/ai/providers.ts"
echo "✓ features/ai/providers.ts geschrieben"

# 2) Clarify-Heuristiken
ensure_dir "$FEAT/analyze"
cat > "$FEAT/analyze/clarify.ts" <<'TS'
export function needsClarify(c: { text?: string; categoryMain?: string|null; region?: string|null }): boolean {
  const t = (c.text||"").toLowerCase();
  const tooShort = t.split(/\s+/).filter(Boolean).length < 6;
  const generic  = /(preis|preiserh|teuer|billig|kosten)/i.test(t) && !/(strom|gas|miete|lebensmittel|sprit|ticket|mwst|tarif)/i.test(t);
  return !!(tooShort || generic);
}
export function clarifyForPrices(){
  return {
    title: "Bitte präzisieren: Welche Preise genau?",
    options: [
      { key:"lebensmittel", label:"Lebensmittelpreise (allgemein)" },
      { key:"energie",      label:"Energiepreise (Strom/Gas/Heizöl)" },
      { key:"kraftstoff",   label:"Kraftstoffpreise (Sprit)" },
      { key:"miete",        label:"Mieten / Nebenkosten" },
      { key:"tarife",       label:"ÖPNV/Telekom-Tarife" }
    ],
    hint: "Konkreter = bessere Zuordnung, Quellen, Faktencheck."
  };
}
TS
echo "✓ features/analyze/clarify.ts geschrieben"

# 3) Analyzer (GPT-only, JSON-Parser, Clarify-CTA)
cat > "$FEAT/analyze/analyzeContribution.ts.new" <<'TS'
import { needsClarify, clarifyForPrices } from "./clarify";
import { callOpenAIJson } from "../ai/providers";

export type Claim = {
  text: string;
  categoryMain?: string | null;
  categorySubs?: string[];
  region?: string | null;
  authority?: string | null;
  canon?: string | null;
};

export type AnalyzeResult = {
  language: string | null;
  mainTopic: string | null;
  subTopics: string[];
  regionHint: string | null;
  claims: Claim[];
  news: any[];
  scoreHints: { baseWeight?: number; reasons?: string[] } | null;
  cta: any | null;
  _meta: {
    mode: "gpt" | "ari" | "error";
    errors: string[] | null;
    tookMs: number;
    gptMs?: number;
    gptText: string | null;
  };
};

export async function analyzeContribution(
  text: string,
  opts: { maxClaims?: number; context?: any; debug?: boolean } = {}
): Promise<AnalyzeResult> {
  const t0 = Date.now();
  const errs: string[] = [];
  const maxClaims = Math.max(1, Number(opts.maxClaims ?? 5));

  let outText = "";
  let gptMs = 0;

  const prompt = [
    "Analysiere den folgenden Bürgertext. Antworte NUR mit gültigem JSON (RFC8259).",
    "Schema: {",
    '  "language": "de"|"en"|null,',
    '  "mainTopic": string|null,',
    '  "subTopics": string[],',
    '  "regionHint": string|null,',
    '  "claims": [ { "text": string, "categoryMain": string|null, "categorySubs": string[], "region": string|null, "authority": string|null } ],',
    '  "news": [], "scoreHints": { "baseWeight": number, "reasons": string[] }, "cta": null',
    "}",
    "Beachte: maximal " + maxClaims + " prägnante Claims; keine Erklärtexte.",
    "Text:",
    text,
  ].join("\n");

  let parsed: any = {};
  try {
    const tCall0 = Date.now();
    const { text: t } = await callOpenAIJson(prompt, 1600);
    gptMs = Date.now() - tCall0;
    outText = String(t || "");
    parsed = JSON.parse(outText || "{}");
  } catch (e: any) {
    errs.push("GPT JSON parse failed: " + String(e?.message || e));
    parsed = {};
  }

  const claims: Claim[] = Array.isArray(parsed?.claims)
    ? (parsed.claims as any[])
        .slice(0, maxClaims)
        .map((c): Claim => {
          const rawCat = c?.categoryMain ?? null;
          const catDE =
            rawCat && String(rawCat).toLowerCase() === "opinion" ? "Meinung" : rawCat;
          return {
            text: String(c?.text || "").trim(),
            categoryMain: catDE,
            categorySubs: Array.isArray(c?.categorySubs) ? c.categorySubs : [],
            region: c?.region ?? null,
            authority: c?.authority ?? null,
            canon: c?.canon ?? null,
          };
        })
        .filter((c) => c.text)
    : [];

  // Heuristik: Preiserhöhung → Wirtschaft/Preise
  if (/preiserh[oö]hung/i.test(claims?.[0]?.text || "")) {
    claims[0] = {
      ...claims[0],
      categoryMain: "Wirtschaft",
      categorySubs: Array.from(new Set([...(claims[0].categorySubs || []), "Preise", "Tarife"])),
    };
  }

  const result: Omit<AnalyzeResult, "_meta"> = {
    language: parsed?.language ?? null,
    mainTopic: parsed?.mainTopic ?? null,
    subTopics: Array.isArray(parsed?.subTopics) ? parsed.subTopics : [],
    regionHint: parsed?.regionHint ?? null,
    claims,
    news: Array.isArray(parsed?.news) ? parsed.news : [],
    scoreHints: parsed?.scoreHints ?? null,
    cta: null,
  };

  // Clarify-CTA bei zu allgemeiner Preis-Aussage
  let cta: any = null;
  const first = result.claims?.[0];
  if (first && needsClarify({ text: first.text, categoryMain: first.categoryMain, region: first.region })) {
    const topic = (result.mainTopic || first.categoryMain || "").toLowerCase();
    if (topic.includes("preis")) cta = { type: "clarify", topic: "prices", ...clarifyForPrices() };
  }

  const _meta: AnalyzeResult["_meta"] = {
    mode: errs.length ? "error" : "gpt",
    errors: errs.length ? errs : null,
    tookMs: Date.now() - t0,
    gptMs,
    gptText: opts.debug ? outText ?? null : null,
  };

  return { ...result, cta, _meta };
}
TS
bak "$FEAT/analyze/analyzeContribution.ts"
mv "$FEAT/analyze/analyzeContribution.ts.new" "$FEAT/analyze/analyzeContribution.ts"
echo "✓ features/analyze/analyzeContribution.ts geschrieben"

# 4) API-Route: /api/contributions/analyze
ensure_dir "$WEB/src/app/api/contributions/analyze"
cat > "$WEB/src/app/api/contributions/analyze/route.ts.new" <<'TS'
// apps/web/src/app/api/contributions/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeContribution } from "@features/analyze/analyzeContribution";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const body = await req.json().catch(() => ({} as any));
  const { text, maxClaims, context } = body ?? {};
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text missing" }, { status: 400 });
  }
  try {
    const result = await analyzeContribution(String(text), {
      maxClaims: Number(maxClaims ?? 5),
      context: context ?? {},
      debug
    });
    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ _meta: { mode: "error", errors:[ String(e?.message||e) ] } }, { status: 500 });
  }
}
TS
bak "$WEB/src/app/api/contributions/analyze/route.ts"
mv "$WEB/src/app/api/contributions/analyze/route.ts.new" "$WEB/src/app/api/contributions/analyze/route.ts"
echo "✓ API route /api/contributions/analyze geschrieben"

# 5) Diag-Route: /api/diag/gpt
ensure_dir "$WEB/src/app/api/diag/gpt"
cat > "$WEB/src/app/api/diag/gpt/route.ts" <<'TS'
import { NextResponse } from "next/server";
import { callOpenAIJson } from "@features/ai/providers";

export async function GET() {
  try {
    const t0 = Date.now();
    const { text, raw } = await callOpenAIJson(
      'Gib NUR JSON: {"ok":true,"echo":"pong","ts":"2025-01-01T00:00:00Z"}',
      256
    );
    const timeMs = Date.now() - t0;
    // Versuche, Text zu parsen, zeige usage
    let usage = raw?.usage || raw?.response?.usage || {};
    return NextResponse.json({ ok:true, text, timeMs, usage });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 500 });
  }
}
TS
echo "✓ Diag route /api/diag/gpt geschrieben"

# 6) Analyze UI: Stepper + CTA Render
APP_PAGE="$WEB/src/app/contributions/analyze/page.tsx"
bak "$APP_PAGE"
cat > "$APP_PAGE" <<'TSX'
"use client";
import React from "react";

type Phase = "idle" | "starting" | "gpt" | "ari" | "facts" | "done" | "error";

type AnalyzeResult = {
  language: string | null;
  mainTopic: string | null;
  subTopics: string[];
  regionHint: string | null;
  claims: Array<{
    text: string;
    categoryMain?: string | null;
    categorySubs?: string[];
    region?: string | null;
    authority?: string | null;
    weight?: number;
    scope?: number;
  }>;
  news: any[];
  scoreHints: { baseWeight?: number; reasons?: string[] } | null;
  cta: any | null;
  _meta: { mode: string; errors: string[] | null; tookMs: number; gptMs?: number; gptText: string | null; };
};

function starsFromWeight(w?: number) {
  if (!w || w <= 0) return 0;
  if (w < 1) return 1; if (w < 1.5) return 2; if (w < 2) return 3; if (w < 2.5) return 4; return 5;
}
function ScopeDots({ value = 0, onChange }:{ value?:number; onChange:(v:number)=>void }) {
  return (
    <div className="flex items-center gap-3">
      {[1,2,3,4,5].map(n=>(
        <button key={n} aria-label={`Gesellschaftlicher Umfang: ${n}`}
          onClick={()=>onChange(n)}
          className={["h-3.5 w-3.5 rounded-full border-0", n<=(value||0)?"bg-gradient-to-r from-teal-500 to-blue-400 shadow":"bg-gray-200"].join(" ")} />
      ))}
    </div>
  );
}
function StepIndicator({ phase }: { phase: Phase }) {
  const steps = [{id:"gpt",label:"GPT-Analyse"},{id:"ari",label:"Recherche"},{id:"facts",label:"Faktencheck"}] as const;
  const activeIdx = phase==="done" ? steps.length-1 : Math.max(0, steps.findIndex(s=>s.id===phase));
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s,i)=>(
        <div key={s.id} className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full border ${i<=activeIdx?"bg-teal-50 border-teal-300 text-teal-700":"bg-gray-50 border-gray-200 text-gray-500"}`}>{s.label}</div>
          {i<steps.length-1 && <div className="w-6 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  );
}

export default function AnalyzeContributionPage() {
  const [text, setText] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AnalyzeResult | null>(null);

  async function analyze() {
    if (!text.trim()) return;
    setPhase("starting"); setError(null); setResult(null);
    setPhase("gpt");

    const res = await fetch("/api/contributions/analyze?debug=1", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text })
    });

    if (!res.ok) { setPhase("error"); setError(`HTTP ${res.status}`); return; }
    const data = await res.json() as AnalyzeResult;
    setResult(data);
    // (Stubs für nächste Phasen)
    setPhase("done");
  }

  function patchClaim(i:number, patch:Partial<AnalyzeResult["claims"][number]>) {
    setResult(prev=>{ if(!prev) return prev; const next=structuredClone(prev); next.claims[i]={...next.claims[i], ...patch}; return next; });
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Beitrag erstellen & analysieren</h1>
        <StepIndicator phase={phase} />
      </div>

      <textarea
        placeholder="Dein Text…"
        value={text} onChange={(e)=>setText(e.target.value)}
        className="mt-4 w-full min-h-[180px] rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-teal-400"
      />

      <div className="mt-3">
        <button onClick={analyze} disabled={phase==="gpt"||phase==="starting"} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-60">
          {phase==="gpt"||phase==="starting" ? "Analysiere…" : "Analyse starten"}
        </button>
      </div>

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {result?.cta?.type==="clarify" && (
        <div className="mt-5 rounded-lg border p-4 bg-amber-50">
          <div className="font-semibold mb-1">{result.cta.title}</div>
          <div className="text-sm text-amber-700 mb-2">{result.cta.hint}</div>
          <div className="flex flex-wrap gap-2">
            {result.cta.options?.map((o:any)=>(
              <button key={o.key} className="px-2 py-1 rounded border bg-white text-sm"
                onClick={()=>setText(t=>`${t}\n(Genauer: ${o.label})`)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {result?.claims?.length ? (
        <div className="mt-6">
          <div className="mb-3 text-sm text-gray-600">
            <span className="font-semibold">Ergebnisse</span> • Sprache: {result.language || "—"} • Hauptthema: {result.mainTopic || "—"}
            {result._meta?.tookMs!=null && <span className="ml-2">• Dauer: {result._meta.tookMs} ms</span>}
          </div>

          {result.claims.map((c, i) => {
            const stars = starsFromWeight(c.weight ?? result?.scoreHints?.baseWeight ?? 0);
            return (
              <div key={i} className="mb-3 rounded-xl border border-gray-200 p-4">
                <div className="mb-2 font-semibold">Aussage {i+1}</div>
                <div className="mb-2">{c.text}</div>
                <div className="mb-3 text-sm text-gray-600">
                  Thema: <b>{c.categoryMain ?? "—"}</b>
                  {c.categorySubs?.length ? (<><span className="mx-1">•</span>Sub: {c.categorySubs.join(", ")}</>) : null}
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <div className="text-xs text-gray-500">Relevanz</div>
                    <div>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>patchClaim(i, { weight:n })}
                          className={`text-xl ${n<=stars ? "text-amber-500":"text-gray-200"}`}>★</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Gesellschaftlicher Umfang</div>
                    <ScopeDots value={c.scope ?? 0} onChange={(v)=>patchClaim(i,{scope:v})} />
                  </div>
                </div>
              </div>
            );
          })}

          <details className="mt-4 text-sm text-gray-600">
            <summary className="cursor-pointer select-none font-medium">Debug / Meta</summary>
            <pre className="mt-2 overflow-auto rounded-md bg-gray-50 p-3">{JSON.stringify(result._meta, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
TSX
echo "✓ Analyze UI aktualisiert"

echo
echo "✅ Patch fertig. Bitte Dev-Server neu starten, falls er noch den alten Code hält."
echo "Tipp: pnpm --filter @vog/web dev"
