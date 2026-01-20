#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
echo "🔧 eDebatte: fix @features alias + routes"

TSBASE="$ROOT/tsconfig.base.json"
ROUTE="$ROOT/apps/web/src/app/api/contributions/analyze/route.ts"
SHIM1="$ROOT/apps/web/src/shims/features/analysis/extract.ts"
ROUTE_STMTS="$ROOT/apps/web/src/app/api/statements/route.ts"

# 1) @features → Repo-Root/features
if command -v jq >/dev/null 2>&1; then
  echo "🗂  Patch tsconfig.base.json (via jq)"
  TMP="$(mktemp)"
  jq '
    .compilerOptions //= {} |
    .compilerOptions.baseUrl //= "." |
    .compilerOptions.paths //= {} |
    .compilerOptions.paths["@features/*"] = ["features/*"]
  ' "$TSBASE" > "$TMP"
  mv "$TMP" "$TSBASE"
else
  echo "ℹ️  jq nicht gefunden. Bitte in $TSBASE unter compilerOptions.paths eintragen:"
  echo '    "@features/*": ["features/*"]'
fi

# 2) analyze-Route (import via @features)
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
    const msg = String(e?.message ?? e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
TS
echo "✅ wrote $ROUTE"

# 3) Shims & weitere Routen, die bisher '@/features/...' nutzen → '@features/...'
replace_path () {
  local file="$1"
  if [ -f "$file" ]; then
    sed -i '' 's#@/features/analyze/analyzeContribution#@features/analyze/analyzeContribution#g' "$file" || true
    echo "🩹 patched $file"
  fi
}
replace_path "$SHIM1"
replace_path "$ROUTE_STMTS"

echo "🧹 optional: .bak/.old putzen (nur src & features)…"
find "$ROOT/apps/web/src" "$ROOT/features" -type f \( -name "*.bak" -o -name "*.BAK" -o -name "*.old" \) -print -delete || true

echo "✅ Done. Starte jetzt dev neu:"
echo "   pnpm --filter @vog/web dev"
echo
echo "🔎 Test:"
echo "curl -sS -X POST http://127.0.0.1:3000/api/contributions/analyze \\"
echo "  -H 'content-type: application/json' \\"
echo "  -d '{\"text\":\"Kommunen fordern mehr Mittel für Katastrophenschutz in NRW.\",\"maxClaims\":3}' | jq ."
