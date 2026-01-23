import * as React from "react";
import type { EvidenceGraph } from "@features/analyze/schemas";

export default function EvidenceGraphPanel({ graph }: { graph: EvidenceGraph }) {
  const claims = graph.nodes.filter((n) => n.type === "claim");
  const evidence = graph.nodes.filter((n) => n.type === "evidence");

  const edgesByClaim = new Map<string, number>();
  for (const e of graph.edges) edgesByClaim.set(e.from, (edgesByClaim.get(e.from) ?? 0) + 1);

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EvidenceGraph</div>
          <div className="text-sm font-medium text-slate-900">
            Claims {graph.summary.claimCount} / Evidence {graph.summary.evidenceCount}
          </div>
          <div className="text-xs text-slate-600">
            linked {graph.summary.linkedClaimCount} / unlinked {graph.summary.unlinkedClaimCount}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {claims.slice(0, 8).map((c) => {
          const n = edgesByClaim.get(c.id) ?? 0;
          return (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-slate-800">{c.label}</div>
                <span
                  className={
                    "shrink-0 rounded-full border px-2 py-0.5 text-[11px] " +
                    (n > 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-900")
                  }
                >
                  {n > 0 ? `${n} links` : "unlinked"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {evidence.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-slate-700">Top Evidence Nodes</div>
          <ul className="mt-1 space-y-1 text-[11px] text-slate-600">
            {evidence.slice(0, 6).map((ev) => (
              <li key={ev.id}>
                <span className="font-medium text-slate-700">{ev.publisher || ev.sourceClass || "Quelle"}</span>
                {ev.label ? <span> / {ev.label}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
