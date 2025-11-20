#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$PWD}"
WEB="$ROOT/apps/web"
SRC="$WEB/src"

say(){ printf "\033[1;32m%s\033[0m\n" "$*"; }

say "🔧 Prüfe/angleiche Aliases"
node - <<'NODE'
const fs=require('fs'); const p="apps/web/tsconfig.json";
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.compilerOptions=j.compilerOptions||{}; j.compilerOptions.paths=j.compilerOptions.paths||{};
j.compilerOptions.paths['@/*']             = j.compilerOptions.paths['@/*'] || ['src/*'];
j.compilerOptions.paths['@features/*']     = ['../../features/*'];
j.compilerOptions.paths['@core/*']         = j.compilerOptions.paths['@core/*'] || ['../../core/*'];
j.compilerOptions.paths['@core/db/triMongo']  = ['src/shims/core/db/db/triMongo.ts'];
j.compilerOptions.paths['@core/db/db/triMongo']= ['src/shims/core/db/db/triMongo.ts'];
fs.writeFileSync(p, JSON.stringify(j,null,2));
console.log("✅ tsconfig ok");
NODE

say "🧩 Stelle Analyzer (GPT-only) bereit"
mkdir -p "$ROOT/features/analyze"
cat > "$ROOT/features/analyze/analyzeContribution.ts" <<'TS'
import { z } from "zod";

const schema = z.object({
  summary: z.string().min(1).max(240),
  categories: z.array(z.string()).min(1).max(8),
  language: z.string().min(2).max(5),
  regionHint: z.string().nullish()
});
export type Analysis = z.infer<typeof schema>;

function apiUrl(){ return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions"; }
function model(){  return process.env.OPENAI_MODEL || "gpt-4o"; }

export async function analyzeContribution(text: string, userCategories: string[] = []): Promise<Analysis> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  const sys = "Extrahiere: summary (<=180 Zeichen), 3-6 Kategorien, language (ISO-2), optional regionHint. Antworte NUR als JSON nach Schema.";
  const user = ([
    "TEXT:", text.slice(0, 6000),
    userCategories.length ? `\nCATEGORIES_HINT: ${userCategories.join(", ")}` : ""
  ]).join("");

  const body:any = {
    model: model(),
    temperature: 0.2,
    messages: [{ role:"system", content:sys }, { role:"user", content:user }],
    response_format: { type:"json_schema", json_schema:{
      name:"analysis", schema:{
        type:"object", additionalProperties:false,
        properties:{
          summary:{type:"string"},
          categories:{type:"array", items:{type:"string"}},
          language:{type:"string"},
          regionHint:{type:["string","null"]}
        },
        required:["summary","categories","language"]
      }
    }}
  };

  const res = await fetch(apiUrl(), {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const json:any = await res.json();
  const content = json?.choices?.[0]?.message?.content || "{}";
  const parsed = schema.safeParse(JSON.parse(content));
  if (!parsed.success) throw new Error("Invalid analysis JSON");
  return parsed.data;
}
TS

say "🧷 Kompat-Exports in triMongo (getDb/getVotesDb)"
node - <<'NODE'
const fs=require('fs'); const p="apps/web/src/shims/core/db/db/triMongo.ts";
let s=fs.readFileSync(p,'utf8');
if(!/export\s+async\s+function\s+getDb/.test(s)){
  s += `

export async function getDb(){ return coreDb(); }
export async function getVotesDb(){ return votesDb(); }
`;
  fs.writeFileSync(p,s);
  console.log("✅ triMongo erweitert");
} else { console.log("ℹ️ triMongo ok"); }
NODE

say "🛠  /api/statements – Import + Wiring erzwingen"
node - <<'NODE'
const fs=require('fs'); const p="apps/web/src/app/api/statements/route.ts";
let s=fs.readFileSync(p,'utf8');
if(!s.includes('@features/analyze/analyzeContribution')){
  s = s.replace(/^(import .+\n)+/, m => m + 'import { analyzeContribution } from "@features/analyze/analyzeContribution";\n');
}
s = s.replace(/const\s+category\s*=\s*[^;\n]+;/, 'let category = String(body?.category ?? "").trim().slice(0,80);');
if(!s.includes('analyzeContribution(')){
  s = s.replace(/const\s+now\s*=\s*new Date\(\);/, `
  const analysis = await analyzeContribution(text, category ? [category] : []);
  if (!category && analysis.categories?.length) category = analysis.categories[0] || "";
  const now = new Date();
`);
}
s = s.replace(/const\s+doc:\s*any\s*=\s*\{/, 'const doc: any = { analysis,');
s = s.replace('const doc: any = { analysis, analysis,', 'const doc: any = { analysis,');
fs.writeFileSync(p,s);
console.log("✅ statements/route.ts verdrahtet");
NODE

say "🛠  /api/statements/[id] – auf coreCol umstellen (robust)"
mkdir -p "$SRC/app/api/statements/[id]"
cat > "$SRC/app/api/statements/[id]/route.ts" <<'TS'
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { coreCol } from "@core/db/triMongo";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!ObjectId.isValid(params.id)) {
    return NextResponse.json({ ok:false, error:"bad_id" }, { status:400 });
  }
  const col = await coreCol("statements");
  const doc = await col.findOne({ _id: new ObjectId(params.id) });
  if (!doc) return NextResponse.json({ ok:false, error:"not_found" }, { status:404 });
  return NextResponse.json({ ok:true, data:{
    id: String(doc._id),
    title: doc.title ?? null,
    text: doc.text,
    category: doc.category ?? null,
    language: doc.language ?? null,
    createdAt: doc.createdAt, updatedAt: doc.updatedAt,
    analysis: doc.analysis ?? null,
  }});
}
TS

say "📦 Deps"
cd "$WEB"
pnpm add zod openai@^4 >/dev/null

say "🔐 ENV-Hinweise"
touch "$WEB/.env.local"
grep -q '^OPENAI_MODEL=' "$WEB/.env.local" || echo 'OPENAI_MODEL=gpt-4o' >> "$WEB/.env.local"
grep -q '^OPENAI_API_KEY=' "$WEB/.env.local" || echo 'OPENAI_API_KEY=HIER_EINTRAGEN' >> "$WEB/.env.local"

say "✅ Done. Bitte dev neu starten."
