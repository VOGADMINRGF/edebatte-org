#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
PROV="$ROOT/features/ai/providers"
ORCH="$ROOT/features/ai"

echo "→ Stelle Ordner sicher…"
mkdir -p "$PROV" "$ORCH" "$WEB/src/app/pipeline/steps" "$WEB/src/app/api/contributions/analyze"

# ---------- OPENAI PROVIDER: runOpenAI hinzufügen (Responses-API, JSON-safe) ----------
if ! grep -q 'export async function runOpenAI' "$PROV/openai.ts" 2>/dev/null; then
  cat >> "$PROV/openai.ts" <<'TSAPPEND'

// --- [eDebatte append] Unified runner for orchestrator ---
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
  if (typeof data?.text === "string") {
    out = data.text;
  } else if (Array.isArray(data?.output)) {
    const parts = data.output
      .flatMap((it: any) => (Array.isArray(it?.content) ? it.content : []))
      .map((c: any) => (typeof c?.text === "string" ? c.text : ""))
      .filter(Boolean);
    if (parts.length) out = parts.join("\n");
  }
  return { ok: true, text: out || "", raw: data, usage: data?.usage, ms: Date.now() - t0 };
}
TSAPPEND
  echo "✓ OpenAI: runOpenAI export (append) bereitgestellt."
else
  echo "✓ OpenAI: runOpenAI bereits vorhanden."
fi

# ---------- ANTHROPIC PROVIDER ----------
cat > "$PROV/anthropic.ts" <<'TS'
export async function runAnthropic(
  prompt: string,
  opts: { json?: boolean; model?: string; system?: string; timeoutMs?: number } = {}
) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = opts.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20240620";
  if (!key) return { ok: false, text: "", skipped: true, error: "ANTHROPIC_API_KEY missing" };

  const body: any = {
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: String(prompt || "") }],
    ...(opts.system ? { system: String(opts.system) } : {}),
  };
  if (opts.json) {
    body.system = `${opts.system ?? ""}\n\nDu MUSST ausschließlich gültiges JSON (RFC8259) ohne Fließtext zurückgeben.`;
  }

  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    return { ok: false, text: "", error: `Anthropic ${res.status} – ${msg}`, ms: Date.now() - t0 };
  }
  const data = await res.json();
  const text = Array.isArray(data?.content) ? data.content.find((c: any) => c?.type === "text")?.text || "" : "";
  return { ok: true, text: text || "", raw: data, ms: Date.now() - t0 };
}
TS
echo "✓ Anthropic: runAnthropic bereitgestellt."

# ---------- MISTRAL PROVIDER ----------
cat > "$PROV/mistral.ts" <<'TS'
export async function runMistral(
  prompt: string,
  opts: { json?: boolean; model?: string; system?: string; timeoutMs?: number } = {}
) {
  const key = process.env.MISTRAL_API_KEY;
  const model = opts.model || process.env.MISTRAL_MODEL || "mistral-large-latest";
  if (!key) return { ok: false, text: "", skipped: true, error: "MISTRAL_API_KEY missing" };

  const t0 = Date.now();
  const body: any = {
    model,
    messages: [
      ...(opts.system ? [{ role: "system", content: String(opts.system) }] : []),
      { role: "user", content: String(prompt || "") },
    ],
    max_tokens: 1024,
  };
  if (opts.json) {
    body.messages.unshift({
      role: "system",
      content: "Gib ausschließlich gültiges JSON (RFC8259) ohne erklärenden Text zurück.",
    });
  }

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    return { ok: false, text: "", error: `Mistral ${res.status} – ${msg}`, ms: Date.now() - t0 };
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  return { ok: true, text: String(text || ""), raw: data, ms: Date.now() - t0 };
}
TS
echo "✓ Mistral: runMistral bereitgestellt."

# ---------- ORCHESTRATOR ----------
cat > "$ORCH/orchestrator_contrib.ts" <<'TS'
import { runOpenAI } from "./providers/openai";
import { runAnthropic } from "./providers/anthropic";
import { runMistral } from "./providers/mistral";

export type OrchestratorRun = {
  provider: "openai" | "anthropic" | "mistral";
  ok: boolean;
  text: string;
  ms?: number;
  error?: string;
  skipped?: boolean;
  raw?: any;
};

export async function orchestrateContribution(
  prompt: string,
  opts: { json?: boolean } = {}
): Promise<{ runs: OrchestratorRun[]; best: OrchestratorRun | null }> {
  const runs: OrchestratorRun[] = [];

  // GPT-5 first (du willst GPT-first), die anderen soft-optional
  runs.push({ provider: "openai", ...(await runOpenAI(prompt, { json: !!opts.json, timeoutMs: 30000 })) });
  runs.push({ provider: "anthropic", ...(await runAnthropic(prompt, { json: !!opts.json, timeoutMs: 30000 })) });
  runs.push({ provider: "mistral", ...(await runMistral(prompt, { json: !!opts.json, timeoutMs: 30000 })) });

  const success = runs.find((r) => r.ok && r.text);
  const best = success || runs.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))[0] || null;

  return { runs, best };
}
TS
echo "✓ Orchestrator: vereinheitlichte Imports & Auswahl-Logik."

