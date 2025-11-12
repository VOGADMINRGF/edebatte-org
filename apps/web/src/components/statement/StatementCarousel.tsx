// apps/web/src/components/statement/StatementCarousel.tsx
"use client";
import * as React from "react";

export type StatementPreview = { title: string; subtitle?: string };

export default function StatementCarousel({ items }: { items: StatementPreview[] }) {
  if (!items?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-xl border p-3">
          <div className="text-sm font-semibold">{it.title}</div>
          {it.subtitle ? (
            <div className="mt-1 text-xs text-neutral-600">{it.subtitle}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
