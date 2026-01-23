"use client";
import React from "react";
type Missing = { region?:boolean; level?:boolean; timeframe?:boolean; actors?:boolean; metrics?:string[] };
type Q = { id:string; text:string; kind:"chips"|"single"|"text"; options?:string[] };
export default function LueckenCheck({ missing, questions, onAnswer }:{
  missing?: Missing; questions?: Q[]; onAnswer:(id:string,val:string)=>void;
}){
  if(!missing && !questions?.length) return null;
  return (
    <div className="vog-card p-4 space-y-3">
      <div className="font-semibold">Noch hilfreiche Details?</div>
      {questions?.map(q=>(
        <div key={q.id} className="space-y-1">
          <div className="text-sm">{q.text}</div>
          {q.kind!=="text" ? (
            <div className="flex flex-wrap gap-2">
              {q.options?.map(opt=>(
                <button key={opt} className="vog-chip" onClick={()=>onAnswer(q.id,opt)}>{opt}</button>
              ))}
              <button className="vog-chip" onClick={()=>onAnswer(q.id,"Überspringen")}>Überspringen</button>
            </div>
          ):(
            <input className="vog-input" placeholder="Kurz eintragen (optional)" onBlur={e=>onAnswer(q.id, e.target.value||"")} />
          )}
        </div>
      ))}
    </div>
  );
}
