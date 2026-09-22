"use client";

import { useCallback, useEffect, useState } from "react";

type ProductionContext = {
  source: "dossier_workspace" | "unavailable";
  workspaceId: string | null;
  dossierId: string | null;
  topic: string | null;
  region: string | null;
  date: string | null;
  edition: null;
  editionStatus: "not_canonical";
  readOnly: true;
};

type StudioResponse = {
  ok: boolean;
  items: Array<{
    draft: {
      draftId: string;
      title: string;
      revision: number;
      storyPlan: { revision: number };
    };
    productionContext: ProductionContext;
  }>;
};

function dateLabel(value: string | null) {
  if (!value) return "nicht vorhanden";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function VoxyStudioProductionContextPanel() {
  const [data, setData] = useState<StudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as StudioResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_production_context_not_loaded");
      }
      setData(payload);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "voxy_studio_production_context_not_loaded",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Voxy · Produktionskontext
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
          Thema, Region und Datum aus dem Dossier
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Diese Angaben sind read-only und stammen ausschließlich aus dem bestehenden Dossier-Workspace bzw.
          MasterPost. Das Studio erzeugt daraus keine neue Metadaten-Wahrheit. Ein kanonisches Feld „Ausgabe“
          existiert derzeit nicht und wird deshalb ausdrücklich nicht erfunden.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {!data?.items.length ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein Studio-Draft mit auflösbarem Produktionskontext vorhanden.
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {data.items.map(({ draft, productionContext }) => (
            <article
              key={draft.draftId}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[rgb(var(--fg))]">{draft.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Draft r{draft.revision} · Story r{draft.storyPlan.revision}
                  </p>
                </div>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--muted))]">
                  {productionContext.source === "dossier_workspace"
                    ? "Dossier-Workspace"
                    : "Kontext nicht verfügbar"}
                </span>
              </div>

              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">Thema</dt>
                  <dd className="mt-1 text-[rgb(var(--fg))]">{productionContext.topic ?? "nicht vorhanden"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">Region</dt>
                  <dd className="mt-1 text-[rgb(var(--fg))]">{productionContext.region ?? "nicht vorhanden"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">Datum</dt>
                  <dd className="mt-1 text-[rgb(var(--fg))]">{dateLabel(productionContext.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">Ausgabe</dt>
                  <dd className="mt-1 text-amber-800 dark:text-amber-200">nicht kanonisch definiert</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
