// apps/web/src/app/demo/factcheck/page.tsx
"use client";
import { useMemo, useState } from "react";
import { useFactcheckJob } from "@/hooks/useFactcheckJob";

type Verdict = "LIKELY_TRUE" | "LIKELY_FALSE" | "MIXED" | "UNDETERMINED";

type ManualEntry = {
  id: string;
  claim: string;
  verdict: Verdict;
  confidence?: number;
  note?: string;
  sources?: string[];
  status: "pending";
  updatedAt: string;
};

const DEMO_AI_CLAIMS = [
  {
    id: "demo-ai-1",
    text: "Radwege mit baulicher Trennung senken Unfallrisiken messbar.",
    verdict: "LIKELY_TRUE",
    confidence: 0.74,
  },
  {
    id: "demo-ai-2",
    text: "Tempo 30 reduziert Laerm in Wohnstrassen deutlich.",
    verdict: "LIKELY_TRUE",
    confidence: 0.68,
  },
  {
    id: "demo-ai-3",
    text: "Schulhoefe ohne Versiegelung verringern Hitzespitzen.",
    verdict: "MIXED",
    confidence: 0.52,
  },
];

const VERDICT_LABELS: Record<Verdict, string> = {
  LIKELY_TRUE: "wahrscheinlich richtig",
  LIKELY_FALSE: "wahrscheinlich falsch",
  MIXED: "gemischt",
  UNDETERMINED: "unklar",
};

