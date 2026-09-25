"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS,
  type VoxyRenderPreviewReviewCheckKey,
} from "@/features/create/voxyRenderPreviewReviewFlowContract";
import type {
  VoxyRenderPreviewReviewDecisionChecklistStatus,
  VoxyRenderPreviewReviewDecisionType,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";

type DraftSummary = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    status: string;
    dossierId: string | null;
    selectedFormat: string;
    storyPlan: {
      storyPlanId: string;
      revision: number;
      outputLanguage: string;
    };
    renderBinding: {
      jobId: string;
      outputId: string;
      outputSha256: string;
      renderedAt: string;
    } | null;
  };
};

type StudioListResponse = {
  ok: boolean;
  items: DraftSummary[];
};

type ChecklistResult = {
  checkKey: VoxyRenderPreviewReviewCheckKey;
  status: VoxyRenderPreviewReviewDecisionChecklistStatus;
  reviewerVisibleReason: string;
  userVisibleReason: string;
};

type PreviewReviewStatus = {
  ok: boolean;
  draftId: string;
  revision: number;
  storyPlanRevision: number;
  previewReviewFlowId: string;
  decisionGateId: string;
  renderDecisionId: string;
  output: {
    outputId: string;
    masterSha256: string;
    previewSha256: string;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    renderProfile: string;
    locale: string;
    publicAsset: false;
    uploaded: false;
    published: false;
  };
  previewUrl: string;
  decision: {
    decisionRecordId: string;
    renderDecisionId: string | null;
    decisionType: VoxyRenderPreviewReviewDecisionType;
    decisionStatus: string;
    persistedAt: string | null;
    persistedBy: string | null;
    reviewerComment: string | null;
    checklistResults: ChecklistResult[];
    nextStep: string;
    userVisibleSummary: string;
  } | null;
  latestRecordMatch: { exact: boolean; reason: string };
  persistence: {
    mode: string;
    productionTruth: boolean;
    restartReconstructable: boolean;
    deploymentReconstructable: boolean;
  };
  reviewWriteAllowed: boolean;
  marksPublishApproved: false;
  uploadAllowed: false;
  publishAllowed: false;
  rerenderTriggered: false;
};

type ChecklistState = Record<
  VoxyRenderPreviewReviewCheckKey,
  VoxyRenderPreviewReviewDecisionChecklistStatus
>;

const REVIEW_DECISIONS: Array<{
  value: VoxyRenderPreviewReviewDecisionType;
  label: string;
}> = [
  { value: "mark_review_ready", label: "Preview review-ready" },
  { value: "request_revision", label: "Revision anfordern" },
  { value: "reject_preview", label: "Preview ablehnen" },
  { value: "keep_as_script_only", label: "Script-only behalten" },
  { value: "comment_only", label: "Nur Kommentar" },
];

const CHECK_LABELS: Record<VoxyRenderPreviewReviewCheckKey, string> = {
  script_accuracy: "Script-Genauigkeit",
  source_caption_accuracy: "Quellen- und Caption-Treue",
  claim_safety: "Claim-Sicherheit",
  language_quality: "Sprachqualität",
  subtitle_readability: "Untertitel-Lesbarkeit",
  rtl_layout: "RTL-Layout / Nicht-Anwendbarkeit geprüft",
  brand_fit: "Brand-Fit",
  voxy_presence: "Voxy-Präsenz",
  audio_voice_fit: "Audio- und Voice-Fit",
  legal_safety: "Rechtliche Sicherheit",
  publication_safety: "Publikationssicherheit",
  accessibility: "Barrierefreiheit",
};

const CHECK_STATUS_OPTIONS: Array<{
  value: VoxyRenderPreviewReviewDecisionChecklistStatus;
  label: string;
}> = [
  { value: "not_checked", label: "Noch nicht geprüft" },
  { value: "needs_review", label: "Weitere Prüfung nötig" },
  { value: "concern", label: "Auffälligkeit" },
  { value: "acceptable_for_review_ready", label: "Für review-ready vertretbar" },
];

function emptyChecklist(): ChecklistState {
  return Object.fromEntries(
    VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.map((key) => [key, "not_checked"]),
  ) as ChecklistState;
}

function checklistFromDecision(results: ChecklistResult[] | undefined): ChecklistState {
  const next = emptyChecklist();
  for (const result of results ?? []) next[result.checkKey] = result.status;
  return next;
}

