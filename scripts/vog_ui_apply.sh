#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
echo "🧩 eDebatte UI workflow: apply pages + api + layout"
mkdir -p "$root/apps/web/src/app/contributions/analyze" \
         "$root/apps/web/src/app/contributions/new" \
         "$root/apps/web/src/app/api/contributions/analyze" \
         "$root/apps/web/src/app/api/drafts" \
         "$root/apps/web/src/app/api/drafts/[id]" \
         "$root/apps/web/src/server" \
         "$root/apps/web/src/components" \
         "$root/apps/web/src/app/statements/new"

# 1) Startseite → /contributions/new
cat > "$root/apps/web/src/app/page.tsx" <<'TS'
import { redirect } from "next/navigation";
export default function Page(){ redirect("/contributions/new"); }
TS
echo "✓ start page -> /contributions/new"

# 2) Header/Footer mobil-first
cat > "$root/apps/web/src/components/SiteHeader.tsx" <<'TS'
"use client";
import { useState } from "react";

export default function SiteHeader(){
  const [open,setOpen]=useState(false);
  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <a href="/" className="font-bold text-lg">eDebatte</a>
        <button aria-label="Menu" className="md:hidden p-2 border rounded" onClick={()=>setOpen(x=>!x)}>☰</button>
        <nav className="hidden md:flex gap-4 text-sm">
          <a href="/contributions/new" className="hover:underline">Neu</a>
          <a href="/contributions/analyze" className="hover:underline">Erweitert</a>
        </nav>
      </div>
      {open && (
        <nav className="md:hidden border-t px-4 py-2 flex flex-col gap-2 text-sm bg-white">
          <a href="/contributions/new" className="py-1">Neu</a>
          <a href="/contributions/analyze" className="py-1">Erweitert</a>
        </nav>
      )}
    </header>
  );
}
TS

cat > "$root/apps/web/src/components/SiteFooter.tsx" <<'TS'
export default function SiteFooter(){
  return (
    <footer className="border-t mt-12">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600">
        © eDebatte — transparent & nachvollziehbar
      </div>
    </footer>
  );
}
TS

# 3) Globales Layout
cat > "$root/apps/web/src/app/layout.tsx" <<'TS'
/* @ts-nocheck */
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function RootLayout({ children }:{children:React.ReactNode}){
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
TS
echo "✓ layout with header/footer"

# 4) Redirect der Alt-Seite /statements/new → /contributions/new
cat > "$root/apps/web/src/app/statements/new/page.tsx" <<'TS'
import { redirect } from "next/navigation";
export default function Page(){ redirect("/contributions/new"); }
TS

# 5) Analyze API mit maxClaims support
cat > "$root/apps/web/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextRequest } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";

export async function POST(req: NextRequest){
  try {
    const { text, maxClaims } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "missing text" }), { status: 400 });
    }
    const out = await analyzeContribution(text);
    const n = Number(maxClaims||0);
    if (n>0 && Array.isArray(out?.claims)) out.claims = out.claims.slice(0, n);
    return Response.json(out);
  } catch (e:any){
    return new Response(JSON.stringify({ error: e?.message||"analyze failed" }), { status: 500 });
  }
}
TS
echo "✓ analyze api"

# 6) Mini Draft-Store (Dev)
cat > "$root/apps/web/src/server/draftStore.ts" <<'TS'
type Draft = { id: string; createdAt: number; data: any };
const store = new Map<string, Draft>();

export function createDraft(data:any){
  const id = Math.random().toString(36).slice(2);
  const d = { id, createdAt: Date.now(), data };
  store.set(id, d);
  return d;
}
export function patchDraft(id:string, patch:any){
  const d = store.get(id);
  if (!d) return null;
  d.data = { ...d.data, ...patch };
  store.set(id, d);
  return d;
}
export function getDraft(id:string){ return store.get(id)||null; }
TS

cat > "$root/apps/web/src/app/api/drafts/route.ts" <<'TS'
import { NextRequest } from "next/server";
import { createDraft } from "@/server/draftStore";