export default function DemoFactcheckPage() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [demoAiReady, setDemoAiReady] = useState(false);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualClaim, setManualClaim] = useState("");
  const [manualVerdict, setManualVerdict] = useState<Verdict>("LIKELY_TRUE");
  const [manualConfidence, setManualConfidence] = useState(70);
  const [manualNote, setManualNote] = useState("");
  const [manualSources, setManualSources] = useState("");
  const { jobId, status, claims, loading, error, enqueue, done } =
    useFactcheckJob();

  const aiClaims = useMemo(() => {
    if (claims && claims.length > 0) {
      return claims.map((c: any, idx: number) => ({
        id: c.id ?? `claim-${idx + 1}`,
        text: c.text,
        verdict: (c.consensus?.verdict ?? "UNDETERMINED") as Verdict,
        confidence: c.consensus?.confidence ?? 0,
      }));
    }
    return DEMO_AI_CLAIMS;
  }, [claims]);

  const manualCanSubmit = manualClaim.trim().length >= 5 && !sending;

  function resetManualForm() {
    setEditingId(null);
    setManualClaim("");
    setManualVerdict("LIKELY_TRUE");
    setManualConfidence(70);
    setManualNote("");
    setManualSources("");
  }

  async function postEditorialFeedback(action: any) {
    const res = await fetch("/api/editorial/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ts: new Date().toISOString(),
        context: { url: "/demo/factcheck" },
        action,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "editorial_feedback_failed");
    }
    return String(data.id ?? "");
  }

  async function handleManualSubmit() {
    if (!manualCanSubmit) return;
    setSending(true);
    setManualStatus(null);
    const sources = manualSources
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const confidence = Math.max(0, Math.min(100, manualConfidence)) / 100;
    try {
      const action = editingId
        ? {
            type: "manual_factcheck_update",
            entryId: editingId,
            claim: manualClaim.trim(),
            verdict: manualVerdict,
            confidence,
            note: manualNote.trim() || undefined,
            sources: sources.length ? sources : undefined,
            origin: "community",
          }
        : {
            type: "manual_factcheck_submit",
            claim: manualClaim.trim(),
            verdict: manualVerdict,
            confidence,
            note: manualNote.trim() || undefined,
            sources: sources.length ? sources : undefined,
            origin: "community",
          };
      const id = await postEditorialFeedback(action);
      const now = new Date().toISOString();
      const entry: ManualEntry = {
        id: editingId ?? id,
        claim: manualClaim.trim(),
        verdict: manualVerdict,
        confidence,
        note: manualNote.trim() || undefined,
        sources: sources.length ? sources : undefined,
        status: "pending",
        updatedAt: now,
      };
      setManualEntries((prev) => {
        if (editingId) {
          return prev.map((item) => (item.id === editingId ? entry : item));
        }
        return [entry, ...prev];
      });
      setManualStatus("An Redaktion gesendet (Status: offen).");
      resetManualForm();
    } catch (err: any) {
      setManualStatus(`Fehler: ${String(err?.message ?? err)}`);
    } finally {
      setSending(false);
    }
  }

  async function handleSendAiToEditorial(force?: boolean) {
    if (!force && !demoAiReady && !done) {
      setManualStatus("Bitte zuerst einen Check starten.");
      return;
    }
    setSending(true);
    setManualStatus(null);
    try {
      for (const claim of aiClaims) {
        await postEditorialFeedback({
          type: "manual_factcheck_submit",
          claim: claim.text,
          verdict: claim.verdict,
          confidence: claim.confidence,
          origin: "ai",
        });
      }
      setManualStatus("KI-Ergebnis an Redaktion gesendet (Status: offen).");
    } catch (err: any) {
      setManualStatus(`Fehler: ${String(err?.message ?? err)}`);
    } finally {
      setSending(false);
    }
  }

  function handleEdit(entry: ManualEntry) {
    setEditingId(entry.id);
    setManualClaim(entry.claim);
    setManualVerdict(entry.verdict);
    setManualConfidence(Math.round((entry.confidence ?? 0) * 100));
    setManualNote(entry.note ?? "");
    setManualSources(entry.sources?.join("\n") ?? "");
    setMode("manual");
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Demo - Factcheck
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Schnellpruefung mit Demo-Daten
        </h1>
        <p className="text-sm text-slate-600">
          Fuer Screenshots: stabiler Flow ohne echte Inhalte. Ergebnisdaten sind
          reproduzierbar.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <textarea
          className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
          rows={5}
          placeholder="Text fuer Factcheck... (min. 20 Zeichen)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`rounded-full px-3 py-1 ${mode === "ai" ? "bg-white text-slate-900" : ""}`}
            >
              KI
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-full px-3 py-1 ${mode === "manual" ? "bg-white text-slate-900" : ""}`}
            >
              Manuell
            </button>
          </div>
          {mode === "ai" && (
            <>
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={loading || input.length < 20}
                onClick={() => {
                  enqueue({ text: input, language: "de", priority: 5 });
                  setDemoAiReady(true);
                  void handleSendAiToEditorial(true);
                }}
              >
                {loading ? "Wird geprueft..." : "Factcheck starten"}
              </button>
              <button
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                disabled={sending}
                onClick={() => {
                  void handleSendAiToEditorial();
                }}
              >
                Ergebnis an Redaktion senden
              </button>
            </>
          )}
          {jobId && <div className="text-xs text-slate-500">JobID: {jobId}</div>}
          {status && <div className="text-xs text-slate-500">Status: {status}</div>}
        </div>

        {error && <div className="text-sm text-red-600">Fehler: {error}</div>}
        {manualStatus && <div className="text-xs text-slate-500">{manualStatus}</div>}
      </div>

      {mode === "ai" && (done || demoAiReady) && aiClaims && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            KI-Ergebnis (Status Redaktion: offen)
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {aiClaims.map((c: any) => (
              <div
                key={c.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="text-sm font-medium text-slate-900">{c.text}</div>
                <div className="mt-2 text-xs text-slate-600">
                  Konsens: {VERDICT_LABELS[c.verdict as Verdict] ?? "unklar"} (
                  {Math.round((c.confidence ?? 0) * 100)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Manuelle Eingabe (immer Redaktion prueft)
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Claim</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                rows={3}
                value={manualClaim}
                onChange={(e) => setManualClaim(e.target.value)}
                placeholder="Aussage / Claim"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">Verdict</label>
                <select
                  value={manualVerdict}
                  onChange={(e) => setManualVerdict(e.target.value as Verdict)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {Object.entries(VERDICT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">Confidence</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={manualConfidence}
                  onChange={(e) => setManualConfidence(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Hinweis</label>
              <input
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Notiz fuer Redaktion"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Quellen (optional)</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm"
                rows={2}
                value={manualSources}
                onChange={(e) => setManualSources(e.target.value)}
                placeholder="https://... (eine URL pro Zeile oder Komma)"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!manualCanSubmit}
                onClick={handleManualSubmit}
              >
                {editingId ? "Update an Redaktion senden" : "An Redaktion senden"}
              </button>
              {editingId && (
                <button
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={resetManualForm}
                >
                  Abbrechen
                </button>
              )}
              <span className="text-xs text-slate-500">Status Redaktion: offen</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Eingereichte manuelle Checks
            </h4>
            {manualEntries.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
                Noch keine manuellen Eintraege.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {manualEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-2"
                  >
                    <div className="text-sm font-medium text-slate-900">{entry.claim}</div>
                    <div className="text-xs text-slate-600">
                      Verdict: {VERDICT_LABELS[entry.verdict]} (
                      {Math.round((entry.confidence ?? 0) * 100)}%)
                    </div>
                    {entry.note && (
                      <div className="text-xs text-slate-500">Notiz: {entry.note}</div>
                    )}
                    {entry.sources && entry.sources.length > 0 && (
                      <div className="text-xs text-slate-500">
                        Quellen: {entry.sources.join(", ")}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Status Redaktion: offen</span>
                      <button
                        className="font-semibold text-sky-600 underline"
                        onClick={() => handleEdit(entry)}
                      >
                        Bearbeiten
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
