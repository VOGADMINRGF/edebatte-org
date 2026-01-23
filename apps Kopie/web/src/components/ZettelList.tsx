"use client";
import * as React from "react";

export type ZettelItem = {
  id: string;
  text: string;
  kind: "kontext" | "frage" | "knoten";
  rotate?: number;
  onJump?: () => void;
};

function kindClass(kind: ZettelItem["kind"]) {
  if (kind === "frage") return "z-green";
  if (kind === "knoten") return "z-violet";
  return "z-blue";
}
function kindLabel(kind: ZettelItem["kind"]) {
  if (kind === "frage") return "Frage";
  if (kind === "knoten") return "Knoten";
  return "Kontext";
}

export function ZettelColumn({
  items = [],
  align = "left",   // "left" | "right"
  width = "w-64",   // z.B. w-64 / w-72 / w-80
  className = "",
}: {
  items?: ZettelItem[];
  align?: "left" | "right";
  width?: string;
  className?: string;
}) {
  return (
    <aside className={`col-sticky ${width} hidden lg:block ${className}`}>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border bg-white/70 p-3 text-[13px] text-neutral-500">
            Noch nichts – starte die Analyse.
          </div>
        )}
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={it.onJump}
            className={`zettel handwriting hover:brightness-[1.03] ${kindClass(it.kind)}`}
            style={{ transform: `rotate(${it.rotate ?? (i % 2 ? -1.3 : 1.3)}deg)` }}
            aria-label={kindLabel(it.kind)}
          >
            {/* inline-Beschriftung (keine Headlines) */}
            <div className="z-inline mb-1">{kindLabel(it.kind)}</div>
            <div className="text-[13px] leading-snug">{it.text}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}

/* Mobile Rails – optional */
export function ZettelRail({ items = [] }: { items?: ZettelItem[] }) {
  if (!items.length) return null;
  return (
    <div className="-mx-4 mb-3 overflow-x-auto lg:hidden">
      <div className="flex gap-3 px-4">
        {items.map((it, i) => (
          <button
            key={it.id}
            className={`min-w-[240px] zettel handwriting ${kindClass(it.kind)}`}
            style={{ transform: `rotate(${i % 2 ? -1.1 : 1.1}deg)` }}
            onClick={it.onJump}
          >
            <div className="z-inline mb-1">{kindLabel(it.kind)}</div>
            <div className="text-[13px] leading-snug">{it.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
