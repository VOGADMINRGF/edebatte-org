"use client";
import React from "react";
export default function ClarifyPanel({ questions }:{questions:string[]|undefined}){
  if(!questions?.length) return null;
  return (
    <div className="vog-card-muted p-4">
      <div className="font-semibold mb-2">Klärungsfragen</div>
      <ul className="list-disc ml-5 text-sm space-y-1">{questions.map((q,i)=><li key={i}>{q}</li>)}</ul>
    </div>
  );
}
