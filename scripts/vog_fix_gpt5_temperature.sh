#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
echo "🔧 eDebatte: GPT-5 temperature-Fix + stabile Analyzer-Implementierung"

mkdir -p "$ROOT/features/ai" "$ROOT/features/analyze" "$ROOT/apps/web/src/app/api/contributions/analyze"

# providers.ts – zentrale OpenAI/ARI Calls (Responses API, JSON-Mode)
cat > "$ROOT/features/ai/providers.ts" <<"TS"
export type GptJsonOut = any;

function allowTemperature(model: string): boolean {
  const m = model?.toLowerCase() || "";
  // Keine temperature für GPT-5 / O-Reasoning / Reasoning-Modelle
  if (m.startsWith("gpt-5")) return false;
  if (/\bo3|o4\b/.test(m)) return false;
  if (m.includes("reasoning")) return false;
  return true;
}

function openaiUrl(path: string) {
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
  return `${base.replace(/\/+$/,"")}${path}`;
}

export async function callOpenAIJson(text: string, model?: string): Promise<GptJsonOut> {
  const mdl = model || process.env.OPENAI_MODEL || "gpt-5";
  const body: any = {
    model: mdl,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "format: json\n\n" + String(text || "").slice(0, 8000) },
        ],
      },
    ],
    // Responses API JSON-Mode
    text: { format: { type: "json_object" } },
    // tokens-Begrenzung (Responses API heißt das 'max_output_tokens')
    max_output_tokens: 2000,
  };
  if (allowTemperature(mdl)) body.temperature = 0;

  const res = await fetch(openaiUrl("/v1/responses"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.OPENAI_API_KEY || ""}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || res.statusText || "OpenAI error";
    throw new Error(`OpenAI ${res.status} – ${JSON.stringify(json) || msg}`);
  }

  // Responses API gibt in .output_text oder im Tool/Message-Stream zurück.
  // Wir nehmen die simpelste Variante:
  const raw = json?.output_text || json?.output?.[0]?.content?.[0]?.text || json;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    // Falls das Modell bereits Objekt zurückgab
    return raw;
  }
}

