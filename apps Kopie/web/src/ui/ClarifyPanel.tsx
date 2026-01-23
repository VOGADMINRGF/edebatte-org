"use client";
import React from "react";

export type Hints = {
  level?: "eu"|"bund"|"land"|"kommune"|null;
  regions?: string[];              // Mehrfach
  timeframe?: "aktuell"|"letzte12"|"letzte5"|"seit1990"|"unsicher"|null;
  audience?: string[];             // Mehrfach (buerger, unternehmen, staat, kinder, rentner)
  stance?: "pro"|"neutral"|"contra"|"unsicher"|null;
  other?: string;
};

function toggle(list:string[], v:string){ return list.includes(v) ? list.filter(x=>x!==v) : [...list, v]; }
const chip = (active:boolean)=>"vog-chip " + (active ? "ring-2 ring-sky-400" : "");

export default function ClarifyPanel({
  text, value, onChange,
}: { text:string; value:Hints; onChange:(v:Hints)=>void }){
  const [othersOpen,setOthersOpen]=React.useState(false);

  // Auto-Vorschlag (debounced)
  React.useEffect(()=>{
    if(!text.trim()) return;
    const ac = new AbortController();
    const t = setTimeout(async()=>{
      try{
        const r = await fetch("/api/quality/clarify",{
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({ text }),
          signal: ac.signal
        });
        const j = await r.json().catch(()=>null);
        if(j?.ok && j?.hints){
          const next:Hints = { ...(value||{}) };
          next.level ??= j.hints.level ?? null;
          if((!next.regions || next.regions.length===0) && j.hints.region){ next.regions=[j.hints.region]; }
          next.timeframe ??= j.hints.timeframe ?? null;
          next.stance ??= j.hints.stance ?? null;
          if((!next.audience || next.audience.length===0) && j.hints.audience){ next.audience=[j.hints.audience]; }
          onChange(next);
        }
      }catch{}
    }, 350);
    return ()=>{ clearTimeout(t); ac.abort(); };
  }, [text]);

  const v:Hints = { regions:[], audience:[], ...value };

  return (
    <div className="space-y-3">
      <div className="text-slate-500 text-sm">Optional präzisieren (für bessere Ergebnisse):</div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">EBENE/ZUSTÄNDIGKEIT <span className="text-slate-400">(Mehrfach möglich)</span></div>
        {["eu","bund","land","kommune"].map(k=>(
          <button key={k} className={chip(v.level===k)} onClick={()=>onChange({ ...v, level: v.level===k ? null : (k as any) })}>
            {k==="eu"?"EU":k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
        <button className={chip(v.level===null)} onClick={()=>onChange({ ...v, level:null })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ORT/REGION <span className="text-slate-400">(Mehrfach möglich)</span></div>
        <button className={chip(v.regions!.includes("bundesweit"))}
          onClick={()=>onChange({ ...v, regions: toggle(v.regions!, "bundesweit") })}>Bundesweit</button>
        <button className={chip(v.regions!.some(x=>x!=="bundesweit"))}
          onClick={()=>{ const r = prompt("Stadt/Region angeben:")?.trim(); if(r){ onChange({ ...v, regions: Array.from(new Set([...(v.regions||[]).filter(x=>x!=="bundesweit"), r])) }); }}}>Stadt/Region…</button>
        <button className={chip(v.regions!.length===0)} onClick={()=>onChange({ ...v, regions: [] })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ZEITRAUM</div>
        {[
          ["aktuell","Aktuell"],
          ["letzte12","Letzte 12 Monate"],
          ["letzte5","Letzte 5 Jahre"],
          ["seit1990","Seit 1990"],
          ["unsicher","Unsicher"],
        ].map(([k,lab])=>(
          <button key={k} className={chip(v.timeframe===k)} onClick={()=>onChange({ ...v, timeframe:k as any })}>{lab}</button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">BETROFFENE</div>
        {[
          ["buerger","Bürger*innen"],
          ["unternehmen","Unternehmen"],
          ["staat","Staat/Verwaltung"],
          ["kinder","Kinder/Jugendliche"],
          ["rentner","Rentner*innen"],
        ].map(([k,lab])=>(
          <button key={k} className={chip(v.audience!.includes(k))}
            onClick={()=>onChange({ ...v, audience: toggle(v.audience!, k) })}>{lab}</button>
        ))}
        <button className={chip((v.audience||[]).length===0)} onClick={()=>onChange({ ...v, audience: [] })}>Unsicher</button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">HALTUNG (optional)</div>
        {["pro","neutral","contra","unsicher"].map(k=>(
          <button key={k} className={chip(v.stance===k)} onClick={()=>onChange({ ...v, stance: v.stance===k ? null : (k as any) })}>
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <button className={chip(!!v.other || othersOpen)} onClick={()=>setOthersOpen(s=>!s)}>Sonstiges…</button>
        {othersOpen && (
          <input className="border rounded-xl px-3 py-2 w-full" placeholder="Optional ergänzen …"
            value={v.other ?? ""} onChange={e=>onChange({ ...v, other:e.target.value })}/>
        )}
      </div>
    </div>
  );
}
