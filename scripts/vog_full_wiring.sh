# scripts/vog_full_wiring.sh
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
WEB="apps/web"
ENV_ROOT="$ROOT/.env.local"
ENV_WEB="$ROOT/$WEB/.env.local"
USAGE_FILE="/tmp/vog-usage.jsonl"

echo "→ Repo: $ROOT"
echo "→ App : $WEB"

backup_if_real_file () {
  local f="$1"
  if [[ -f "$f" && ! -L "$f" ]]; then
    cp -n "$f" "${f}.bak.$(date +%s)"
    echo "  • backup: ${f}.bak.*"
  fi
}

write_file () {
  local path="$1"; shift
  mkdir -p "$(dirname "$path")"
  backup_if_real_file "$path"
  cat > "$path" <<'TS'
'"$@"'
TS
  echo "  ✓ wrote: $path"
}

echo "=== STEP 1: .env-Kette prüfen ==="
if [[ ! -f "$ENV_ROOT" ]]; then
  echo "  • $ENV_ROOT fehlt → lege Stub an (bitte OPENAI_API_KEY eintragen)"
  cat > "$ENV_ROOT" <<'EOF'
# Root env – bitte Schlüssel setzen:
# OPENAI_API_KEY=sk-...
EOF
fi

if [[ -L "$ENV_WEB" ]]; then
  echo "  ✓ $ENV_WEB ist Symlink → ok"
else
  if [[ -f "$ENV_WEB" ]]; then
    backup_if_real_file "$ENV_WEB"
  fi
  ln -sf "../../.env.local" "$ENV_WEB"
  echo "  ✓ Symlink gesetzt: $ENV_WEB → ../../.env.local"
fi

echo "=== STEP 2: Debug/Health Routen ==="
# /api/debug/env – zeigt keine Klartexte, nur Masken/Längen
write_file "$WEB/src/app/api/debug/env/route.ts" 'import { NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
function mask(v?: string|null){ if(!v) return null; return {len:v.length, head:v.slice(0,5), tail:v.slice(-3)};}
export async function GET(){
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    OPENAI_API_KEY: mask(process.env.OPENAI_API_KEY),
  });
}'

# /api/health (idempotent – falls schon vorhanden, lassen wir es in Ruhe)
if [[ ! -f "$WEB/src/app/api/health/route.ts" ]]; then
  write_file "$WEB/src/app/api/health/route.ts" 'import { NextResponse } from "next/server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ return NextResponse.json({ok:true, ts: Date.now()}); }'
fi

echo "=== STEP 3: Usage-Metering (Datei-basiert, optional DB später) ==="
mkdir -p "$(dirname "$USAGE_FILE")"; touch "$USAGE_FILE"

write_file "$WEB/src/lib/metrics/usage.ts" '// BEGIN:eDebatte Usage
import fs from "node:fs";
import path from "node:path";

const USAGE_FILE = process.env.VOG_USAGE_FILE || "/tmp/vog-usage.jsonl";

export type UsageRecord = {
  ts: number;
  route: string;
  userId?: string|null;
  model?: string|null;
  promptTokens?: number|null;
  completionTokens?: number|null;
  totalTokens?: number|null;
  ms?: number|null;
  ok: boolean;
  err?: string|null;
  meta?: Record<string,any>;
};

export async function recordUsage(u: UsageRecord){
  try{
    const line = JSON.stringify(u) + "\\n";
    await fs.promises.appendFile(USAGE_FILE, line, "utf8");
  }catch(e:any){
    console.error("usage-append-failed:", e?.message||e);
  }
}

// kleine Aggregation (Datei-basiert)
export async function aggregateUsage() {
  try{
    const txt = await fs.promises.readFile(USAGE_FILE, "utf8");
    const lines = txt.split(/\\n+/).filter(Boolean);
    const rows: UsageRecord[] = lines.map(l=>{ try{return JSON.parse(l);}catch{ return null as any; } }).filter(Boolean);
    const byDayUser: Record<string, any> = {};
    for(const r of rows){
      const day = new Date(r.ts).toISOString().slice(0,10);
      const key = `${day}::${r.userId||"anon"}`;
      const cur = byDayUser[key] ||= { day, userId: r.userId||"anon", total:0, ok:0, err:0, tokens:0, ms:0, routes:{} as any, models:{} as any };
      cur.total += 1;
      cur.ok += r.ok ? 1 : 0;
      cur.err += r.ok ? 0 : 1;
      cur.tokens += Number(r.totalTokens||0);
      cur.ms += Number(r.ms||0);
      cur.routes[r.route] = (cur.routes[r.route]||0)+1;
      if(r.model) cur.models[r.model] = (cur.models[r.model]||0)+1;
    }
    return Object.values(byDayUser);
  }catch(e:any){
    return { error: String(e?.message||e) };
  }
}
// END:eDebatte Usage
'

write_file "$WEB/src/app/api/admin/usage/summary/route.ts" 'import { NextResponse } from "next/server";
import { aggregateUsage } from "@/lib/metrics/usage";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ const data = await aggregateUsage(); return NextResponse.json({ ok:true, data }); }'

echo "=== STEP 4: Analyze-Route robust machen + Usage-Logging ==="
# Wir wrappen die bestehende Analyze-Route defensiv und loggen die Dauer/Fehler.
AN_ROUTE="$WEB/src/app/api/contributions/analyze/route.ts"
if rg -n "BEGIN:VOG_ANALYZE_WRAPPER" "$AN_ROUTE" >/dev/null 2>&1; then
  echo "  ✓ Analyze-Route hat bereits Wrapper"
