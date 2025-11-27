"use client";

import { useMemo, useState } from "react";
import type { ResponsibilityActor, ResponsibilityPath } from "@core/responsibility";

type Props = {
  paths?: ResponsibilityPath[] | null;
  actors?: ResponsibilityActor[] | null;
  statementTitle?: string;
};

type ResolvedStep = {
  label: string;
  subline?: string;
};

export function ResponsibilityNavigator({ paths = [], actors = [], statementTitle }: Props) {
  const [open, setOpen] = useState(false);
  const actorByKey = useMemo(() => {
    const map = new Map<string, ResponsibilityActor>();
    (actors ?? []).forEach((actor) => {
      if (actor.actorKey) map.set(actor.actorKey, actor);
    });
    return map;
  }, [actors]);

  const resolvedPaths: ResolvedStep[][] = useMemo(() => {
    return (paths ?? []).map((path) => {
      return (path.steps ?? []).map((step, idx) => {
        const actor = step.actorKey ? actorByKey.get(step.actorKey) : undefined;
        const actorLabel = actor?.name ?? step.actorName ?? step.actorKey ?? "Unbekannter Akteur";
        const levelLabel = actor?.level ?? step.level;
        const roleLabel = actor?.role ?? step.role;
        const parts = [levelLabel, roleLabel, step.function].filter(Boolean).join(" · ");
        return {
          label: `${idx + 1}. ${actorLabel}`,
          subline: parts || undefined,
        } satisfies ResolvedStep;
      });
    });
  }, [actorByKey, paths]);

  const hasPaths = (paths?.length ?? 0) > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responsibility</p>
          <h2 className="text-lg font-bold text-slate-900">Zuständigkeitsnavigator</h2>
          <p className="text-sm text-slate-600">Visualisiert Responsibility Paths aus der Analyse.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          disabled={!hasPaths}
        >
          Zuständigkeitsnavigator öffnen
        </button>
      </div>
      {!hasPaths && (
        <p className="mt-3 text-sm text-slate-600">Keine Responsibility Paths vorhanden.</p>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Navigator</p>
                <h3 className="text-xl font-bold text-slate-900">{statementTitle || "Statement"}</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                schließen
              </button>
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-4">
              {resolvedPaths.length === 0 ? (
                <p className="text-sm text-slate-600">Keine Pfade vorhanden.</p>
              ) : (
                resolvedPaths.map((steps, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-700">Pfad {idx + 1}</div>
                    </div>
                    <ol className="space-y-2">
                      {steps.map((step, stepIdx) => (
                        <li key={stepIdx} className="rounded-lg bg-white p-3 shadow-sm">
                          <div className="font-semibold text-slate-900">{step.label}</div>
                          {step.subline && (
                            <div className="text-xs text-slate-600">{step.subline}</div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ResponsibilityNavigator;