export async function POST(req: NextRequest){
  const body = await req.json().catch(()=> ({}));
  const draft = createDraft(body);
  return Response.json({ ok:true, id: draft.id, draft });
}
TS

cat > "$root/apps/web/src/app/api/drafts/[id]/route.ts" <<'TS'
import { NextRequest } from "next/server";
import { getDraft, patchDraft } from "@/server/draftStore";

export async function GET(_:NextRequest, { params }:{params:{id:string}}){
  const d = getDraft(params.id);
  if (!d) return new Response("Not found", { status: 404 });
  return Response.json(d);
}
export async function PATCH(req:NextRequest, { params }:{params:{id:string}}){
  const body = await req.json().catch(()=> ({}));
  const d = patchDraft(params.id, body);
  if (!d) return new Response("Not found", { status:404 });
  return Response.json({ ok:true, draft:d });
}
TS

# 7) /contributions/analyze (voll)
cat > "$root/apps/web/src/app/contributions/analyze/page.tsx" <<'TS'
/* @ts-nocheck */
"use client";
import { useEffect, useMemo, useState } from "react";

type Claim = { text:string; categoryMain?:string|null; categorySubs?:string[]; region?:string|null; authority?:string|null; relevance?: number };
type AnalyzeResult = { language:string; mainTopic:string|null; subTopics:string[]; regionHint:string|null; claims:Claim[] };

function Stars({ value, onChange }:{value:number; onChange:(v:number)=>void}){
  const v = Math.max(1, Math.min(5, Number(value||3)));
  return (
    <div className="select-none">
      {[1,2,3,4,5].map(i=>(
        <button key={i} className="text-xl mr-1" aria-label={`Relevanz ${i}`} onClick={()=>onChange(i)}>
          {i<=v ? "★" : "☆"}
        </button>
      ))}
      <span className="ml-1 text-sm text-gray-600">{v}/5</span>
    </div>
  );
}

