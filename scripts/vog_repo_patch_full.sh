# scripts/vog_repo_patch_full.sh
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
WEB="apps/web"
ENV_ROOT="$ROOT/.env.local"
ENV_WEB="$ROOT/$WEB/.env.local"
USAGE_FILE="${VOG_USAGE_FILE:-/tmp/vog-usage.jsonl}"

echo "→ Repo: $ROOT"
echo "→ App : $WEB"

bk () { [[ -f "$1" && ! -L "$1" ]] && cp -n "$1" "$1.bak.$(date +%s)" && echo "  • backup: $1.bak.*" || true; }
write () { mkdir -p "$(dirname "$1")"; bk "$1"; cat > "$1" <<'TS'
'"$2"'
TS
echo "  ✓ wrote: $1"; }

echo "=== STEP 0: .env Kette ==="
if [[ ! -f "$ENV_ROOT" ]]; then
  echo "  • $ENV_ROOT fehlt → Stub anlegen (OPENAI_API_KEY selbst eintragen)"
  cat > "$ENV_ROOT" <<'EOF'
# Root env
# OPENAI_API_KEY=sk-...
EOF
fi
if [[ -L "$ENV_WEB" ]]; then
  echo "  ✓ $ENV_WEB ist Symlink"
else
  [[ -f "$ENV_WEB" ]] && bk "$ENV_WEB"
  ln -sf "../../.env.local" "$ENV_WEB"
  echo "  ✓ Symlink gesetzt: $ENV_WEB → ../../.env.local"
fi

echo "=== STEP 1: Debug/Health ==="
write "$WEB/src/app/api/debug/env/route.ts" 'import { NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const mask=(v?:string|null)=>!v?null:{len:v.length,head:v.slice(0,5),tail:v.slice(-3)};
export async function GET(){ return NextResponse.json({
  NODE_ENV: process.env.NODE_ENV,
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
}); }
export async function HEAD(){ return new Response(null,{status:200}); }
export async function OPTIONS(){ return new Response(null,{status:204,headers:{Allow:"GET,HEAD,OPTIONS"}}); }'

if [[ ! -f "$WEB/src/app/api/health/route.ts" ]]; then
  write "$WEB/src/app/api/health/route.ts" 'import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ return NextResponse.json({ ok:true, ts: Date.now() }); }'
fi

echo "=== STEP 2: Usage-Metering (file-based) ==="
mkdir -p "$(dirname "$USAGE_FILE")"; touch "$USAGE_FILE"
write "$WEB/src/lib/metrics/usage.ts" '// BEGIN:eDebatte Usage
import fs from "node:fs";
const USAGE_FILE = process.env.VOG_USAGE_FILE || "/tmp/vog-usage.jsonl";
export type UsageRecord = { ts:number; route:string; userId?:string|null; model?:string|null;
  promptTokens?:number|null; completionTokens?:number|null; totalTokens?:number|null; ms?:number|null; ok:boolean; err?:string|null; meta?:Record<string,any>; };
export async function recordUsage(u: UsageRecord){ try{ await fs.promises.appendFile(USAGE_FILE, JSON.stringify(u)+"\n","utf8"); }catch(e:any){ console.error("usage-append-failed:", e?.message||e); } }
export async function aggregateUsage(){
  try{ const txt=await fs.promises.readFile(USAGE_FILE,"utf8"); const rows=txt.split(/\n+/).filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean) as UsageRecord[];
    const by:Record<string,any>={}; for(const r of rows){ const day=new Date(r.ts).toISOString().slice(0,10); const key=day+"::"+(r.userId||"anon"); const cur=by[key] ||= { day, userId:r.userId||"anon", total:0, ok:0, err:0, tokens:0, ms:0, routes:{}, models:{} };
      cur.total++; r.ok?cur.ok++:cur.err++; cur.tokens += Number(r.totalTokens||0); cur.ms += Number(r.ms||0);
      cur.routes[r.route]=(cur.routes[r.route]||0)+1; if(r.model) cur.models[r.model]=(cur.models[r.model]||0)+1; }
    return Object.values(by);
  }catch(e:any){ return { error:String(e?.message||e) }; }
}
// END:eDebatte Usage
'
write "$WEB/src/app/api/admin/usage/summary/route.ts" 'import { NextResponse } from "next/server";
import { aggregateUsage } from "@/lib/metrics/usage";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ const data=await aggregateUsage(); return NextResponse.json({ ok:true, data }); }'

