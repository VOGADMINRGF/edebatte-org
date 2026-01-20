#!/usr/bin/env bash
set -euo pipefail
APP="apps/web"

mkdir -p "$APP/src/store" "$APP/src/ui" "$APP/src/lib/net"

# Zustand-Store (ohne extra lib, tiny)
cat > "$APP/src/store/pipeline.ts" <<'TS'
"use client";
import { useSyncExternalStore } from "react";

type Step = { id:string; label:string; status:"idle"|"run"|"ok"|"err"; ms?:number };
const steps = new Map<string, Step>();
let analyzing = false;
let ready = false;
let sub = new Set<() => void>();
const emit = ()=> sub.forEach(f=>f());

export function setAnalyzing(v:boolean){ analyzing=v; if(!v) ready=true; emit(); }
export function getAnalyzing(){ return analyzing; }
export function getReady(){ return ready; }
export function setStep(s:Step){ steps.set(s.id,s); emit(); }
export function reset(){ analyzing=false; ready=false; steps.clear(); emit(); }

export function usePipeline(){
  return useSyncExternalStore(
    (cb)=>{ sub.add(cb); return ()=>sub.delete(cb); },
    ()=>({ analyzing, ready, steps: Array.from(steps.values()) })
  );
}
TS

# fetch-Instrumentation (Client)
cat > "$APP/src/lib/net/fetchInstrument.tsx" <<'TS'
"use client";
import { PropsWithChildren, useEffect } from "react";
import { setStep, setAnalyzing, reset } from "@/store/pipeline";

const WATCH = [
  { id:"stance",  match:/\/api\/stance\/expand/ , label:"eDebatte-AI 1 · Lager/Varianten"},
  { id:"civic",   match:/\/api\/search\/civic/  , label:"eDebatte-AI 2 · Recherche"     },
  { id:"analyze", match:/\/api\/contributions\/analyze/, label:"eDebatte-AI 3 · Claims" }
];

export default function FetchInstrument({children}:PropsWithChildren){
  useEffect(()=>{
    if (typeof window === "undefined") return;
    const orig = window.fetch;
    let inFlight = 0;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String((input as any)?.url || "");
      const hit = WATCH.find(w=>w.match.test(url));
      if (hit){
        if (inFlight===0){ reset(); setAnalyzing(true); document.body.dataset.analyzing="1"; }
        inFlight++;
        const t0 = performance.now();
        setStep({ id:hit.id, label:hit.label, status:"run" });
        try{
          const res = await orig(input, init);
          const ms = Math.round(performance.now()-t0);
          setStep({ id:hit.id, label:hit.label, status: res.ok?"ok":"err", ms });
          return res;
        }catch(e){
          const ms = Math.round(performance.now()-t0);
          setStep({ id:hit.id, label:hit.label, status:"err", ms });
          throw e;
        }finally{
          inFlight--;
          if (inFlight<=0){ setAnalyzing(false); document.body.dataset.analyzing="0"; document.body.dataset.analysisReady="1"; }
        }
      }
      return orig(input, init);
    };

    return ()=>{ window.fetch = orig; };
  },[]);
  return children as any;
}
TS

# HUD-Komponente
cat > "$APP/src/ui/PipelineHUD.tsx" <<'TS'
"use client";
import { usePipeline } from "@/store/pipeline";

function Dot({s}:{s:"idle"|"run"|"ok"|"err"}){
  const c = s==="run"?"bg-amber-500 animate-pulse": s==="ok"?"bg-emerald-500": s==="err"?"bg-rose-500":"bg-gray-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}

export default function PipelineHUD(){
  const { analyzing, steps } = usePipeline();
  if (!analyzing && steps.length===0) return null;
  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="shadow-md rounded-xl bg-white/90 backdrop-blur px-3 py-2 text-xs text-slate-700 border border-slate-200">
        <div className="font-medium mb-1">Analyse läuft…</div>
        <ul className="space-y-1">
          {steps.map(s=>(
            <li key={s.id} className="flex items-center gap-2">
              <Dot s={s.status} />
              <span>{s.label}</span>
              {typeof s.ms==="number" && <span className="text-slate-400">· {s.ms}ms</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
TS

# Layout patch: Instrumentation + HUD einhängen
FILE="$APP/src/app/layout.tsx"
if [ -f "$FILE" ]; then
  cp "$FILE" "$FILE.bak.$(date +%s)"
  # Import einfügen
  perl -0777 -pi -e 's#(from\s+\"next\/font\/.*?\";[\r\n]+)#$1import FetchInstrument from \"@\/lib\/net\/fetchInstrument\";\nimport PipelineHUD from \"@\/ui\/PipelineHUD\";\n#s' "$FILE" || true
  # Body um HUD/Instrumentation erweitern
  perl -0777 -pi -e 's#(<body[^>]*>)#$1\n      <FetchInstrument>\n        <PipelineHUD />#s' "$FILE"
  perl -0777 -pi -e 's#(</body>)#      </FetchInstrument>\n  $1#s' "$FILE"
fi

# CSS-Gating & Skeleton
CSS="$APP/src/app/globals.css"
grep -q "/* eDebatte gating */" "$CSS" 2>/dev/null || cat >> "$CSS" <<'CSS'

/* eDebatte gating */
body[data-analyzing="1"] [data-requires-analysis] { display: none; }
body:not([data-analysis-ready="1"]) [data-requires-analysis] { display: none; }
/* Simple skeleton */
.skeleton { @apply animate-pulse rounded-xl bg-slate-200/70; }
CSS

rm -rf "$APP/.next" 2>/dev/null || true
echo "✓ HUD + Instrumentation gepatcht. In Panels einfach data-requires-analysis setzen."
