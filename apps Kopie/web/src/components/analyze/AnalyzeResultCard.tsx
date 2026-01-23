"use client";
import React from "react";
import CTAButtons from "./CTAButtons";
export type Claim = { text:string; categoryMain?:string|null; categorySubs?:string[]|null; region?:string|null; authority?:string|null };
export default function AnalyzeResultCard({ claim, onUse }:{ claim: Claim; onUse:(t:string)=>void; }){
  const subs=(claim.categorySubs||[]).join(", ");
  return (
    <div className="vog-card p-4 space-y-3">
      <div className="font-medium">{claim.text}</div>
      <div className="text-sm text-slate-600">
        {claim.categoryMain ? <>Thema: <b>{claim.categoryMain}</b>{subs?<> · Sub: {subs}</>:null}</> : "—"}
        {claim.region ? <> · Region: {claim.region}</> : null}
      </div>
      <CTAButtons
        onUse={()=>onUse(claim.text)}
        onAlternatives={()=>window.dispatchEvent(new CustomEvent("vog:alt",{detail:claim}))}
        onResearch={()=>window.dispatchEvent(new CustomEvent("vog:research",{detail:claim}))}
        onFactcheck={()=>window.dispatchEvent(new CustomEvent("vog:factcheck",{detail:claim}))}
      />
    </div>
  );
}
