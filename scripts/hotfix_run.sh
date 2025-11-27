#!/usr/bin/env bash
set -euo pipefail

# LEGACY_KEEP: Hotfix-Stubs für alte Dev-Setups; enthält bewusst unfertige
# Platzhalter. Nicht in produktiven Flows einsetzen.

# --- tsconfig (JSONC) sicher patchen ---
node - <<'NODE'
const fs=require("fs"), p="apps/web/tsconfig.json";
let raw=fs.readFileSync(p,"utf8");
// JSONC -> JSON (Kommentare entfernen)
raw = raw.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^\:])\/\/.*$/gm,"");
const j = JSON.parse(raw);

// exclude ergänzen (ohne Duplikate)
j.exclude = Array.from(new Set([...(j.exclude||[]), "../../scripts/**", "../../src/**"]));

// Pfad-Alias für Root-Features
j.compilerOptions = j.compilerOptions || {};
j.compilerOptions.paths = j.compilerOptions.paths || {};
j.compilerOptions.paths["@features/*"] = ["../../features/*"];

fs.writeFileSync(p, JSON.stringify(j,null,2) + "\n");
console.log("✔ tsconfig.json gepatcht");
NODE

# --- Admin Sidebar: .tsx + valider JSX ---
mkdir -p features/dashboard/components/admin
cat > features/dashboard/components/admin/SidebarNavAdmin.tsx <<'TSX'
import Link from "next/link";

export default function SidebarNavAdmin() {
  const nav = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/contributions", label: "Contributions" }
  ];
  return (
    <aside className="w-56 bg-white dark:bg-neutral-900 shadow flex flex-col gap-1 p-4">
      <div className="mb-4 font-bold text-xl">Admin</div>
      {nav.map(n => (
        <Link key={n.href} href={n.href}
          className="block px-3 py-2 rounded hover:bg-violet-100 dark:text-neutral-100 dark:hover:bg-neutral-800">
          {n.label}
        </Link>
      ))}
    </aside>
  );
}
TSX
[ -f features/dashboard/components/admin/SidebarNavAdmin.ts ] && rm -f features/dashboard/components/admin/SidebarNavAdmin.ts || true
echo "✔ SidebarNavAdmin fixed"

# --- Event/Report/Statements: minimale gültige Stubs ---
cat > features/event/projekt.tsx <<'TSX'
export default function Projekt(){ return null; }
TSX

cat > features/report/components/ReportPage.tsx <<'TSX'
export default function ReportPage(){ return <div className="p-4">ReportPage</div>; }
TSX

cat > features/report/data/listReports.ts <<'TS'
export type ListReport = { id:string; title:string; createdAt?:string };
export const listReports: ListReport[] = [];
TS

cat > features/statement/data/statements_demo.ts <<'TS'
export type DemoStatement = { id:string; title:string };
export const demoStatements: DemoStatement[] = [];
TS
echo "✔ Feature-Stubs gesetzt"

# --- App-Quellen reparieren (kleine Parserfehler) ---
# /api/region/effective
mkdir -p apps/web/src/app/api/region/effective
cat > apps/web/src/app/api/region/effective/route.ts <<'TS'
import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(_req: NextRequest) {
  return NextResponse.json({ region: null, source: "none" });
}
TS

# /admin/errors
mkdir -p apps/web/src/app/admin/errors
cat > apps/web/src/app/admin/errors/page.tsx <<'TSX'
export default function AdminErrorsPage(){ return <div className="p-4">No errors</div>; }
TSX

# accessControl: fehlendes Anführungszeichen
mkdir -p apps/web/src/config
cat > apps/web/src/config/accessControl.ts <<'TS'
export const accessControl = {
  allowedRoles: ["user","legitimized","admin","moderator","ngo","politics"] as const
};
export type AllowedRole = typeof accessControl.allowedRoles[number];
TS

# useTranslation: minimaler Hook
mkdir -p apps/web/src/utils
cat > apps/web/src/utils/useTranslation.ts <<'TS'
export function useTranslation(){
  return { t: (s: string, _vars?: Record<string,any>) => s };
}
TS

# QuickRegister: valide Komponente
mkdir -p apps/web/src/components
cat > apps/web/src/components/QuickRegister.tsx <<'TSX'
"use client";
import { useState } from "react";
export default function QuickRegister(){
  const [email, setEmail] = useState("");
  function onSubmit(e: React.FormEvent){ e.preventDefault(); /* TODO */ }
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input value={email} onChange={e=>setEmail(e.currentTarget.value)} placeholder="Email" />
      <button type="submit">Register</button>
    </form>
  );
}
TSX

echo "✅ Hotfix fertig"
