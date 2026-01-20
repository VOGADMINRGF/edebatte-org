#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
echo "▶️  eDebatte Orchestrator Full – root: $ROOT"

# --- Guard: im Repo-Root? ---
test -d "apps/web" || { echo "❌ Bitte im Repo-Root ausführen (Ordner apps/web fehlt)"; exit 1; }

# --- 1) tsconfig Aliase robust patchen (JSONC tolerant) ---
node - "apps/web/tsconfig.json" <<'NODE'
const fs=require('fs');
const pathArg = process.argv[2];
function stripJsonComments(str){
  let out='', inStr=false, q='', esc=false;
  for(let i=0;i<str.length;i++){
    const c=str[i], n=str[i+1];
    if(inStr){ out+=c; if(esc){esc=false;continue}
      if(c==='\\'){esc=true;continue} if(c===q){inStr=false;q=''} continue; }
    if(c=='"'||c=="'"){ inStr=true; q=c; out+=c; continue; }
    if(c==='/'&&n=='/'){ while(i<str.length && str[i] !== '\n') i++; out+='\n'; continue; }
    if(c==='/'&&n==='*'){ i+=2; while(i<str.length && !(str[i]=='*'&&str[i+1]=='/')) i++; i++; continue; }
    out+=c;
  }
  return out;
}
let raw = fs.readFileSync(pathArg,'utf8').replace(/^\uFEFF/,'');
const j = JSON.parse(stripJsonComments(raw));
j.compilerOptions = j.compilerOptions || {};
j.compilerOptions.baseUrl = j.compilerOptions.baseUrl || '.';
j.compilerOptions.paths = Object.assign({}, j.compilerOptions.paths, {
  "@/*": ["src/*"],
  "@features/*": ["../../features/*"],
  "@/features/*": ["../../features/*"],
  "@core/*": ["../../core/*"],
  "@/core/*": ["../../core/*"]
});
fs.writeFileSync(pathArg, JSON.stringify(j,null,2));
console.log("✅ tsconfig aliases patched");
NODE

# --- 2) OpenAI Responses-API Provider (modern, JSON-Mode sicher) ---
mkdir -p features/ai/providers

cat > features/ai/providers/openai.ts <<'TS'
/**
 * features/ai/providers/openai.ts
 * Minimaler, Responses-API-kompatibler Provider:
 * - KEIN response_format/temperature!
 * - input_text + text.format: { type: "json_object" }
 * - "format: json" Prefix im Prompt, damit die API den JSON-Mode akzeptiert.
 */
export async function callOpenAI(
  prompt: string,
  opts?: { timeoutMs?: number; forceJsonMode?: boolean; model?: string }
): Promise<{ text: string; raw: any }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = opts?.model || process.env.OPENAI_MODEL || "gpt-5.1";
  const endpoint = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses";

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(3000, opts?.timeoutMs ?? 18000));

  // JSON-Mode: Responses API verlangt, dass im Text das Wort "json" vorkommt,
  // wenn text.format = json_object verwendet wird.
  const wantsJSON = !!opts?.forceJsonMode;
  const userText = wantsJSON ? `format: json\n\n${prompt}` : prompt;

  const body: any = {
    model,
    // Responses API expects 'input' as an array of messages
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: userText }],
      },
    ],
  };
  if (wantsJSON) {
    body.text = { format: { type: "json_object" } };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }).catch((e) => {
    clearTimeout(t);
    throw e;
  });
  clearTimeout(t);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status} – ${errText}`);
  }
  const data = await res.json();
  // Responses API convenience:
  const text: string =
    data.output_text ??
    (Array.isArray(data.output) &&
      data.output[0]?.content &&
      Array.isArray(data.output[0].content) &&
      data.output[0].content[0]?.text) ||
    "";
  return { text: text || "", raw: data };
}
TS

echo "✅ OpenAI provider written"

# --- 3) Hinweis: ARI Key optional (ansonsten nur 'search' statt 'research') ---
if [[ -z "${ARI_API_KEY:-}" ]]; then
  echo "ℹ️  ARI_API_KEY fehlt – ARI research-Aufrufe werden 401 liefern. Setze ARI_API_KEY, oder zwinge Search-Only."
fi

echo "✅ Done. Jetzt Dev neu starten."
