"use client";
import React from "react";
import XPBar from "./XPBar";
export default function GameHUD({xp,level,step}:{xp:number; level:number; step:number}) {
  return (
    <div className="vog-card p-3 flex items-center gap-4 sticky top-3 z-30">
      <div className="text-xl">🕹️</div>
      <div className="flex-1"><XPBar xp={xp} level={level}/></div>
      <div className="text-sm"><span className="text-slate-500">Step</span> <span className="font-semibold">{step}/4</span></div>
    </div>
  );
}
