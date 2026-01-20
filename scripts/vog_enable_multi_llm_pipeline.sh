#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1) Orchestrator-Erweiterung (neue Datei, keine bestehende überschreiben)
mkdir -p "$ROOT/features/ai"
cat > "$ROOT/features/ai/orchestrator_contrib.ts" <<'TS'
export type AnalyzerInput = { text: string; maxClaims?: number; localeHint?: string };
export type AnalyzerClaim = {
  text: string; categoryMain?: string|null; categorySubs?: string[]; region?: string|null; authority?: string|null;
};
export type AnalyzerOut = {
  language: string|null; mainTopic: string|null; subTopics: string[]; regionHint: string|null;
  claims: AnalyzerClaim[]; news: any[]; scoreHints: { baseWeight?: number; reasons?: string[] }|null;
  _meta: { mode: "multi"|"gpt"|"error"; tookMs: number; engines: Record<string, {ok:boolean; ms:number; tokens?:any; err?:string}>; };
};

import { runOpenAI } from "./providers/openai";        // vorhanden :contentReference[oaicite:1]{index=1}
import { runAnthropic } from "./providers/anthropic";  // vorhanden :contentReference[oaicite:2]{index=2}
import { runMistral } from "./providers/mistral";      // vorhanden :contentReference[oaicite:3]{index=3}

import fs from "node:fs";
import path from "node:path";

function promptFrom(file:string) {
  const p = path.join(process.cwd(), "core/prompts", file); // core/prompts existiert :contentReference[oaicite:4]{index=4}
  return fs.readFileSync(p, "utf8");
}

const SHARED = () => promptFrom("_shared_constraints.md");
const P_GPT = () => promptFrom("gpt_analysis.md");
const P_CLAUDE = () => promptFrom("claude_analysis.md");
const P_MISTRAL = () => promptFrom("mistral_analysis.md");

type EngineSpec = { id: "gpt5"|"claude"|"mistral"; run: (p:string, maxTokens:number)=>Promise<{text:string; usage?:any}>; prompt:string };
function engines(): EngineSpec[] {
  return [
    { id:"gpt5",    run:(p,mx)=>runOpenAI({ prompt:p, maxTokens:mx, jsonExpected:true }),
      prompt: [SHARED(), P_GPT()].join("\n\n") },
    { id:"claude",  run:(p,mx)=>runAnthropic({ prompt:p, maxTokens:mx, jsonExpected:true }),
      prompt: [SHARED(), P_CLAUDE()].join("\n\n") },
    { id:"mistral", run:(p,mx)=>runMistral({ prompt:p, maxTokens:mx, jsonExpected:true }),
      prompt: [SHARED(), P_MISTRAL()].join("\n\n") },
  ];
}

export async function analyzeMulti(input: AnalyzerInput): Promise<AnalyzerOut> {
  const t0 = Date.now();
  const ask = (base:string) => [
    base,
    "",
    "Antwort NUR als **gültiges JSON**:",
    `{"language": "de|en|null", "mainTopic": string|null, "subTopics": string[], "regionHint": string|null,`,
    `"claims":[{"text":string,"categoryMain":string|null,"categorySubs":string[],"region":string|null,"authority":string|null}],`,
    `"news":[], "scoreHints":{"baseWeight": number, "reasons": string[]}}`,
    "",
    "Text:",
    input.text
  ].join("\n");

  const specs = engines();
  const results: Record<string, {ok:boolean; ms:number; text?:string; usage?:any; err?:string}> = {};

  await Promise.all(specs.map(async (e)=>{
    const t1 = Date.now();
    try {
      const { text, usage } = await e.run(ask(e.prompt), 1600);
      results[e.id] = { ok:true, ms: Date.now()-t1, text, usage };
    } catch(err:any) {
      results[e.id] = { ok:false, ms: Date.now()-t1, err: String(err?.message||err) };
    }
  }));

  // Auswahl/Consensus: bevorzugt valides JSON + vollständigste claims
  function tryParse(s?:string){ try{ return s? JSON.parse(s):null }catch{ return null } }
  const parsed = (["gpt5","claude","mistral"] as const)
    .map(id => ({ id, p: tryParse(results[id]?.text||"") }))
    .filter(x=>x.p && Array.isArray(x.p.claims))
    .sort((a,b)=> (b.p.claims?.length||0) - (a.p.claims?.length||0));

  if (parsed.length===0) {
    return {
      language: null, mainTopic: null, subTopics: [], regionHint: null,
      claims: [], news: [], scoreHints: null,
      _meta: { mode:"error", tookMs: Date.now()-t0, engines: results }
    };
  }

  // Erster valider als Primär, leichte Normalisierung (Opinion->Meinung)
  const prim = parsed[0].p;
  const claims = (Array.isArray(prim.claims)? prim.claims:[]).map((c:any)=>({
    text: String(c?.text||"").trim(),
    categoryMain: c?.categoryMain && String(c.categoryMain).toLowerCase()==="opinion" ? "Meinung" : c?.categoryMain ?? null,
    categorySubs: Array.isArray(c?.categorySubs)? c.categorySubs : [],
    region: c?.region ?? null,
    authority: c?.authority ?? null
  }));

  // leichte Heuristik: Preiserhöhung -> Wirtschaft/Preise (wie vorher)
  if (claims[0]?.text && /preiserh[oö]hung/i.test(claims[0].text)) {
    claims[0].categoryMain = "Wirtschaft";
    claims[0].categorySubs = Array.from(new Set([...(claims[0].categorySubs||[]), "Preise","Tarife"]));
  }

  return {
    language: prim.language ?? null,
    mainTopic: prim.mainTopic ?? null,
    subTopics: Array.isArray(prim.subTopics)? prim.subTopics : [],
    regionHint: prim.regionHint ?? null,
    claims,
    news: Array.isArray(prim.news)? prim.news : [],
    scoreHints: prim.scoreHints ?? null,
    _meta: { mode:"multi", tookMs: Date.now()-t0, engines: results }
  };
}
TS

