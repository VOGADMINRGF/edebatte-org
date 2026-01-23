"use client";
import React from "react";

export default function FactcheckModal({ open, text, onClose }:{
  open:boolean; text:string; onClose:()=>void;
}){
  const [data,setData] = React.useState<any|null>(null);
  const [busy,setBusy] = React.useState(false);

  React.useEffect(()=>{
    if(!open) return;
    setData(null); setBusy(true);
    fetch("/api/analyze/factcheck", {
      method:"POST", headers:{ "content-type":"application/json" },
      body: JSON.stringify({ text })
    }).then(r=>r.json()).then(j=> setData(j))
      .catch(()=> setData({ verdict:"unbestimmt", notes:["Stub: Faktencheck-Service noch im Aufbau."] }))
      .finally(()=> setBusy(false));
  }, [open, text]);

  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="vog-card w-full max-w-2xl p-4" onClick={(e)=>e.stopPropagation()}>
        <div className="font-semibold mb-2">Faktencheck</div>
        {busy && <div className="vog-skeleton h-5 w-28" />}
        <div className="text-sm">
          <div><b>Ergebnis:</b> {data?.verdict ?? "—"}</div>
          {Array.isArray(data?.notes) && data.notes.length ? (
            <ul className="list-disc ml-5 mt-2">{data.notes.map((n:string,i:number)=><li key={i}>{n}</li>)}</ul>
          ): null}
        </div>
        <div className="mt-4 flex justify-end"><button className="vog-btn vog-btn--pri" onClick={onClose}>Schließen</button></div>
      </div>
    </div>
  );
}
