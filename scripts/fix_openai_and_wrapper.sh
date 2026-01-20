#!/usr/bin/env bash
set -euo pipefail

# Wurzeln relativ zu apps/web – bitte ggf. anpassen, falls dein Pfad anders ist.
ROOT="apps/web/src"

ANALYZE_FEAT="$ROOT/features/analyze/analyzeContribution.ts"
WRAPPER_FEAT="$ROOT/features/analyze/wrapper.ts"
ROUTE_FILE="$ROOT/app/api/contributions/analyze/route.ts"

echo "→ Patch: $ANALYZE_FEAT"
mkdir -p "$(dirname "$ANALYZE_FEAT")"
cat > "$ANALYZE_FEAT" <<'TS'
import { z } from "zod";

/* === Schemas (kompakt) === */
const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
  id: z.string().optional(),
  claimType: z.enum(["Fakt","Forderung","Prognose","Wertung"]).optional(),
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

/* === Systemprompt === */
function buildSystemPrompt() {
  return `
Du bist ein strenger Extraktor für eDebatte (eDebatte). Antworte NUR mit JSON.
Ziel: wenige, präzise, abstimmbare Aussagen ("claims"). Genau 1 prüfbare Aussage je claim.text (≤180 Zeichen, keine "und/oder").
Nutze Domain-/Topic-Kanon; setze region/authority nur bei klarer Salienz.
Liefere optional: claimType, policyInstrument, ballotDimension, timeframe, targets[], evidence[], decisionMaker, jurisdiction, verifiability, checks[], relevance, confidence.
JSON-Form:
{"language":"de","mainTopic":null,"subTopics":[],"regionHint":null,"claims":[{...}]}
`.trim();
}

/* === Normalizer === */
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

/* === OpenAI Responses API (GPT-5 Thinking) === */
export async function analyzeContribution(text: string): Promise<AnalyzeResult> {
  const model = process.env.OPENAI_MODEL || "gpt-5"; // bleibt bei dir ENV-overridebar
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const body = {
    model,
    reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "medium" },
    input: [
      { role: "system", content: [{ type: "input_text", text: buildSystemPrompt() }] },
      { role: "user",   content: [{ type: "input_text", text: String(text).slice(0, 8000) }] },
    ],
    text: { format: "json" as const },
    max_output_tokens: 1500,
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const full = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status} – ${JSON.stringify(full)}`);

  const outText = (full.output_text ?? "").trim();
  let parsed: any = null;
  try { parsed = JSON.parse(outText); } catch {}

  let out = coerceToAnalyzeResult(parsed, text);

  // Sanitize & Dedupe
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

# Wrapper: Topic "Veranstaltungen" aus Typbereich rausnehmen (Domain bleibt)
if [ -f "$WRAPPER_FEAT" ]; then
  echo "→ Patch: $WRAPPER_FEAT"
  sed -i '' -E \
    -e 's/(\[\/silvester\|veranstalt\|event\|party\/i, \{ domain: "Kultur, Medien & Sport"), topic: "[^"]+"\s*\}/\1 \}/' \
    -e 's/return \{ domain: "Kultur, Medien & Sport", topic: "[^"]+" \} as Hit;/return { domain: "Kultur, Medien & Sport" } as Hit;/' \
    -e 's/\{ domain: "Kultur, Medien & Sport", topic: "[^"]+" \} as Hit;/{ domain: "Kultur, Medien & Sport" } as Hit;/' \
    "$WRAPPER_FEAT" || true
fi

# Next route: type-only für NextRequest (verbatimModuleSyntax)
if [ -f "$ROUTE_FILE" ]; then
  echo "→ Patch: $ROUTE_FILE"
  # erste Importzeile anpassen
  sed -i '' -E '1,20 s/import \{ NextRequest, NextResponse \} from "next\/server";/import type { NextRequest } from "next\\/server";\nimport { NextResponse } from "next\\/server";/' "$ROUTE_FILE" || true
fi

echo "✓ Patches geschrieben. Starte jetzt: pnpm --filter @vog/web dev"
