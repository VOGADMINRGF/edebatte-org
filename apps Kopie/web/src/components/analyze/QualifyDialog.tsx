"use client";
import React from "react";
import { FLAGS } from "@/config/flags";
export default function QualifyDialog({ open, onClose, clusterId }:{ open:boolean; onClose:()=>void; clusterId?:string; }){
  const [loading,setLoading]=React.useState(false); const [msg,setMsg]=React.useState<string|null>(null);
  async function start(tier:"mini"|"std"|"pro"){
    setLoading(true); setMsg(null);
    try{
      const r=await fetch("/api/qualify/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clusterId,tier})});
      const j=await r.json(); setMsg(`Job gestartet (#${j?.jobId||"—"}) – Escrow: ${j?.escrow?.coins ?? "?"} Coins`);
    } finally { setLoading(false); }
  }
  if(!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
    <div className="vog-card p-4 max-w-md w-full">
      <div className="font-semibold mb-2">Qualifizieren (Coins)</div>
      {!FLAGS.ENABLE_COINS ? <div className="text-sm text-slate-600">Coin-System deaktiviert.</div> :
        <div className="space-y-2">
          <button className="vog-btn w-full" disabled={loading} onClick={()=>start("mini")}>Mini (3 Coins) – Kategorien + 2 Quellen</button>
          <button className="vog-btn w-full" disabled={loading} onClick={()=>start("std")}>Standard (7 Coins) – + Region + Summary</button>
          <button className="vog-btn w-full" disabled={loading} onClick={()=>start("pro")}>Pro (15 Coins) – + Faktencheck (3 Reviewer) + Merge-Vorschlag</button>
        </div>}
      {msg && <div className="mt-3 text-sm" style={{ color:"#065F46", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:".75rem", padding:".5rem .75rem" }}>{msg}</div>}
      <div className="mt-3 flex justify-end"><button className="vog-btn-ghost" onClick={onClose}>Schließen</button></div>
    </div>
  </div>;
}
