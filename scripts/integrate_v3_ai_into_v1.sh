#!/usr/bin/env bash
set -euo pipefail

# === Pfade ===
ROOT="${ROOT:-$HOME/Arbeitsmappe/LandingeDbtt}"
V3_ZIPS="${V3_ZIPS:-$HOME/Arbeitsmappe/V3}"
WEB="$ROOT/apps/web"
SRC="$WEB/src"
STAGING="$ROOT/.v3_stage"

echo "🏁 ROOT:     $ROOT"
echo "📦 V3_ZIPS:  $V3_ZIPS"
echo "🧪 STAGING:  $STAGING"
mkdir -p "$STAGING"

# --- Helper: unzip with optional single-root normalization ---
unzip_if () {
  local zip="$1"; local dest="$2"
  if [[ -f "$zip" ]]; then
    echo "🔓 Unzip $(basename "$zip") → $dest"
    mkdir -p "$dest"
    unzip -q -o "$zip" -d "$dest"
    # normalize single root dir
    local entries=("$dest"/*)
    if [[ ${#entries[@]} -eq 1 && -d "${entries[0]}" ]]; then
      rsync -a --delete "${entries[0]}/" "$dest/"
    fi
  else
    echo "⚠️  Zip fehlt: $zip"
  fi
}

# --- 0) V3-Zips entpacken (nur falls vorhanden) ---
unzip_if "$V3_ZIPS/features.zip"         "$STAGING/v3_features"
unzip_if "$V3_ZIPS/core.zip"             "$STAGING/v3_core"
unzip_if "$V3_ZIPS/packages.zip"         "$STAGING/v3_packages"
unzip_if "$V3_ZIPS/prisma.zip"           "$STAGING/v3_prisma"
unzip_if "$V3_ZIPS/scripts.zip"          "$STAGING/v3_scripts"
unzip_if "$V3_ZIPS/V3apps:web:src.zip"   "$STAGING/v3_apps_web_src"

# --- 1) Aliases für V3-Layout (harmonisiert) ---
node - <<'NODE'
const fs=require('fs'); const p="apps/web/tsconfig.json";
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths['@/*']         = j.compilerOptions.paths['@/*']         || ['src/*'];
j.compilerOptions.paths['@core/*']     = ['../../core/*'];
j.compilerOptions.paths['@features/*'] = ['../../features/*'];
j.compilerOptions.paths['@packages/*'] = ['../../packages/*'];
// Legacy alias für triMongo beibehalten
j.compilerOptions.paths['@core/db/triMongo'] = j.compilerOptions.paths['@core/db/triMongo'] || ['src/shims/core/db/db/triMongo.ts'];
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✅ tsconfig paths aktualisiert");
NODE

# --- 2) V3-Module gezielt portieren (ohne V1 zu zerlegen) ---
#    features: Contribution/Statement/Report/User/Stream/Analysis (falls vorhanden)
copy_if_dir () { local src="$1"; local dst="$2";
  if [[ -d "$src" ]]; then
    echo "➡️  $(basename "$src") → $dst"
    mkdir -p "$dst"
    rsync -a --delete "$src/" "$dst/"
  else
    echo "• übersprungen (nicht gefunden): $src"
  fi
}

# 2a) features/*
copy_if_dir "$STAGING/v3_features/features/contribution" "$ROOT/features/contribution"
copy_if_dir "$STAGING/v3_features/features/statement"    "$ROOT/features/statement"
copy_if_dir "$STAGING/v3_features/features/report"       "$ROOT/features/report"
copy_if_dir "$STAGING/v3_features/features/user"         "$ROOT/features/user"
copy_if_dir "$STAGING/v3_features/features/stream"       "$ROOT/features/stream"
copy_if_dir "$STAGING/v3_features/features/analyze"      "$ROOT/features/analyze"

# 2b) core/* (nur AI/Workflow/Queue falls vorhanden — triMongo bleibt V1/Shim)
copy_if_dir "$STAGING/v3_core/core/ai"        "$ROOT/core/ai"
copy_if_dir "$STAGING/v3_core/core/workflow"  "$ROOT/core/workflow"
copy_if_dir "$STAGING/v3_core/core/openai"    "$ROOT/core/openai"
copy_if_dir "$STAGING/v3_core/core/queue"     "$ROOT/core/queue"
copy_if_dir "$STAGING/v3_core/core/nlp"       "$ROOT/core/nlp"
# keine triMongo-Überschreibung!

# 2c) prisma/scripts (optional – nur wenn vollständig)
copy_if_dir "$STAGING/v3_prisma/prisma"       "$ROOT/prisma"
copy_if_dir "$STAGING/v3_scripts/scripts"     "$ROOT/scripts"

# --- 3) GPT-only Analyzer ersetzen/verdrahten ---
ANALYZER_DIR="$ROOT/features/analyze"
mkdir -p "$ANALYZER_DIR"
cat > "$ANALYZER_DIR/analyzeContribution.ts" <<'TS'
import { z } from "zod";

// GPT-only – erfordert OPENAI_API_KEY
const schema = z.object({
  summary: z.string().min(1).max(240),
  categories: z.array(z.string()).min(1).max(8),
  language: z.string().min(2).max(5),
  regionHint: z.string().nullish()
});

export type Analysis = z.infer<typeof schema>;

function apiUrl() { return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions"; }
function model()  { return process.env.OPENAI_MODEL || "gpt-4o-mini"; }

export async function analyzeContribution(text: string, userCategories: string[] = []): Promise<Analysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing (required for analyzer)");
  }
  const sys = "Du extrahierst aus deutschem Freitext eine kurze Zusammenfassung (<= 180 Zeichen), 3-6 Kategorien als Schlagworte, die Sprache (ISO-2) und optional einen Regionshinweis. Rückgabe im JSON-Format laut Schema.";
  const user = [
    "TEXT:", text.slice(0, 5000),
    userCategories.length ? `\nUSER_CATEGORIES_HINT: ${userCategories.join(", ")}` : ""
  ].join("");

  const body:any = {
    model: model(),
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "analysis",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            categories: { type: "array", items: { type: "string" } },
            language: { type: "string" },
            regionHint: { type: ["string","null"] }
          },
          required: ["summary","categories","language"],
          additionalProperties: false
        }
      }
    }
  };

  const res = await fetch(apiUrl(), {
    method: "POST",
    headers: {
      "Content-Type":"application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const json:any = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = schema.safeParse(JSON.parse(content || "{}"));
  if (!parsed.success) throw new Error("Invalid analysis result");
  return parsed.data;
}
TS

# --- 4) statements/route.ts an GPT-Analyzer anschließen (ohne Heuristik) ---
node - <<'NODE'
const fs=require('fs');
const p='apps/web/src/app/api/statements/route.ts';
let s=fs.readFileSync(p,'utf8');

// ensure import
if (!s.includes("@features/analyze/analyzeContribution")) {
  s = s.replace(/^(import .+\n)+/, m => m + 'import { analyzeContribution } from "@features/analyze/analyzeContribution";\n');
}

// category -> let (überschreibbar)
s = s.replace(/const\s+category\s*=\s*/, 'let category = ');

// Analyzer-Aufruf unmittelbar vor now = new Date();
s = s.replace(/const\s+now\s*=\s*new Date\(\);/, `
  const analysis = await analyzeContribution(text, [category]);
  if (!category && analysis.categories?.length) category = analysis.categories[0];
  const now = new Date();
`);

// analysis im Dokument speichern
s = s.replace(/const\s+doc:\s*any\s*=\s*\{/, 'const doc: any = { analysis,');
// Doppelte Korrektur, falls bereits eingefügt
s = s.replace('const doc: any = { analysis, analysis,', 'const doc: any = { analysis,');

fs.writeFileSync(p,s);
console.log("✅ statements/route.ts → GPT-Analyzer verdrahtet");
NODE

# --- 5) typedCookies/session auf await (Next15 Dynamic APIs) – falls nicht bereits ---
cat > "$SRC/lib/http/typedCookies.ts" <<'TS'
import { cookies } from "next/headers";
export type CookieOptions = { httpOnly?: boolean; sameSite?: "lax"|"strict"|"none"; secure?: boolean; path?: string; maxAge?: number; };
export async function getCookie(name: string): Promise<string|null> { const jar = await cookies(); return jar.get(name)?.value ?? null; }
export async function setCookie(name: string, value: string, opts: CookieOptions = {}) { const jar = await cookies(); jar.set(name, value, { httpOnly:true, sameSite:"lax", secure:false, path:"/", ...opts }); }
export async function deleteCookie(name: string) { const jar = await cookies(); jar.delete(name); }
TS

node - <<'NODE'
const fs=require('fs');
const p='apps/web/src/utils/session.ts';
if (fs.existsSync(p)) {
  let s=fs.readFileSync(p,'utf8');
  s = s.replace(/export\s+function\s+getSessionToken\s*\(/, 'export async function getSessionToken(');
  s = s.replace(/getCookie\(/g, 'await getCookie(');
  s = s.replace(/export\s+function\s+readSession\s*\(/, 'export async function readSession(');
  s = s.replace(/=\s*getSessionToken\(/g, '= await getSessionToken(');
  fs.writeFileSync(p,s); console.log('✅ session.ts aktualisiert');
}
NODE

# --- 6) NPM Deps für AI/Schema ---
cd "$WEB"
pnpm add zod openai@^4

# --- 7) ENV-Hinweise setzen (nicht überschreiben, nur ergänzen) ---
touch "$WEB/.env.local"
grep -q '^OPENAI_API_KEY=' "$WEB/.env.local" || echo 'OPENAI_API_KEY=DEIN_KEY_HIER' >> "$WEB/.env.local"
grep -q '^OPENAI_MODEL='   "$WEB/.env.local" || echo 'OPENAI_MODEL=gpt-4o-mini' >> "$WEB/.env.local"
grep -q '^OPENAI_BASE_URL=' "$WEB/.env.local" || echo '# OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions' >> "$WEB/.env.local"

echo "✅ Integration fertig. Jetzt: pnpm -w exec tsc --noEmit && (pkill -f \"next dev\" || true; pnpm dev)"
