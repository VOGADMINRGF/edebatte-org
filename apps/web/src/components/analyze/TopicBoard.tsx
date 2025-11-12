"use client";
import * as React from "react";

export type Topic = {
  id: string;
  title: string;           // Abschnitt/Label (z. B. "Tierhaltungsstandards")
  question: string;        // abgeleitete Leitfrage
  statements: string[];    // kurze Claims als Vorschau
};

export default function TopicBoard({ topics }: { topics: Topic[] }) {
  if (!topics?.length) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="text-sm font-medium text-neutral-600">Hauptthemen & Fragen</div>
      {topics.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border border-neutral-200 bg-white/60 p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-neutral-900">
              {t.title}
            </div>
            <span className="rounded-full bg-black/5 px-2 py-1 text-xs text-neutral-600">
              Vorschau
            </span>
          </div>

          <div className="mb-3 text-lg font-semibold leading-snug">
            {t.question}
          </div>

          {t.statements?.length > 0 && (
            <ul className="space-y-1">
              {t.statements.slice(0, 3).map((s, i) => (
                <li
                  key={i}
                  className="rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
