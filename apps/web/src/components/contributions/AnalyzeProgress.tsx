"use client";

import * as React from "react";

type StepState = "running" | "done" | "empty" | "failed";

export type AnalyzeStep = {
  key: string;
  label: string;
  state: StepState;
  reason?: string | null;
};

export type ProviderMatrixEntry = {
  provider: string;
  state: "queued" | "running" | "ok" | "failed" | "cancelled" | "skipped" | "disabled";
  attempt?: number | null;
  errorKind?: string | null;
  status?: number | null;
  durationMs?: number | null;
  model?: string | null;
  reason?: string | null;
};

function ms(ms?: number | null) {
  if (!ms || ms <= 0) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function doneLabelForStep(key: string) {
  if (key === "claims") return "fertig";
  if (key === "context") return "fertig";
  if (key === "questions") return "fertig";
  if (key === "consequences") return "fertig";
  if (key === "responsibility") return "fertig";
  return "fertig";
}

const stateColors: Record<StepState, string> = {
  running: "bg-sky-50 text-sky-700 ring-sky-100",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  empty: "bg-slate-50 text-slate-600 ring-slate-200",
  failed: "bg-rose-50 text-rose-700 ring-rose-100",
};

const stateLabelBase: Record<StepState, string> = {
  running: "in Arbeit",
  done: "fertig",
  empty: "bereit",
  failed: "fehlgeschlagen",
};

function StepPill({
  idx,
  label,
  state,
  compact,
}: {
  idx: number;
  label: string;
  state: StepState;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "shrink-0 rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm ring-1 ring-white/40 backdrop-blur",
        compact ? "px-3 py-2" : "px-4 py-3",
      ].join(" ")}
    >
      <div className={compact ? "grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-center" : "flex items-center gap-3"}>
        <span
          className={[
            "flex items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
            compact ? "h-5 w-5 text-[10px] font-semibold" : "h-7 w-7 text-[12px] font-semibold",
          ].join(" ")}
        >
          {idx + 1}
        </span>

        <span className={compact ? "text-[11px] font-semibold text-slate-800" : "text-sm font-semibold text-slate-800"}>
          {label}
        </span>

        <span
          className={[
            "col-start-1 col-end-3 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
            stateColors[state],
          ].join(" ")}
        >
          {state === "done" ? doneLabelForStep(label) : stateLabelBase[state]}
        </span>
      </div>
    </div>
  );
}

function ProviderBadge({ row }: { row: ProviderMatrixEntry }) {
  const status =
    row.state === "ok"
      ? "ok"
      : row.state === "running"
      ? "running"
      : row.state === "failed"
      ? "failed"
      : row.state;

  const cls =
    status === "ok"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "running"
      ? "bg-sky-50 text-sky-700 ring-sky-100"
      : status === "failed"
      ? "bg-rose-50 text-rose-700 ring-rose-100"
      : "bg-slate-50 text-slate-600 ring-slate-200";

  const metaParts: string[] = [];
  if (row.model) metaParts.push(row.model);
  const dur = ms(row.durationMs);
  if (dur) metaParts.push(dur);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 text-[11px] text-slate-700">
      <span className="font-semibold text-slate-900">{row.provider}</span>
      <span className={["inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset", cls].join(" ")}>
        {status}
      </span>
      {metaParts.length ? <span className="text-slate-500">{metaParts.join(" · ")}</span> : null}
      {row.reason ? <span className="text-slate-500">· {row.reason}</span> : null}
    </div>
  );
}

export default function AnalyzeProgress({
  steps,
  providerMatrix,
  compact,
}: {
  steps: AnalyzeStep[];
  providerMatrix?: ProviderMatrixEntry[];
  compact?: boolean;
}) {
  const pm = Array.isArray(providerMatrix) ? providerMatrix : [];
  const hasProviders = pm.length > 0;

  return (
    <div className="w-full space-y-2">
      <div className="md:hidden text-[10px] text-slate-500 px-1">Swipe für Status</div>
      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {steps.map((s, idx) => (
            <StepPill key={s.key} idx={idx} label={s.label} state={s.state} compact />
          ))}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-5 md:gap-3">
        {steps.map((s, idx) => (
          <StepPill key={s.key} idx={idx} label={s.label} state={s.state} compact={compact ?? true} />
        ))}
      </div>

      {hasProviders ? (
        <details className="mt-3 rounded-2xl border border-slate-200/70 bg-white/60 px-4 py-3 shadow-sm ring-1 ring-white/40 backdrop-blur">
          <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900">
            Provider / Telemetrie
          </summary>
          <div className="mt-3 space-y-2">
            {pm.map((row) => (
              <ProviderBadge key={`${row.provider}-${row.attempt ?? 0}-${row.state}`} row={row} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