# ---------- STEP: analyze_multi_llm ----------
cat > "$WEB/src/app/pipeline/steps/analyze_multi_llm.ts" <<'TS'
import { orchestrateContribution } from "@/features/ai/orchestrator_contrib";

export async function step_analyze_multi_llm(
  text: string,
  { maxClaims = 5 }: { maxClaims?: number } = {}
) {
  const prompt = [
    "Analysiere den folgenden Bürgertext und gib NUR gültiges JSON (RFC8259) zurück.",
    "Schema: {",
    '  "language": "de"|"en"|null,',
    '  "mainTopic": string|null,',
    '  "subTopics": string[],',
    '  "regionHint": string|null,',
    '  "claims": [ { "text": string, "categoryMain": string|null, "categorySubs": string[], "region": string|null, "authority": string|null } ],',
    '  "news": [], "scoreHints": { "baseWeight": number, "reasons": string[] }, "cta": null',
    "}",
    `Beachte: maximal ${maxClaims} prägnante Claims; keine Erklärtexte.`,
    "Text:",
    text,
  ].join("\n");

  const { runs, best } = await orchestrateContribution(prompt, { json: true });

  let parsed: any = {};
  let parseError: string | null = null;
  try {
    parsed = JSON.parse(String(best?.text || "{}"));
  } catch (e: any) {
    parseError = e?.message || String(e);
  }

  const claims = Array.isArray(parsed?.claims) ? parsed.claims.slice(0, maxClaims) : [];

  return {
    language: parsed?.language ?? null,
    mainTopic: parsed?.mainTopic ?? null,
    subTopics: Array.isArray(parsed?.subTopics) ? parsed.subTopics : [],
    regionHint: parsed?.regionHint ?? null,
    claims,
    news: Array.isArray(parsed?.news) ? parsed.news : [],
    scoreHints: parsed?.scoreHints ?? null,
    cta: parsed?.cta ?? null,
    _meta: {
      mode: "multi",
      errors: parseError ? [`JSON parse failed: ${parseError}`] : null,
      tookMs: runs.reduce((s, r) => s + (r.ms || 0), 0),
      runs,
      picked: best?.provider ?? null,
      gptText: best?.text ?? null,
    },
  };
}
TS
echo "✓ Step: analyze_multi_llm erstellt."

# ---------- API ROUTE: /api/contributions/analyze ----------
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
import { step_analyze_multi_llm } from "@/apps/web/src/app/pipeline/steps/analyze_multi_llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const maxClaims = Number(body?.maxClaims ?? 5);
    const modeParam = req.nextUrl.searchParams.get("mode");
    const MODE = (modeParam || process.env.VOG_ANALYZE_MODE || "gpt").toLowerCase();

    if (!text) {
      return NextResponse.json({ error: "Kein Text übergeben." }, { status: 400 });
    }

    const result =
      MODE === "multi"
        ? await step_analyze_multi_llm(text, { maxClaims })
        : await analyzeContribution(text, { maxClaims });

    return NextResponse.json(result, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { _meta: { mode: "error", errors: [String(e?.message || e)] } },
      { status: 500 }
    );
  }
}
TS
echo "✓ API-Route geschrieben."

# ---------- kleine Smoke-Tests ----------
mkdir -p "$ROOT/scripts"
cat > "$ROOT/scripts/smoke_multi.sh" <<'BASH'
#!/usr/bin/env bash
set -e
curl -sS -H 'content-type: application/json' \
  -d '{"text":"Ich bin gegen weitere Preiserhöhungen.","maxClaims":2}' \
  'http://127.0.0.1:3000/api/contributions/analyze?mode=multi' \
| jq '{claims, mainTopic, _meta:{mode, picked, errors}}'
BASH
chmod +x "$ROOT/scripts/smoke_multi.sh"

cat > "$ROOT/scripts/smoke_gpt.sh" <<'BASH'
#!/usr/bin/env bash
set -e
curl -sS -H 'content-type: application/json' \
  -d '{"text":"Kurzer Testbeitrag.","maxClaims":2}' \
  'http://127.0.0.1:3000/api/contributions/analyze?mode=gpt' \
| jq '{claims, mainTopic, _meta}'
BASH
chmod +x "$ROOT/scripts/smoke_gpt.sh"

echo
echo "→ Fertig. Bitte Dev-Server neu starten (oder laufend lassen) und dann Smoke-Tests ausführen:"
echo "   scripts/smoke_multi.sh   # Multi-LLM (OpenAI/Claude/Mistral)"
echo "   scripts/smoke_gpt.sh     # GPT-only (bestehende analyzeContribution)"
