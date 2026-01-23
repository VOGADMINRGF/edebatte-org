"use client";
import React from "react";

export default function AlternativeModal({ open, text, onClose }:{
  open:boolean; text:string; onClose:()=>void;
}){
  const [ideas,setIdeas] = React.useState<string[]|null>(null);
  const [busy,setBusy] = React.useState(false);

  React.useEffect(()=>{
    if(!open) return;
    setIdeas(null); setBusy(true);
    fetch("/api/analyze/alternatives", {
      method:"POST", headers:{ "content-type":"application/json" },
      body: JSON.stringify({ text })
    }).then(r=>r.json()).then(j=>{
      setIdeas(Array.isArray(j?.alternatives)?j.alternatives:[]);
    }).catch(()=> setIdeas(["Schrittweise Einführung statt sofort.", "Pilot in 2 Bezirken mit Evaluation.", "Fokus auf besonders betroffene Zielgruppen zuerst."]))
      .finally(()=> setBusy(false));
  }, [open, text]);

  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="vog-card w-full max-w-2xl p-4" onClick={(e)=>e.stopPropagation()}>
        <div className="font-semibold mb-2">Alternativen</div>
        {busy && <div className="vog-skeleton h-5 w-28" />}
        <ul className="list-disc ml-5 space-y-1">
          {(ideas||[]).map((t,i)=><li key={i} className="text-sm">{t}</li>)}
        </ul>
        <div className="mt-4 flex justify-end"><button className="vog-btn vog-btn--pri" onClick={onClose}>Schließen</button></div>
      </div>
    </div>
  );
}
