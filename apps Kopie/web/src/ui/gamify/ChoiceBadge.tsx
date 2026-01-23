"use client";
import React from "react";
export default function ChoiceBadge({icon,label,active,onClick}:{icon:string;label:string;active?:boolean;onClick?:()=>void}) {
  return (
    <button type="button" onClick={onClick}
      className={"px-3 py-1 rounded-full border text-sm transition-all " +
        (active ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                : "bg-white hover:bg-slate-50 border-slate-300")}>
      <span className="mr-1">{icon}</span>{label}
    </button>
  );
}
