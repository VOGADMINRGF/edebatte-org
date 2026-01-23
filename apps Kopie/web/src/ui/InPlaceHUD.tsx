"use client";
import React from "react";
export default function InPlaceHUD({ log, analyzing }:{ log:string[]; analyzing:boolean }){
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2 text-xs">
        {["Schritt 1: Extrahieren","Schritt 2: Zuständigkeit","Schritt 3: Evidenz","Schritt 4: Perspektiven"].map((t,i)=>(
          <div key={i} className={"px-2 py-0.5 rounded-full border "+(analyzing?"bg-sky-50":"bg-emerald-50")}>{t}</div>
        ))}
      </div>
      {log?.length>0 && <ul className="text-xs text-slate-600 list-disc ml-5">{log.slice(-7).map((l,i)=><li key={i}>{l}</li>)}</ul>}
    </div>
  );
}
