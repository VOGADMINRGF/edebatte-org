"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EvidenceClaim = {
  claimId: string;
  text: string;
  kind: string;
  status: string;
};

type EvidenceQuestion = {
  questionId: string;
  text: string;
  status: string;
};

type StoryChapter = {
  chapterId: string;
  role: string;
  headline: string;
  claimBindings: Array<{
    claimId: string;
    presentation:
      | "confirmed_fact"
      | "attributed_position"
      | "interpretation"
      | "uncertainty"
      | "scenario"
      | "open_question";
  }>;
  openQuestionIds: string[];
};

type StudioItem = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    status: string;
    storyPlan: {
      revision: number;
      chapters: StoryChapter[];
    };
  };
  evidenceReview: {
    approved: boolean;
    snapshot: {
      fingerprint: string;
      claims: EvidenceClaim[];
      openQuestions: EvidenceQuestion[];
    };
  } | null;
};

type StudioResponse = {
  ok: boolean;
  items: StudioItem[];
};

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

export default function VoxyStudioBoundTruthPanel() {
  const [items, setItems] = useState<StudioItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as StudioResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_bound_truth_not_loaded");
      }
      setItems(payload.items ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "voxy_studio_bound_truth_not_loaded",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(
    () =>
      items.map((item) => {
        const claims = new Map(
          (item.evidenceReview?.snapshot.claims ?? []).map((claim) => [claim.claimId, claim]),
        );
        const questions = new Map(
          (item.evidenceReview?.snapshot.openQuestions ?? []).map((question) => [
            question.questionId,
            question,
          ]),
        );
        const chapters = item.draft.storyPlan.chapters
          .map((chapter) => {
            const positions = chapter.claimBindings
              .filter((binding) => binding.presentation === "attributed_position")
              .map((binding) => ({ binding, claim: claims.get(binding.claimId) ?? null }));
            const openQuestions = chapter.openQuestionIds.map((questionId) => ({
              questionId,
              question: questions.get(questionId) ?? null,
            }));
            return positions.length || openQuestions.length
              ? { chapter, positions, openQuestions }
              : null;
          })
          .filter(Boolean) as Array<{
          chapter: StoryChapter;
          positions: Array<{
            binding: StoryChapter["claimBindings"][number];
            claim: EvidenceClaim | null;
          }>;
          openQuestions: Array<{
            questionId: string;
            question: EvidenceQuestion | null;
          }>;
        }>;
        return { item, chapters };
      }),
    [items],
  );

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
            Voxy · Gebundene redaktionelle Wahrheit
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Positionen und offene Fragen konkret prüfen
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Diese Ansicht ist read-only. Sie zeigt nur `attributed_position`-Claims und offene Fragen,
            die bereits an die aktuelle Story-Revision gebunden sind und im exakten Dossier-Evidence-Snapshot
            existieren. Das Studio erzeugt hier weder Gegenpositionen noch neue Fragen oder Claim-Bindungen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
        >
          Bindungen aktualisieren
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <p className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein Studio-Draft vorhanden.
        </p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map(({ item, chapters }) => (
            <article
              key={item.draft.draftId}
              className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[rgb(var(--fg))]">{item.draft.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Draft r{item.draft.revision} · Story r{item.draft.storyPlan.revision} · {item.draft.status}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.evidenceReview?.approved
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  }`}
                >
                  {item.evidenceReview?.approved
                    ? "Evidence-Snapshot freigegeben"
                    : "Evidence Review offen"}
                </span>
              </div>

              {item.evidenceReview ? (
                <p className="break-all text-[11px] text-[rgb(var(--muted))]">
                  Fingerprint {item.evidenceReview.snapshot.fingerprint}
                </p>
              ) : null}

              {chapters.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[rgb(var(--border))] p-3 text-sm text-[rgb(var(--muted))]">
                  In dieser Story-Revision sind keine `attributed_position`-Claims oder offenen Fragen gebunden.
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {chapters.map(({ chapter, positions, openQuestions }) => (
                    <section
                      key={chapter.chapterId}
                      className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3"
                    >
                      <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                        {humanize(chapter.role)}
                      </p>
                      <p className="mt-1 font-semibold text-[rgb(var(--fg))]">{chapter.headline}</p>

                      {positions.length ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">
                            Zugeordnete Positionen
                          </p>
                          {positions.map(({ binding, claim }) => (
                            <div
                              key={binding.claimId}
                              className="rounded-md border border-[rgb(var(--border))] p-2 text-sm"
                            >
                              <p className="text-[rgb(var(--fg))]">
                                {claim?.text ?? "Gebundener Claim fehlt im aktuellen Evidence-Snapshot."}
                              </p>
                              <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
                                {binding.claimId}
                                {claim ? ` · ${humanize(claim.kind)} · ${humanize(claim.status)}` : " · snapshot mismatch"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {openQuestions.length ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">
                            Gebundene offene Fragen
                          </p>
                          {openQuestions.map(({ questionId, question }) => (
                            <div
                              key={questionId}
                              className="rounded-md border border-[rgb(var(--border))] p-2 text-sm"
                            >
                              <p className="text-[rgb(var(--fg))]">
                                {question?.text ?? "Gebundene Frage fehlt im aktuellen Evidence-Snapshot."}
                              </p>
                              <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
                                {questionId}
                                {question ? ` · ${humanize(question.status)}` : " · snapshot mismatch"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