function durationLabel(durationMs: number | null) {
  if (!Number.isFinite(durationMs)) return "–";
  const totalSeconds = Math.round(Number(durationMs) / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

function shortHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
}

export default function VoxyStudioPreviewReviewPanel() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [statusByDraft, setStatusByDraft] = useState<Record<string, PreviewReviewStatus>>({});
  const [decisionByDraft, setDecisionByDraft] = useState<Record<string, VoxyRenderPreviewReviewDecisionType>>({});
  const [commentByDraft, setCommentByDraft] = useState<Record<string, string>>({});
  const [checklistByDraft, setChecklistByDraft] = useState<Record<string, ChecklistState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const renderedDrafts = useMemo(
    () => drafts.filter((item) => item.draft.status === "rendered" && item.draft.renderBinding),
    [drafts],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as StudioListResponse | null;
      if (!response.ok || !payload?.ok) throw new Error("voxy_studio_preview_review_drafts_not_loaded");
      const rendered = (payload.items ?? []).filter(
        (item) => item.draft.status === "rendered" && item.draft.renderBinding,
      );
      setDrafts(payload.items ?? []);
      const statuses = await Promise.all(
        rendered.map(async (item) => {
          const statusResponse = await fetch(
            `/api/admin/voxy-studio/${encodeURIComponent(item.draft.draftId)}/preview-review`,
            { cache: "no-store" },
          );
          const statusPayload = (await statusResponse.json().catch(() => null)) as PreviewReviewStatus | null;
          if (!statusResponse.ok || !statusPayload?.ok) return null;
          return [item.draft.draftId, statusPayload] as const;
        }),
      );
      const nextStatuses = Object.fromEntries(
        statuses.filter(Boolean) as Array<readonly [string, PreviewReviewStatus]>,
      );
      setStatusByDraft(nextStatuses);
      setDecisionByDraft((current) => {
        const next = { ...current };
        for (const [draftId, status] of Object.entries(nextStatuses)) {
          if (!next[draftId]) next[draftId] = status.decision?.decisionType ?? "mark_review_ready";
        }
        return next;
      });
      setCommentByDraft((current) => {
        const next = { ...current };
        for (const [draftId, status] of Object.entries(nextStatuses)) {
          if (next[draftId] === undefined) next[draftId] = status.decision?.reviewerComment ?? "";
        }
        return next;
      });
      setChecklistByDraft((current) => {
        const next = { ...current };
        for (const [draftId, status] of Object.entries(nextStatuses)) {
          if (!next[draftId]) next[draftId] = checklistFromDecision(status.decision?.checklistResults);
        }
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_preview_review_not_loaded");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitDecision(item: DraftSummary) {
    const draftId = item.draft.draftId;
    const status = statusByDraft[draftId];
    const decisionType = decisionByDraft[draftId] ?? "mark_review_ready";
    const comment = commentByDraft[draftId]?.trim() ?? "";
    const checklist = checklistByDraft[draftId] ?? emptyChecklist();
    if (!status || busy) return;
    if (!comment) {
      setError("Für die Preview-Entscheidung ist ein kurzer menschlicher Review-Kommentar erforderlich.");
      return;
    }
    if (
      decisionType === "mark_review_ready" &&
      VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.some(
        (key) => checklist[key] !== "acceptable_for_review_ready",
      )
    ) {
      setError("Review-ready ist erst möglich, wenn alle 12 Prüfpunkte ausdrücklich als vertretbar markiert sind.");
      return;
    }

    const checklistResults: ChecklistResult[] = VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.map((checkKey) => {
      const label = CHECK_LABELS[checkKey];
      const checkStatus = checklist[checkKey];
      const statusLabel = CHECK_STATUS_OPTIONS.find((option) => option.value === checkStatus)?.label ?? checkStatus;
      return {
        checkKey,
        status: checkStatus,
        reviewerVisibleReason: `${label}: ${statusLabel}. Menschlicher Kommentar: ${comment}`,
        userVisibleReason: `${label}: ${statusLabel}.`,
      };
    });

    setBusy(`${draftId}:decision`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(draftId)}/preview-review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: item.draft.revision,
            decisionType,
            reviewerComment: comment,
            checklistResults,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_preview_review_not_saved");
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_preview_review_not_saved");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
            Voxy · Human Preview Review
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Gerendertes Ergebnis prüfen
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Das private WebM wird direkt aus dem #568-Output gestreamt. Jede Entscheidung wird an Draft-/Story-Revision, Job, Output sowie Preview- und Master-SHA gebunden. „Review-ready“ ist ausdrücklich keine Publish-Freigabe.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
        >
          Status aktualisieren
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {renderedDrafts.length === 0 ? (
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein technisch verifizierter Render ist an einen Studio-Draft gebunden.
        </div>
      ) : null}

      {renderedDrafts.map((item) => {
        const draft = item.draft;
        const status = statusByDraft[draft.draftId];
        const checklist = checklistByDraft[draft.draftId] ?? emptyChecklist();
        const decisionType = decisionByDraft[draft.draftId] ?? "mark_review_ready";
        const decisionBusy = busy === `${draft.draftId}:decision`;
        const persistenceReady = status?.reviewWriteAllowed === true;

        return (
          <article
            key={draft.draftId}
            className="space-y-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[rgb(var(--fg))]">{draft.title}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Draft r{draft.revision} · Story r{draft.storyPlan.revision} · {draft.selectedFormat} · {draft.storyPlan.outputLanguage}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${persistenceReady ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"}`}>
                {persistenceReady ? "persistentes Human Review" : "Review-Schreiben blockiert"}
              </span>
            </div>

            {!status ? (
              <p className="text-sm text-[rgb(var(--muted))]">Preview-Bindung wird geprüft …</p>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,.8fr)]">
                  <div className="space-y-3">
                    <video
                      key={`${draft.draftId}:${status.output.previewSha256}`}
                      controls
                      preload="metadata"
                      src={status.previewUrl}
                      className="aspect-video w-full rounded-xl border border-[rgb(var(--border))] bg-black object-contain"
                    >
                      Ihr Browser kann das private Voxy-Preview nicht wiedergeben.
                    </video>
                    <div className="grid gap-2 text-xs text-[rgb(var(--muted))] sm:grid-cols-2">
                      <span>Profil: {status.output.renderProfile}</span>
                      <span>Locale: {status.output.locale}</span>
                      <span>Format: {status.output.width ?? "?"}×{status.output.height ?? "?"}</span>
                      <span>Dauer: {durationLabel(status.output.durationMs)}</span>
                      <span>Preview SHA: <code>{shortHash(status.output.previewSha256)}</code></span>
                      <span>Master SHA: <code>{shortHash(status.output.masterSha256)}</code></span>
                    </div>
                    <div className="rounded-lg border border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--muted))]">
                      <p className="font-semibold text-[rgb(var(--fg))]">Exakte Entscheidungsbindung</p>
                      <p className="mt-1 break-all">{status.renderDecisionId}</p>
                      <p className="mt-1 break-all">{status.previewReviewFlowId}</p>
                      <p className="mt-1 break-all">{status.decisionGateId}</p>
                    </div>
                    {status.decision ? (
                      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/25 dark:text-emerald-100">
                        <p className="font-semibold">
                          Letzte exakte Entscheidung: {status.decision.decisionType}
                        </p>
                        <p className="mt-1">{status.decision.userVisibleSummary}</p>
                        <p className="mt-1 text-xs">
                          {status.decision.persistedBy ?? "unbekannt"} · {status.decision.persistedAt ?? "ohne Zeitstempel"}
                        </p>
                      </div>
                    ) : status.latestRecordMatch.reason !== "decision_missing" ? (
                      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                        Eine ältere Preview-Entscheidung existiert, ist aber für diesen exakten Output nicht gültig: {status.latestRecordMatch.reason}.
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-2">
                      {VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.map((checkKey) => (
                        <label
                          key={checkKey}
                          className="grid gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-xs text-[rgb(var(--muted))]"
                        >
                          <span className="font-semibold text-[rgb(var(--fg))]">{CHECK_LABELS[checkKey]}</span>
                          <select
                            value={checklist[checkKey]}
                            disabled={!persistenceReady || Boolean(busy)}
                            onChange={(event) =>
                              setChecklistByDraft((current) => ({
                                ...current,
                                [draft.draftId]: {
                                  ...(current[draft.draftId] ?? emptyChecklist()),
                                  [checkKey]: event.target.value as VoxyRenderPreviewReviewDecisionChecklistStatus,
                                },
                              }))
                            }
                            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                          >
                            {CHECK_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>

                    <label className="grid gap-1 text-xs text-[rgb(var(--muted))]">
                      <span>Entscheidung</span>
                      <select
                        value={decisionType}
                        disabled={!persistenceReady || Boolean(busy)}
                        onChange={(event) =>
                          setDecisionByDraft((current) => ({
                            ...current,
                            [draft.draftId]: event.target.value as VoxyRenderPreviewReviewDecisionType,
                          }))
                        }
                        className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                      >
                        {REVIEW_DECISIONS.map((decision) => (
                          <option key={decision.value} value={decision.value}>{decision.label}</option>
                        ))}
                      </select>
                    </label>

                    <textarea
                      value={commentByDraft[draft.draftId] ?? ""}
                      disabled={!persistenceReady || Boolean(busy)}
                      onChange={(event) =>
                        setCommentByDraft((current) => ({
                          ...current,
                          [draft.draftId]: event.target.value,
                        }))
                      }
                      rows={4}
                      maxLength={3000}
                      placeholder="Was wurde im exakten Preview geprüft? Auffälligkeiten konkret benennen."
                      className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                    />

                    <button
                      type="button"
                      disabled={!persistenceReady || Boolean(busy)}
                      onClick={() => void submitDecision(item)}
                      className="rounded-full border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-950/30 dark:text-emerald-100"
                    >
                      {decisionBusy ? "Entscheidung wird gespeichert …" : "Human Preview Review speichern"}
                    </button>
                    <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                      Keine dieser Aktionen startet Re-Render, Upload, Scheduling oder Publishing. Eine spätere Publish-Freigabe benötigt weiterhin ein eigenes Gate.
                    </p>
                  </div>
                </div>
              </>
            )}
          </article>
        );
      })}
    </section>
  );
}
