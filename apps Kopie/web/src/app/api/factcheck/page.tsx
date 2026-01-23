"use client";
import { useState } from "react";

export default function FactcheckPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const enq = await fetch("/api/factcheck/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-role": "admin" },
        body: JSON.stringify({ text, language: "de" }),
      });
      const ej = await enq.json();
      if (!enq.ok) throw new Error(ej?.message ?? "enqueue failed");

      // sanft pollen, max. 30s
      for (let i = 0; i < 30; i++) {
        const st = await fetch(`/api/factcheck/status/${ej.jobId}`, {
          headers: { "x-role": "admin" },
        });
        const sj = await st.json();
        if (st.ok && (sj.job.status === "completed" || sj.job.status === "failed")) {
          setResult({
            job: sj.job,
            claims: (sj.claims ?? []).map((c: any, idx: number) => ({
              id: c.id ?? String(idx + 1),
              text: c.text,
            })),
          });
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Timeout");
    } catch (e: any) {
      setError(e.message ?? String(e));
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Factcheck</h1>
      <textarea
        className="w-full border rounded p-3 min-h-[140px]"
        placeholder="Text hier einfügen…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={run}
        disabled={loading || text.trim().length < 10}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Prüfe…" : "Factcheck starten"}
      </button>

      {error && <p className="text-red-600">Fehler: {error}</p>}
      {result && (
        <div className="border rounded p-4 space-y-2">
          <div className="text-sm text-gray-600">
            Job #{result.job.jobId} – {result.job.status}
          </div>
          {result.job?.verdict && (
            <div className="text-xs text-gray-500">
              Verdict: <b>{result.job.verdict}</b>
              {typeof result.job.confidence === "number" ? ` (confidence ${result.job.confidence})` : ""}
            </div>
          )}
          {result.claims.map((c: any) => (
            <div key={c.id} className="p-3 bg-gray-50 rounded">
              <div className="font-medium">{c.text}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
