"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EvidenceSource = {
  sourceId: string;
  url: string;
  title: string;
  publisher: string;
  type: string;
  language: string | null;
};

type StudioItem = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    status: string;
    storyPlan: {
      revision: number;
      chapters: Array<{
        chapterId: string;
        headline: string;
        sourceIds: string[];
        evidenceWindow: {
          kind: "none" | "source" | "comparison" | "data" | "timeline";
          sourceIds: string[];
          visible?: boolean;
        };
      }>;
    };
  };
  evidenceReview: {
    approved: boolean;
    snapshot: {
      fingerprint: string;
      sources: EvidenceSource[];
    };
  } | null;
};

type StudioResponse = {
  ok: boolean;
  items: StudioItem[];
};

function displaySource(source: EvidenceSource | undefined, sourceId: string) {
  if (!source) return sourceId;
  return [source.title || sourceId, source.publisher, source.type]
    .filter(Boolean)
    .join(" · ");
}

export default function VoxyStudioSourceBindingPanel() {
  const [items, setItems] = useState<StudioItem[]>([]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as StudioResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_source_bindings_not_loaded");
      }
      setItems(payload.items ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "voxy_studio_source_bindings_not_loaded",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = useMemo(
    () =>
      items.flatMap((item) => {
        const snapshotSources = item.evidenceReview?.snapshot.sources ?? [];
        const byId = new Map(snapshotSources.map((source) => [source.sourceId, source]));
        return item.draft.storyPlan.chapters.flatMap((chapter) => {
          if (
            chapter.evidenceWindow.kind === "none" ||
            chapter.evidenceWindow.kind === "comparison" ||
            chapter.sourceIds.length === 0
          ) {
            return [];
          }
          const allowedSources = chapter.sourceIds.flatMap((sourceId) => {
            const source = byId.get(sourceId);
            return source ? [source] : [];
          });
          if (allowedSources.length === 0) return [];
          return [{ item, chapter, allowedSources, byId }];
        });
      }),
    [items],
  );

  async function applySource(input: (typeof editable)[number]) {
    const { item, chapter } = input;
    const key = `${item.draft.draftId}:${chapter.chapterId}`;
    const currentSourceId = chapter.evidenceWindow.sourceIds[0] ?? "";
    const nextSourceId = selection[key] ?? currentSourceId;
    if (!nextSourceId || nextSourceId === currentSourceId || busy) return;

    setBusy(key);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(item.draft.draftId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: item.draft.revision,
            chapterUpdates: [
              {
                chapterId: chapter.chapterId,
                evidenceWindowSourceId: nextSourceId,
              },
            ],
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_source_binding_not_saved");
      }
      setSelection((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "voxy_studio_source_binding_not_saved",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Voxy · Quellenkarten
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
          Autoritative Dossier-Quelle für eine Karte wählen
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Hier kann nur zwischen Quellen gewechselt werden, die bereits im jeweiligen Kapitel gebunden sind.
          URL, Titel und Herkunft kommen ausschließlich aus dem aktuellen Dossier-Evidence-Snapshot. Freie URLs,
          neue Quellen oder Vergleichskarten werden in diesem Schritt nicht erzeugt. Jede Änderung erzeugt eine
          neue Story-Revision und entwertet ältere Renderfreigaben.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {editable.length === 0 ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Aktuell gibt es keine Single-Source-Karte mit einer autoritativ gebundenen Dossier-Quelle.
        </p>
      ) : null}

      <div className="space-y-3">
        {editable.map(({ item, chapter, allowedSources, byId }) => {
          const key = `${item.draft.draftId}:${chapter.chapterId}`;
          const currentSourceId = chapter.evidenceWindow.sourceIds[0] ?? "";
          const selectedSourceId = selection[key] ?? currentSourceId;
          const currentSource = byId.get(currentSourceId);
          const canSwitch = allowedSources.length > 1;
          return (
            <article
              key={key}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[rgb(var(--fg))]">{item.draft.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    {chapter.headline} · Draft r{item.draft.revision} · Story r{item.draft.storyPlan.revision}
                  </p>
                </div>
                <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--muted))]">
                  {item.evidenceReview?.approved ? "Evidence freigegeben" : "Evidence Review offen"}
                </span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
                  <span>Gebundene Quellenkarte</span>
                  <select
                    value={selectedSourceId}
                    disabled={!canSwitch || busy === key}
                    onChange={(event) =>
                      setSelection((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] disabled:opacity-60"
                  >
                    {allowedSources.map((source) => (
                      <option key={source.sourceId} value={source.sourceId}>
                        {displaySource(source, source.sourceId)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={
                    !canSwitch ||
                    selectedSourceId === currentSourceId ||
                    busy !== null
                  }
                  onClick={() => void applySource({ item, chapter, allowedSources, byId })}
                  className="self-end rounded-full border border-sky-400 px-4 py-2 text-sm font-semibold text-sky-900 disabled:opacity-40 dark:text-sky-100"
                >
                  {busy === key ? "Speichert …" : "Quellenkarte umstellen"}
                </button>
              </div>

              {currentSource ? (
                <div className="mt-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-xs leading-5 text-[rgb(var(--muted))]">
                  <p className="font-semibold text-[rgb(var(--fg))]">Aktuell: {currentSource.title}</p>
                  <p>{currentSource.publisher || "Herkunft nicht angegeben"} · {currentSource.type} · {currentSource.language ?? "Sprache offen"}</p>
                  {currentSource.url ? (
                    <a
                      href={currentSource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-sky-700 underline underline-offset-2 dark:text-sky-300"
                    >
                      {currentSource.url}
                    </a>
                  ) : (
                    <p>Keine URL im autoritativen Dossier-Snapshot.</p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
