#!/usr/bin/env bash
set -euo pipefail

DEV_ORIGIN="${1:-}"
ROOT="$(pwd)"

echo "› eDebatte – Phase A (AI/Telemetry/OpenAI + Ebene-Typ-Fix)"
echo "  Repo: $ROOT"
[ -n "$DEV_ORIGIN" ] && echo "  allowedDevOrigins: http://${DEV_ORIGIN}"

ensure_dir(){ mkdir -p "$1"; }

# 1) features/ai/providers/types.ts
ensure_dir "features/ai/providers"
cat > features/ai/providers/types.ts <<'TS'
export type AskArgs = {
  prompt: string;
  asJson?: boolean;
  system?: string;
  model?: string;
};

export type AskFn = (args: AskArgs) => Promise<{ text: string }>;
export type Provider = { ask: AskFn };
TS
echo "✓ providers/types.ts"

# 2) features/ai/providers/openai.ts  (Chat Completions, kein Responses-API-Fehler mehr)
cat > features/ai/providers/openai.ts <<'TS'
import OpenAI from "openai";
import type { AskArgs } from "./types";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function ask({ prompt, asJson = false, system, model }: AskArgs) {
  if (!client.apiKey) throw new Error("OPENAI_API_KEY missing");
  const mdl = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: "system", content: system });
  const user = asJson
    ? `${prompt}\n\nAntworte ausschließlich als **gültiges** JSON-Objekt.`
    : prompt;
  messages.push({ role: "user", content: user });

  const res = await client.chat.completions.create({
    model: mdl,
    messages,
    temperature: 0,
    ...(asJson ? { response_format: { type: "json_object" as const } } : {}),
  });

  const text = res.choices[0]?.message?.content ?? "";
  return { text };
}
TS
echo "✓ providers/openai.ts"

# 3) features/ai/askAny.ts (JSON-Helfer + ARI Platzhalter)
cat > features/ai/askAny.ts <<'TS'
import { ask as askOpenAI } from "./providers/openai";

export async function callOpenAIJson(prompt: string) {
  const full = `${prompt}\n\nGib NUR gültiges JSON (RFC8259) zurück.`;
  const { text } = await askOpenAI({ prompt: full, asJson: true });
  return { text };
}

// Platzhalter – ARI/YOUCOM
export async function youcomResearch(_args: any) {
  throw new Error("ARI not configured (YOUCOM_ARI_API_KEY missing)");
}
export async function youcomSearch(_args: any) {
  throw new Error("ARI search not configured");
}
export function extractNewsFromSearch(){ return []; }
TS
echo "✓ askAny.ts"

# 4) features/ai/providers/index.ts  (providerEntries + Legacy-Reexports)
cat > features/ai/providers/index.ts <<'TS'
import type { Provider } from "./types";
import { ask as askOpenAI } from "./openai";
import { ask as askAnthropic } from "./anthropic";
import { ask as askMistral } from "./mistral";
import { ask as askGemini } from "./gemini";

export const providers = {
  openai:    { ask: askOpenAI },
  anthropic: { ask: askAnthropic },
  mistral:   { ask: askMistral },
  gemini:    { ask: askGemini },
} as const satisfies Record<string, Provider>;

export type ProviderName = keyof typeof providers;
export const PROVS = providers;
export const providerEntries = Object.entries(providers) as [ProviderName, Provider][];

export { callOpenAIJson, youcomResearch, youcomSearch, extractNewsFromSearch } from "../askAny";
export * from "./types";
TS
echo "✓ providers/index.ts"

# 5) Admin Telemetry Route – kompakt & getypt
ensure_dir "apps/web/src/app/api/admin/telemetry/ai"
cat > apps/web/src/app/api/admin/telemetry/ai/route.ts <<'TS'
import { NextResponse } from "next/server";
import { providerEntries, type ProviderName } from "@features/ai/providers";

type ProvRow = {
  name: ProviderName;
  label: string;
  ok: boolean;
  skipped?: boolean;
  code: number;
  note?: string;
};

const META: Record<ProviderName, { label: string; envKeys: string[]; note?: string }> = {
  openai:    { label: "OpenAI",    envKeys: ["OPENAI_API_KEY"] },
  anthropic: { label: "Anthropic", envKeys: ["ANTHROPIC_API_KEY"] },
  mistral:   { label: "Mistral",   envKeys: ["MISTRAL_API_KEY"] },
  gemini:    { label: "Gemini",    envKeys: ["GOOGLE_GENERATIVE_AI_API_KEY","GEMINI_API_KEY"] },
};

export async function GET() {
  const providers: ProvRow[] = providerEntries.map(([name]) => {
    const meta = META[name];
    const hasKey = (meta?.envKeys ?? []).some((k) => !!process.env[k]);
    return hasKey
      ? { name, label: meta?.label ?? name, ok: true, code: 200, note: meta?.note ?? "Key vorhanden" }
      : { name, label: meta?.label ?? name, ok: false, skipped: true, code: 202, note: "Kein API-Key gesetzt" };
  });

  return NextResponse.json({ providers, ts: new Date().toISOString() });
}
TS
echo "✓ telemetry route"

# 6) Ebene-Typfehler in features/analyze/assigner.ts – minimal casten
if [ -f "features/analyze/assigner.ts" ]; then
  sed -i.bak \
    -e 's/ebene: "EU"/ebene: "EU" as Ebene/' \
    -e 's/ebene: "Bund"/ebene: "Bund" as Ebene/' \
    -e 's/ebene: "Land"/ebene: "Land" as Ebene/' \
    -e 's/ebene: "Kommune"/ebene: "Kommune" as Ebene/' \
    features/analyze/assigner.ts || true
  echo "✓ assigner.ts (Ebene casts gesetzt)  (Backup: features/analyze/assigner.ts.bak)"
else
  echo "• Hinweis: features/analyze/assigner.ts nicht gefunden – Schritt übersprungen."
fi

# 7) allowedDevOrigins Hinweis/Option
patch_next_config(){
  local FILE="$1"
  if ! grep -q "allowedDevOrigins" "$FILE"; then
    echo "• Hinweis: Trage allowedDevOrigins in $FILE ein, z.B.:"
    cat <<MSG
experimental: {
  ...(typeof experimental !== "undefined" ? experimental : {}),
  allowedDevOrigins: ["http://${DEV_ORIGIN}"],
}
MSG
  else
    echo "✓ next.config: allowedDevOrigins bereits vorhanden"
  fi
}
if [ -n "$DEV_ORIGIN" ]; then
  if [ -f "next.config.mjs" ]; then patch_next_config "next.config.mjs";
  elif [ -f "next.config.js" ]; then patch_next_config "next.config.js";
  else
    echo "• Hinweis: keine next.config.{mjs,js} gefunden – Schritt übersprungen"
  fi
fi

echo "—"
echo "Fertig. Empfohlen:"
echo "  pnpm --filter @vog/web run typecheck"
echo "  pnpm --filter @vog/web dev"
