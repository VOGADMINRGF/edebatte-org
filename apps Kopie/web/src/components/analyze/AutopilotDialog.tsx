"use client";
import React from "react";
import { FLAGS } from "@/config/flags";
export default function AutopilotDialog({ open, onClose, text }:{ open:boolean; onClose:()=>void; text:string }){
  const [loading,setLoading]=React.useState(false); const [msg,setMsg]=React.useState<string|null>(null);
  async function start(){
    setLoading(true); setMsg(null);
    try{
      const r=await fetch("/api/autopilot/start",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text})});
      const j=await r.json(); setMsg(`Autopilot gestartet (#${j?.jobId||"—"}) – wir benachrichtigen dich.`);
    } finally { setLoading(false); }
  }
  if(!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
    <div className="vog-card p-4 max-w-md w-full">
      <div className="font-semibold mb-2">eDebatte übernimmt</div>
      {!FLAGS.ENABLE_AUTOPILOT ? <div className="text-sm text-slate-600">Autopilot deaktiviert.</div> :
        <div className="space-y-3 text-sm text-slate-700">
          <p>Wir erstellen ein sauberes Statement, sammeln Belege und stoßen ggf. den Faktencheck an.</p>
          <button className="vog-btn-pri w-full" onClick={start} disabled={loading}>Autopilot starten</button>
          {msg && <div className="text-sm" style={{ color:"#065F46", background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:".75rem", padding:".5rem .75rem" }}>{msg}</div>}
        </div>}
      <div className="mt-3 flex justify-end"><button className="vog-btn-ghost" onClick={onClose}>Schließen</button></div>
    </div>
  </div>;
}
