#!/usr/bin/env bash
set -euo pipefail

# LEGACY_KEEP: Reparatur-Script für alte v1-LandingeDbtt-Stände, nur manuell
# nutzen. Keine aktuelle Deployment-Pipeline.

# === Pfade anpassen falls nötig ===
V1_ROOT="${V1_ROOT:-$(pwd)}"
WEB_DIR="$V1_ROOT/apps/web"
SRC_DIR="$WEB_DIR/src"
BACKUP="$WEB_DIR/_repair_backup_$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"

echo "🔧 Arbeite in: $WEB_DIR"

# 1) package.json Scripts sicherstellen
if [[ -f "$WEB_DIR/package.json" ]]; then
  cp "$WEB_DIR/package.json" "$BACKUP/package.json.bak"
  node - <<'NODE'
const fs=require('fs');const p="apps/web/package.json";
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.scripts={...(j.scripts||{}),
  "dev":"next dev -p 3000",
  "build":"next build",
  "start":"next start -p 3000",
  "typecheck":"tsc --noEmit -p tsconfig.json"
};
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✅ Scripts aktualisiert");
NODE
fi

# 2) Tailwind/PostCSS auf .cjs zwingen (ESM-Fix)
for f in postcss.config.js postcss.config.ts postcss.config.mjs; do
  [[ -f "$WEB_DIR/$f" ]] && mv "$WEB_DIR/$f" "$BACKUP/$f.bak" || true
done
cat > "$WEB_DIR/postcss.config.cjs" <<'JS'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };
JS

for f in tailwind.config.ts tailwind.config.js tailwind.config.mjs; do
  [[ -f "$WEB_DIR/$f" ]] && mv "$WEB_DIR/$f" "$BACKUP/$f.bak" || true
done
cat > "$WEB_DIR/tailwind.config.cjs" <<'JS'
module.exports = { content: ["./src/**/*.{ts,tsx,js,jsx}"], theme: { extend: {} }, plugins: [] };
JS

# 3) tsconfig vereinfachen (robuste Defaults)
if [[ -f "$WEB_DIR/tsconfig.json" ]]; then
  cp "$WEB_DIR/tsconfig.json" "$BACKUP/tsconfig.json.bak"
fi
cat > "$WEB_DIR/tsconfig.json" <<'JSON'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
JSON

# 4) Middleware fixen
mkdir -p "$SRC_DIR"
cat > "$SRC_DIR/middleware.ts" <<'TS'
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") return NextResponse.next();
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*"] };
TS

# 5) await cookies() -> cookies() (Server/API)
if command -v rg >/dev/null 2>&1; then G="rg -l --hidden --glob '!node_modules'"; else G="grep -RIl"; fi
$G "await cookies\\(\\)" "$SRC_DIR" | while read -r f; do
  cp "$f" "$BACKUP/$(echo "$f" | sed 's#/#_#g').bak" || true
  sed -E -i '' 's/await\\s+cookies\\(\\)/cookies()/g' "$f" 2>/dev/null || sed -E -i 's/await\s+cookies\(\)/cookies()/g' "$f"
  echo "🔁 cookies() ent-asynced: $f"
done || true

# 6) SidebarNav robust machen (Server-Wrapper + Client)
if [[ -f "$SRC_DIR/components/SidebarNav.tsx" ]]; then
  mv "$SRC_DIR/components/SidebarNav.tsx" "$BACKUP/SidebarNav.tsx.bak" || true
fi
mkdir -p "$SRC_DIR/components/nav"
cat > "$SRC_DIR/components/nav/SidebarNav.tsx" <<'TSX'
import { cookies } from "next/headers";
import SidebarNavClient from "./SidebarNavClient";
export type NavItem = { href: string; label: string; roles?: string[] };
export default function SidebarNav({ items }: { items: NavItem[] }) {
  const role = cookies().get("u_role")?.value ?? "guest";
  return <SidebarNavClient items={items} role={role} />;
}
TSX
cat > "$SRC_DIR/components/nav/SidebarNavClient.tsx" <<'TSX'
"use client";
import Link from "next/link";
import clsx from "clsx";
export default function SidebarNavClient({ items, role }:{
  items: { href: string; label: string; roles?: string[] }[]; role: string;
}) {
  const visible = items.filter(it => !it.roles || it.roles.includes(role));
  return (
    <nav className="flex flex-col gap-1">
      {visible.map(it => (
        <Link key={it.href} href={it.href}
          className={clsx("rounded-md px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800")}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
TSX

# 7) 0-Byte .ts/.tsx stubs erzeugen (vermeidet TS-Parsefehler)
find "$SRC_DIR" -type f -size 0 -name "*.ts" -o -type f -size 0 -name "*.tsx" | while read -r f; do
  rel="${f#$SRC_DIR/}"
  cp "$f" "$BACKUP/$(echo "$rel" | sed 's#/#_#g').empty.bak" || true
  if [[ "$f" == *"/route.ts" ]]; then
    cat > "$f" <<'RTS'
import { NextResponse } from "next/server";
export async function GET()  { return NextResponse.json({ ok:false, reason:"not-implemented" }, { status: 501 }); }
export async function POST() { return NextResponse.json({ ok:false, reason:"not-implemented" }, { status: 501 }); }
RTS
  elif [[ "$f" == *"/page.tsx" ]]; then
    cat > "$f" <<'PTS'
export default function TODOPage() { return <div className="p-6">Not implemented yet.</div>; }
PTS
  else
    echo 'export {};' > "$f"
  fi
  echo "🩹 stubbed: $rel"
done || true

# 8) Health-Check Route (optional)
mkdir -p "$SRC_DIR/app/api/health"
cat > "$SRC_DIR/app/api/health/route.ts" <<'HTS'
import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ ok: true, ts: Date.now() }); }
HTS

# 9) Install & Typecheck
cd "$WEB_DIR"
pnpm i
pnpm run typecheck || true

echo "✅ Fertig. Starte jetzt: cd $WEB_DIR && pnpm dev"
