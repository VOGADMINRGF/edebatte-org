"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InlineAnalyzeFeed, { FeedItem } from "./InlineAnalyzeFeed";

function findTextarea(): HTMLTextAreaElement|null {
  const ta = document.querySelector("textarea");
  return ta as HTMLTextAreaElement|null;
}
function ensureFeedHost(ta: HTMLElement, id="vog-inline-feed-mount"): HTMLElement {
  let host = document.getElementById(id);
  if (!host) {
    host = document.createElement("div");
    host.id = id;
    host.style.marginTop = "8px";
    ta.insertAdjacentElement("afterend", host);
  }
  return host;
}
function addFallbackButton(ta: HTMLElement, onClick: ()=>void){
  if (document.getElementById("vog-inline-trigger")) return;
  const btn = document.createElement("button");
  btn.id = "vog-inline-trigger";
  btn.type = "button";
  btn.textContent = "Analyse starten (inline)";
  btn.className = "mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50";
  ta.insertAdjacentElement("afterend", btn);
  btn.addEventListener("click", onClick);
}

export default function ContribChatOrchestrator(){
  const [items, setItems] = useState<FeedItem[]>([]);
  const [host, setHost] = useState<HTMLElement|null>(null);
  const fetchPatched = useRef(false);
  const stage = useRef<"idle"|"running">("idle");
  const lastClaimDump = useRef<number>(0);

  // Mount host sobald Textarea geladen
  useEffect(()=>{
    const tryMount = ()=>{
      const ta = findTextarea();
      if (!ta) return false;
      setHost(ensureFeedHost(ta));
      // Strg+Enter als Fallback
      ta.addEventListener("keydown", (e: any)=>{
        if ((e.ctrlKey||e.metaKey) && e.key==="Enter"){
          e.preventDefault();
          runManualFlow();
        }
      });
      // Falls kein Button erkennbar, Fallback-Button setzen
      addFallbackButton(ta, runManualFlow);
      return true;
    };
    if (tryMount()) return;
    const mo = new MutationObserver(()=>{ tryMount(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
    return ()=> mo.disconnect();
  },[]);

  // Fetch-Instrumentation (einmal)
  useEffect(()=>{
    if (fetchPatched.current) return;
    fetchPatched.current = true;

    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(typeof input === "string" ? input : (input as any).url || "");
      const method = (init?.method || "GET").toUpperCase();
      const isAnalyze = /\/api\/contributions\/analyze/.test(url);
      const isPreflight = /\/api\/preflight/.test(url);
      const isStance = /\/api\/stance\/expand/.test(url);
      const isCivic = /\/api\/search\/civic/.test(url);

      const stamp = (t:string)=> setItems(prev=>[...prev, { type:"step", text:t }]);

      try{
        if (isPreflight) stamp("Prüfe ähnliche Inhalte & poliere Formulierung…");
        if (isAnalyze)   stamp("Extrahiere Claims…");
        if (isStance)    stamp("Erzeuge Lager/Varianten…");
        if (isCivic && Date.now() - lastClaimDump.current > 4000) {
          stamp("Recherche / Newsfeeds laufen…");
          lastClaimDump.current = Date.now();
        }

        const res = await origFetch(input as any, init);
        // Inhalte anhängen, ohne Originalfluss zu stören
        try{
          if (isPreflight) {
            const clone = res.clone();
            const j = await clone.json();
            if (j?.similar?.kind === "verified") {
              setItems(p=>[...p, { type:"success", text:`Verifizierter Treffer: ${j.similar.stmt?.title}` }]);
            } else if (j?.similar?.kind === "cluster") {
              const titles = (j.similar?.top||[]).map((x:any)=>x.title).join(" · ");
              setItems(p=>[...p, { type:"info", text:`Ähnliche Statements: ${titles}` }]);
            } else {
              setItems(p=>[...p, { type:"info", text:"Keine direkten Duplikate." }]);
            }
            if (j?.polish?.improved) {
              setItems(p=>[...p, { type:"success", text:`Polished: ${j.polish.improved}` }]);
            }
          }
          if (isAnalyze) {
            const clone = res.clone();
            const j = await clone.json();
            const claims = Array.isArray(j?.claims) ? j.claims.map((c:any)=>String(c?.text||"")).filter(Boolean) : [];
            if (!claims.length) {
              setItems(p=>[...p, { type:"error", text:"Keine Claims erkannt. Bitte präzisieren (Ort/Zeitraum/Betroffene)." }]);
            } else {
              setItems(p=>[...p, { type:"success", text:`${claims.length} Claim(s) erkannt.` }]);
              setItems(p=>[...p, { type:"choices", title:"Wähle Haupt-Claim", items:claims, onPick:(i:number)=>{
                setItems(p2=>[...p2, { type:"step", text:`Haupt-Claim gesetzt: ${claims[i]}` }]);
                setItems(p2=>[...p2, { type:"info", text:"Als Nächstes: Alternativen & Einwände/Essenz." }]);
              }} as any]);
            }
          }
        }catch(_e){}
        return res;
      }catch(e:any){
        setItems(prev=>[...prev, { type:"error", text:`Netzwerkfehler: ${String(e?.message||e)}` }]);
        throw e;
      }
    };
  },[]);

  // Manuelle Pipeline (falls kein eigener Knopf genutzt wird)
  async function runManualFlow(){
    if (stage.current==="running") return;
    stage.current = "running";
    setItems([{ type:"step", text:"Starte Analyse…" }]);
    const ta = findTextarea();
    const text = ta?.value?.trim() || "";

    // Preflight zuerst (zeigt sich im Feed über fetch-Instrumentation zusätzlich)
    try { await fetch("/api/preflight", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ text }) }); } catch {}

    // Danach Analyze
    try {
      await fetch("/api/contributions/analyze?mode=multi&clarify=1", {
        method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ text, maxClaims:5 })
      });
    } catch {}

    stage.current = "idle";
  }

  if (!host) return null;
  return createPortal(<InlineAnalyzeFeed items={items} />, host);
}
