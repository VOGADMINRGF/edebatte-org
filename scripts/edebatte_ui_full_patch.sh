#!/usr/bin/env bash
set -euo pipefail

# Root automatisch erkennen (git) oder vom Skriptpfad ausgehen
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  ROOT="$(git rev-parse --show-toplevel)"
else
  ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
fi

echo "→ Root: $ROOT"

APP_WEB="$ROOT/apps/web"
SRC="$APP_WEB/src"
CMP="$SRC/components"
ANZ="$CMP/analyze"
APP="$SRC/app"

mkdir -p "$ANZ" "$APP/contributions/analyze" "$APP/contributions/new" "$SRC/app"

echo "→ Stelle Tailwind v4 & PostCSS korrekt ein …"
# 1) Tailwind v4 Config (ESM/TS)
cat > "$APP_WEB/tailwind.config.ts" <<'TS'
import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../features/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { from: "#00E6D1", to: "#2196F3" },
      },
      borderRadius: { "2xl": "1rem" },
      boxShadow: {
        soft: "0 8px 24px rgba(2, 6, 23, 0.06)",
      },
    },
  },
} satisfies Config;
TS

# Entferne evtl. alte fehlerhafte CJS-Config
rm -f "$APP_WEB/tailwind.config.cjs" 2>/dev/null || true

