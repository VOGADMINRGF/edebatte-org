#!/usr/bin/env bash
set -euo pipefail

# LEGACY_KEEP: UX-Pipeline-Stub aus VPM25, nicht automatisiert im Einsatz.
# Nur als Vorlage für spätere Schritte gedacht.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/apps/web"

say() { printf "\n\033[1;36m%s\033[0m\n" "$*"; }

file_backup() {
  local f="$1"
  if [[ -f "$f" && ! -f "$f.bak" ]]; then cp "$f" "$f.bak"; fi
}

ensure() {
  [[ -d "$WEB" ]] || { echo "❌ $WEB nicht gefunden"; exit 1; }
}

say "🧭 Projekt: $ROOT"
ensure

say "🔐 .env.local ergänzen"
mkdir -p "$WEB"
touch "$WEB/.env.local"
grep -q '^OPENAI_API_KEY=' "$WEB/.env.local" || echo 'OPENAI_API_KEY=DEIN_API_KEY_HIER' >> "$WEB/.env.local"
grep -q '^OPENAI_MODEL='   "$WEB/.env.local" || echo 'OPENAI_MODEL=gpt-4o-mini'       >> "$WEB/.env.local"

say "📦 Zod sicherstellen"
if command -v pnpm >/dev/null 2>&1; then PM=pnpm; else PM=npm; fi
$PM add -w zod >/dev/null 2>&1 || true

say "🧠 Analyzer schreiben/aktualisieren"
mkdir -p "$WEB/src/features/analyze"
file_backup "$WEB/src/features/analyze/analyzeContribution.ts"
cat > "$WEB/src/features/analyze/analyzeContribution.ts" <<'TS'
// apps/web/src/features/analyze/analyzeContribution.ts
import "server-only";
import { z } from "zod";

// ---- Schemas
const ClaimSchema = z.object({
  text: z.string().min(6).max(2000),
  categoryMain: z.string().min(2).max(80).nullable().optional(),
  categorySubs: z.array(z.string().min(2).max(80)).max(6).default([]),
  region: z.string().min(2).max(120).nullable().optional(),
  authority: z.string().min(2).max(160).nullable().optional(),
});

const ContextSchema = z.object({
  language: z.string().min(2).max(5).default("de"),
  mainTopic: z.string().min(2).max(80).nullable().optional(),
  subTopics: z.array(z.string().min(2).max(80)).max(10).default([]),
  regionHint: z.string().nullable().optional(),
  overallSummary: z.string().min(6).max(1000).nullable().optional(),
  thesis: z.string().min(3).max(280).nullable().optional(),
  stance: z.enum(["pro","contra","neutral"]).nullable().optional(),
  keyArguments: z.array(z.string().min(4).max(280)).max(10).default([]),
  sourceCandidates: z.array(z.string().url().or(z.string().min(6))).max(10).default([]),
  derivedClaims: z.array(z.string().min(6).max(220)).max(8).default([]),
  factcheck: z.object({
    needed: z.boolean().default(false),
    reason: z.string().max(240).nullable().optional(),
    type: z.enum(["behauptung","unklarheit","zahlen","keine"]).default("keine")
  }).default({ needed:false, reason:null, type:"keine" }),
  joinExisting: z.object({
    suggest: z.boolean().default(false),
    topics: z.array(z.string().min(2)).max(6).default([])
  }).default({ suggest:false, topics:[] }),
  claims: z.array(ClaimSchema).min(1).max(20),
});

export type AnalyzeResult = z.infer<typeof ContextSchema>;

// ---- System Prompt
const SYS = `
Du bist ein präziser, strenger Extraktor für VoiceOpenGov (VOG).

AUFGABEN:
1) Gesamt-Kontext erfassen: "overallSummary" (2–4 Sätze), "mainTopic", "subTopics", optional "regionHint".
2) Zentrale "thesis" (1 Satz) und "stance" (pro/contra/neutral) bestimmen.
3) "keyArguments" extrahieren (je 1 kurzer Satz).
4) "sourceCandidates": erkennbare Quellen/URLs/Zitate (falls vorhanden).
5) Text in kurze, überprüfbare "claims" (1 Thema/Claim, 1–2 Sätze, ≤180 Zeichen) zerlegen.
   Jeder Claim mit "categoryMain" (Tier-1), optional "categorySubs".
6) "derivedClaims": zusätzliche prägnante Kernaussagen (max 8), nur wenn sauber ableitbar.
7) "factcheck":
   - needed=true, wenn Behauptungen, Zahlen, Kausalitäten oder unklare Infos enthalten sind.
   - reason (kurz) + type={"behauptung","unklarheit","zahlen","keine"}.
8) "joinExisting": Wenn eher generelles Anliegen (z.B. "GEZ nicht zahlen") → suggest=true + Themen.

REGELN:
- Keine Kommentare außerhalb des JSON. Keine Halluzinationen.
- Claims strikt deduplizieren, 1 Kernaussage pro Claim, 1–2 Sätze, ≤180 Zeichen.
`;

