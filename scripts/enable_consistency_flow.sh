#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
WEB="$ROOT/apps/web"
APP="$WEB/src/app"
FEAT="$WEB/src/features"

echo "➕ Ensure folders"
mkdir -p "$APP" "$APP/contributions/analyze" "$FEAT" "$WEB/src/app/api" "$WEB/src/app/(components)" "$WEB/src/app/(styles)"

############################################
# 1) Startseite => Redirect auf contributions/new
############################################
cat > "$APP/page.tsx" <<'TS'
import { redirect } from "next/navigation";
export default function Page(){ redirect("/contributions/new"); }
TS
echo "✅ Startseite -> /contributions/new"

############################################
# 2) Nav-Links hart umbiegen (statements/new -> contributions/new), wenn vorhanden
############################################
if grep -RIl --exclude-dir=node_modules "/statements/new" "$WEB" >/dev/null 2>&1; then
  echo "🧷 Passe Links /statements/new -> /contributions/new an"
  rg -l "/statements/new" "$WEB" | while read -r f; do
    sed -i '' 's#/statements/new#/contributions/new#g' "$f"
  done
fi

############################################
# 3) Lightweight Styles (Container, Stepper, Loader)
############################################
GL="$APP/globals.css"
touch "$GL"
if ! grep -q "/* eDebatte flow styles */" "$GL"; then
cat >> "$GL" <<'CSS'
/* eDebatte flow styles */
:root{ --page-max: 920px; }
.vog-container{ max-width:var(--page-max); margin:0 auto; padding:12px; }
.vog-card{ border:1px solid #ddd; border-radius:8px; padding:12px; background:#fff; }
.vog-muted{ color:#555; }
.vog-stepper{ display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
.vog-step{ display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; border:1px solid #ddd; background:#fafafa; font-size:14px }
.vog-step[data-active="true"]{ border-color:#333; background:#f0f0f0; font-weight:600 }
.vog-spinner{ width:18px; height:18px; border-radius:50%; border:2px solid #ccc; border-top-color:#333; animation:spin .8s linear infinite }
@keyframes spin{ to{ transform:rotate(360deg) } }
.vog-claims{ display:grid; gap:10px; }
.vog-claim{ border:1px solid #eee; border-radius:8px; padding:10px; background:#fff }
.vog-btn{ padding:8px 12px; border-radius:8px; border:1px solid #222; background:#111; color:#fff; cursor:pointer }
.vog-btn[disabled]{ opacity:.5; cursor:default }
.vog-btn--ghost{ background:#fff; color:#111; border-color:#ccc }
.vog-row{ display:flex; gap:8px; flex-wrap:wrap; }
textarea.vog-input{ width:100%; min-height:140px; font:inherit; padding:8px; border-radius:8px; border:1px solid #bbb; }
CSS
  echo "✅ glob. Styles ergänzt"
fi

############################################
# 4) Neue, geführte Analyze-Page
############################################
cat > "$APP/contributions/analyze/page.tsx" <<'TS'
"use client";
import React from "react";

type AnalyzeResult = {
  language: string;
  mainTopic: string|null;
  subTopics: string[];
  regionHint: string|null;
  claims: { text:string; categoryMain:string|null; categorySubs:string[]; region:string|null; authority:string|null }[];
};

type Step = "write" | "analyzing" | "confirm" | "factchecking" | "done" | "error";

function Stepper({step}:{step:Step}){
  const steps: {id:Step; label:string}[] = [
    {id:"write", label:"Text"},
    {id:"analyzing", label:"Analyse"},
    {id:"confirm", label:"Bestätigung"},
    {id:"factchecking", label:"Faktencheck"},
    {id:"done", label:"Fertig"}
  ];
  const idx = steps.findIndex(s => s.id===step);
  return (
    <div className="vog-stepper">
      {steps.map((s,i)=>(
        <div key={s.id} className="vog-step" data-active={i<=idx}>
          {i<idx ? "✅" : i===idx ? "🟡" : "⚪️"} {s.label}
        </div>
      ))}
    </div>
  );
}

export default function AnalyzePage(){
  const [text, setText] = React.useState("");
  const [step, setStep] = React.useState<Step>("write");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string|null>(null);

  const [result, setResult] = React.useState<AnalyzeResult|null>(null);
  const [jobId, setJobId] = React.useState<string|null>(null);
  const [contributionId, setContributionId] = React.useState<string|null>(null);
  const [status, setStatus] = React.useState<string>("");

  async function doAnalyze(){
    setErr(null);
    if (!text.trim()) return;
    setLoading(true);
    setStep("analyzing");
    try{
      const res = await fetch("/api/contributions/analyze",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text })});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AnalyzeResult = await res.json();
      setResult(json);
      setStep("confirm");
    }catch(e:any){
      setErr(e?.message || "Unerwarteter Fehler");
      setStep("error");
    }finally{
      setLoading(false);
    }
  }

  // sehr einfache Heuristik: Faktencheck wenn Zahlen/Prozente vorkommen ODER >4 Claims
  function needsFactcheck(r:AnalyzeResult){
    const hasNumbers = r.claims.some(c => /\d/.test(c.text));
    return hasNumbers || r.claims.length>4;
  }

  async function confirmAndMaybeFactcheck(){
    if(!result) return;
    if(!needsFactcheck(result)){
      setStep("done");
      setStatus("Kein Faktencheck nötig. Prüfe bestehende Debatten & stimme ab.");
      return;
    }
    setLoading(true);
    setStep("factchecking");
    setStatus("Warteschlange …");
    try{
      const q = { claims: result.claims, mainTopic: result.mainTopic, regionHint: result.regionHint };
      const res = await fetch("/api/factcheck/enqueue",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(q)});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const { jobId:jid, contributionId:cid } = await res.json();
      setJobId(jid||null);
      setContributionId(cid||null);
      setStatus("Gestartet");

      // Polling
      let tries=0;
      const tick = async () => {
        if(!jid) return;
        tries++;
        const sres = await fetch(`/api/factcheck/status/${jid}`);
        if(sres.ok){
          const s = await sres.json();
          setStatus(s?.status || "…");
          if(s?.status==="done" || s?.status==="failed" || tries>60){
            setStep("done");
            return;
          }
        }
        if(tries<=60) setTimeout(tick, 2000);
      };
      setTimeout(tick, 1500);
    }catch(e:any){
      setErr(e?.message||"Fehler beim Faktencheck");
      setStep("error");
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="vog-container" style={{paddingBottom:24}}>
      <h1 style={{fontSize:28, fontWeight:700, margin:"8px 0"}}>Beitrag erstellen & analysieren</h1>

      <Stepper step={step} />

      {/* Eingabe */}
      <div className="vog-card" style={{margin:"12px 0"}}>
        <textarea
          className="vog-input"
          placeholder="Dein Text…"
          value={text}
          onChange={e=>setText(e.target.value)}
          disabled={loading || step==="factchecking"}
        />
        <div className="vog-row" style={{marginTop:8}}>
          <button className="vog-btn" disabled={loading || !text.trim()} onClick={doAnalyze}>
            {loading && step==="analyzing" ? <span className="vog-spinner" /> : "Analysieren"}
          </button>
          {step!=="write" && (
            <button className="vog-btn vog-btn--ghost" disabled={loading} onClick={()=>{ setStep("write"); setResult(null); }}>
              Neu anfangen
            </button>
          )}
        </div>
      </div>

      {/* Ergebnis & Bestätigung */}
      {result && (step==="confirm" || step==="factchecking" || step==="done") && (
        <div className="vog-card" style={{margin:"12px 0"}}>
          <div className="vog-muted" style={{marginBottom:8}}>
            <b>Sprache:</b> {result.language || "—"} • <b>Hauptthema:</b> {result.mainTopic ?? "—"} • <b>Subthemen:</b> {result.subTopics?.join(", ") || "—"} • <b>Region-Hinweis:</b> {result.regionHint ?? "—"}
          </div>
          <div className="vog-claims">
            {result.claims.map((c,i)=>(
              <div key={i} className="vog-claim">
                <div style={{fontWeight:700}}>Aussage {i+1}</div>
                <div style={{margin:"4px 0"}}>{c.text}</div>
                <div className="vog-muted" style={{fontSize:13}}>
                  Thema: <b>{c.categoryMain ?? "—"}</b>
                  {c.categorySubs?.length ? <> • Sub: {c.categorySubs.join(", ")}</> : null}
                  {c.region ? <> • Region: {c.region}</> : null}
                  {c.authority ? <> • Amt: {c.authority}</> : null}
                </div>
              </div>
            ))}
          </div>

          {step==="confirm" && (
            <div className="vog-row" style={{marginTop:12}}>
              <button className="vog-btn" disabled={loading} onClick={confirmAndMaybeFactcheck}>
                ✅ Passt so – weiter
              </button>
              <button className="vog-btn vog-btn--ghost" disabled={loading} onClick={()=>setStep("write")}>
                ✏️ Text korrigieren & neu analysieren
              </button>
            </div>
          )}

          {step==="factchecking" && (
            <div style={{marginTop:12}}>
              <div className="vog-row"><span className="vog-spinner" /> <b>Faktencheck läuft…</b></div>
              <div className="vog-muted" style={{marginTop:6}}>
                {jobId ? <>Job: <code>{jobId}</code> • </> : null}
                Status: {status || "…"}
              </div>
            </div>
          )}

          {step==="done" && (
            <div style={{marginTop:12}}>
              <div>🎉 <b>Fertig.</b> {status || "Ergebnisse bereit."}</div>
              {contributionId && (
                <div className="vog-muted" style={{marginTop:6}}>
                  Ergebnis-API: <a href={`/api/factcheck/result/${contributionId}`} target="_blank" rel="noreferrer">/api/factcheck/result/{contributionId}</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {err && (
        <div className="vog-card" style={{borderColor:"#dd5555", background:"#fff7f7"}}>
          <b>Fehler:</b> {err}
        </div>
      )}

      {/* Transparenz: Pipeline */}
      <div className="vog-card" style={{marginTop:12}}>
        <div className="vog-muted" style={{fontSize:13, marginBottom:4}}>Analyse-Pipeline</div>
        <ol style={{margin:"0 0 0 18px", padding:0}}>
          <li>Vorverarbeitung</li>
          <li>Kanon-Mapping (Tier-1/Tier-2)</li>
          <li>Interner Abgleich (Duplikate/Region)</li>
          <li>Externe Quellen (Suche/Rank)</li>
          <li>Virtuelles Experten-Panel</li>
          <li>Faktencheck</li>
          <li>Trust-Score</li>
        </ol>
      </div>
    </div>
  );
}
TS
echo "✅ /contributions/analyze Flow geschrieben"

echo "ℹ️  Starte dev neu (falls läuft):"
echo "    pkill -f 'next dev' >/dev/null 2>&1 || true"
echo "    pnpm --filter @vog/web dev"