else
  backup_if_real_file "$AN_ROUTE"
  # Wir bauen einen minimalen Wrapper um die existierende Implementierung.
  cat > "$AN_ROUTE" <<'TS'
// BEGIN:VOG_ANALYZE_WRAPPER
import { NextRequest, NextResponse } from "next/server";
import { recordUsage } from "@/lib/metrics/usage";
// deine eigentliche Logik:
import { analyzeContribution } from "@/features/analyze/analyzeContribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest){
  const t0 = Date.now();
  let ok = false, err: any=null, out: any = null;
  let model: string|undefined;
  let totalTokens: number|undefined;

  try{
    const body = await req.json().catch(()=> ({}));
    const text = String(body?.text||"").slice(0, 8000);
    const maxClaims = Number(body?.maxClaims ?? 5);
    // eigentliche Analyse (robust, darf nie crashen)
    out = await analyzeContribution(text, { maxClaims, debug: false });
    // (optional) falls dein analyzeContribution Meta-Usage liefert:
    model = (out?._meta?.model) || undefined;
    totalTokens = (out?._meta?.usage?.total_tokens) || undefined;
    ok = true;
  }catch(e:any){
    err = e?.message||String(e);
    out = { _meta: { mode:"error", errors:[String(err)], tookMs: Date.now()-t0 } };
  }finally{
    await recordUsage({
      ts: Date.now(),
      route: "/api/contributions/analyze",
      userId: null,         // wenn du Auth hast, hier ID eintragen
      model: model||null,
      totalTokens: totalTokens||null,
      ms: Date.now()-t0,
      ok, err: ok?null:String(err||"") || null,
      meta: { source:"wrapper" }
    });
  }
  return NextResponse.json(out);
}
// END:VOG_ANALYZE_WRAPPER
TS
  echo "  ✓ Analyze-Wrapper gesetzt"
fi

echo "=== STEP 5: Prozess-Ticker im Fließtext + UI-Gating (sanft) ==="
# 5a) Store-Events – minimaler Event-Bus
write_file "$WEB/src/store/pipelineEvents.ts" '/* BEGIN:eDebatte pipeline events (client) */
"use client";
type Tick = { ts:number; kind:string; msg:string };
const subs = new Set<(t:Tick)=>void>();
export function pushTick(kind:string, msg:string){
  const t = { ts: Date.now(), kind, msg };
  subs.forEach(fn=>fn(t));
}
export function onTicks(fn:(t:Tick)=>void){
  subs.add(fn); return ()=>subs.delete(fn);
}
/* END:eDebatte pipeline events */'

# 5b) Fließtext-Ticker-Komponente (Chat-Style)
write_file "$WEB/src/ui/FlowTicker.tsx" '/* BEGIN:eDebatte FlowTicker */
"use client";
import { useEffect, useState, useRef } from "react";
import { onTicks } from "@/store/pipelineEvents";
export default function FlowTicker(){
  const [items, setItems] = useState<{ts:number,kind:string,msg:string}[]>([]);
  const ref = useRef<HTMLDivElement|null>(null);
  useEffect(()=> onTicks(t=>{ setItems(v=>[...v, t].slice(-200)); setTimeout(()=> ref.current?.scrollTo({ top: 10**9, behavior:"smooth" }), 10); }), []);
  if(!items.length) return null;
  return (
    <div className="mt-4 rounded-xl border p-3 text-sm bg-white/60">
      {items.map((it,i)=>(
        <div key={it.ts+"-"+i} className="leading-6">
          <span className="opacity-50 mr-2">{new Date(it.ts).toLocaleTimeString()}</span>
          <b className="mr-2">{it.kind}</b>
          <span>{it.msg}</span>
        </div>
      ))}
      <div ref={ref} />
    </div>
  );
}
/* END:eDebatte FlowTicker */'

# 5c) Gate Panels (Contributions/New) – erst anzeigen, wenn sinnvolle Daten da sind
CN_PAGE="$WEB/src/app/contributions/new/page.tsx"
if [[ -f "$CN_PAGE" ]]; then
  if ! rg -n "BEGIN:VOG_UI_GATING" "$CN_PAGE" >/dev/null 2>&1; then
    backup_if_real_file "$CN_PAGE"
    awk '1; /<main/ && !p {print "{/* BEGIN:VOG_UI_GATING */}"; p=1}' "$CN_PAGE" > "$CN_PAGE.tmp" || true
    mv "$CN_PAGE.tmp" "$CN_PAGE" || true
    echo "  • Bitte im Editor an passender Stelle Panels mit einfachem Flag umschließen, z.B.:"
    echo '    {hasResult && <LagerSpektrum/>}'
    echo '    {hasResult && <EinwaendeArgumente/>}'
    echo '    {hasResult && <QuickEssenz/>}'
  else
    echo "  ✓ UI-Gating Marker vorhanden (manueller Feinschliff im Editor)"
  fi
else
  echo "  • Hinweis: contributions/new/page.tsx nicht gefunden – UI-Gating übersprungen"
fi

echo "=== STEP 6: Admin-Config – Usage Summary Endpoint bereits unter /api/admin/usage/summary ==="
echo "  • Datenquelle: $USAGE_FILE (env: VOG_USAGE_FILE anpassbar)"
echo "=== Fertig ==="
