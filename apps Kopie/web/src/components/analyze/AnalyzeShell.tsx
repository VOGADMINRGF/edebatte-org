"use client";
import * as React from "react";
import StatementCarousel from "@/components/statement/StatementCarousel";
import { buildPyramid } from "@features/analyze/pyramid";

type ApiResponse = {
  ok: boolean;
  degraded?: boolean;
  fallback?: boolean;
  reason?: string | null;
  message?: string | null;
  error?: string | null;
  errorCode?: string | null;
  result?: {
    claims?: any[];
    statements?: any[];
  };
  frames?: any;
  claims?: any[];
  statements?: any[];
};

function InlineProcessOverlay({stage, note}:{stage:number; note:string|null}) {
  const steps = [
    "Vorbereitung …",
    "KI-Analyse (Claims extrahieren) …",
    "Clustern & Postprocessing …",
    "Frames & Vorschau bauen …",
    "Fertig.",
  ];
  const active = Math.min(stage, steps.length - 1);
  return (
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/70 backdrop-blur-sm
                    flex flex-col items-center justify-center gap-2 text-sm">
      <div className="animate-spin h-5 w-5 rounded-full border-2 border-black/20 border-t-black" />
      <div className="font-medium">{steps[active]}</div>
      {note && <div className="text-xs text-neutral-600">{note}</div>}
    </div>
  );
}

export default function AnalyzeShell() {
  const [text, setText]   = React.useState("");
  const [busy, setBusy]   = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [note, setNote]   = React.useState<string | null>(null);
  const [carousel, setCarousel] = React.useState<any[]>([]);
  const [thanks, setThanks] = React.useState(false);

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    setStage(1);
    setNote(null);
    setCarousel([]);
    setThanks(false);

    try {
      setStage(2);
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // MaxClaims absichtlich NICHT mitsenden -> Server-Default 20
        body: JSON.stringify({ text: text.slice(0, 8000), locale: "de" }),
      });

      setStage(3);
      const data: ApiResponse | null = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setNote(
          data?.message ||
            data?.error ||
            `Ups – das hat nicht geklappt (HTTP ${res.status}). Bitte nochmal versuchen oder unseren Support kontaktieren.`,
        );
        setBusy(false);
        return;
      }

      const claims = data.result?.claims ?? data.claims;
      const statements = data.result?.statements ?? data.statements;
      if (!Array.isArray(claims)) {
        setNote("Analyse ergab keine Claims. Bitte versuche einen anderen Text oder kontaktiere den Support.");
        setBusy(false);
        return;
      }

      const { previews } = buildPyramid({
        claims,
        statements,
      });

      setCarousel(previews);
      setStage(4);
      setThanks(true);

      if (data.degraded || data.fallback) {
        setNote("Hinweis: Analyse lief im Fallback. Falls das Ergebnis komisch wirkt, probiere es bitte erneut.");
      }
    } catch {
      setNote("Netzwerk/Serverproblem. Bitte erneut versuchen – sonst Support: support@edebatte.org");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Beitrag analysieren</h1>

      <div className="relative">
        <textarea
          className="h-48 w-full rounded-2xl border p-4"
          placeholder="Beschreibe kurz dein Anliegen …"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-busy={busy}
        />
        {busy && <InlineProcessOverlay stage={stage} note={note} />}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={busy || !text.trim()}
          className="rounded-2xl bg-gradient-to-r from-brand-from to-brand-to px-5 py-2 text-white shadow disabled:opacity-50"
        >
          {busy ? "Analysiere …" : "Analysieren"}
        </button>

        {note && !busy && (
          <div className="text-sm text-neutral-700">
            {note}{" "}
            <button className="underline font-medium" onClick={analyze}>Erneut versuchen</button>{" "}
            · <a className="underline" href="mailto:support@edebatte.org?subject=Analyse%20Problem">Support</a>
          </div>
        )}
      </div>

      {thanks && (
        <div className="mt-4 rounded-xl border bg-white p-4 text-sm text-neutral-700">
          Danke! Wir haben deinen Text in überprüfbare Bausteine zerlegt. Unten siehst du erste
          Vorschläge als Statement-Karten. Wenn etwas fehlt oder unklar ist, kannst du es gleich anpassen.
        </div>
      )}

      {carousel.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 text-sm font-medium">Vorschau deiner Statement-Karten</div>
          <StatementCarousel items={carousel} />
        </div>
      )}
    </div>
  );
}
