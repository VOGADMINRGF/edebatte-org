"use client";
import React from "react";
export default function CounterSynth({ text }:{ text:string }){
  // Demo: konstante Werte; Backend kann confidence/dissent berechnen
  const essence="Kurz-Essenz basierend auf gesammelten Einwänden & Fakten.";
  const confidence=0.71; const dissent=[{id:"d1", title:"Datenlage unzureichend", status:"open"},{id:"d2", title:"Religiös motivierte Gegenposition", status:"open"}];
  return (
    <div className="vog-card p-4 space-y-2">
      <div className="font-semibold">Quick-Essenz</div>
      <div className="text-sm">{essence}</div>
      <div className="text-xs text-slate-600">Confidence: {confidence} · Dissent: {dissent.length} offen</div>
      <ul className="text-xs list-disc ml-5">{dissent.map(d=><li key={d.id}>{d.title} – {d.status}</li>)}</ul>
    </div>
  );
}
