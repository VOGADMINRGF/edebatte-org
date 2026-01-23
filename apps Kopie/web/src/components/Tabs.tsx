"use client";
import * as React from "react";

type Tab = { id: string; label: string };
export function Tabs({ tabs, value, onChange }: { tabs: Tab[]; value: string; onChange:(id:string)=>void }){
  return (
    <div role="tablist" aria-label="Sektionen" className="flex gap-2">
      {tabs.map(t=>(
        <button key={t.id}
          role="tab" aria-selected={value===t.id}
          onClick={()=>onChange(t.id)}
          className={`rounded-xl border px-3 py-1.5 text-sm ${value===t.id ? "bg-cyan-50 border-cyan-200 text-cyan-900" : "bg-white"}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