echo "=== STEP 3: Analyze-Route robust + Usage-Logging ==="
AN="$WEB/src/app/api/contributions/analyze/route.ts"
bk "$AN"
cat > "$AN" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { recordUsage } from "@/lib/metrics/usage";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
import { step_analyze_multi_llm } from "@/app/pipeline/steps/analyze_multi_llm";

export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function POST(req: NextRequest){
  const t0 = Date.now();
  let ok=false, err:string|null=null, model:string|undefined, totalTokens:number|undefined;
  let out:any=null;
  try{
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || (process.env.VOG_ANALYZE_MODE || "gpt");
    const body = await req.json().catch(()=>({}));
    const text = String((body as any)?.text ?? "").trim().slice(0, 8000);
    const maxClaims = Number((body as any)?.maxClaims ?? 3);
    if(!text){ out={ error:"Kein Text übergeben.", status:400 }; ok=true; return NextResponse.json(out,{status:200}); }
    out = mode==="multi" ? await step_analyze_multi_llm(text,{maxClaims}) : await analyzeContribution(text,{maxClaims});
    model = out?._meta?.model || process.env.OPENAI_API_MODEL || undefined;
    totalTokens = out?._meta?.usage?.total_tokens || undefined;
    ok=true;
    return NextResponse.json(out,{status:200});
  }catch(e:any){
    err = String(e?.message||e);
    out = { _meta:{ mode:"error", errors:[String(err)], tookMs: Date.now()-t0 } };
    return NextResponse.json(out,{status:200});
  }finally{
    await recordUsage({ ts:Date.now(), route:"/api/contributions/analyze", userId:null, model:model||null,
      totalTokens: totalTokens||null, ms: Date.now()-t0, ok, err: ok?null:err, meta:{ source:"wrapper" } });
  }
}
TS
echo "  ✓ analyze/route.ts um Schutz + Usage ergänzt"

echo "=== STEP 4: Shim für '@/features/analysis/extract' (Translate-Fix) ==="
write "$WEB/src/features/analysis/extract.ts" 'export { analyzeContribution } from "@features/analyze/analyzeContribution";'

echo "=== STEP 5 (optional): Similar-Route (falls nicht vorhanden) ==="
SIM="$WEB/src/app/api/statements/similar/route.ts"
if [[ ! -f "$SIM" ]]; then
  write "$SIM" 'import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const norm=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export async function GET(req:NextRequest){
  const text = norm(String(req.nextUrl.searchParams.get("text")||""));
  if(/(opnv|oepnv|tram|strassenbahn|nahverkehr|bvg|koepenick|kopenick)/.test(text)){
    return NextResponse.json({ kind:"cluster", clusterId:"clu-berlin-tram", top:[
      { id:"stmt-berlin-tram-a", title:"Straßenbahn Ostkreuz–Köpenick ausbauen", trust:0.62, evidenceCount:2, sim:0.82 },
      { id:"stmt-berlin-tram-b", title:"Kostenloser ÖPNV in Berlin", trust:0.55, evidenceCount:1, sim:0.78 },
    ]});
  }
  return NextResponse.json({ kind:"none" });
}'
fi

echo "=== DONE ==="
echo "Checks:"
echo "  curl -s http://127.0.0.1:3000/api/debug/env | jq ."
echo "  curl -s http://127.0.0.1:3000/api/health | jq ."
echo "  curl -s --get --data-urlencode \"text=ÖPNV Berlin\" http://127.0.0.1:3000/api/statements/similar | jq ."
echo "  curl -s -X POST -H 'content-type: application/json' -d '{\"text\":\"Ich bin gegen Preiserhöhungen.\",\"maxClaims\":5}' \"http://127.0.0.1:3000/api/contributions/analyze?mode=multi&clarify=1\" | jq '{_meta,claims}'"
