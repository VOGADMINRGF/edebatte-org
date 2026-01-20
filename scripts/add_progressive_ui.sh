#!/usr/bin/env bash
set -euo pipefail
APP="apps/web"
echo "→ Install framer-motion (für sanfte Auto-Height/Spring)"
pnpm -w add framer-motion >/dev/null

mkdir -p "$APP/src/ui/progressive" "$APP/src/store" "$APP/src/lib/net"

############################################
# A) Pipeline-Store: doneAt für Fertig-Reihenfolge
############################################
cat > "$APP/src/store/pipeline.ts" <<'TS'
"use client";
import { useSyncExternalStore } from "react";

export type Step = { id:string; label:string; status:"idle"|"run"|"ok"|"err"; ms?:number; doneAt?:number };
const steps = new Map<string, Step>();
let analyzing = false;
let ready = false;
const subs = new Set<() => void>();
const emit = ()=> subs.forEach(fn=>fn());

export function setAnalyzing(v:boolean){ analyzing=v; if(!v) ready=true; emit(); }
export function getAnalyzing(){ return analyzing; }
export function getReady(){ return ready; }
export function reset(){ analyzing=false; ready=false; steps.clear(); emit(); }
export function setStep(s:Step){
  const prev = steps.get(s.id);
  const finished = (s.status==="ok" || s.status==="err");
  steps.set(s.id, {
    ...prev, ...s,
    doneAt: finished ? (prev?.doneAt ?? Date.now()) : prev?.doneAt
  });
  emit();
}
export function usePipeline(){
  return useSyncExternalStore(
    (cb)=>{ subs.add(cb); return ()=>subs.delete(cb); },
    ()=>({ analyzing, ready, steps: Array.from(steps.values()) })
  );
}
TS

############################################
# B) Typewriter-Hook + Komponenten
############################################
cat > "$APP/src/ui/progressive/useTypewriter.ts" <<'TS'
"use client";
import { useEffect, useRef, useState } from "react";

/** Tippt Text sichtbar. speed = Zeichen/ms (z.B. 25 = 25ms pro Zeichen) */
export function useTypewriter(full: string, speed = 25, start = true){
  const [txt, setTxt] = useState("");
  const i = useRef(0);
  useEffect(()=>{
    if (!start){ setTxt(""); i.current=0; return; }
    setTxt(""); i.current=0;
    const t = setInterval(()=>{
      i.current++;
      setTxt(full.slice(0, i.current));
      if (i.current >= full.length) clearInterval(t);
    }, speed);
    return ()=>clearInterval(t);
  }, [full, speed, start]);
  return txt;
}
TS

cat > "$APP/src/ui/progressive/Grow.tsx" <<'TS'
"use client";
import { motion } from "framer-motion";
import { PropsWithChildren } from "react";

/** Weiches Einblenden + Auto-Height */
export default function Grow({children, delay=0}: PropsWithChildren<{delay?:number}>){
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ type: "spring", stiffness: 140, damping: 18, delay }}
    >
      {children}
    </motion.div>
  );
}
TS

cat > "$APP/src/ui/progressive/ProgressiveSlots.tsx" <<'TS'
"use client";
import { useMemo } from "react";
import Grow from "./Grow";
import { usePipeline } from "@/store/pipeline";

type Renderers = {
  stance?: () => JSX.Element;   // eDebatte-AI 1: Lager/Varianten
  civic?: () => JSX.Element;    // eDebatte-AI 2: Recherche
  analyze?: () => JSX.Element;  // eDebatte-AI 3: Claims/Essenz
};
export default function ProgressiveSlots({ render }: { render: Renderers }){
  const { steps } = usePipeline();

  // Wir ordnen fertige Schritte nach doneAt (wer zuerst fertig, kommt zuerst)
  const order = useMemo(()=>{
    const map = new Map(steps.map(s=>[s.id, s]));
    const ids = ["stance","civic","analyze"].filter(id=>map.get(id)?.doneAt);
    return ids.sort((a,b)=>(map.get(a)!.doneAt! - map.get(b)!.doneAt!));
  }, [steps]);

  const blocks = order.map((id, idx)=>{
    const Comp = (id==="stance") ? render.stance
              : (id==="civic") ? render.civic
              : (id==="analyze") ? render.analyze
              : undefined;
    if (!Comp) return null;
    return (
      <Grow key={id} delay={idx*0.05}>
        <Comp />
      </Grow>
    );
  });

  return <div className="space-y-6">{blocks}</div>;
}
TS

############################################
# C) Fetch-Instrumentation (falls noch nicht da) – lässt Body wachsen
############################################
mkdir -p "$APP/src/lib/net"
cat > "$APP/src/lib/net/fetchInstrument.tsx" <<'TS'
"use client";
import { PropsWithChildren, useEffect } from "react";
import { reset, setAnalyzing, setStep } from "@/store/pipeline";

const WATCH = [
  { id:"stance",  match:/\/api\/stance\/expand/,            label:"eDebatte-AI 1 · Lager/Varianten"},
  { id:"civic",   match:/\/api\/search\/civic/,             label:"eDebatte-AI 2 · Recherche"},
  { id:"analyze", match:/\/api\/contributions\/analyze/,    label:"eDebatte-AI 3 · Claims"}
];

export default function FetchInstrument({children}:PropsWithChildren){
  useEffect(()=>{
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

############################################
# D) HUD (klein) für visuelles Feedback – optional
############################################
cat > "$APP/src/ui/PipelineHUD.tsx" <<'TS'
"use client";
import { usePipeline } from "@/store/pipeline";

function Dot({s}:{s:"idle"|"run"|"ok"|"err"}){
  const c = s==="run"?"bg-amber-500 animate-pulse": s==="ok"?"bg-emerald-500": s==="err"?"bg-rose-500":"bg-gray-300";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}
export default function PipelineHUD(){
  const { steps } = usePipeline();
  if (!steps.length) return null;
  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="shadow-md rounded-xl bg-white/90 backdrop-blur px-3 py-2 text-xs text-slate-700 border border-slate-200">
        <div className="font-medium mb-1">Analyse</div>
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

############################################
# E) Layout: Instrumentation + HUD anhängen (idempotent)
############################################
LAY="$APP/src/app/layout.tsx"
if [ -f "$LAY" ]; then
  cp "$LAY" "$LAY.bak.$(date +%s)"
  perl -0777 -pe '
    s#(from\s+"next/font/[^"]+";[\r\n]+)#$1import FetchInstrument from "@/lib/net/fetchInstrument";\nimport PipelineHUD from "@/ui/PipelineHUD";\n#s;
    s#(<body[^>]*>)#$1\n      <FetchInstrument>\n        <PipelineHUD />#s;
    s#(</body>)#      </FetchInstrument>\n$1#s;
  ' -i "$LAY"
fi

############################################
# F) Klein bisschen CSS für Vorher/Nachher
############################################
CSS="$APP/src/app/globals.css"
grep -q "/* progressive-gating */" "$CSS" 2>/dev/null || cat >> "$CSS" <<'CSS'

/* progressive-gating */
body[data-analyzing="1"] [data-requires-analysis] { display: none; }
body:not([data-analysis-ready="1"]) [data-requires-analysis] { display: none; }
/* skeleton helper */
.skeleton { @apply animate-pulse rounded-xl bg-slate-200/70; }
CSS

echo "✓ Progressive UI installiert."
