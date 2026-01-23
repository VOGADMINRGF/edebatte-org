"use client";
import React from "react";

type Step = { ts: number; label: string; kind: "ok" | "info" | "error" };

export function ProgressLog() {
  const [steps, setSteps] = React.useState<Step[]>([]);
  const add = (s: Step) => setSteps((v) => [...v, s]);

  React.useEffect(() => {
    // no-op here; component is just a container
  }, []);

  return (
    <div className="mt-3 rounded border p-3 bg-white">
      <div className="font-semibold mb-2">Analyse-Prozess</div>
      {steps.length === 0 ? (
        <div className="text-sm text-gray-500">Keine Schritte.</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {steps.map((s, i) => (
            <li key={i} className={s.kind === "error" ? "text-red-600" : s.kind === "ok" ? "text-emerald-700" : ""}>
              {new Date(s.ts).toLocaleTimeString()} – {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function useAnalyzeWithProgress() {
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<Step[]>([]);
  const add = (label: string, kind: Step["kind"] = "info") =>
    setLog((v) => [...v, { ts: Date.now(), label, kind }]);

  const run = React.useCallback(async (payload: any) => {
    setResult(null); setError(null); setLog([]);
    add("Starte…");
    const es = new EventSource(`/api/contributions/analyze?stream=1`, { withCredentials: false });

    es.addEventListener("start", () => add("Pipeline init", "ok"));
    es.addEventListener("step", (ev: any) => {
      try { add(JSON.parse(ev.data)?.name || "Schritt"); } catch { add("Schritt"); }
    });
    es.addEventListener("error", (ev: any) => {
      try { setError(JSON.parse(ev.data)?.message || "Fehler"); } catch { setError("Fehler"); }
      add("Fehler", "error");
      es.close();
    });
    es.addEventListener("done", (ev: any) => {
      try { setResult(JSON.parse(ev.data)?.result || null); add("Fertig", "ok"); } catch { add("Fertig", "ok"); }
      es.close();
    });

    // send POST body through a tiny fetch (so the SSE route can read JSON body from request clone)
    await fetch(`/api/contributions/analyze?stream=1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(()=>{});
  }, []);

  return { run, result, error, log };
}

/* Stars: neutral mapping, no default 3 stars */
export function starsFromWeight(w?: number) {
  if (!w || w <= 0) return 0;
  if (w < 1) return 1;
  if (w < 1.5) return 2;
  if (w < 2) return 3;
  if (w < 2.5) return 4;
  return 5;
}
