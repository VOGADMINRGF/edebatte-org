"use client";
import React from "react";
export default function CTAButtons({ onUse, onAlternatives, onResearch, onFactcheck }:{
  onUse: ()=>void; onAlternatives: ()=>void; onResearch: ()=>void; onFactcheck: ()=>void;
}){ return (
  <div className="flex flex-wrap gap-2">
    <button className="vog-btn-pri" onClick={onUse}>Statement übernehmen</button>
    <button className="vog-btn" onClick={onAlternatives}>Alternativen</button>
    <button className="vog-btn" onClick={onResearch}>Recherche</button>
    <button className="vog-btn" onClick={onFactcheck}>Faktencheck</button>
  </div>
);}
