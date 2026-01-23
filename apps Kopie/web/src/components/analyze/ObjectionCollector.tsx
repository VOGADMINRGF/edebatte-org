"use client";
import React from "react";
type O = { id:string; text:string; polarity:'pro'|'con'|'neutral' };
export default function ObjectionCollector(){
  const [list,setList]=React.useState<O[]>([]);
  const [text,setText]=React.useState(""); const [pol,setPol]=React.useState<O["polarity"]>("con");
  function add(){ if(!text.trim())return; setList([{id:Math.random().toString(36).slice(2), text, polarity:pol}, ...list]); setText(""); }
  const groups={pro:list.filter(x=>x.polarity==='pro'),con:list.filter(x=>x.polarity==='con'),neutral:list.filter(x=>x.polarity==='neutral')};
  const coverage = [groups.pro.length>0,groups.con.length>0,groups.neutral.length>0].filter(Boolean).length;
  return (
    <div className="vog-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Einwände & Argumente</div>
        <div className="text-xs text-slate-600">Coverage: {coverage}/3</div>
      </div>
      <div className="flex gap-2">
        <select className="border rounded-xl px-2 py-1 text-sm" value={pol} onChange={e=>setPol(e.target.value as any)}>
          <option value="con">Contra</option><option value="pro">Pro</option><option value="neutral">Neutral</option>
        </select>
        <input className="flex-1 border rounded-xl px-2 py-1 text-sm" placeholder="Einwand/Argument…" value={text} onChange={e=>setText(e.target.value)} />
        <button className="vog-btn" onClick={add}>Add</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div><div className="font-medium mb-1">Pro</div>{groups.pro.map(o=><div key={o.id} className="border rounded-xl p-2 mb-1">{o.text}</div>)||null}</div>
        <div><div className="font-medium mb-1">Neutral</div>{groups.neutral.map(o=><div key={o.id} className="border rounded-xl p-2 mb-1">{o.text}</div>)||null}</div>
        <div><div className="font-medium mb-1">Contra</div>{groups.con.map(o=><div key={o.id} className="border rounded-xl p-2 mb-1">{o.text}</div>)||null}</div>
      </div>
    </div>
  );
}
