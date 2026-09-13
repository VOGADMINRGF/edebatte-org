"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  canActivateParticipationSpace,
  canApproveParticipationSpaceActivation,
  canApproveParticipationSpacePublication,
  canPublishParticipationSpace,
  type ParticipationSpacePublishRecord,
} from "@/features/create/participationSpacePublishWorkflow";

type ParticipationSpacePublishAction =
  | "reviewParticipationSpaceQuestionGuard"
  | "approveParticipationSpaceActivation"
  | "rejectParticipationSpaceActivation"
  | "activateApprovedParticipationSpace"
  | "approveParticipationSpacePublication"
  | "rejectParticipationSpacePublication"
  | "publishApprovedParticipationSpace";

type Props = {
  record: ParticipationSpacePublishRecord;
};

async function postAction(input: {
  sourceHandoffId: string;
  action: ParticipationSpacePublishAction;
  actorExtractionSource?: "human_review";
  evidenceRefs?: string[];
  actorContexts?: ParticipationSpacePublishRecord["questionGuard"]["actorContexts"];
  noNamedActorsConfirmed?: boolean;
}) {
  const response = await fetch(
    `/api/admin/participation-space-publish/${encodeURIComponent(input.sourceHandoffId)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: input.action,
        ...(input.actorExtractionSource
          ? { actorExtractionSource: input.actorExtractionSource }
          : {}),
        ...(input.evidenceRefs ? { evidenceRefs: input.evidenceRefs } : {}),
        ...(input.actorContexts ? { actorContexts: input.actorContexts } : {}),
        ...(input.noNamedActorsConfirmed
          ? { noNamedActorsConfirmed: true }
          : {}),
      }),
    },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? "participation_space_publish_action_failed");
  }
}

export default function ParticipationSpacePublishActions({ record }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<ParticipationSpacePublishAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionGuardEvidenceRef, setQuestionGuardEvidenceRef] = useState("");
  const [noNamedActorsConfirmed, setNoNamedActorsConfirmed] = useState(false);

  async function runAction(
    action: ParticipationSpacePublishAction,
    reviewEvidenceRef?: string,
  ) {
    setPendingAction(action);
    setError(null);
    try {
      await postAction({
        sourceHandoffId: record.sourceHandoffId,
        action,
        ...(reviewEvidenceRef
          ? {
              actorExtractionSource: "human_review" as const,
              evidenceRefs: [reviewEvidenceRef],
              actorContexts: record.questionGuard.actorContexts,
              noNamedActorsConfirmed:
                record.questionGuard.actorContexts.length === 0
                  ? noNamedActorsConfirmed
                  : undefined,
            }
          : {}),
      });
      startTransition(() => router.refresh());
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "participation_space_publish_action_failed",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const canApproveActivation = canApproveParticipationSpaceActivation(record);
  const canActivate = canActivateParticipationSpace(record);
  const canApprovePublication = canApproveParticipationSpacePublication(record);
  const canPublish = canPublishParticipationSpace(record);

  return (
    <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <p className="text-xs text-[rgb(var(--muted))]">
        Aktivierung ist ein separater Freigabeschritt. Veröffentlichung ist
        nicht Teil der Erstellung.
      </p>
      <p className="mt-2 text-xs text-[rgb(var(--muted))]">
        Öffentliche Sichtbarkeit entsteht nur nach expliziter Veröffentlichung.
        Quellen, Community-Hinweise, Dossier-, Anlassraum- und Graph-Bezüge
        sind Review-Kontext, keine automatische Wahrheit.
      </p>
      <p className="mt-2 text-xs text-[rgb(var(--muted))]">
        Es gibt keinen Auto-Publish, keine Auto-Aktivierung, keinen Auto-Graph
        und keinen Auto-Merge.
      </p>

      {record.questionGuard.releaseState === "review_required" ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <label
            className="block text-xs font-semibold text-amber-950"
            htmlFor={`participation-space-question-guard-evidence-${record.sourceHandoffId}`}
          >
            Belastbare Review-Evidenz
          </label>
          <input
            id={`participation-space-question-guard-evidence-${record.sourceHandoffId}`}
            data-testid={`participation-space-question-guard-evidence-${record.sourceHandoffId}`}
            value={questionGuardEvidenceRef}
            onChange={(event) => setQuestionGuardEvidenceRef(event.target.value)}
            placeholder="z. B. human-review:ticket-123"
            className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-[rgb(var(--fg))]"
          />
          <button
            type="button"
            data-testid={`review-participation-space-question-guard-${record.sourceHandoffId}`}
            disabled={
              questionGuardEvidenceRef.trim().length === 0 ||
              (record.questionGuard.actorContexts.length === 0 &&
                !noNamedActorsConfirmed) ||
              pendingAction === "reviewParticipationSpaceQuestionGuard"
            }
            onClick={() =>
              runAction(
                "reviewParticipationSpaceQuestionGuard",
                questionGuardEvidenceRef.trim(),
              )
            }
            className="mt-2 rounded-full border border-amber-400 px-4 py-2 text-xs font-semibold text-amber-950 disabled:opacity-60"
          >
            Question Guard mit Evidenz erneut prüfen
          </button>
          {record.questionGuard.actorContexts.length === 0 ? (
            <label className="mt-3 flex items-start gap-2 text-xs text-amber-950">
              <input
                type="checkbox"
                checked={noNamedActorsConfirmed}
                onChange={(event) =>
                  setNoNamedActorsConfirmed(event.target.checked)
                }
              />
              Ich bestätige nach menschlicher Prüfung ausdrücklich, dass die
              Frage keine benannten Personen oder Organisationen enthält.
            </label>
          ) : (
            <p className="mt-3 text-xs text-amber-950">
              {record.questionGuard.actorContexts.length} belegte
              Akteurskontexte werden mit Typ und Rolle erneut persistiert.
            </p>
          )}
          <p className="mt-2 text-xs text-amber-900">
            Die erneute Prüfung ändert nur den Guard-State. Aktivierung und
            Veröffentlichung bleiben separate, explizite Schritte.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`approve-participation-space-activation-${record.sourceHandoffId}`}
          disabled={
            !canApproveActivation ||
            pendingAction === "approveParticipationSpaceActivation"
          }
          onClick={() => runAction("approveParticipationSpaceActivation")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Aktivierung freigeben
        </button>
        <button
          type="button"
          data-testid={`reject-participation-space-activation-${record.sourceHandoffId}`}
          disabled={pendingAction === "rejectParticipationSpaceActivation"}
          onClick={() => runAction("rejectParticipationSpaceActivation")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Aktivierung ablehnen
        </button>
        <button
          type="button"
          data-testid={`activate-participation-space-${record.sourceHandoffId}`}
          disabled={
            !canActivate ||
            pendingAction === "activateApprovedParticipationSpace"
          }
          onClick={() => runAction("activateApprovedParticipationSpace")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Intern aktivieren
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`approve-participation-space-publication-${record.sourceHandoffId}`}
          disabled={
            !canApprovePublication ||
            pendingAction === "approveParticipationSpacePublication"
          }
          onClick={() => runAction("approveParticipationSpacePublication")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Veröffentlichung freigeben
        </button>
        <button
          type="button"
          data-testid={`reject-participation-space-publication-${record.sourceHandoffId}`}
          disabled={pendingAction === "rejectParticipationSpacePublication"}
          onClick={() => runAction("rejectParticipationSpacePublication")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Veröffentlichung ablehnen
        </button>
        <button
          type="button"
          data-testid={`publish-participation-space-${record.sourceHandoffId}`}
          disabled={
            !canPublish || pendingAction === "publishApprovedParticipationSpace"
          }
          onClick={() => runAction("publishApprovedParticipationSpace")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Öffentlich veröffentlichen
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
