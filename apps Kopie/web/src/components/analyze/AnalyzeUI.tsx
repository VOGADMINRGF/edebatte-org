"use client";
import React, { useMemo, useState } from "react";
import analyzeLocal, { Analysis } from "@/lib/analysis";

function pct(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n * 100))) : 0;
}

type Step = "idle" | "analyse" | "review" | "factcheck" | "done";

export default function AnalyzeUI() {
  const [text, setText] = useState<string>("");
  const [step, setStep] = useState<Step>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const readyForFactcheck = useMemo(
    () => !!analysis && (analysis.theses.length > 0 || analysis.statements.length > 0) && confirmed,
    [analysis, confirmed]
  );

  async function runAnalyse() {
    setConfirmed(false);
    setStep("analyse");
    const res = analyzeLocal(text);
    setAnalysis(res);
    setStep("review");
  }

  async function runFactcheck() {
    // Platzhalter: hier später ARI/YOu.com/LLM-Factcheck einhängen
    setStep("factcheck");
    setTimeout(() => setStep("done"), 600); // kurze Fake-Latenz
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Beitrag erstellen &amp; analysieren</h1>

      {/* Eingabe */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text hier einfügen – oder URL + Kurzkontext…"
        className="w-full h-40 border rounded p-3 leading-relaxed"
      />

      {/* Actions + Stepper */}
      <div className="flex items-center gap-3">
        <button
          onClick={runAnalyse}
          className="px-3 py-1.5 rounded bg-black text-white disabled:bg-neutral-400"
          disabled={!text.trim()}
        >
          Analyse starten
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className={`px-2 py-0.5 rounded ${step === "analyse" ? "bg-blue-100" : "bg-neutral-100"}`}>Analyse</span>
          <span>›</span>
          <span className={`px-2 py-0.5 rounded ${step === "review" ? "bg-blue-100" : "bg-neutral-100"}`}>Review</span>
          <span>›</span>
          <span className={`px-2 py-0.5 rounded ${step === "factcheck" ? "bg-blue-100" : "bg-neutral-100"}`}>Faktencheck</span>
          <span>›</span>
          <span className={`px-2 py-0.5 rounded ${step === "done" ? "bg-green-100" : "bg-neutral-100"}`}>Fertig</span>
        </div>
      </div>

      {/* Review Controls */}
      {analysis && (
        <div className="flex items-center justify-between border rounded p-3 bg-neutral-50">
          <div className="text-sm">
            <strong>Überblick</strong>{" "}
            <span className="text-neutral-500">
              • Themen: {analysis.summary.topics} • Thesen: {analysis.summary.theses} • Ø Relevanz:{" "}
              {pct(analysis.summary.avgRelevance)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Zusammenfassung plausibel
            </label>
            <button
              onClick={runFactcheck}
              disabled={!readyForFactcheck}
              className="px-3 py-1.5 rounded border disabled:opacity-50"
              title={!readyForFactcheck ? "Erst kurze Bestätigung setzen" : "Faktencheck starten"}
            >
              Faktencheck starten
            </button>
            <button
              className="px-3 py-1.5 rounded border"
              onClick={() => alert("An Redaktion gemeldet (Stub)")}
            >
              An Redaktion melden
            </button>
          </div>
        </div>
      )}

      {/* Ergebnisse */}
      {analysis && (
        <div className="space-y-4">
          <Section title="Themen">
            <ul className="list-disc pl-6 space-y-1">
              {analysis.topics.map((t, i) => (
                <li key={i}>
                  {t.topic} <span className="text-neutral-500">({pct(t.score)}%)</span>
                </li>
              ))}
              {analysis.topics.length === 0 && <li className="text-neutral-500">– keine –</li>}
            </ul>
          </Section>

          <Section title="Thesen">
            <ul className="list-disc pl-6 space-y-2">
              {analysis.theses.map((th, i) => (
                <li key={i}>
                  <span className="text-neutral-500">({pct(th.relevance)}%)</span> {th.text}
                </li>
              ))}
              {analysis.theses.length === 0 && <li className="text-neutral-500">– keine –</li>}
            </ul>
          </Section>

          <Section title="Kernaussagen">
            <ul className="list-disc pl-6 space-y-2">
              {analysis.statements.map((s, i) => (
                <li key={i}>{s.text}</li>
              ))}
              {analysis.statements.length === 0 && <li className="text-neutral-500">– keine –</li>}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="border rounded">
      <header className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b">
        <h3 className="font-semibold">{title}</h3>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}