export default function AnalyzePage(){
  const [text, setText] = useState("");
  const [step, setStep] = useState<0|1|2|3|4>(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult|null>(null);
  const [draftId, setDraftId] = useState<string|null>(null);
  const [jobId, setJobId] = useState<string|null>(null);
  const [factStatus, setFactStatus] = useState<any>(null);
  const [trust, setTrust] = useState<number|undefined>(undefined);

  const safeClaims = useMemo(()=> result?.claims ?? [], [result]);

  async function runAnalyze(){
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contributions/analyze", { method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ text }) });
      const data = await res.json();
      const safe: AnalyzeResult = {
        language: data?.language ?? "de",
        mainTopic: data?.mainTopic ?? null,
        subTopics: Array.isArray(data?.subTopics)?data.subTopics:[],
        regionHint: data?.regionHint ?? null,
        claims: (Array.isArray(data?.claims)?data.claims:[]).map((c:any)=>({ ...c, relevance: 3 })),
      };
      setResult(safe);
      setStep(2);
      const create = await fetch("/api/drafts", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(safe) }).then(r=>r.json());
      setDraftId(create?.id ?? null);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  }

  async function saveRelevance(){
    if (!draftId || !result) return;
    await fetch(`/api/drafts/${draftId}`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ claims: result.claims })
    });
  }

  async function enqueueFactcheck(){
    if (!result?.claims?.length){ setStep(4); return; }
    setLoading(true);
    try{
      const res = await fetch("/api/factcheck/enqueue", { method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ claims: result.claims, context: { topic: result.mainTopic, sub: result.subTopics } }) });
      const { jobId } = await res.json();
      setJobId(jobId||null);
      setStep(3);
      const poll = async ()=>{
        const r = await fetch(`/api/factcheck/status/${jobId}`);
        const j = await r.json();
        setFactStatus(j);
        if (j?.state === "done" || j?.state === "error"){
          const checked = Array.isArray(j?.items) ? j.items.length : 0;
          const ok = Array.isArray(j?.items) ? j.items.filter((x:any)=>x?.verdict==="supported").length : 0;
          const score = Math.round((ok / Math.max(1, checked)) * 100);
          setTrust(score);
          return;
        }
        setTimeout(poll, 1500);
      };
      poll();
    } catch(e){ console.error(e); setStep(4); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold mb-4">Beitrag erstellen &amp; analysieren</h1>

      <div className="flex gap-2 mb-3 text-sm">
        {["Text","Analyse","Bestätigung","Faktencheck","Fertig"].map((label,i)=>{
          const active = i<=step;
          return <span key={i} className={`px-3 py-1 rounded-full border ${active?"bg-yellow-100":"bg-white"}`}>{active?"✅":"○"} {label}</span>;
        })}
      </div>

      <textarea className="w-full h-40 border rounded p-3"
        placeholder="Dein Text…"
        value={text} onChange={e=>setText(e.target.value)} />

      <div className="mt-3 flex items-center gap-2">
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
                disabled={loading || !text.trim()}
                onClick={()=>{ setStep(1); runAnalyze(); }}>
          {loading?"Analysiere …":"Analysieren"}
        </button>
        <button className="px-3 py-2 rounded border" disabled={loading}
                onClick={()=>{ setText(""); setResult(null); setStep(0); setDraftId(null); setJobId(null); setFactStatus(null); }}>
          Neu anfangen
        </button>
      </div>

      <div className="mt-4 border rounded p-3">
        <div className="font-semibold mb-2">Analyse-Pipeline</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Vorverarbeitung</li><li>Kanon-Mapping (Tier-1/Tier-2)</li><li>Interner Abgleich (Duplikate/Region)</li>
          <li>Externe Quellen (Suche/Rank)</li><li>Virtuelles Experten-Panel</li><li>Faktencheck</li><li>Trust-Score</li>
        </ol>
      </div>

      {step>=1 && (
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-2">
            Sprache: {result?.language ?? "—"} • Hauptthema: {result?.mainTopic ?? "—"} • Subthemen: {result?.subTopics?.join(", ") || "—"}
          </div>
          <div className="space-y-3">
            {safeClaims.map((c,i)=>(
              <div key={i} className="border rounded p-3">
                <div className="font-semibold flex items-center justify-between">
                  <span>Aussage {i+1}</span>
                  {step===2 && (
                    <Stars value={c.relevance ?? 3} onChange={(v)=>{
                      const next = structuredClone(result);
                      next.claims[i].relevance = v;
                      setResult(next);
                    }}/>
                  )}
                </div>
                <div className="mt-1">{c.text}</div>
                <div className="mt-2 text-xs text-gray-600">
                  <span className="mr-2">Thema: {c.categoryMain ?? "—"}</span>
                  {c.categorySubs?.length? <span>• Sub: {c.categorySubs.join(", ")}</span>: null}
                </div>
              </div>
            ))}
          </div>

          {step===2 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="px-4 py-2 rounded border" onClick={saveRelevance}>Bestätigung speichern</button>
              <button className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
                      disabled={loading || !safeClaims.length}
                      onClick={enqueueFactcheck}>
                Faktencheck starten
              </button>
            </div>
          )}

          {step===3 && (
            <div className="mt-4 border rounded p-3">
              <div className="font-semibold mb-2">Faktencheck läuft …</div>
              <pre className="text-xs overflow-auto">{JSON.stringify(factStatus||{state:"queued"}, null, 2)}</pre>
              {typeof trust==="number" && (
                <div className="mt-3 text-sm">Vorläufiger Trust-Score: <b>{trust}</b>/100</div>
              )}
              <div className="mt-3">
                <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={()=>setStep(4)}>Weiter</button>
              </div>
            </div>
          )}

          {step===4 && (
            <div className="mt-6 border rounded p-4 bg-green-50">
              <div className="font-semibold mb-2">Fertig — Vorschau gespeichert.</div>
              <div className="text-sm">Du kannst jetzt veröffentlichen, weitere Themen ableiten oder zurück zur Analyse.</div>
              <div className="mt-3 flex gap-2">
                <a className="px-4 py-2 rounded border" href="/contributions/analyze">Neue Analyse</a>
                <a className="px-4 py-2 rounded border" href="/contributions/new">Zur Kurz-Analyse</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
TS

# 8) /contributions/new (bis 3 Kernaussagen)
cat > "$root/apps/web/src/app/contributions/new/page.tsx" <<'TS'
/* @ts-nocheck */
"use client";
import { useMemo, useState } from "react";

type Claim = { text:string; categoryMain?:string|null; categorySubs?:string[]; relevance?: number };
type AnalyzeResult = { language:string; mainTopic:string|null; subTopics:string[]; claims:Claim[] };

function Stars({ value, onChange }:{value:number; onChange:(v:number)=>void}){
  const v = Math.max(1, Math.min(5, Number(value||3)));
  return (
    <div className="select-none">
      {[1,2,3,4,5].map(i=>(
        <button key={i} className="text-xl mr-1" aria-label={`Relevanz ${i}`} onClick={()=>onChange(i)}>
          {i<=v ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function NewContribution(){
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState<AnalyzeResult|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const safeClaims = useMemo(()=> result?.claims ?? [], [result]);

  async function runAnalyze(){
    if(!text.trim()) return;
    setLoading(true);
    try{
      const res = await fetch("/api/contributions/analyze", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text, maxClaims: 3 }) });
      const data = await res.json();
      setResult({
        language: data?.language ?? "de",
        mainTopic: data?.mainTopic ?? null,
        subTopics: Array.isArray(data?.subTopics)?data.subTopics:[],
        claims: (Array.isArray(data?.claims)?data.claims:[]).map((c:any)=>({ ...c, relevance: 3 })),
      });
    } finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl font-bold mb-4">Beitrag erstellen &amp; analysieren</h1>

      <textarea className="w-full h-40 border rounded p-3" placeholder="Schreibe deinen Beitrag/These…"
        value={text} onChange={e=>setText(e.target.value)} />
      <div className="mt-3">
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-60" disabled={loading || !text.trim()} onClick={runAnalyze}>
          {loading?"Analysiere …":"Analyse starten"}
        </button>
      </div>

      <div className="mt-4 border rounded p-3">
        <div className="font-semibold mb-2">Analyse-Pipeline</div>
        <ul className="pl-5 list-disc text-sm space-y-1">
          <li>Vorverarbeitung</li><li>Kanon-Mapping</li><li>Duplikate/Region</li><li>Quellen</li><li>Faktencheck</li><li>Trust-Score</li>
        </ul>
      </div>

      {result && (
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-3">
            Sprache: {result.language} • Hauptthema: {result.mainTopic ?? "—"} • Subthemen: {result.subTopics?.join(", ") || "—"}
          </div>
          <div className="space-y-3">
            {safeClaims.map((c,i)=>(
              <div key={i} className="border rounded p-3">
                <div className="font-semibold">Kernaussage {i+1}</div>
                <div className="mt-1">{c.text}</div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span>Relevanz:</span>
                  <Stars value={c.relevance ?? 3} onChange={(v)=> {
                    const next = structuredClone(result);
                    next.claims[i].relevance = v;
                    setResult(next);
                  }}/>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {safeClaims.length>=3 && <>Es wurden bis zu 3 Kernaussagen extrahiert. Für eine vollständige Analyse wechsle zu <a className="underline" href="/contributions/analyze">Erweitert</a>.</>}
          </div>

          <div className="mt-4 flex gap-2">
            {!confirmed ? (
              <button className="px-4 py-2 rounded bg-indigo-600 text-white" onClick={()=>setConfirmed(true)}>Zusammenfassung bestätigen</button>
            ) : (
              <>
                <a className="px-4 py-2 rounded border" href="/contributions/analyze">Erweitert fortsetzen</a>
                <button className="px-4 py-2 rounded border">Premium buchen</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
TS

echo "✅ applied. Jetzt: pnpm --filter @vog/web run typecheck && pnpm --filter @vog/web dev"