# 2) Pipeline-Step (neu)
mkdir -p "$ROOT/apps/web/src/pipeline/steps"
cat > "$ROOT/apps/web/src/pipeline/steps/analyze_multi_llm.ts" <<'TS'
import type { AnalyzeResult } from "@/features/analyze/analyzeContribution"; // kompatibler Typ
import { analyzeMulti } from "@/features/ai/orchestrator_contrib";

export async function step_analyze_multi_llm(text:string, opts:{maxClaims?:number}={}): Promise<AnalyzeResult> {
  const out = await analyzeMulti({ text, maxClaims: opts.maxClaims });
  return {
    language: out.language,
    mainTopic: out.mainTopic,
    subTopics: out.subTopics,
    regionHint: out.regionHint,
    claims: out.claims,
    news: out.news,
    scoreHints: out.scoreHints,
    cta: null,
    _meta: {
      mode: out._meta.mode==="error" ? "error" : "gpt",
      errors: out._meta.mode==="error" ? ["multi-llm failed"] : null,
      tookMs: out._meta.tookMs,
      gptMs: undefined,
      gptText: null
    }
  };
}
TS

# 3) API-Route contributions/analyze erweitern (Feature-Flag)
ROUTE="$ROOT/apps/web/src/app/api/contributions/analyze/route.ts"
if [ -f "$ROUTE" ]; then
  if ! grep -q "step_analyze_multi_llm" "$ROUTE"; then
    sed -i '' '1i\
import { step_analyze_multi_llm } from "@/app/pipeline/steps/analyze_multi_llm";\
' "$ROUTE"

    # Hinterlege Umschalter per Query (?mode=multi)
    perl -0777 -i -pe 's/const result\s*=\s*await\s*analyzeContribution\(([^)]+)\);/const USE_MULTI = (req.nextUrl?.searchParams?.get("mode") === "multi") || process.env.VOG_ANALYZE_MODE==="multi";\n  const result = USE_MULTI\n    ? await step_analyze_multi_llm(text, { maxClaims })\n    : await analyzeContribution(text, { maxClaims });/s' "$ROUTE"
  fi
fi

# 4) Admin-Config: Schalter sichtbar machen (falls Datei vorhanden)
ADMIN_CFG="$ROOT/apps/web/src/config/admin-config.ts"
if [ -f "$ADMIN_CFG" ] && ! grep -q "VOG_ANALYZE_MODE" "$ADMIN_CFG"; then
  cat >> "$ADMIN_CFG" <<'TS'

// eDebatte Analyse-Modus Schalter
export const ANALYZE_MODE_FLAG = process.env.VOG_ANALYZE_MODE || "gpt"; // "gpt" | "multi"
TS
fi

# 5) Beispiel .env.local Ergänzungen
ENVF="$ROOT/apps/web/.env.local"
touch "$ENVF"
grep -q '^VOG_ANALYZE_MODE=' "$ENVF" || echo 'VOG_ANALYZE_MODE=gpt' >> "$ENVF"
grep -q '^OPENAI_MODEL=' "$ENVF"      || echo 'OPENAI_MODEL=gpt-5-2025-08-07' >> "$ENVF"
grep -q '^ANTHROPIC_MODEL=' "$ENVF"   || echo 'ANTHROPIC_MODEL=claude-3-7-sonnet' >> "$ENVF"
grep -q '^MISTRAL_MODEL=' "$ENVF"     || echo 'MISTRAL_MODEL=mistral-large-latest' >> "$ENVF"

echo "✓ Multi-LLM Pipeline verdrahtet. Setze VOG_ANALYZE_MODE=multi für parallele Engines."
