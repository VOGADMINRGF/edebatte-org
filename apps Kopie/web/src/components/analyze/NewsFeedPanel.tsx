"use client";
import React from "react";
type Item = { title:string; url:string; score?:number; source?:string };
export default function NewsFeedPanel({ topic, region, keywords=[] as string[] }:{
  topic:string; region?:string|null; keywords?:string[];
}){
  const [items,setItems]=React.useState<Item[]|null>(null);
  const [errors,setErrors]=React.useState<string[]|null>(null);
  const [loading,setLoading]=React.useState(false);
  const load = React.useCallback(async ()=>{
    setLoading(true); setErrors(null);
    try{
      const res=await fetch("/api/search/civic",{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({topic,region:region||undefined,keywords,limit:8})});
      const js=await res.json(); setItems(Array.isArray(js.items)?js.items:[]);
      if(js.errors) setErrors(js.errors);
    }catch(e:any){ setItems([]); setErrors([String(e?.message||e)]) } finally{ setLoading(false) }
  },[topic,region,keywords]);
  React.useEffect(()=>{ load() },[load]);
  return (
    <div className="vog-card p-4">
      <div className="font-semibold mb-2">Aktuelle Recherche</div>
      {loading && !items && <div className="vog-skeleton h-4 w-40" />}
      {(!items || items.length===0) ? (
        <div className="text-sm text-slate-600">
          Keine Treffer aus konfigurierten Quellen.
          {errors?.length ? <details className="text-xs mt-2"><summary>Details</summary>
            <ul className="list-disc ml-4">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul></details> : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it,i)=>(
            <li key={i}>
              <a href={it.url} target="_blank" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="font-medium tw-fallback-line-clamp-2">{it.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {(it.source ?? (()=>{try{return new URL(it.url).host}catch{return ""}})())}
                  {typeof it.score==="number" ? ` · Score ${it.score.toFixed(2)}` : ""}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
