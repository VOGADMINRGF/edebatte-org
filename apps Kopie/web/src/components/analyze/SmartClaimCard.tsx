"use client";
import React from "react";
import AnalyzeResultCard, { type Claim } from "./AnalyzeResultCard";
import { getClaimMatch, type ClaimMatch } from "@/lib/claimMatch";
import ClaimMatchBadge from "./ClaimMatchBadge";
import QualifyDialog from "./QualifyDialog";

export default function SmartClaimCard({ claim, onUse }:{ claim: Claim; onUse:(t:string)=>void; }){
  const [match,setMatch]=React.useState<ClaimMatch>({kind:"none"});
  const [openQualify,setOpenQualify]=React.useState(false);
  React.useEffect(()=>{ let ok=true; getClaimMatch(claim.text).then(m=>{ if(ok) setMatch(m) }); return ()=>{ok=false} },[claim.text]);
  const primary = match.kind==="verified" ? ()=>window.location.assign(`/statements/${match.stmt.id}`) : ()=>onUse(claim.text);
  return (
    <div className="space-y-2">
      <ClaimMatchBadge match={match}/>
      <AnalyzeResultCard claim={claim} onUse={primary}/>
      {match.kind==="cluster" && (
        <div className="flex flex-wrap gap-2">
          <button className="vog-btn" onClick={()=>setOpenQualify(true)}>Qualifizieren (Coins)</button>
          <a className="vog-btn" href={`/clusters/${match.clusterId}`}>Merge ansehen</a>
        </div>
      )}
      {match.kind==="verified" && (
        <div className="flex flex-wrap gap-2">
          <a className="vog-btn" href={`/statements/${match.stmt.id}#discuss`}>Diskutieren</a>
          <a className="vog-btn" href={`/statements/${match.stmt.id}?join=1`}>Beitreten</a>
        </div>
      )}
      <QualifyDialog open={openQualify} onClose={()=>setOpenQualify(false)} clusterId={match.kind==="cluster" ? match.clusterId : undefined}/>
    </div>
  );
}
