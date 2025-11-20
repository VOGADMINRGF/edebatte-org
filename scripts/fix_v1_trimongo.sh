#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
WEB="$ROOT/apps/web"
SRC="$WEB/src"
SHIMS="$SRC/shims/core/db"
TS="$WEB/tsconfig.json"

echo "🧭 Project: $ROOT"
echo "🛠  Ensure alias + shim for @core/db/triMongo"

# 1) tsconfig.json: Aliases für V1 wiederherstellen/ergänzen
node - <<'NODE'
const fs=require('fs');const p="apps/web/tsconfig.json";
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths["@/*"]=j.compilerOptions.paths["@/*"]||["src/*"];
j.compilerOptions.paths["@core/db/triMongo"]=["src/shims/core/db/db/triMongo.ts"];
j.compilerOptions.paths["@core/db/db/triMongo"]=["src/shims/core/db/db/triMongo.ts"];
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✅ tsconfig paths aktualisiert");
NODE

# 2) triMongo-Shim anlegen
mkdir -p "$SHIMS"
cat > "$SHIMS/db/triMongo.ts" <<'TS'
import { MongoClient, type Db, type Collection } from "mongodb";

let _core: MongoClient | null = null;
let _votes: MongoClient | null = null;

function getUri(name: "CORE"|"VOTES") {
  const env = process.env[name + "_MONGODB_URI"] || "";
  if (env.trim()) return env;
  // Dev-Defaults (lokal)
  if (name === "CORE") return "mongodb://127.0.0.1:27017/vpm25_core";
  return "mongodb://127.0.0.1:27017/vpm25_votes";
}

async function getClient(which: "core"|"votes"): Promise<MongoClient> {
  const uri = which === "core" ? getUri("CORE") : getUri("VOTES");
  const existing = (which === "core" ? _core : _votes);
  if (existing) return existing;
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  if (which === "core") _core = client; else _votes = client;
  return client;
}

function dbNameFromUri(uri: string, fallback: string) {
  try { const u = new URL(uri); const n=(u.pathname||"").replace(/^\//,""); return n || fallback; } catch { return fallback; }
}

export async function coreDb(): Promise<Db> {
  const client = await getClient("core");
  const name = dbNameFromUri(getUri("CORE"), "vpm25_core");
  return client.db(name);
}
export async function votesDb(): Promise<Db> {
  const client = await getClient("votes");
  const name = dbNameFromUri(getUri("VOTES"), "vpm25_votes");
  return client.db(name);
}

export async function coreCol<T=any>(name: string): Promise<Collection<T>> {
  const db = await coreDb();
  return db.collection<T>(name);
}
export async function votesCol<T=any>(name: string): Promise<Collection<T>> {
  const db = await votesDb();
  return db.collection<T>(name);
}

export default { coreDb, votesDb, coreCol, votesCol };
TS
echo "✅ Shim geschrieben: $SHIMS/db/triMongo.ts"

# 3) .env.local: Defaults setzen, falls fehlen
ENV="$WEB/.env.local"
touch "$ENV"
grep -q '^CORE_MONGODB_URI=' "$ENV" || echo 'CORE_MONGODB_URI=mongodb://127.0.0.1:27017/vpm25_core' >> "$ENV"
grep -q '^VOTES_MONGODB_URI=' "$ENV" || echo 'VOTES_MONGODB_URI=mongodb://127.0.0.1:27017/vpm25_votes' >> "$ENV"
echo "✅ .env.local geprüft/ergänzt"

# 4) Abhängigkeit sicherstellen
cd "$WEB"
pnpm add mongodb@^6

# 5) Typecheck & dev-Restart Hinweis
pnpm -w exec tsc --noEmit || true
echo "🚀 Fertig. Bitte dev neu starten:  cd $WEB && pnpm dev"
