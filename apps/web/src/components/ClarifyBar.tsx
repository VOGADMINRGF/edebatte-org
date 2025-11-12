"use client";
import React from "react";

export type Hint = {
  index: number;
  field: "zustaendigkeit";
  proposal: "EU" | "Bund" | "Land" | "Kommune";
  options: Array<"EU" | "Bund" | "Land" | "Kommune">;
  confidence?: number;
};

export default function ClarifyBar({
  hints,
  onAccept,
}: {
  hints: Hint[];
  onAccept: (h: Hint) => void;
}) {
  if (!hints?.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-black/5 bg-amber-50/80 p-3 backdrop-blur-sm">
      <div className="mb-2 text-sm font-semibold">Noch 1 Klick zur Präzision</div>
      <div className="flex flex-wrap gap-2">
        {hints.map((h, i) => (
          <button
            key={i}
            onClick={() => onAccept(h)}
            className="rounded-full bg-white/90 px-3 py-1 text-sm shadow-sm ring-1 ring-black/5 hover:bg-black/5"
            title={`Konfidenz: ${((h.confidence ?? 0) * 100) | 0}%`}
          >
            Claim #{h.index + 1}: Zuständigkeit → {h.proposal}
          </button>
        ))}
      </div>
    </div>
  );
}
