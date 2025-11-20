#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
WEB="$ROOT/apps/web"
FEAT="$ROOT/features"

echo ">>> Phase 1: paths, includes & hygiene for $WEB"

# portable sed
if command -v gsed >/dev/null 2>&1; then SED="gsed"; else SED="sed"; fi

test -d "$WEB" || { echo "ERROR: $WEB nicht gefunden (Repo-Root übergeben?)"; exit 1; }

# 1) package.json normalisieren (scripts + dep)
if [ -f "$WEB/package.json" ]; then
  PKG="$WEB/package.json" node <<'NODE'
const fs=require('fs'); const p=process.env.PKG;
const pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts=Object.assign({
  dev:"next dev -p 3000",
  build:"next build",
  start:"next start -p 3000",
  typecheck:"tsc --noEmit -p tsconfig.json"
}, pkg.scripts||{});
pkg.dependencies=Object.assign({ "framer-motion":"^11" }, pkg.dependencies||{});
fs.writeFileSync(p, JSON.stringify(pkg,null,2));
console.log(" - scripts & deps normalized in", p);
NODE
fi

# 2) Tailwind/PostCSS → .cjs
for f in tailwind.config postcss.config; do
  if [ -f "$WEB/$f.js" ]; then
    mv "$WEB/$f.js" "$WEB/$f.cjs"
    echo " - $f.js -> $f.cjs"
  fi
done

# 3) next.config.ts minimal
if [ ! -f "$WEB/next.config.ts" ] && [ ! -f "$WEB/next.config.mjs" ] && [ ! -f "$WEB/next.config.js" ]; then
  cat > "$WEB/next.config.ts" <<'TS'
import type { NextConfig } from "next";
const config: NextConfig = {
  experimental: {
    allowedDevOrigins: ["http://localhost:3000","http://127.0.0.1:3000"],
    typedRoutes: true,
    externalDir: true
  }
};
export default config;
TS
  echo " - wrote next.config.ts"
fi

# 4) tsconfig paths (externes features + shims)
if [ -f "$WEB/tsconfig.json" ]; then
  TS="$WEB/tsconfig.json" node <<'NODE'
const fs=require('fs'); const p=process.env.TS;
const ts=JSON.parse(fs.readFileSync(p,'utf8'));
ts.compilerOptions=ts.compilerOptions||{};
ts.compilerOptions.baseUrl = ts.compilerOptions.baseUrl || ".";
ts.compilerOptions.paths = Object.assign({
  "@/features/*":               ["../../features/*"],
  "@/features/analysis/*":      ["../../features/analysis/*","src/shims/features/analysis/*"],
  "@/*":                        ["src/*"],
  "@config/*":                  ["src/config/*"],
  "@lib/*":                     ["src/lib/*"],
  "@models/*":                  ["src/models/*"],
  "@db/web":                    ["src/shims/db-web.ts"],
  "@db/core":                   ["src/shims/db-core.ts"],
  "@core/db/triMongo":             ["src/shims/core/db/db/triMongo.ts"]
}, ts.compilerOptions.paths || {});
delete ts.compilerOptions.paths["src/*"];
delete ts.compilerOptions.paths["@core/db/db/triMongo"];
fs.writeFileSync(p, JSON.stringify(ts,null,2));
console.log(" - paths normalized in", p);
NODE
fi

# 5) tsconfig include (externes features zur Typeprüfung)
if [ -f "$WEB/tsconfig.json" ]; then
  TS="$WEB/tsconfig.json" node <<'NODE'
const fs=require('fs'); const p=process.env.TS;
const ts=JSON.parse(fs.readFileSync(p,'utf8'));
const inc=new Set([...(ts.include||["src/**/*"])]);
["src/**/*","../../features/**/*.ts","../../features/**/*.tsx","../../features/**/*.mts","../../features/**/*.cts"].forEach(x=>inc.add(x));
ts.include=[...inc];
fs.writeFileSync(p, JSON.stringify(ts,null,2));
console.log(" - include updated in", p);
NODE
fi

