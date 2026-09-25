#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
ui_file="apps/web/src/ui/AnalysisFallbackNotice.tsx"
api_file="apps/web/src/app/api/support/report/route.ts"

mkdir -p "$(dirname "$ui_file")" "$(dirname "$api_file")"

write_file_safe () {
  local path="$1"
  local tmp="$path.tmp.$$"
  local suggested="$path.suggested"
  cat > "$tmp"
  if [ -e "$path" ]; then
    mv "$tmp" "$suggested"
    echo "• Exists: $path  → wrote suggestion: $suggested"
  else
    mv "$tmp" "$path"
    echo "✓ Wrote: $path"
  fi
}

# ---------- UI-Komponente ----------
write_file_safe "$ui_file" <<'TS'
// apps/web/src/ui/AnalysisFallbackNotice.tsx
"use client";
import React from "react";

type Props = {
  analysis?: any;                 // Ergebnisobjekt von /api/contributions/analyze
  analyzing?: boolean;            // true während der Analyse
  onRetry?: ()=>void;             // wird aufgerufen bei "Nochmal versuchen"
  autoReport?: boolean;           // wenn true: nach Anzeige automatisch melden (einmalig)
  textSample?: string;            // optional: kurzer Auszug des Eingabetexts
  source?: string;                // z.B. "contributions/new"
};

export default function AnalysisFallbackNotice({
  analysis, analyzing=false, onRetry, autoReport=false, textSample="", source="contributions/new"
}: Props){
  const [sent,setSent] = React.useState<null|{ok:boolean; id?:string; err?:string}>(null);
  const [showDetails,setShowDetails] = React.useState(false);
  const [busy,setBusy] = React.useState(false);

  const meta = analysis?._meta || {};
  const tookMs = Number(meta?.tookMs ?? 0);
  const hadError = meta?.mode === "error" || (Array.isArray(meta?.errors) && meta.errors.length>0);
  const noClaims = !Array.isArray(analysis?.claims) || analysis.claims.length===0;
  const shouldShow = !analyzing && (hadError || noClaims || tookMs>7000);

  // Einmaliges Auto-Reporting (wenn gewünscht)
  const reportedRef = React.useRef(false);
  React.useEffect(()=>{
    if (autoReport && shouldShow && !reportedRef.current) {
      reportedRef.current = true;
      doReport().catch(()=>{});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReport, shouldShow]);

  if (!shouldShow) return null;

  async function doReport(){
    try{
      setBusy(true);
      const payload = {
        ts: Date.now(),
        source,
        tookMs,
        meta,
        textLen: (textSample||"").length,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null
      };
      const res = await fetch("/api/support/report", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(()=>({ok:false}));
      setSent(j?.ok ? {ok:true, id:j?.id||undefined} : {ok:false, err:j?.error||"unknown"});
    }catch(e:any){
      setSent({ok:false, err:String(e?.message||e)});
    }finally{
      setBusy(false);
    }
  }

  return (
    <div className="vog-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Kurze technische Störung</div>
          <div className="text-sm opacity-80">
            Gerade konnten keine verwertbaren Aussagen erzeugt werden. Das tut uns leid.
          </div>
        </div>
        <div className="vog-chip">Status: {hadError ? "Fehler" : (noClaims ? "keine Claims" : "verzögert")}</div>
      </div>

      <ol className="list-decimal pl-5 text-sm space-y-1">
        <li>Seite geöffnet lassen.</li>
        <li>Mit „Nochmal versuchen“ die Analyse erneut anstoßen.</li>
        <li>Optional „Details anzeigen“ öffnen, um Einsicht in Laufzeit & Meta zu erhalten.</li>
        <li>Auf Wunsch den Support automatisch informieren – wir prüfen das zeitnah.</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <button className="vog-btn-pri" onClick={()=>onRetry?.()} disabled={busy || analyzing}>Nochmal versuchen</button>
        <button className="vog-btn-sec" onClick={()=>setShowDetails(s=>!s)}>{showDetails? "Details ausblenden":"Details anzeigen"}</button>
        <button className="vog-btn" onClick={doReport} disabled={busy}>
          {busy? "Sende…" : (sent?.ok ? "Gemeldet ✓" : "Support informieren")}
        </button>
      </div>

      {sent && (
        <div className={`text-sm ${sent.ok? "text-emerald-600":"text-red-600"}`}>
          {sent.ok ? "Danke! Deine Meldung ist bei uns angekommen." : `Senden fehlgeschlagen: ${sent.err||"Unbekannter Fehler"}`}
        </div>
      )}

      {showDetails && (
        <div className="mt-2 rounded-2xl border p-3 text-xs overflow-auto">
          <div><b>tookMs:</b> {tookMs}</div>
          <div><b>mode:</b> {String(meta?.mode||"")}</div>
          {Array.isArray(meta?.errors) && meta.errors.length>0 && (
            <div className="mt-1">
              <b>errors:</b>
              <ul className="list-disc pl-5">{meta.errors.map((e:any,i:number)=><li key={i}>{String(e)}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="text-xs opacity-60">
        Hinweis: Inhaltlich wird nichts zensiert oder heuristisch gefiltert. Diese Meldung betrifft rein die technische Verarbeitung.
      </div>
    </div>
  );
}
TS

# ---------- API-Route ----------
write_file_safe "$api_file" <<'TS'
// apps/web/src/app/api/support/report/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// weich einbinden: niemals die API crashen, wenn metrics fehlt
async function recordUsageSafe(e:any){
  try{
    const m = await import("@/lib/metrics/usage");
    const f = (m as any)?.recordUsage;
    if (typeof f === "function") await f(e);
  }catch{}
}

export async function POST(req: NextRequest){
  const t0 = Date.now();
  try{
    const body = await req.json().catch(()=> ({}));
    const id = `sr_${t0}_${Math.random().toString(36).slice(2,8)}`;

    // einfache Protokollierung (Serverlog)
    console.warn("[support-report]", id, JSON.stringify({
      source: body?.source, tookMs: body?.tookMs, meta: body?.meta, textLen: body?.textLen
    }));

    // optional: Usage protokollieren (non-blocking)
    recordUsageSafe({
      ts: Date.now(),
      route: "/api/support/report",
      userId: null,
      model: null,
      totalTokens: null,
      ms: Date.now()-t0,
      ok: true,
      err: null,
      meta: { source: body?.source||null, tookMs: body?.tookMs||null }
    }).catch(()=>{});

    return NextResponse.json({ ok:true, id }, { status: 200 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error:String(e?.message||e) }, { status: 200 });
  }
}
TS

echo
echo "Done."
echo "→ Import & Nutzung in deiner Page z.B.:"
cat <<'TIP'

/** Beispiel (Ausschnitt aus apps/web/src/app/contributions/new/page.tsx)
import AnalysisFallbackNotice from "@/ui/AnalysisFallbackNotice";
...
<AnalysisFallbackNotice
  analysis={analysis}
  analyzing={analyzing}
  onRetry={runAnalyze}
  autoReport={false}              // auf true setzen, wenn automatische Meldung gewünscht
  textSample={text.slice(0,240)}
  source="contributions/new"
/>
*/
TIP