// erzwinge JSON-Objekt
function jsonSchemaForOpenAI() { return { type: "json_object" as const }; }

// ---- Core
export async function analyzeContribution(text: string): Promise<AnalyzeResult> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const user = (text || "").slice(0, 8000);

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
      // kein temperature/top_p → volle Kompatibilität
      response_format: jsonSchemaForOpenAI(),
    })
  });

  const raw = await r.text();
  if (!r.ok) throw new Error(`OpenAI ${r.status}${raw ? ` – ${raw}` : ""}`);

  let content: any;
  try { content = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "{}"; }
  catch { content = raw; }

  let parsed: any = content;
  if (typeof content === "string") { try { parsed = JSON.parse(content); } catch { parsed = null; } }

  // Safe parse
  const safe = ContextSchema.safeParse(parsed);
  let out: AnalyzeResult;
  if (safe.success) out = safe.data;
  else {
    out = {
      language: "de", mainTopic: null, subTopics: [], regionHint: null,
      overallSummary: null, thesis: null, stance: "neutral",
      keyArguments: [], sourceCandidates: [], derivedClaims: [],
      factcheck: { needed:false, reason:null, type:"keine" },
      joinExisting: { suggest:false, topics:[] },
      claims: [{ text: user, categoryMain: null, categorySubs: [], region: null, authority: null }]
    };
  }

  // Normalize & dedupe
  const seen = new Set<string>();
  out.claims = (out.claims||[])
    .map(c => ({ ...c, text: (c.text||"").trim().replace(/\s+/g," ").slice(0,240) }))
    .filter(c => {
      if (!c.text) return false;
      const k = (c.text + "|" + (c.categoryMain||"")).toLowerCase();
      if (seen.has(k)) return false; seen.add(k); return true;
    });

  return out;
}
TS

say "🛠  API: /api/contributions/analyze"
mkdir -p "$WEB/src/app/api/contributions/analyze"
file_backup "$WEB/src/app/api/contributions/analyze/route.ts"
cat > "$WEB/src/app/api/contributions/analyze/route.ts" <<'TS'
import { NextResponse } from "next/server";
import { analyzeContribution } from "@/features/analyze/analyzeContribution";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ ok: false, error: "text_required" }, { status: 400 });
    }
    const result = await analyzeContribution(text);
    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "analyze_failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
TS

say "🛠  (Optional) API: /api/contributions/ingest (Stub)"
mkdir -p "$WEB/src/app/api/contributions/ingest"
file_backup "$WEB/src/app/api/contributions/ingest/route.ts"
cat > "$WEB/src/app/api/contributions/ingest/route.ts" <<'TS'
import { NextResponse } from "next/server";
export const runtime = "nodejs";
// Erwartet: { text: string, analysis: any }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.text || !body?.analysis) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
    }
    // TODO: hier DB-Speicherung + Factcheck-Queue integrieren
    return NextResponse.json({ ok: true, saved: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "ingest_failed" }, { status: 500 });
  }
}
TS

say "🏠 Startseite → /contributions/new umleiten"
mkdir -p "$WEB/src/app"
file_backup "$WEB/src/app/page.tsx"
cat > "$WEB/src/app/page.tsx" <<'TS'
import { redirect } from "next/navigation";
export default function Home() { redirect("/contributions/new"); }
TS

say "🖥️  Neue Eingabeseite: /contributions/new (UX: Stepper, Highlighting, Panels)"
mkdir -p "$WEB/src/app/contributions/new"
file_backup "$WEB/src/app/contributions/new/page.tsx"
cat > "$WEB/src/app/contributions/new/page.tsx" <<'TS'
"use client";
import { useMemo, useState } from "react";

type Claim = { text:string; categoryMain:string|null; categorySubs:string[]; region:string|null; authority:string|null; };
type Analysis = {
  language:string; mainTopic:string|null; subTopics:string[]; regionHint:string|null;
  overallSummary:string|null; thesis:string|null; stance:"pro"|"contra"|"neutral"|null;
  keyArguments:string[]; sourceCandidates:string[]; derivedClaims:string[];
  factcheck:{ needed:boolean; reason:string|null; type:string };
  joinExisting:{ suggest:boolean; topics:string[] };
  claims: Claim[];
};

