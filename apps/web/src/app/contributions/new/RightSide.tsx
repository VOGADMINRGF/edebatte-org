"use client";
import * as React from "react";
export type Chip = { id: string; text: string };

export function RightSide({
  questions, knots, editorHeight, onJump,
}: { questions: Chip[]; knots: Chip[]; editorHeight: number; onJump?: (offset: number) => void; }) {
  return (
    <aside className="sticky top-20 self-start" style={{ height: editorHeight || "auto" }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => onJump?.(0)}
              className="w-full rounded-2xl border p-3 text-left handwriting italic shadow-sm transition hover:-translate-y-[2px] hover:shadow-lg ring-1 ring-emerald-300/30 bg-white/90"
              style={{ transform: `rotate(${i % 2 ? -1 : 1}deg)` }}
            >
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-900/80">Frage</div>
              <div className="text-[13px] leading-snug text-emerald-900/95">{q.text}</div>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {knots.map((k, i) => (
            <button
              key={k.id}
              onClick={() => onJump?.(0)}
              className="w-full rounded-2xl border p-3 text-left handwriting italic shadow-sm transition hover:-translate-y-[2px] hover:shadow-lg ring-1 ring-violet-300/30 bg-white/90"
              style={{ transform: `rotate(${i % 2 ? -1 : 1}deg)` }}
            >
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-violet-900/80">Knoten</div>
              <div className="text-[13px] leading-snug text-violet-900/95">{k.text}</div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
