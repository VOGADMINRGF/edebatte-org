import React, { useState } from "react";
import type { ImpactRecord, ResponsibleActor } from "@features/analyze/schemas";

type ImpactSectionProps = {
  impacts: ImpactRecord[];
  onChange: (next: ImpactRecord[]) => void;
};

export function ImpactSection({ impacts, onChange }: ImpactSectionProps) {
  const [drafts, setDrafts] = useState<ImpactRecord[]>(
    impacts.length ? impacts : [{ type: "", description: "", confidence: null }],
  );

  const update = (idx: number, patch: Partial<ImpactRecord>) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addRow = () => setDrafts((prev) => [...prev, { type: "", description: "", confidence: null }]);

  const save = () => {
    const cleaned = drafts
      .map((d, idx) => ({
        type: d.type || `Typ ${idx + 1}`,
        description: d.description.trim(),
        confidence: d.confidence ?? null,
      }))
      .filter((d) => d.description.length > 0);
    onChange(cleaned);
  };

  if (impacts.length > 0) {
    return (
      <ul className="space-y-2 text-sm text-slate-800">
        {impacts.map((impact, idx) => (
          <li key={`${impact.type}-${idx}`} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
              {idx + 1}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{impact.type || "Folge"}</p>
              <p className="text-sm text-slate-800">{impact.description}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Noch kein automatischer Vorschlag. Du kannst mögliche Folgen ergänzen.</p>
      {drafts.map((draft, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <input
            value={draft.type}
            onChange={(e) => update(idx, { type: e.target.value })}
            placeholder="Kategorie (z.B. rechtlich, gesellschaftlich)"
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <textarea
            value={draft.description}
            onChange={(e) => update(idx, { description: e.target.value })}
            placeholder="Mögliche Folge beschreiben…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          weitere Folge
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}

type ResponsibilitySectionProps = {
  actors: ResponsibleActor[];
  onChange: (next: ResponsibleActor[]) => void;
};

export function ResponsibilitySection({ actors, onChange }: ResponsibilitySectionProps) {
  const [drafts, setDrafts] = useState<ResponsibleActor[]>(
    actors.length ? actors : [{ level: "", hint: "", confidence: null }],
  );

  const update = (idx: number, patch: Partial<ResponsibleActor>) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addRow = () => setDrafts((prev) => [...prev, { level: "", hint: "", confidence: null }]);

  const save = () => {
    const cleaned = drafts
      .map((d, idx) => ({
        level: d.level || `Ebene ${idx + 1}`,
        hint: d.hint.trim(),
        confidence: d.confidence ?? null,
      }))
      .filter((d) => d.hint.length > 0);
    onChange(cleaned);
  };

  if (actors.length > 0) {
    return (
      <ul className="space-y-2 text-sm text-slate-800">
        {actors.map((actor, idx) => (
          <li key={`${actor.level}-${idx}`} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700">
              {idx + 1}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{actor.level || "Zuständigkeit"}</p>
              <p className="text-sm text-slate-800">{actor.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Noch kein automatischer Vorschlag. Du kannst mögliche Zuständigkeiten ergänzen.</p>
      {drafts.map((draft, idx) => (
        <div key={idx} className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm space-y-2">
          <input
            value={draft.level}
            onChange={(e) => update(idx, { level: e.target.value })}
            placeholder='Ebene (z.B. "Bund", "Land", "Kommune")'
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
          <textarea
            value={draft.hint}
            onChange={(e) => update(idx, { hint: e.target.value })}
            placeholder="Hinweis oder zuständiger Akteur…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          weitere Zuständigkeit
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
