"use client";
import * as React from "react";
export type Note = { id: string; text: string; start?: number };

export function LeftSide({
  notes, editorHeight, activeId, onJump,
}: { notes: Note[]; editorHeight: number; activeId?: string | null; onJump?: (offset: number) => void; }) {
  return (
    <aside className="sticky top-20 self-start" style={{ height: editorHeight || "auto" }}>
      <div className="space-y-3">
        {notes.map((n, i) => (
          <button
            key={n.id}
            onClick={() => typeof n.start === "number" && onJump?.(n.start!)}
            className={[
              "w-full text-left rounded-2xl p-3 transition",
              "ring-1 ring-cyan-300/30 bg-white/90 shadow-sm hover:-translate-y-[2px] hover:shadow-lg",
              "handwriting",
              activeId === n.id ? "ring-2 ring-glow-cyan" : "",
            ].join(" ")}
            style={{ transform: `rotate(${i % 2 ? -1.2 : 1.2}deg)` }}
          >
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-900/80">Kontext</div>
            <div className="text-[13px] leading-snug text-cyan-900/95">{n.text}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
