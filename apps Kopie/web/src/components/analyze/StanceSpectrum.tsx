"use client";
import React from "react";
type Stance = '<<'|'<'|'~'|'>'|'>>';
type Variant = { stance:Stance; thesis:string; proposals:string[]; tradeoffs:string[]; evidence:{title:string;url:string;kind:'press'|'official'|'study'}[]; status:'new'|'fragment'|'verified'; trust?:number; };
export type StanceBundle = { coverageScore:number; symmetry:number; variants:Variant[]; missing:Stance[] };

export default function StanceSpectrum({ claimText }:{ claimText:string }){
  const [data,setData]=React.useState<StanceBundle|null>(null);
  const [active,setActive]=React.useState<Stance>('~' as Stance);
  React.useEffect(()=>{ (async ()=>{
    const r=await fetch("/api/stance/expand",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:claimText})});
    const j=await r.json(); setData(j);
  })(); },[claimText]);

  if(!data) return <div className="vog-card p-4"><div className="vog-skeleton h-4 w-40 mb-2"></div><div className="vog-skeleton h-24 w-full"></div></div>;
  const order:['<<','<','~','>','>>']=['<<','<','~','>','>>'];
  const vMap=Object.fromEntries(data.variants.map(v=>[v.stance,v]));
  return (
    <div className="vog-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Lager-Spektrum</div>
        <div className="text-xs text-slate-600">Coverage: {Math.round(data.coverageScore*5)}/5 · Balance: {data.symmetry.toFixed(2)}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {order.map(s=>(
          <button key={s} onClick={()=>setActive(s)} className="vog-chip" style={active===s?{borderColor:"#0EA5E9",color:"#0EA5E9"}:{}}>{s}</button>
        ))}
      </div>
      <div className="text-sm text-slate-700">
        {vMap[active] ? (
          <div className="space-y-2">
            <div><b>These:</b> {vMap[active].thesis}</div>
            <div><b>Maßnahmen:</b> {vMap[active].proposals.join(" · ")||"—"}</div>
            <div><b>Trade-offs:</b> {vMap[active].tradeoffs.join(" · ")||"—"}</div>
            <div className="text-xs"><b>Quellen:</b> {(vMap[active].evidence||[]).map((e,i)=><a key={i} href={e.url} target="_blank" className="underline mr-2">{e.title}</a>)}</div>
          </div>
        ) : <div className="text-sm">Noch keine Variante – <span className="underline">Qualifizieren</span> sinnvoll.</div>}
      </div>
    </div>
  );
}
