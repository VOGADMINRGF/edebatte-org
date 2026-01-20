#!/usr/bin/env bash
set -euo pipefail

# Paths where the analyzer might live (monorepo variants)
CANDIDATES=(
  "apps/web/src/features/analyze/analyzeContribution.ts"
  "features/analyze/analyzeContribution.ts"
)

fix_one() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  cp -f "$f" "$f.bak.$(date +%s)"

  cat > "$f" <<'TS'
// Fixed Responses API usage for eDebatte analyzer
// - content type: "input_text" (NOT "text")
// - system prompt goes into top-level `instructions`
// - JSON mode via text.format: { type: "json_object" }

import { z } from "zod";

/* ── Schemas ─────────────────────────────────────────────────────────────── */
const OptionSchema = z.object({
  label: z.string().min(1).max(120),
  params: z.record(z.string(), z.any()).default({}),
});
const MetricSchema = z.object({
  name: z.string().min(1).max(120),
  target: z.string().min(1).max(120),
});
const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
  id: z.string().optional(),
  claimType: z.enum(["Fakt", "Forderung", "Prognose", "Wertung"]).optional(),
  policyInstrument: z.enum([
    "Steuer/Abgabe","Subvention/Förderung","Verbot/Limit","Erlaubnis/Ausnahme",
    "Transparenz/Reporting","Investition","Organisation/Prozess","Standard/Norm",
  ]).optional(),
  ballotDimension: z.enum(["Budget","Gesetz/Regel","Personal/Organisation","Infrastruktur","Symbol/Resolution"]).optional(),
  timeframe: z.string().max(24).optional(),
  targets: z.array(z.string().min(2).max(40)).max(3).optional(),
  evidence: z.array(z.string().min(1).max(160)).max(6).optional(),
  decisionMaker: z.string().max(160).optional(),
  jurisdiction: z.enum(["kommunal","land","regional","national","eu","global","ÖRR"]).optional(),
  options: z.array(OptionSchema).max(8).optional(),
  metrics: z.array(MetricSchema).max(8).optional(),
  verifiability: z.enum(["hoch","mittel","niedrig"]).optional(),
  checks: z.array(z.string().min(2).max(140)).max(8).optional(),
  relevance: z.number().int().min(1).max(5).optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export const AnalyzeSchema = z.object({
  language: z.string().min(2).max(5).default("de"),
  mainTopic: z.string().min(2).max(80).nullable().optional(),
  subTopics: z.array(z.string().min(2).max(80)).max(10).default([]),
  regionHint: z.string().nullable().optional(),
  claims: z.array(ClaimSchema).min(1).max(20),
});
export type AnalyzeResult = z.infer<typeof AnalyzeSchema>;
export type AnalyzeInput = { text: string; maxClaims?: number; mode?: "offline" | "gpt" };

/* ── Prompt ──────────────────────────────────────────────────────────────── */
function buildSystemPrompt() {
  return `
Du bist ein strenger Extraktor für eDebatte (eDebatte). Antworte **NUR** mit JSON.
Ziel: wenige, präzise, abstimmbare Aussagen ("claims"). Genau 1 prüfbare Aussage je claim.text (≤180 Zeichen, keine "und/oder").
Nutze Domain-/Topic-Kanon; setze region/authority nur bei klarer Salienz.
Liefere optional: claimType, policyInstrument, ballotDimension, timeframe, targets[], evidence[], decisionMaker, jurisdiction, verifiability, checks[], relevance, confidence.
Ausgabe-Form:
{"language":"de","mainTopic":null,"subTopics":[],"regionHint":null,"claims":[{...}]}
`.trim();
}

/* ── Normalizer ──────────────────────────────────────────────────────────── */
function coerceToAnalyzeResult(parsed: any, fallbackText: string): AnalyzeResult {
  const direct = AnalyzeSchema.safeParse(parsed);
  if (direct.success) return direct.data;
  return {
    language: "de",
    mainTopic: null,
    subTopics: [],
    regionHint: null,
    claims: [{
      text: fallbackText,
      categoryMain: null,
      categorySubs: [],
      region: null,
      authority: null,
    }],
  };
}

/* ── Hauptfunktion: OpenAI Responses API ─────────────────────────────────── */
export async function analyzeContribution(text: string): Promise<AnalyzeResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5"; // „GPT-5 Thinking“
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const body = {
    model,
    reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "medium" }, // low|medium|high
    instructions: buildSystemPrompt(), // <-- system prompt hier
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: text.slice(0, 8000) }], // <-- richtiger Typ
      },
    ],
    text: { format: { type: "json_object" } }, // <-- Objekt, nicht String
    max_output_tokens: 1500,
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  const full = await res.json();
  if (!res.ok) {
    // Lass den Route-Handler den Fallback setzen; hier sauber eskalieren
    throw new Error(`OpenAI ${res.status} – ${JSON.stringify(full)}`);
  }

  const content = (full.output_text ?? "").trim();
  let parsed: any = null;
  try { parsed = JSON.parse(content); } catch { /* Schema-Fallback unten */ }

  let out = coerceToAnalyzeResult(parsed, text);

  // Sanitize + Dedupe
  const seen = new Set<string>();
  out.language = (out.language || "de").slice(0, 5);
  out.mainTopic ??= null;
  out.regionHint ??= null;
  out.subTopics ??= [];
  out.claims = (out.claims || [])
    .map((c: any) => ({
      ...c,
      text: (c.text || "").trim().replace(/\s+/g, " ").slice(0, 240),
      categoryMain: c.categoryMain ?? null,
      categorySubs: (c.categorySubs ?? []).slice(0, 2),
      region: c.region ?? null,
      authority: c.authority ?? null,
      relevance: Math.max(1, Math.min(5, Math.round((c as any).relevance ?? 3))),
    }))
    .filter((c: any) => {
      if (!c.text) return false;
      const k = `${c.text}|${c.categoryMain ?? ""}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  if (!out.claims.length) {
    out.claims = [{ text, categoryMain: null, categorySubs: [], region: null, authority: null }];
  }
  return out;
}
TS

  echo "✓ Patched $f"
}

did_fix=false
for f in "${CANDIDATES[@]}"; do
  if [[ -f "$f" ]]; then
    fix_one "$f"
    did_fix=true
  fi
done

if [[ "$did_fix" = false ]]; then
  echo "⚠️  analyzer file not found under known paths. Adjust script paths if needed."
  exit 1
fi

echo "• Typecheck @vog/web (no env changes)"
if command -v pnpm >/dev/null 2>&1; then
  (cd apps/web && pnpm run -s typecheck) || true
fi

cat <<'TIP'

Next: quick smoke test
  curl -sS -X POST http://127.0.0.1:3000/api/contributions/analyze \
    -H 'content-type: application/json' \
    -d '{"text":"Kommunen fordern mehr Mittel für Katastrophenschutz in NRW.","maxClaims":3}' | jq .

You should no longer see:
  _meta.mode: "fallback"
and the error about text.format/input[0].content[0].type should be gone.
TIP
