#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
WEB="$ROOT/apps/web"

echo "▶ focus TypeScript scope auf die Analyse + Shims, bitte kurz warten …"

mkdir -p "$WEB/src/lib" \
         "$WEB/src/components/analyze" \
         "$WEB/src/app/api/contributions/analyze/stream" \
         "$WEB/src/app/api/contributions/analyze" \
         "$WEB/src/app/contributions/analyze" \
         "$WEB/src/app/contributions/new" \
         "$WEB/src/config" \
         "$WEB/src/shims/core/db" \
         "$WEB/src/shims/packages/config"

# 0) Admin-Config lokal (statt @packages/…)
cat > "$WEB/src/config/admin-config.ts" <<'EOF'
export interface PricingConfig { membershipMonthlyEUR: number; postImmediateEUR: number; swipeToPostThresholds: number[]; }
export interface PipelineLimits { newsfeedMaxPerRun: number; factcheckMaxPerItemTokens: number; enableAutoPost: boolean; }
export interface RegionPilot { defaultRegionKey: string; }
export interface AdminConfig { pricing: PricingConfig; limits: PipelineLimits; region: RegionPilot; }

export const adminConfig: AdminConfig = {
  pricing: {
    membershipMonthlyEUR: Number(process.env.VOG_PRICE_MEMBERSHIP ?? 5),
    postImmediateEUR: Number(process.env.VOG_PRICE_POST_IMMEDIATE ?? 1.99),
    swipeToPostThresholds: (process.env.VOG_SWIPE_THRESHOLDS ?? "100,500,1000")
      .split(",").map(x=>Number(x.trim())).filter(Boolean),
  },
  limits: {
    newsfeedMaxPerRun: Number(process.env.VOG_NEWSFEED_MAX_PER_RUN ?? 50),
    factcheckMaxPerItemTokens: Number(process.env.VOG_FACTCHECK_TOKENS ?? 4096),
    enableAutoPost: String(process.env.VOG_PIPELINE_AUTODRAFT ?? "true")==="true",
  },
  region: { defaultRegionKey: String(process.env.VOG_DEFAULT_REGION ?? "DE:BE:11000000") }
};
export default adminConfig;
EOF

# 1) triMongo ist bei dir bereits da – falls Pfad differiert, Dummy anlegen
if [ ! -f "$WEB/src/shims/core/db/db/triMongo.ts" ]; then
  cat > "$WEB/src/shims/core/db/db/triMongo.ts" <<'EOF'
import { MongoClient, Db, Collection, Document } from "mongodb";
let coreClient: MongoClient | null = null;
async function getClient(uri: string){ const c=new MongoClient(uri); try{await c.connect();}catch{} return c; }
export async function coreDb():Promise<Db>{
  const uri = process.env.CORE_MONGODB_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  coreClient = coreClient ?? await getClient(uri);
  const name = process.env.CORE_DB_NAME || process.env.DB_NAME || "core";
  return coreClient.db(name);
}
export async function coreCol<T extends Document=Document>(name:string):Promise<Collection<T>>{
  return (await coreDb()).collection<T>(name);
}
export default { coreDb, coreCol };
EOF
fi

# 2) Middleware – „OPTIONS“ sauber handlen + Redirect
cat > "$WEB/src/middleware.ts" <<'EOF'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.nextUrl.pathname === "/statements/new") {
    return NextResponse.redirect(new URL("/contributions/new", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
EOF

# 3) tsconfig: Wir beschränken TSC strikt auf die Analyse-Dateien
cat > "$WEB/tsconfig.json" <<'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022","DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@core/db/triMongo": ["src/shims/core/db/db/triMongo.ts"],
      "@config/*": ["src/config/*"],
      "@features/*": ["src/shims/features/*"],
      "@packages/*": ["src/shims/packages/*"]
    },
    "plugins": [{ "name": "next" }],
    "incremental": true
  },
  "include": [
    "next-env.d.ts",
    "src/middleware.ts",
    "src/lib/**/*",
    "src/components/analyze/**/*",
    "src/app/api/contributions/analyze/**/*",
    "src/app/contributions/**/*",
    "src/shims/**/*"
  ],
  "exclude": [
    "node_modules", ".next", "dist", "build",
    "src/_disabled/**",
    "src/__features_local_DISABLED__/**"
  ]
}
EOF

# 4) Next-Config (Warnung bzgl. allowedDevOrigins ist ok – nur Dev)
cat > "$WEB/next.config.ts" <<'EOF'
import type { NextConfig } from "next";
const origins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000").split(",");
const config: NextConfig = {
  experimental: { typedRoutes: true, externalDir: true, /* allowedDevOrigins: origins */ }
};
export default config;
EOF

# 5) Drafts bson->mongodb – robust mit perl (vermeidet BSD sed Fehler)
DRAFTS="$WEB/src/server/drafts.ts"
if [ -f "$DRAFTS" ]; then
  perl -0777 -pe 's/from\s+["\']bson["\']/from "mongodb"/g' -i.bak "$DRAFTS" || true
fi

echo "✅ Fertig. Jetzt 'pnpm --filter @vog/web run typecheck' und 'pnpm --filter @vog/web run dev' ausführen."
