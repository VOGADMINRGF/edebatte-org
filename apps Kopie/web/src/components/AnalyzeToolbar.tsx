"use client";
import React from "react";

type Props = {
  busy?: boolean;
  hasText: boolean;
  maxClaims: number;
  setMaxClaims: (v: number) => void;
  onRun: () => void;
  label?: string;
  className?: string;
};

export default function AnalyzeToolbar({
  busy,
  hasText,
  maxClaims,
  setMaxClaims,
  onRun,
  label = "Analysieren",
  className = "",
}: Props) {
  return (
    <div className={`sticky top-16 z-20 mt-3 rounded-2xl border bg-white/95 backdrop-blur px-3 py-2 shadow-sm ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">maxClaims</label>
        <input
          type="number"
          min={1}
          max={20}
          value={maxClaims}
          onChange={(e) =>
            setMaxClaims(Math.max(1, Math.min(20, Number(e.target.value || 1))))
          }
          className="w-20 rounded-lg border px-2 py-1"
        />
        <div className="flex-1" />
        <button
          type="button"
          onClick={onRun}
          disabled={busy || !hasText}
          className="rounded-2xl px-4 py-2 text-white disabled:opacity-50
                     bg-black bg-gradient-to-r from-brand-from to-brand-to"
          aria-busy={busy}
        >
          {busy ? "Analysiere…" : label}
        </button>
      </div>
    </div>
  );
}
