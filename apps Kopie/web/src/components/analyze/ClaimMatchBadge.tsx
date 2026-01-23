"use client";
import React from "react";
import type { ClaimMatch } from "@/lib/claimMatch";
export default function ClaimMatchBadge({ match }:{ match: ClaimMatch }){
  if(match.kind==="verified"){
    const s=match.stmt;
    return <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="vog-chip" style={{background:"#ECFDF5",borderColor:"#A7F3D0",color:"#065F46"}}>✓ Verifiziert</span>
      <span className="opacity-80">Trust {s.trust.toFixed(2)} · v{s.version} · Quellen {s.evidenceCount}</span>
    </div>;
  }
  if(match.kind==="cluster"){
    const b=match.top[0];
    return <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="vog-chip" style={{background:"#FFFBEB",borderColor:"#FDE68A",color:"#92400E"}}>~ Cluster</span>
      <span className="opacity-80">Top {b?.title ?? "Variante"} · Trust {(b?.trust??0).toFixed(2)} · Quellen {b?.evidenceCount ?? 0}</span>
    </div>;
  }
  return <div className="text-xs text-slate-500"><span className="vog-chip">∅ Neu</span></div>;
}
