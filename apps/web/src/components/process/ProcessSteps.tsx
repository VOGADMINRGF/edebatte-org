"use client";
import React from "react";

export type ProcessStepsProps = {
  stage: number; // 0..4
  busy?: boolean;
  note?: string | null;
  className?: string;
};

const STAGES = [
  "Vorbereitung",
  "KI-Analyse",
  "Postprocessing",
  "Register/Frames",
  "Vorschau/Ergebnis",
];

export default function ProcessSteps({ stage, busy, note, className = "" }: ProcessStepsProps) {
  const pct = Math.max(0, Math.min(1, stage / (STAGES.length - 1)));
  return (
    <div className={`mt-4 rounded-2xl border bg-white/90 backdrop-blur p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Analyse-Prozess</div>
        <div className="text-xs text-neutral-500">
          {busy ? "läuft…" : stage >= STAGES.length - 1 ? "fertig" : "bereit"}
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className="h-full bg-gradient-to-r from-brand-from to-brand-to transition-[width] duration-300"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {STAGES.map((label, i) => {
          const active = i === stage; const done = i < stage;
          return (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span
                className={[
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs",
                  done
                    ? "bg-black text-white border-black"
                    : active
                    ? "bg-black/80 text-white border-black/80"
                    : "bg-white text-black border-black/20",
                ].join(" ")}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "font-medium" : ""}>{label}</span>
            </div>
          );
        })}
      </div>
      {!!note && <div className="mt-2 text-xs text-neutral-600">{note}</div>}
    </div>
  );
}