# 6) evtl. lokales src/features deaktivieren (Konflikte)
if [ -d "$WEB/src/features" ]; then
  mv "$WEB/src/features" "$WEB/src/__features_local_DISABLED__"
  echo " - renamed apps/web/src/features -> __features_local_DISABLED__"
fi

# 7) middleware.ts dedupen & Signatur fixen (ENV statt argv)
if [ -f "$WEB/src/middleware.ts" ]; then
  MIDDLE="$WEB/src/middleware.ts" node <<'NODE'
const fs=require('fs'); const f=process.env.MIDDLE;
let s=fs.readFileSync(f,'utf8');
// alle Next-Imports raus
s=s.replace(/^\s*import\s+\{\s*NextResponse\s*\}\s+from\s+"next\/server";\s*$/gm,'');
s=s.replace(/^\s*import\s+type\s+\{\s*NextRequest\s*\}\s+from\s+"next\/server";\s*$/gm,'');
// Signatur vereinheitlichen
s=s.replace(/export\s+function\s+middleware\s*\([^)]*\)\s*\{/, 'export function middleware(req: NextRequest) {');
// einmal korrekt rein
s=`import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
` + s.trimStart();
fs.writeFileSync(f,s);
console.log(" - middleware normalized & deduped");
NODE
fi

# 8) triMongo Util
mkdir -p "$WEB/src/utils"
cat > "$WEB/src/utils/db/triMongo.ts" <<'TS'
import * as tri from "@core/db/triMongo";
const asFn = <T>(x:any)=> (typeof x==="function" ? x : (()=>x as T));
export const coreConn  = asFn<any>((tri as any).coreConn  || (tri as any).getCoreConn  || (tri as any).core);
export const votesConn = asFn<any>((tri as any).votesConn || (tri as any).getVotesConn || (tri as any).votes);
export const piiConn   = asFn<any>((tri as any).piiConn   || (tri as any).getPiiConn   || (tri as any).pii);
const dbOf = (c:any)=>{ const conn = typeof c==="function" ? c() : c; return (conn as any).db ?? conn; };
export const coreDb  = () => dbOf(coreConn());
export const votesDb = () => dbOf(votesConn());
export const piiDb   = () => dbOf(piiConn());
export const coreCol  = (name:string) => (tri as any).coreCol  ? (tri as any).coreCol(name)  : (coreDb()  as any).collection(name);
export const votesCol = (name:string) => (tri as any).votesCol ? (tri as any).votesCol(name) : (votesDb() as any).collection(name);
export const piiCol   = (name:string) => (tri as any).piiCol   ? (tri as any).piiCol(name)   : (piiDb()  as any).collection(name);
export default { coreConn, votesConn, piiConn, coreDb, votesDb, piiDb, coreCol, votesCol, piiCol };
TS
echo " - utils/db/triMongo.ts written"

# 9) drafts.ts server-only + bson->mongodb
if [ -f "$WEB/src/server/drafts.ts" ]; then
  grep -q 'server-only' "$WEB/src/server/drafts.ts" || $SED -i.bak '1s/^/import "server-only";\n/' "$WEB/src/server/drafts.ts"
  $SED -i.bak 's/from\s*['"'"'"]bson['"'"'"]/from "mongodb"/g' "$WEB/src/server/drafts.ts" || true
  echo " - hardened src/server/drafts.ts"
fi

# 10) Shim für "@/features/analysis/extract"
mkdir -p "$WEB/src/shims/features/analysis"
cat > "$WEB/src/shims/features/analysis/extract.ts" <<'TS'
export { analyzeContribution, AnalyzeSchema } from "@/features/analyze/analyzeContribution";
export type { AnalyzeInput } from "@/features/analyze/analyzeContribution";
TS
echo " - shim for @/features/analysis/extract ready"

echo ">>> Phase 1 done"