function highlightText(src:string, claims:Claim[]) {
  let html = src;
  for (const c of claims) {
    const raw = (c.text||"").trim();
    if (!raw) continue;
    const t = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!t) continue;
    const re = new RegExp(t, "i");
    html = html.replace(re, (m) => `<mark class="mark">${m}</mark>`);
  }
  return html;
}

export default function NewContributionPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<0|1|2|3|4|5>(0);
  const [error, setError] = useState<string|null>(null);
  const [analysis, setAnalysis] = useState<Analysis|null>(null);

  async function run() {
    setError(null); setAnalysis(null); setLoading(true); setStep(1);
    try {
      await new Promise(r => setTimeout(r, 200)); setStep(2);
      await new Promise(r => setTimeout(r, 200)); setStep(3);

      const r = await fetch("/api/contributions/analyze", {
        method: "POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text })
      });
      const j = await r.json(); if (!j.ok) throw new Error(j.error || "unexpected");
      setAnalysis(j.data);

      setStep(4);
      await new Promise(r => setTimeout(r, 150));
      setStep(5);
    } catch(e:any) {
      setError(e?.message || "Unerwartete Antwort");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!analysis) return;
    await fetch("/api/contributions/ingest", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, analysis })
    }).catch(()=>{});
    alert("Entwurf gespeichert (Stub).");
  }

  const previewHtml = useMemo(() => {
    if (!analysis?.claims?.length) return text.replace(/\n/g,"<br/>");
    return highlightText(text, analysis.claims).replace(/\n/g,"<br/>");
  }, [text, analysis]);

  return (
    <main className="container">
      <h1 style={{margin:"8px 0 16px", fontSize:28}}>Beitrag erstellen & analysieren</h1>

      <div className="grid grid-2">
        <section className="card">
          <label style={{fontWeight:600}}>Dein Text</label>
          <textarea rows={12} style={{width:"100%", marginTop:6}} placeholder="Freitext eingeben…"
            value={text} onChange={e=>setText(e.target.value)} />
          <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
            <button onClick={run} disabled={loading || !text.trim()}>
              {loading ? "Analysiere …" : "Analyse starten"}
            </button>
            {loading && <span>Pipeline läuft…</span>}
          </div>

          {/* Stepper */}
          <div style={{marginTop:12}}>
            <div className={`step ${step>=1?"done":""} ${step===1?"run":""}`}>Vorverarbeitung</div>
            <div className={`step ${step>=2?"done":""} ${step===2?"run":""}`}>Kanon-Mapping (Themen)</div>
            <div className={`step ${step>=3?"done":""} ${step===3?"run":""}`}>Interner Abgleich (Duplikate/Region)</div>
            <div className={`step ${step>=4?"done":""} ${step===4?"run":""}`}>Externe Hinweise (Quellen)</div>
            <div className={`step ${step>=5?"done":""} ${step===5?"run":""}`}>Faktencheck-Entscheid</div>
          </div>

          {/* Live-Vorschau mit Highlights */}
          <div className="card" style={{marginTop:12, background:"#fafafa"}}>
            <div style={{fontWeight:600, marginBottom:6}}>Vorschau (Hervorhebungen):</div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>

          {error && <p style={{ color: "#b00020", marginTop: 12 }}>✖ {error}</p>}
        </section>

        <aside className="card">
          <div style={{fontWeight:700, marginBottom:8}}>Kontext</div>
          {analysis ? (
            <>
              <div><b>Sprache:</b> {analysis.language ?? "—"}</div>
              <div><b>Hauptthema:</b> {analysis.mainTopic ?? "—"}</div>
              <div><b>Subthemen:</b> {analysis.subTopics?.join(", ") || "—"}</div>
              <div><b>Region:</b> {analysis.regionHint ?? "—"}</div>
              <div style={{marginTop:8}}><b>These:</b> {analysis.thesis ?? "—"} ({analysis.stance ?? "neutral"})</div>
              {analysis.overallSummary && <div style={{marginTop:6}}><b>Zusammenfassung:</b> {analysis.overallSummary}</div>}
              {!!analysis.keyArguments?.length && (
                <div style={{marginTop:8}}>
                  <b>Argumente:</b>
                  <ul style={{margin:"6px 0 0 18px"}}>
                    {analysis.keyArguments.map((a,i)=>(<li key={i}>{a}</li>))}
                  </ul>
                </div>
              )}
              {!!analysis.sourceCandidates?.length && (
                <div style={{marginTop:8}}>
                  <b>Quellen-Hinweise:</b>
                  <ul style={{margin:"6px 0 0 18px"}}>
                    {analysis.sourceCandidates.map((s,i)=>(<li key={i}><span style={{wordBreak:"break-all"}}>{s}</span></li>))}
                  </ul>
                </div>
              )}
              {!!analysis.derivedClaims?.length && (
                <div style={{marginTop:8}}>
                  <b>Hergeleitete Kernaussagen:</b>
                  <ul style={{margin:"6px 0 0 18px"}}>
                    {analysis.derivedClaims.map((d,i)=>(<li key={i}>{d}</li>))}
                  </ul>
                </div>
              )}

              <div className="card" style={{marginTop:12}}>
                <div><b>Faktencheck nötig?</b> {analysis.factcheck.needed ? "Ja" : "Nein"}</div>
                {analysis.factcheck.reason && <div><b>Grund:</b> {analysis.factcheck.reason}</div>}
                {analysis.joinExisting?.suggest && (
                  <div style={{marginTop:6}}>
                    ➜ Vorschlag: an bestehende Debatte anschließen ({analysis.joinExisting.topics.join(", ") || "Thema"}).
                  </div>
                )}
                <div style={{display:"flex", gap:8, marginTop:10}}>
                  <button onClick={saveDraft} disabled={!analysis}>Als Entwurf speichern</button>
                  <button disabled={!analysis || !analysis.factcheck.needed}>Faktencheck starten</button>
                  <button disabled={!analysis || !analysis.joinExisting?.suggest}>Zu Debatte wechseln</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{opacity:.7}}>Analyse-Ergebnis erscheint hier.</div>
          )}
        </aside>
      </div>

      {/* Claim-Liste */}
      {analysis && (
        <section style={{marginTop:18}}>
          <h2 style={{fontSize:20, marginBottom:8}}>Erkannte Aussagen</h2>
          {analysis.claims?.map((c,i)=>(
            <div key={i} className="card" style={{marginBottom:8}}>
              <div style={{fontWeight:700}}>Aussage {i+1}</div>
              <div style={{marginTop:4}}>{c.text}</div>
              <div style={{fontSize:13, opacity:.8, marginTop:6}}>
                <b>Thema:</b> {c.categoryMain ?? "—"}
                {c.categorySubs?.length ? <> • <b>Sub:</b> {c.categorySubs.join(", ")}</> : null}
                {" • "}<b>Region:</b> {c.region ?? "—"}
                {" • "}<b>Amt:</b> {c.authority ?? "—"}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
TS

say "🎨 Basis-CSS ergänzen (Desktop≈Mobile)"
CSS="$WEB/src/app/globals.css"
touch "$CSS"
file_backup "$CSS"
cat >> "$CSS" <<'CSS'

/* --- VOG UX base --- */
:root { --maxw: 980px; }
.container { max-width: var(--maxw); margin: 24px auto; padding: 0 16px; }
.card { border:1px solid #e5e7eb; border-radius:12px; padding:12px 14px; background:#fff; }
.grid { display:grid; gap:12px; }
@media (min-width: 900px) { .grid-2 { grid-template-columns: 1.3fr 1fr; } }
.mark { background:#fff3b0; border-radius:4px; padding:0 2px; }
.step { display:flex; gap:10px; align-items:center; font-size:14px; margin-top:4px; }
.step:before { content:"•"; color:#888; }
.step.done:before { content:"✔"; color:#0a7; }
.step.run:before  { content:"⏳"; color:#555; }
CSS

say "📱 layout.tsx: viewport (falls Datei existiert, nur Hinweis)"
LAY="$WEB/src/app/layout.tsx"
if [[ -f "$LAY" ]] && ! grep -q "viewport" "$LAY"; then
  file_backup "$LAY"
  # Füge export metadata viewport hinzu (sehr einfacher Patch)
  awk '1; /export const metadata =/ && !done {done=1}' "$LAY" > "$LAY.tmp"
  mv "$LAY.tmp" "$LAY"
  echo '// Tipp: Prüfe, dass metadata.viewport gesetzt ist (Next 15).' >> "$LAY"
fi

say "✅ Fertig. Starte neu:"
cat <<'NOTE'
cd apps/web
pnpm dev

- Default-Start: /contributions/new
- Analyse läuft zuerst, UI zeigt Stepper, Highlights, Kontext-Panel, Claim-Karten
- /api/contributions/ingest ist ein Stub (hier DB+Factcheck einklinken)

Rückgängig machen? .bak-Dateien liegen neben den geänderten Dateien.
NOTE
