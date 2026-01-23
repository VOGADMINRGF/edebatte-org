"use client";
import React from "react";
export default function XPBar({xp=0, level=1}:{xp:number; level?:number}) {
  const pct = Math.max(0, Math.min(100, xp));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold">Level {level}</span>
        <span className="tabular-nums">{pct}% XP</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full transition-all duration-500"
             style={{width: pct+"%", background:
              "linear-gradient(90deg,#00e6a7,#4f46e5,#06b6d4)"}}/>
      </div>
    </div>
  );
}
