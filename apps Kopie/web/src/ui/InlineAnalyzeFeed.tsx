"use client";
import React from "react";

export type FeedItem =
  | { type:"info"; text:string }
  | { type:"step"; text:string }
  | { type:"success"; text:string }
  | { type:"error"; text:string }
  | { type:"choices"; title:string; items:string[]; onPick:(i:number)=>void };

export default function InlineAnalyzeFeed({items}:{items:FeedItem[]}) {
  return (
    <div className="mt-3 space-y-2">
      {items.map((it,idx)=>{
        if (it.type==="choices") {
          return (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white shadow p-3">
              <div className="text-sm font-medium text-slate-800 mb-2">{it.title}</div>
              <div className="flex flex-col gap-2">
                {it.items.map((t,i)=>(
                  <button key={i} onClick={()=>it.onPick(i)}
                    className="text-left rounded-lg border border-slate-200 hover:bg-slate-50 px-3 py-2 text-sm">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        const tone = it.type==="error" ? "border-rose-200 bg-rose-50"
                  : it.type==="success" ? "border-emerald-200 bg-emerald-50"
                  : it.type==="step" ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-white";
        return (
          <div key={idx} className={`rounded-xl border ${tone} shadow p-3 text-sm text-slate-800`}>
            {it.text}
          </div>
        );
      })}
    </div>
  );
}
