"use client";
import React from "react";
export default function NarrativeBreaker({ text }:{ text:string }){
  // Demo: heuristisch ein paar „Myth→Fact“
  const myth = text;
  const facts = ["Relevante Datenlage ist uneinheitlich", "Es gibt Gegenbeispiele in Region X"];
  const fallacies = ["cherry_picking","false_dilemma"];
  const tradeoffs = ["Kosten steigen kurzfristig","Koordinationsaufwand"];
  return (
    <div className="vog-card p-4 space-y-2">
      <div className="font-semibold">NarrativeBreaker</div>
      <div className="text-sm"><b>Mythos:</b> {myth}</div>
      <div className="text-sm"><b>Fakten:</b> {facts.join(" · ")}</div>
      <div className="text-sm"><b>Typische Muster:</b> {fallacies.join(", ")}</div>
      <div className="text-sm"><b>Trade-offs:</b> {tradeoffs.join(" · ")}</div>
    </div>
  );
}
