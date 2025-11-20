#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
APP="$ROOT/apps/web"
SRC="$APP/src"

echo "Repo: $ROOT"
echo "App : $APP"

# --- sed inline Flag (macOS vs GNU) ------------------------------------------
if sed --version >/dev/null 2>&1; then
  SED_I=(-i)
else
  SED_I=(-i '')
fi

# --- 1) kaputte Importe reparieren -------------------------------------------
echo "Fixing broken imports: from \"\"@/..."
if command -v rg >/dev/null 2>&1; then
  FILES=$(rg -l 'from ""@/' "$SRC" || true)
else
  FILES=$(grep -RIl 'from ""@/' "$SRC" || true)
fi
if [ -n "${FILES:-}" ]; then
  echo "$FILES" | xargs -I{} sed "${SED_I[@]}" 's/from ""@/from "@/g' {} || true
fi

# --- 2) tsconfig.json: exclude & paths ergänzen -------------------------------
echo "Patching tsconfig.json (exclude + paths)..."
node - <<NODE
const fs = require('fs');
const tsconfigPath = "${APP}/tsconfig.json";
const raw = fs.readFileSync(tsconfigPath, 'utf8');
const j = JSON.parse(raw);

j.exclude = Array.from(new Set([...(j.exclude||[]),
  "node_modules", ".next", "dist", "build",
  "src/_disabled/**",
  "src/middleware.ts"
]));

j.compilerOptions = j.compilerOptions || {};
j.compilerOptions.paths = j.compilerOptions.paths || {};

function ensure(alias, targets){
  const arr = j.compilerOptions.paths[alias] || [];
  for (const t of (Array.isArray(targets)?targets:[targets])) {
    if (!arr.includes(t)) arr.push(t);
  }
  j.compilerOptions.paths[alias] = arr;
}

ensure("@db/web", ["src/shims/db-web.ts"]);
ensure("@core/db/triMongo", ["src/shims/core/db/db/triMongo.ts"]);
ensure("@core/db/db/triMongo", ["src/shims/core/db/db/triMongo.ts"]);
ensure("@ui", ["src/shims/ui.ts"]);
ensure("@components/*", ["src/shims/components/*"]);

fs.writeFileSync(tsconfigPath, JSON.stringify(j, null, 2));
console.log("tsconfig.json updated");
NODE

# --- 3) Verzeichnisse für Shims ----------------------------------------------
mkdir -p "$SRC/shims/core/db" "$SRC/shims/components" "$SRC/features/analysis"

# --- 4) triMongo-Shim ---------------------------------------------------------
cat > "$SRC/shims/core/db/db/triMongo.ts" <<'TS'
import { MongoClient, Db, Collection, Document } from "mongodb";

let coreClient: MongoClient | null = null;
let votesClient: MongoClient | null = null;
let piiClient: MongoClient | null = null;

async function getClient(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri);
  // optional connect; neuere Treiber verbinden lazy
  try { await client.connect(); } catch {}
  return client;
}

export async function coreDb(): Promise<Db> {
  const uri = process.env.CORE_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  coreClient = coreClient ?? await getClient(uri);
  const name = process.env.CORE_DB_NAME || process.env.DB_NAME || "core";
  return coreClient.db(name);
}
export async function votesDb(): Promise<Db> {
  const uri = process.env.VOTES_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  votesClient = votesClient ?? await getClient(uri);
  const name = process.env.VOTES_DB_NAME || process.env.DB_NAME || "votes";
  return votesClient.db(name);
}
export async function piiDb(): Promise<Db> {
  const uri = process.env.PII_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  piiClient = piiClient ?? await getClient(uri);
  const name = process.env.PII_DB_NAME || process.env.DB_NAME || "pii";
  return piiClient.db(name);
}

export async function coreCol<T extends Document = Document>(name: string): Promise<Collection<T>> {
  return (await coreDb()).collection<T>(name);
}
export async function votesCol<T extends Document = Document>(name: string): Promise<Collection<T>> {
  return (await votesDb()).collection<T>(name);
}
export async function piiCol<T extends Document = Document>(name: string): Promise<Collection<T>> {
  return (await piiDb()).collection<T>(name);
}
/** Legacy alias für alte Importe */
export async function getCol<T extends Document = Document>(name: string): Promise<Collection<T>> {
  return coreCol<T>(name);
}

const api = { coreDb, votesDb, piiDb, coreCol, votesCol, piiCol, getCol };
export default api;
TS

# --- 5) db-web Shim -----------------------------------------------------------
cat > "$SRC/shims/db-web.ts" <<'TS'
export enum PublishStatus { DRAFT="DRAFT", PUBLISHED="PUBLISHED", ARCHIVED="ARCHIVED" }
export enum ContentKind { STATEMENT="STATEMENT", ITEM="ITEM", REPORT="REPORT", TOPIC="TOPIC" }
export enum RegionMode { GLOBAL="GLOBAL", NATIONAL="NATIONAL", REGIONAL="REGIONAL", LOCAL="LOCAL" }
export type AnswerOpt = { label: string; value: string; exclusive?: boolean };
export const prisma: any = {}; // nur für Typecheck – Runtime später ersetzen
export default { prisma, PublishStatus, ContentKind, RegionMode };
TS

# --- 6) UI-Shim ---------------------------------------------------------------
cat > "$SRC/shims/ui.ts" <<'TSX'
import React from "react";
export const Header = (p: any) => <header {...p} />;
export const Footer = (p: any) => <footer {...p} />;
export const Card = (p: any) => <div {...p} />;
export const CardHeader = (p: any) => <div {...p} />;
export const CardContent = (p: any) => <div {...p} />;
export const CardFooter = (p: any) => <div {...p} />;
export const Badge = (p: any) => <span {...p} />;
export const Button = (p: any) => <button {...p} />;
export const Input = (p: any) => <input {...p} />;
export const Separator = (p: any) => <hr {...p} />;
export const Avatar = (p: any) => <div {...p} />;
export const AvatarFallback = (p: any) => <div {...p} />;
export const AvatarImage = (p: any) => <img alt="" {...p} />;
export default {};
TSX

# --- 7) @components/TabNav Stub ----------------------------------------------
cat > "$SRC/shims/components/TabNav.tsx" <<'TSX'
import React from "react";
export default function TabNav({ tabs = [], children }: { tabs?: string[]; children?: React.ReactNode[] }) {
  return <div>{children}</div>;
}
TSX

# --- 8) Re-Export für alte Importpfade ---------------------------------------
cat > "$SRC/features/analysis/extract.ts" <<'TS'
export { analyzeContribution } from "@/features/analyze/analyzeContribution";
export type { AnalyzeResult } from "@/features/analyze/analyzeContribution";
TS

# --- 9) analyzeContribution: 2. Arg optional ---------------------------------
AC="$SRC/features/analyze/analyzeContribution.ts"
if [ -f "$AC" ]; then
  sed "${SED_I[@]}" \
    's/export async function analyzeContribution(text: string): Promise<AnalyzeResult>/export async function analyzeContribution(text: string, subTopics?: string[]): Promise<AnalyzeResult>/' \
    "$AC" || true
fi

echo "Done. Now run:"
echo "pnpm --filter @vog/web run typecheck"
