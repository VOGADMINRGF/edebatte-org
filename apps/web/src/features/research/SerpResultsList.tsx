// apps/web/src/features/research/SerpResultsList.tsx
import React from "react";
import SerpResultItem, { type SerpResult } from "./SerpResultItem";

export function SerpResultsList({
  results,
  view = "serp",
}: {
  results: SerpResult[];
  view?: "serp" | "cards";
}) {
  if (!results || results.length === 0) return null;

  if (view === "cards") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {results.map((res, i) => (
          <SerpResultItem key={(res.url || "no-url") + res.title + i} result={res} view="cards" />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {results.map((res, i) => (
        <div key={(res.url || "no-url") + res.title + i} className="px-0">
          <SerpResultItem result={res} view="serp" />
        </div>
      ))}
    </div>
  );
}

export default SerpResultsList;

