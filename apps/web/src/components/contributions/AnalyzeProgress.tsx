import React from "react";

type AnalyzeProgressProps = {
  steps: {
    key: string;
    label: string;
    state: "running" | "done" | "empty" | "failed";
    reason?: string | null;
  }[];
  providerMatrix?: {
    provider: string;
    state: "queued" | "running" | "ok" | "failed" | "cancelled" | "skipped" | "disabled";
    attempt?: number | null;
    errorKind?: string | null;
    status?: number | null;
    durationMs?: number | null;
    model?: string | null;
    reason?: string | null;
  }[];
};

export function AnalyzeProgress({
  steps,
  providerMatrix = [],
  compact = false,
}: AnalyzeProgressProps & { compact?: boolean }) {
  const stateColors: Record<"running" | "done" | "empty" | "failed", string> = {
    running: "bg-amber-100 text-amber-800 border border-amber-200",
    done: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    empty: "bg-slate-100 text-slate-700 border border-slate-200",
    failed: "bg-rose-100 text-rose-800 border border-rose-200",
  };
  const stateLabel: Record<keyof typeof stateColors, string> = {
    running: "läuft",
    done: "fertig",
    empty: "leer",
    failed: "fehlgeschlagen",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
      <div className={compact ? "grid grid-cols-5 gap-1" : "flex flex-col gap-2"}>
        {steps.map((step, idx) => (
          <div
            key={step.key}
            className={
              compact
                ? "flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px]"
                : "flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={
                  compact
                    ? "flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
                    : "flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700"
                }
              >
                {idx + 1}
              </span>
              <span className={compact ? "text-[11px] font-semibold text-slate-800" : "text-sm font-semibold text-slate-800"}>
                {step.label}
              </span>
              <span className={`rounded-full ${compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"} ${stateColors[step.state]}`}>
                {stateLabel[step.state]}
              </span>
            </div>
            {!compact && step.reason ? <div className="text-slate-500">{step.reason}</div> : null}
          </div>
        ))}
      </div>
      {providerMatrix.length > 0 ? (
        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <summary className="cursor-pointer select-none font-semibold text-slate-800">
            Technik-Details
          </summary>
          <div className="mt-2 space-y-2">
            {providerMatrix.map((p) => {
              const stateClasses: Record<typeof p.state, string> = {
                queued: "bg-slate-100 text-slate-700 border border-slate-200",
                running: "bg-amber-100 text-amber-800 border border-amber-200",
                ok: "bg-emerald-100 text-emerald-800 border border-emerald-200",
                failed: "bg-rose-100 text-rose-800 border border-rose-200",
                cancelled: "bg-slate-100 text-slate-700 border border-slate-200",
                skipped: "bg-slate-100 text-slate-700 border border-slate-200",
                disabled: "bg-slate-100 text-slate-700 border border-slate-200",
              };
              const stateLabel =
                p.state === "running"
                  ? `läuft${p.attempt ? ` (Versuch ${p.attempt})` : ""}`
                  : p.state === "queued"
                    ? "wartet"
                    : p.state === "cancelled"
                      ? "abgebrochen"
                      : p.state;
              return (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 ${stateClasses[p.state]}`}>
                      {stateLabel}
                    </span>
                    <span className="font-semibold text-slate-800">{p.provider}</span>
                    {p.model ? <span className="text-slate-500">· {p.model}</span> : null}
                    {p.attempt ? <span className="text-slate-500">· Versuch {p.attempt}</span> : null}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    {p.errorKind ? <span>err={p.errorKind}</span> : null}
                    {p.status ? <span>status={p.status}</span> : null}
                    {p.durationMs ? <span>{p.durationMs}ms</span> : null}
                    {p.reason ? <span className="text-slate-400">({p.reason})</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default AnalyzeProgress;