# 2) PostCSS auf v4-Flow
cat > "$APP_WEB/postcss.config.cjs" <<'CJS'
module.exports = {
  plugins: {
    tailwindcss: {},
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
CJS

# 3) Globale Styles + CI-Helfer
mkdir -p "$SRC/app"
cat > "$SRC/app/globals.css" <<'CSS'
@import "tailwindcss";
@plugin "@tailwindcss/forms";
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/aspect-ratio";

/* --- eDebatte / eDebatte CI helpers --- */
:root { --page-max: 1100px; }
.container-vog { max-width: var(--page-max); margin: 0 auto; padding: 1rem; }

.vog-head { 
  @apply text-3xl md:text-4xl font-extrabold tracking-tight;
  background: linear-gradient(90deg, #00E6D1 0%, #2196F3 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}

.vog-card       { @apply rounded-2xl border border-slate-200/80 bg-white shadow-soft; }
.vog-card-muted { @apply rounded-2xl border border-slate-200/80 bg-slate-50/70; }
.vog-btn        { @apply inline-flex items-center justify-center rounded-2xl px-3.5 py-2.5 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50; }
.vog-btn-pri    { @apply inline-flex items-center justify-center rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white; background: linear-gradient(90deg, #00E6D1 0%, #2196F3 100%); }
.vog-btn-ghost  { @apply inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100; }

.vog-stepper { @apply flex items-center gap-2 text-xs text-slate-500; }
.vog-stepper .dot { @apply h-2 w-2 rounded-full bg-slate-300; }
.vog-stepper .dot.active { @apply bg-sky-500; }

.vog-chip { @apply inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600; }

.vog-skeleton { @apply animate-pulse bg-slate-200/60 rounded; }
CSS

echo "→ Baue UI-Komponenten …"
# 4) Komponenten: CTA-Buttons
mkdir -p "$ANZ"
cat > "$ANZ/CTAButtons.tsx" <<'TS'
"use client";
import React from "react";

export default function CTAButtons({
  onUse, onAlternatives, onResearch, onFactcheck
}:{
  onUse: ()=>void; onAlternatives: ()=>void; onResearch: ()=>void; onFactcheck: ()=>void;
}){
  return (
    <div className="flex flex-wrap gap-2">
      <button className="vog-btn-pri" onClick={onUse}>Statement übernehmen</button>
      <button className="vog-btn" onClick={onAlternatives}>Alternativen</button>
      <button className="vog-btn" onClick={onResearch}>Recherche</button>
      <button className="vog-btn" onClick={onFactcheck}>Faktencheck</button>
    </div>
  );
}
TS

# 5) Komponenten: Ergebnis-Karte
cat > "$ANZ/AnalyzeResultCard.tsx" <<'TS'
"use client";
import React from "react";
import CTAButtons from "./CTAButtons";

export type Claim = {
  text: string;
  categoryMain?: string | null;
  categorySubs?: string[] | null;
  region?: string | null;
  authority?: string | null;
};

export default function AnalyzeResultCard({ claim, onUse }:{
  claim: Claim; onUse:(text:string)=>void;
}){
  const subs = (claim.categorySubs||[]).join(", ");
  return (
    <div className="vog-card p-4 space-y-3">
      <div className="font-medium leading-relaxed">{claim.text}</div>
      <div className="text-sm text-slate-600">
        {claim.categoryMain ? <>Thema: <b>{claim.categoryMain}</b>{subs?<> · Sub: {subs}</>:null}</> : "—"}
        {claim.region ? <> · Region: {claim.region}</> : null}
      </div>
      <CTAButtons
        onUse={()=>onUse(claim.text)}
        onAlternatives={()=>window.dispatchEvent(new CustomEvent("vog:alt", { detail: claim }))}
        onResearch={()=>window.dispatchEvent(new CustomEvent("vog:research", { detail: claim }))}
        onFactcheck={()=>window.dispatchEvent(new CustomEvent("vog:factcheck", { detail: claim }))}
      />
    </div>
  );
}
TS

# 6) Komponenten: News/Referenzen-Panel
cat > "$ANZ/NewsFeedPanel.tsx" <<'TS'
"use client";
import React from "react";

type Item = { title:string; url:string; score?:number; source?:string };

export default function NewsFeedPanel({ topic, region, keywords=[] as string[] }:{
  topic: string; region?: string|null; keywords?: string[];
}){
  const [items,setItems] = React.useState<Item[]|null>(null);
  const [errors,setErrors] = React.useState<string[]|null>(null);
  const [loading,setLoading] = React.useState(false);

  async function load(){
    setLoading(true); setErrors(null);
    try{
      const res = await fetch("/api/search/civic", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ topic, region: region||undefined, keywords, limit: 8 })
      });
      const js = await res.json();
      setItems(Array.isArray(js.items) ? js.items : []);
      if(js.errors) setErrors(js.errors);
    }catch(e:any){
      setItems([]); setErrors([String(e?.message||e)]);
    }finally{ setLoading(false); }
  }

  React.useEffect(()=>{ load(); }, [topic, region, JSON.stringify(keywords)]);

  return (
    <div className="vog-card p-4">
      <div className="font-semibold mb-2">Aktuelle Recherche</div>
      {loading && !items && <div className="vog-skeleton h-4 w-40" />}
      {(!items || items.length===0) ? (
        <div className="text-sm text-slate-600">
          Keine Treffer aus konfigurierten Quellen.
          {errors?.length ? (
            <details className="text-xs mt-2">
              <summary>Details/Fehler</summary>
              <ul className="list-disc ml-4 mt-1">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
            </details>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {items!.map((it,i)=>(
            <li key={i} className="group">
              <a href={it.url} target="_blank" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="font-medium line-clamp-2">{it.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {(it.source ?? (()=>{ try { return new URL(it.url).host } catch { return "" } })())}
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
TS

# 7) Komponenten: Clarify-Panel (Rückfragen)
cat > "$ANZ/ClarifyPanel.tsx" <<'TS'
"use client";
import React from "react";

export default function ClarifyPanel({ questions }:{ questions: string[] }){
  if(!questions?.length) return null;
  return (
    <div className="vog-card-muted p-4">
      <div className="font-semibold mb-2">Klärungsfragen</div>
      <ul className="list-disc ml-5 space-y-1 text-sm">
        {questions.map((q,i)=><li key={i}>{q}</li>)}
      </ul>
    </div>
  );
}
TS

echo "→ Seiten: /contributions/analyze (Pro) & /contributions/new (Öffentlich) …"
# 8) /contributions/analyze (Pro/Redaktion, mit Zugangs-Hinweis)
cat > "$APP/contributions/analyze/page.tsx" <<'TS'
"use client";
import React from "react";
import AnalyzeResultCard, { type Claim } from "@/components/analyze/AnalyzeResultCard";
import NewsFeedPanel from "@/components/analyze/NewsFeedPanel";
import ClarifyPanel from "@/components/analyze/ClarifyPanel";

type Res = {
  language?: string; mainTopic?: string|null; subTopics?: string[];
  regionHint?: string|null;
  claims?: Claim[];
  followUps?: string[];
  news?: any[];
  scoreHints?: { baseWeight?: number; reasons?: string[] };
  _meta?: { picked?: string|null };
};

function getRole(): string {
  if (typeof document === "undefined") return "guest";
  const m = document.cookie.match(/(?:^|;)\s*u_role=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "guest";
}

export default function AnalyzePage(){
  const [text,setText] = React.useState("");
  const [busy,setBusy] = React.useState(false);
  const [res,setRes] = React.useState<Res|null>(null);
  const [role,setRole] = React.useState<string>("guest");

  React.useEffect(()=>{ setRole(getRole()); }, []);

  async function analyze(opts:{clarify?:boolean} = {}){
    setBusy(true);
    try{
      const url = "/api/contributions/analyze?mode=multi" + (opts.clarify ? "&clarify=1" : "");
      const r = await fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ text, maxClaims: 6 }) });
      const j = await r.json();
      setRes(j);
    } finally { setBusy(false); }
  }

  function useStatement(s:string){
    const u = new URL("/contributions/new", window.location.origin);
    u.searchParams.set("text", s);
    window.location.href = u.toString();
  }

  return (
    <div className="container-vog">
      <h1 className="vog-head mb-2">Beitrag erstellen &amp; analysieren (Pro)</h1>
      {(role !== "editor" && role !== "admin") && (
        <div className="mb-4 text-sm text-slate-600">
          Hinweis: Dieser Bereich ist für Redaktion/Partner. Für die schnelle Erstellung nutze bitte{" "}
          <a className="underline" href="/contributions/new">„Beitrag (schnell)“</a>.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <textarea
            className="w-full min-h-[180px] rounded-2xl border p-4"
            placeholder="Worum geht es? Was soll sich ändern? (z. B. Kostenloser Nahverkehr, bessere Straßenbahn-Anbindung …)"
            value={text} onChange={e=>setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button className="vog-btn-pri" onClick={()=>analyze()} disabled={!text || busy}>Analyse starten</button>
            <button className="vog-btn" onClick={()=>analyze({clarify:true})} disabled={!text || busy}>Analyse + Klärungsfragen</button>
          </div>

          {res && (
            <div className="space-y-3">
              <div className="vog-card p-4">
                <div className="font-semibold">
                  Ergebnisse • Sprache: {res.language ?? "—"} • Hauptthema: {res.mainTopic ?? "—"}
                  {res._meta?.picked ? <> • Pipeline: {res._meta?.picked}</> : null}
                </div>
              </div>

              <div className="space-y-3">
                {(res.claims||[]).map((c,i)=>(
                  <div key={i} className="space-y-2">
                    <div className="text-xs text-slate-500">Aussage {i+1}</div>
                    <AnalyzeResultCard claim={c} onUse={useStatement}/>
                  </div>
                ))}
                {(res.claims?.length??0)===0 && (
                  <div className="vog-card p-4">Keine Aussagen erkannt. Probiere <b>Analyse + Klärungsfragen</b>.</div>
                )}
              </div>

              <ClarifyPanel questions={res.followUps||[]}/>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <NewsFeedPanel
            topic={res?.mainTopic || "ÖPNV"}
            region={res?.regionHint || "DE:BE"}
            keywords={res?.subTopics || []}
          />
          <div className="vog-card p-4">
            <div className="font-semibold mb-2">Was ist der nächste Schritt?</div>
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Aussage auswählen → <i>„Statement übernehmen“</i></li>
              <li>Optional Alternativen vergleichen</li>
              <li>Recherche öffnen &amp; Belege sammeln</li>
              <li>Faktencheck anstoßen oder veröffentlichen</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
TS

# 9) /contributions/new (Öffentlich, hübsch + schnell)
cat > "$APP/contributions/new/page.tsx" <<'TS'
"use client";
import React from "react";

export default function ContributionQuick(){
  const [text,setText] = React.useState<string>(typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("text") || "") : "");

  async function analyzeAndMove(){
    const url = "/api/contributions/analyze?mode=multi&clarify=1";
    const r = await fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ text, maxClaims: 4 }) });
    const j = await r.json();
    const claim = (j?.claims?.[0]?.text || text || "").slice(0, 500);
    const u = new URL("/statements/new", window.location.origin);
    if (claim) u.searchParams.set("text", claim);
    window.location.href = u.toString();
  }

  return (
    <div className="container-vog">
      <h1 className="vog-head mb-4">Beitrag erstellen &amp; analysieren</h1>
      <div className="max-w-3xl space-y-4">
        <textarea
          className="w-full min-h-[200px] rounded-2xl border p-4"
          placeholder="Schreibe deinen Beitrag/These…"
          value={text} onChange={e=>setText(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button className="vog-btn-pri" onClick={analyzeAndMove} disabled={!text}>Analyse starten</button>
          <div className="vog-chip">Analyse-Pipeline</div>
        </div>

        <div className="vog-card p-4">
          <div className="font-semibold mb-2">Was passiert als Nächstes?</div>
          <ul className="list-disc ml-5 space-y-1 text-sm">
            <li>Wir extrahieren 1–3 Kernaussagen.</li>
            <li>Wir schlagen Kategorien &amp; Region vor.</li>
            <li>Du kannst direkt veröffentlichen oder Quellen sammeln.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
TS

echo "→ API: Clarify-Step optional einklinken …"
# 10) API-Route patchen, falls vorhanden: followUps anhängen (idempotent)
ROUTE="$APP/api/contributions/analyze/route.ts"
if [ -f "$ROUTE" ]; then
  cp "$ROUTE" "$ROUTE.bak" || true
  # Wenn "followUps" noch nicht eingebaut, erweitern wir die Response (non-destructive)
  if ! grep -q "followUps" "$ROUTE"; then
    cat > "$ROUTE" <<'TS'
import { NextRequest, NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
import { step_analyze_multi_llm } from "@/app/pipeline/steps/analyze_multi_llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const maxClaims = Number(body?.maxClaims ?? 5);
    const modeParam = req.nextUrl.searchParams.get("mode");
    const clarify = req.nextUrl.searchParams.get("clarify") === "1";
    const MODE = (modeParam || process.env.VOG_ANALYZE_MODE || "gpt").toLowerCase();

    if (!text) return NextResponse.json({ error: "Kein Text übergeben." }, { status: 400 });

    const result =
      MODE === "multi"
        ? await step_analyze_multi_llm(text, { maxClaims })
        : await analyzeContribution(text, { maxClaims });

    if (clarify) {
      try {
        const { clarify: doClarify } = await import("@/features/analyze/clarify");
        const qs = await doClarify(text);
        if (Array.isArray(qs) && qs.length) (result as any).followUps = qs.slice(0,5);
      } catch {}
    }

    return NextResponse.json(result, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unbekannter Fehler" }, { status: 500 });
  }
}
TS
  fi
else
  echo "⚠️  Konnte $ROUTE nicht finden – überspringe API-Patch."
fi

echo "→ Fertig! Starte jetzt: pnpm --filter @vog/web dev"
