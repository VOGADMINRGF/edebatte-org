#!/usr/bin/env bash
set -euo pipefail

FILE="features/ai/providers/openai.ts"
BACKUP="$FILE.bak.$(date +%s)"
mkdir -p "$(dirname "$FILE")"
[ -f "$FILE" ] && cp "$FILE" "$BACKUP" && echo "• Backup -> $BACKUP"

cat > "$FILE" <<'TS'
// OpenAI Responses API — stabiler Minimal-Client (Text-only, optional JSON).
// - Keine: modalities, temperature, response_format
// - Erst normal mit Instruktion, bei 400(text.format) 1x Retry mit { text:{ format:{ type:"json_object" } } }

const API_BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");
const MODEL    = process.env.OPENAI_MODEL || "gpt-4o-mini";

export type AskArgs = {
  prompt: string;
  asJson?: boolean;
  maxOutputTokens?: number;
  signal?: AbortSignal;
};
export type AskResult = { text: string; raw: any };

function withJsonInstruction(s: string){
  return `${s}\n\nReturn ONLY valid JSON (RFC8259). No preamble, no Markdown, no code fences.`;
}

async function post(body:any, signal?:AbortSignal){
  const res = await fetch(`${API_BASE}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok){
    const msg = data?.error?.message || JSON.stringify(data);
    const err:any = new Error(`OpenAI error ${res.status}: ${msg}`);
    err.status = res.status; err.payload = data;
    throw err;
  }
  return data;
}

function extractText(data:any):string{
  // Responses API: bevorzugt output_text; fallback auf content-Array
  const direct = typeof data?.output_text === "string" ? data.output_text : "";
  if (direct) return direct.trim();
  try {
    const block = data?.output?.[0]?.content?.find?.((c:any)=>c?.type==="output_text");
    if (block?.text) return String(block.text).trim();
  } catch{}
  return "";
}

export async function ask({ prompt, asJson=false, maxOutputTokens=1200, signal }: AskArgs): Promise<AskResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY fehlt");

  // 1) Primär: nur Instruktion (robusteste Form)
  const body1:any = { model: MODEL, input: asJson ? withJsonInstruction(prompt) : prompt, max_output_tokens: maxOutputTokens };
  try {
    const data = await post(body1, signal);
    return { text: extractText(data), raw: data };
  } catch (e:any) {
    const msg = String(e?.message||"");
    const isFormatErr = /text\.format|response_format/i.test(msg);
    if (!isFormatErr) throw e;

    // 2) Retry mit objektförmigem text.format
    const body2:any = { ...body1, text: { format: { type: "json_object" } } };
    const data = await post(body2, signal);
    return { text: extractText(data), raw: data };
  }
}

// Aliase
export const callOpenAI = ask;
export const runOpenAI  = ask;

export async function callOpenAIJson(prompt: string){
  const { text } = await ask({ prompt, asJson: true });
  return { text };
}

export default ask;
TS

echo "✓ Wrote $FILE"

# Alte Params repo-weit killen (idempotent)
# macOS/BSD sed: -i ''
sed -E -i '' 's/[[:space:]]*["'\'']?modalities["'\'']?[[:space:]]*:[[:space:]]*\[[^]]*\],?//g' $(git ls-files | tr '\n' ' ') || true
sed -E -i '' 's/[[:space:]]*["'\'']?temperature["'\'']?[[:space:]]*:[[:space:]]*[-0-9.]+,?//g' $(git ls-files | tr '\n' ' ') || true
sed -E -i '' 's/[[:space:]]*["'\'']?response_format["'\'']?[[:space:]]*:[[:space:]]*\{[^}]*\},?//g' $(git ls-files | tr '\n' ' ') || true

echo "✓ Cleaned old 'modalities', 'temperature', 'response_format' occurrences where safe."
echo "Done."
