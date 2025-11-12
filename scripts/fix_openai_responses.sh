#!/usr/bin/env bash
set -euo pipefail

FILE="features/ai/providers/openai.ts"
BACKUP="$FILE.bak.$(date +%s)"

echo "• Backup -> $BACKUP"
mkdir -p "$(dirname "$FILE")"
[ -f "$FILE" ] && cp "$FILE" "$BACKUP"

cat > "$FILE" <<'TS'
// OpenAI Responses API – text-only helper (JSON-fähig).
// Wichtig: KEIN temperature/top_p/modalities senden (einige Modelle erlauben nur Default).
const API_BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");
const MODEL    = process.env.OPENAI_MODEL || "gpt-4o-mini"; // ggf. anpassen

type AskArgs = {
  prompt: string;
  asJson?: boolean;               // JSON erzwingen
  maxOutputTokens?: number;       // optional
  signal?: AbortSignal;
};

type AskResult = { text: string; raw: any };

export async function ask({ prompt, asJson=false, maxOutputTokens=1200, signal }: AskArgs): Promise<AskResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY fehlt");
  }

  // Responses API erwartet input_* Types:
  const body: any = {
    model: MODEL,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    // kein temperature, kein top_p, keine modalities!
    max_output_tokens: maxOutputTokens,
  };

  if (asJson) {
    // Garantiert JSON – Modell erzeugt ein einzelnes JSON-Objekt
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${API_BASE}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    // kompakter, aber nützlich
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`OpenAI error ${res.status}: ${msg}`);
  }

  // Responses API: output[0].content[0].type === "output_text"
  let text = "";
  try {
    const first = data.output?.[0]?.content?.[0];
    text = first?.type === "output_text" ? (first.text ?? "") : (data.output_text ?? "");
  } catch { /* noop */ }

  return { text, raw: data };
}

// Legacy-Aliase für bestehenden Code:
export const callOpenAI = ask;
export const runOpenAI  = ask;

export async function callOpenAIJson(prompt: string) {
  const { text } = await ask({ prompt, asJson: true });
  return { text };
}

export default ask;
TS

echo "✓ Wrote $FILE"
echo "Hinweis: Falls du im Code noch 'type: \"text\"' oder 'modalities' nutzt, das ist jetzt NICHT mehr nötig."
echo "Fertig."