export async function callARI(text: string, context: Record<string, any> = {}) {
  const url = process.env.ARI_API_URL;
  if (!url) throw new Error("ARI_API_URL missing");
  const res = await fetch(url.replace(/\/+$/,"") + "/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, context }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`ARI ${res.status} – ${JSON.stringify(json)}`);
  return json;
}
TS

# analyzeContribution.ts – minimal, robust, mit Kaskade GPT→ARI→Fallback
cat > "$ROOT/features/analyze/analyzeContribution.ts" <<"TS"
import { callOpenAIJson, callARI } from "../ai/providers";

export type AnalyzeInput = {
  text: string;
  maxClaims?: number;
  model?: string;
  forceFallback?: boolean;
};

type Claim = {
  text: string;
  categoryMain: string | null;
  categorySubs: string[];
  region: string | null;
  authority: string | null;
  relevance?: number;
};

type AnalyzeResult = {
  language: string | null;
  mainTopic: string | null;
  subTopics: string[];
  regionHint: string | null;
  claims: Claim[];
  pulse?: { approxSources?: number | null; recency?: string | null };
  scoreHints?: { baseWeight: number; reasons: string[] };
  _meta?: Record<string, any>;
};

function fallback(text: string, meta: Record<string, any>): AnalyzeResult {
  const trimmed = String(text || "").slice(0, 180);
  const claims: Claim[] = trimmed
    ? [{ text: trimmed, categoryMain: null, categorySubs: [], region: null, authority: null }]
    : [];
  return {
    language: "de",
    mainTopic: null,
    subTopics: [],
    regionHint: null,
    claims,
    _meta: { mode: "fallback", ...meta },
  };
}

function coerceToResult(raw: any, originalText: string, maxClaims: number): AnalyzeResult {
  // Erwartete Felder absichern
  const out: AnalyzeResult = {
    language: raw?.language ?? null,
    mainTopic: raw?.mainTopic ?? null,
    subTopics: Array.isArray(raw?.subTopics) ? raw.subTopics : [],
    regionHint: raw?.regionHint ?? null,
    claims: Array.isArray(raw?.claims)
      ? raw.claims.filter((c: any) => c?.text).map((c: any) => ({
          text: String(c.text),
          categoryMain: c?.categoryMain ?? null,
          categorySubs: Array.isArray(c?.categorySubs) ? c.categorySubs : [],
          region: c?.region ?? null,
          authority: c?.authority ?? null,
          relevance: typeof c?.relevance === "number" ? c.relevance : undefined,
        }))
      : [],
    pulse: typeof raw?.pulse === "object" ? raw.pulse : undefined,
    scoreHints: typeof raw?.scoreHints === "object" ? raw.scoreHints : undefined,
    _meta: typeof raw?._meta === "object" ? raw._meta : undefined,
  };

  if (!out.claims.length && originalText) {
    out.claims = [{
      text: String(originalText).slice(0, 180),
      categoryMain: null,
      categorySubs: [],
      region: null,
      authority: null,
    }];
  }
  if (out.claims.length > maxClaims) out.claims = out.claims.slice(0, maxClaims);

  // Standard-Scoring-Hinweise (dein Gamification-Modell: 0.4/1.0/1.2/1.4)
  if (!out.scoreHints) {
    out.scoreHints = {
      baseWeight: 1.0,
      reasons: ["Standardgewichtung – keine zusätzlichen Nachweise"],
    };
  }
  return out;
}

export async function analyzeContribution(
  text: string,
  { maxClaims = 3, model, forceFallback = false }: { maxClaims?: number; model?: string; forceFallback?: boolean } = {},
): Promise<AnalyzeResult> {
  if (forceFallback) {
    return fallback(text, { reason: "forced" });
  }

  // 1) GPT zuerst
  try {
    const gpt = await callOpenAIJson(text, model);
    const out = coerceToResult(gpt, text, maxClaims);
    out._meta = { ...(out._meta || {}), mode: "gpt" };
    return out;
  } catch (e1: any) {
    // 2) ARI nur wenn konfiguriert
    try {
      const ari = await callARI(text, { source: "analyzeContribution" });
      const out = coerceToResult(ari, text, maxClaims);
      out._meta = { ...(out._meta || {}), mode: "ari", gptError: String(e1?.message || e1) };
      return out;
    } catch (e2: any) {
      // 3) Sanfter Fallback
      return fallback(text, {
        gptError: String(e1?.message || e1),
        ariError: String(e2?.message || e2),
      });
    }
  }
}
TS

# API-Route sicherstellen (Import via @features)
ROUTE="$ROOT/apps/web/src/app/api/contributions/analyze/route.ts"
mkdir -p "$(dirname "$ROUTE")"
cat > "$ROUTE" <<"TS"
// apps/web/src/app/api/contributions/analyze/route.ts
import { NextResponse } from "next/server";
import { analyzeContribution } from "@features/analyze/analyzeContribution";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(()=> ({}));
    const { text = "", maxClaims = 3, model, forceFallback = false } = body || {};
    const result = await analyzeContribution(String(text || ""), { model, maxClaims, forceFallback: !!forceFallback });
    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 });
  }
}
TS

# Alias @features → Repo-Root/features in tsconfig.base.json
TSBASE="$ROOT/tsconfig.base.json"
if command -v jq >/dev/null 2>&1; then
  TMP="$(mktemp)"
  jq '
    .compilerOptions //= {} |
    .compilerOptions.baseUrl //= "." |
    .compilerOptions.paths //= {} |
    .compilerOptions.paths["@features/*"] = ["features/*"]
  ' "$TSBASE" > "$TMP"
  mv "$TMP" "$TSBASE"
else
  echo "ℹ️  jq fehlt. Bitte in tsconfig.base.json unter compilerOptions.paths eintragen:"
  echo '    "@features/*": ["features/*"]'
fi

echo "🧹 Alte .bak/.old in apps/web/src & features säubern…"
find "$ROOT/apps/web/src" "$ROOT/features" -type f \( -name "*.bak" -o -name "*.BAK" -o -name "*.old" \) -print -delete || true

echo "✅ Fertig. Starte jetzt:"
echo "pnpm --filter @vog/web dev"
echo
echo "Test:"
echo "curl -sS -X POST http://127.0.0.1:3000/api/contributions/analyze -H 'content-type: application/json' -d '{\"text\":\"Kommunen fordern mehr Mittel für Katastrophenschutz in NRW.\",\"maxClaims\":3}' | jq ."
