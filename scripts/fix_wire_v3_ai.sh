#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$PWD}"
WEB="$ROOT/apps/web"
SRC="$WEB/src"

echo "🔧 Harmonisiere V1 mit V3-AI Orchestrierung"

# 1) TS-Aliases sicherstellen (inkl. @core/db/db/triMongo)
node - <<'NODE'
const fs=require('fs'); const p="apps/web/tsconfig.json";
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions=j.compilerOptions||{}; j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths['@/*']           = j.compilerOptions.paths['@/*']           || ['src/*'];
j.compilerOptions.paths['@features/*']   = j.compilerOptions.paths['@features/*']   || ['../../features/*'];
j.compilerOptions.paths['@core/*']       = j.compilerOptions.paths['@core/*']       || ['../../core/*'];
j.compilerOptions.paths['@core/db/triMongo']= ['src/shims/core/db/db/triMongo.ts'];
j.compilerOptions.paths['@core/db/db/triMongo']= ['src/shims/core/db/db/triMongo.ts'];
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✅ tsconfig paths aktualisiert");
NODE

# 2) triMongo: Kompat-Exports (getDb / getVotesDb), falls fehlen
node - <<'NODE'
const fs=require('fs'); const p="apps/web/src/shims/core/db/db/triMongo.ts";
let s=fs.readFileSync(p,'utf8');
if(!/export\s+async\s+function\s+getDb/.test(s)){
  s += `

/** Compatibility layer for older imports */
export async function getDb(){ return coreDb(); }
export async function getVotesDb(){ return votesDb(); }
`;
  fs.writeFileSync(p,s); console.log("✅ triMongo: getDb/getVotesDb exportiert");
} else {
  console.log("ℹ️  triMongo: getDb bereits vorhanden");
}
NODE

# 3) /api/statements/[id] auf getDb oder coreDb absichern
if [[ -f "$SRC/app/api/statements/[id]/route.ts" ]]; then
  node - <<'NODE'
  const fs=require('fs'); const p="apps/web/src/app/api/statements/[id]/route.ts";
  let s=fs.readFileSync(p,'utf8');
  // Import sicherstellen
  if(!s.includes("from '@core/db/db/triMongo'") && !s.includes('from "@core/db/db/triMongo"') &&
     !s.includes("from '@core/db/triMongo'") && !s.includes('from "@core/db/triMongo"')) {
    s = s.replace(/^(import .+\n)+/, m => m + `import { getDb } from "@core/db/triMongo";\n`);
  }
  // Fallback: falls coreDb genutzt werden soll
  if (/getDb\(\)/.test(s)===false && /coreDb\(\)/.test(s)===false){
    s = s.replace(/const db\s*=\s*await\s+([^;]+);?/, 'const db = await getDb();');
  }
  fs.writeFileSync(p,s); console.log('✅ statements/[id]/route.ts abgesichert');
NODE
fi

# 4) GPT-Analyzer import + Wiring in /api/statements (ohne Heuristik, ohne Pflichtfelder)
node - <<'NODE'
const fs=require('fs'); const p="apps/web/src/app/api/statements/route.ts";
let s=fs.readFileSync(p,'utf8');

// Import einfügen, wenn fehlt
if(!s.includes('@features/analyze/analyzeContribution')){
  s = s.replace(/^(import .+\n)+/, m => m + 'import { analyzeContribution } from "@features/analyze/analyzeContribution";\n');
}

// Kategorie nicht mehr defaulten -> leer, GPT setzt sie
s = s.replace(/const\s+category\s*=\s*[^;\n]+;/, 'let category = String(body?.category ?? "").trim().slice(0,80);');

// Analyzer direkt vor 'new Date()' aufrufen (und category ggf. aus Ergebnis nehmen)
if(!s.includes('analyzeContribution(')){
  s = s.replace(/const\s+now\s*=\s*new Date\(\);/, `
  const analysis = await analyzeContribution(text, category ? [category] : []);
  if (!category && analysis.categories?.length) category = analysis.categories[0] || "";
  const now = new Date();
`);
}

// analysis im Dokument speichern
s = s.replace(/const\s+doc:\s*any\s*=\s*\{/, 'const doc: any = { analysis,');

// POST-Check: keine Doppler
s = s.replace('const doc: any = { analysis, analysis,', 'const doc: any = { analysis,');

fs.writeFileSync(p,s); console.log("✅ statements/route.ts → GPT-Analyzer verdrahtet");
NODE

# 5) Minimal-UI: nur Freitext (Titel/Kategorie entfernt)
cat > "$SRC/app/statements/new/page.tsx" <<'TSX'
"use client";
import { useState } from "react";

export default function NewStatement() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(""); setCreatedId(null);
    try {
      const t = (await (await fetch("/api/csrf", { cache: "no-store" })).json()).token;
      const res = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": t ?? "" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(()=>({}));
      if (res.ok && data?.ok && data?.id) {
        setCreatedId(String(data.id));
        setMsg("✅ erfolgreich gespeichert (inkl. KI-Analyse).");
        setText("");
      } else {
        setMsg(`❌ Fehler: ${data?.error || res.statusText}`);
      }
    } catch (e:any) {
      setMsg(`❌ Client/Netzwerk: ${e?.message || e}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Neues Anliegen</h1>
      <form onSubmit={submit} className="space-y-3">
        <textarea className="w-full h-56 border rounded px-3 py-2"
          placeholder="Dein Text…"
          value={text}
          onChange={e=>setText(e.target.value)}
          required
        />
        <button disabled={busy} className="border rounded px-4 py-2 disabled:opacity-50" type="submit">
          {busy ? "Sende…" : "Statement einreichen"}
        </button>
      </form>
      <div className="mt-3 text-sm">
        {msg && <div>{msg}</div>}
        {createdId && (
          <div className="mt-2">
            ID: <code>{createdId}</code> – <a className="underline" href={`/api/statements/${createdId}`}>API</a>
          </div>
        )}
      </div>
    </div>
  );
}
TSX

echo "✅ Fertig. Setze jetzt OPENAI_API_KEY in $WEB/.env.local und starte dev neu."
