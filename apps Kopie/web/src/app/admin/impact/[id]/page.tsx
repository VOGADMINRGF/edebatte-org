"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type {
  ConsequenceRecord,
  DecisionTree,
  EventualityNode,
  ResponsibilityPath,
  ResponsibilityRecord,
} from "@features/analyze/schemas";
import {
  ConsequencesPreviewCard,
  ResponsibilityPreviewCard,
} from "@features/statement/components/StatementImpactPreview";

type ImpactSnapshot = {
  contributionId: string;
  locale?: string;
  eventualities: EventualityNode[];
  decisionTrees: DecisionTree[];
  consequences: ConsequenceRecord[];
  responsibilities: ResponsibilityRecord[];
  responsibilityPaths: ResponsibilityPath[];
};

type ApiResponse =
  | { ok: true; impact: ImpactSnapshot }
  | { ok: false; error: string };

export default function ImpactInspectorPage() {
  const params = useParams<{ id: string }>();
  const contributionId = params?.id ?? "";
  const [impact, setImpact] = useState<ImpactSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/impact/by-contribution?id=${encodeURIComponent(contributionId)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as ApiResponse;
        if (!res.ok || !data.ok) {
          throw new Error((data as any)?.error || res.statusText);
        }
        if (!ignore) setImpact(data.impact);
      } catch (err: any) {
        if (!ignore) {
          setImpact(null);
          setError(err?.message ?? "Impact-Daten konnten nicht geladen werden.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (contributionId) {
      load();
    }
    return () => {
      ignore = true;
    };
  }, [contributionId]);

  const hasImpactData = useMemo(() => {
    if (!impact) return false;
    return (
      impact.eventualities.length > 0 ||
      impact.decisionTrees.length > 0 ||
      impact.consequences.length > 0 ||
      impact.responsibilities.length > 0 ||
      impact.responsibilityPaths.length > 0
    );
  }, [impact]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin · Impact Inspector</p>
        <h1 className="text-2xl font-bold text-slate-900">Contribution {contributionId}</h1>
        <p className="text-sm text-slate-600">
          Snapshot der zuletzt gespeicherten Impact-Daten (Eventualitäten, Konsequenzen, Zuständigkeiten).
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Weitere Impact-Ansichten</h2>
          <p className="text-xs text-slate-500">Verlinkt aktuelle Graph-/Report-Seiten.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            href="/admin/graph/impact"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            Graph Impact öffnen →
          </Link>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Topic-/Region-Verlinkung folgt, sobald der Inspector Metadaten wie topicSlug/regionId zuverlässig liefert.
        </p>
      </section>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
          Lädt Impact-Daten …
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && impact && (
        <>
          {!hasImpactData && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm">
              Für diese Contribution liegen derzeit keine persistierten Impact-Daten vor.
            </div>
          )}

          {hasImpactData && (
            <>
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900">Eventualitäten & DecisionTrees</h2>
                  <span className="text-xs text-slate-500">
                    {impact.eventualities.length} Eventualitäten · {impact.decisionTrees.length} DecisionTrees
                  </span>
                </div>
                <EventualityList impact={impact} />
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <ConsequencesPreviewCard
                  consequences={impact.consequences}
                  responsibilities={impact.responsibilities}
                />
                <ResponsibilityPreviewCard
                  responsibilities={impact.responsibilities}
                  paths={impact.responsibilityPaths}
                  showPathOverlay
                  overlayButtonLabel="Zuständigkeitsweg anzeigen"
                />
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

function EventualityList({ impact }: { impact: ImpactSnapshot }) {
  if (!impact.eventualities.length && !impact.decisionTrees.length) {
    return <p className="text-sm text-slate-500">Keine Eventualitäten oder Entscheidungsbäume vorhanden.</p>;
  }

  return (
    <div className="space-y-5">
      {impact.decisionTrees.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">DecisionTrees</h3>
          <div className="space-y-3">
            {impact.decisionTrees.map((tree) => (
              <div key={tree.rootStatementId} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">Statement {tree.rootStatementId}</p>
                <ul className="mt-1 text-xs text-slate-600">
                  {(["pro", "neutral", "contra"] as const).map((option) => {
                    const node = tree.options?.[option];
                    if (!node) return null;
                    return (
                      <li key={`${tree.rootStatementId}-${option}`} className="mt-1">
                        <span className="font-semibold uppercase text-slate-500">{option}</span>: {node.narrative}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {impact.eventualities.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Freistehende Eventualitäten</h3>
          <div className="space-y-2">
            {impact.eventualities.map((evt) => (
              <div key={evt.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statement {evt.statementId} · {evt.stance ?? "neutral"}
                </div>
                <p className="font-semibold text-slate-900">{evt.label}</p>
                <p className="text-slate-600">{evt.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
