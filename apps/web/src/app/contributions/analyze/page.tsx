"use client";

import * as React from "react";
import StatementCarousel from "@/components/statement/StatementCarousel";
import { buildPyramid } from "@features/analyze/pyramid";

/* ---------- kleines Inline-Overlay für Live-Status ---------- */
function InlineProcessOverlay({ stage, note }: { stage: number; note: string | null }) {
  const steps = [
    "Vorbereitung …",
    "KI-Analyse (Claims extrahieren) …",
    "Clustern & Postprocessing …",
    "Frames & Vorschau bauen …",
    "Fertig.",
  ];
  const active = Math.min(stage, steps.length - 1);
  return (
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-sm">
      <div className="animate-spin h-5 w-5 rounded-full border-2 border-black/20 border-t-black" />
      <div className="font-medium">{steps[active]}</div>
      {note && <div className="text-xs text-neutral-600">{note}</div>}
    </div>
  );
}

type ApiResponse = {
  ok: boolean;
  degraded?: boolean;
  reason?: string | null;
  trace?: string;
  frames?: any;
  claims?: any[];
  statements?: any[];
  clusters?: any[];
};

export default function ContributionAnalyzePage() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [stage, setStage] = React.useState(0);
  const [note, setNote] = React.useState<string | null>(null);
  const [trace, setTrace] = React.useState<string | null>(null);

  const [carousel, setCarousel] = React.useState<any[]>([]);

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true);
    setStage(0);
    setNote(null);
    setTrace(null);
    setCarousel([]);

    try {
      setStage(1);
      const res = await fetch("/api/contributions/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // maxClaims absichtlich weggelassen → Server-Default 20
        body: JSON.stringify({ text: text.slice(0, 8000), locale: "de" }),
      });

      setStage(2);
      const data: ApiResponse = await res.json();

      setStage(3);
      if (!data?.ok) {
        setNote(
          data?.reason === "OPENAI_AUTH"
            ? "API-Zugang fehlerhaft."
            : data?.reason === "RATE_LIMIT"
            ? "Rate-Limit. Bitte kurz warten und erneut auslösen."
            : data?.reason === "TIMEOUT"
            ? "Zeitüberschreitung. Bitte erneut versuchen."
            : data?.reason === "CLIENT_PARAM_MISMATCH"
            ? "Client/Server-Parameter aktualisiert. Bitte Seite neu laden."
            : data?.reason === "PARSE_ERROR"
            ? "Antwort konnte nicht interpretiert werden."
            : "Unerwarteter Fehler."
        );
        if (data?.trace) setTrace(data.trace);
        setBusy(false);
        return;
      }

      const { previews } = buildPyramid({
        frames: data.frames,
        claims: data.claims,
        statements: data.statements,
      });

      setCarousel(previews);

      setStage(4);
      if (data?.degraded) {
        setNote("Hinweis: Antwort wurde vereinfacht. Du kannst es erneut versuchen.");
      }
    } catch {
      setNote("Netzwerk/Serverproblem. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Beitrag analysieren</h1>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-48 w-full rounded-2xl border p-4"
          placeholder="Beschreibe kurz dein Anliegen …"
          aria-busy={busy}
        />
        {busy && <InlineProcessOverlay stage={stage} note={note} />}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={analyze}
          disabled={busy || !text.trim()}
          className="
            group inline-flex items-center gap-2 rounded-2xl
            bg-gradient-to-r from-brand-from to-brand-to
            px-5 py-2.5 text-white font-semibold
            shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20
            transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-to
            disabled:opacity-50
          "
        >
          {busy ? "Analysiere …" : "Analysieren"}
        </button>

        {note && !busy && (
          <div className="text-sm text-neutral-700">
            {note}{" "}
            {trace && <span className="opacity-70">• Trace: {trace}</span>} ·{" "}
            <button className="underline font-medium" onClick={analyze}>
              Erneut versuchen
            </button>{" "}
            ·{" "}
            <a
              className="underline"
              href={`mailto:support@voiceopengov.org?subject=Analyse%20Problem&body=Trace%3A%20${encodeURIComponent(
                trace || ""
              )}`}
            >
              Support
            </a>
          </div>
        )}
      </div>

      {carousel.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 text-sm font-medium">Vorschau deiner Statement-Karten</div>
          <StatementCarousel items={carousel} />
        </div>
      )}
    </div>
  );
}
