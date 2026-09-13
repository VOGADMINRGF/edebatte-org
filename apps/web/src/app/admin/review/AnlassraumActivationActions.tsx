"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  canActivateAnlassraum,
  canApproveAnlassraumActivation,
  canApproveAnlassraumPublication,
  canPublishAnlassraum,
  type AnlassraumActivationRecord,
} from "@/features/create/anlassraumActivationWorkflow";

type AnlassraumActivationAction =
  | "reviewAnlassraumQuestionGuard"
  | "approveAnlassraumActivation"
  | "rejectAnlassraumActivation"
  | "activateApprovedAnlassraum"
  | "approveAnlassraumPublication"
  | "rejectAnlassraumPublication"
  | "publishApprovedAnlassraum";

type Props = {
  record: AnlassraumActivationRecord;
};

async function postAction(input: {
  sourceHandoffId: string;
  action: AnlassraumActivationAction;
  actorExtractionSource?: "human_review";
  evidenceRefs?: string[];
  actorContexts?: AnlassraumActivationRecord["questionGuard"]["actorContexts"];
  noNamedActorsConfirmed?: boolean;
}) {
  const response = await fetch(
    `/api/admin/anlassraum-activation/${encodeURIComponent(input.sourceHandoffId)}`,
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
    throw new Error(body?.error ?? "anlassraum_activation_action_failed");
  }
}

export default function AnlassraumActivationActions({ record }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] =
    useState<AnlassraumActivationAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [questionGuardEvidenceRef, setQuestionGuardEvidenceRef] = useState("");
  const [noNamedActorsConfirmed, setNoNamedActorsConfirmed] = useState(false);

  async function runAction(
    action: AnlassraumActivationAction,
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
          : "anlassraum_activation_action_failed",
      );
    } finally {
      setPendingAction(null);
    }
  }

  const canApproveActivation = canApproveAnlassraumActivation(record);
  const canActivate = canActivateAnlassraum(record);
  const canApprovePublication = canApproveAnlassraumPublication(record);
  const canPublish = canPublishAnlassraum(record);

  return (
    <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
      <p className="text-xs text-[rgb(var(--muted))]">
        Erstellung ist nicht Aktivierung. Aktivierung ist nicht
        Veröffentlichung.
      </p>
      <p className="mt-2 text-xs text-[rgb(var(--muted))]">
        Öffentliche Sichtbarkeit entsteht nur nach expliziter Veröffentlichung.
        Quellen, Community-Hinweise, Dossier- und Graph-Bezüge sind
        Review-Kontext, keine automatische Wahrheit.
      </p>
      <p className="mt-2 text-xs text-[rgb(var(--muted))]">
        Es gibt keinen Auto-Publish, keine Auto-Aktivierung, keinen
        Auto-Graph, keinen Auto-Merge, keinen Auto-Factcheck und kein
        DeepSearch.
      </p>

      {record.questionGuard.releaseState === "review_required" ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <label
            className="block text-xs font-semibold text-amber-950"
            htmlFor={`anlassraum-question-guard-evidence-${record.sourceHandoffId}`}
          >
            Belastbare Review-Evidenz
          </label>
          <input
            id={`anlassraum-question-guard-evidence-${record.sourceHandoffId}`}
            data-testid={`anlassraum-question-guard-evidence-${record.sourceHandoffId}`}
            value={questionGuardEvidenceRef}
            onChange={(event) => setQuestionGuardEvidenceRef(event.target.value)}
            placeholder="z. B. human-review:ticket-123"
            className="mt-2 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-[rgb(var(--fg))]"
          />
          <button
            type="button"
            data-testid={`review-anlassraum-question-guard-${record.sourceHandoffId}`}
            disabled={
              questionGuardEvidenceRef.trim().length === 0 ||
              (record.questionGuard.actorContexts.length === 0 &&
                !noNamedActorsConfirmed) ||
              pendingAction === "reviewAnlassraumQuestionGuard"
            }
            onClick={() =>
              runAction(
                "reviewAnlassraumQuestionGuard",
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
          data-testid={`approve-anlassraum-activation-${record.sourceHandoffId}`}
          disabled={
            !canApproveActivation ||
            pendingAction === "approveAnlassraumActivation"
          }
          onClick={() => runAction("approveAnlassraumActivation")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Aktivierung freigeben
        </button>
        <button
          type="button"
          data-testid={`reject-anlassraum-activation-${record.sourceHandoffId}`}
          disabled={pendingAction === "rejectAnlassraumActivation"}
          onClick={() => runAction("rejectAnlassraumActivation")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Aktivierung ablehnen
        </button>
        <button
          type="button"
          data-testid={`activate-anlassraum-${record.sourceHandoffId}`}
          disabled={!canActivate || pendingAction === "activateApprovedAnlassraum"}
          onClick={() => runAction("activateApprovedAnlassraum")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Intern aktivieren
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid={`approve-anlassraum-publication-${record.sourceHandoffId}`}
          disabled={
            !canApprovePublication ||
            pendingAction === "approveAnlassraumPublication"
          }
          onClick={() => runAction("approveAnlassraumPublication")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Veröffentlichung freigeben
        </button>
        <button
          type="button"
          data-testid={`reject-anlassraum-publication-${record.sourceHandoffId}`}
          disabled={pendingAction === "rejectAnlassraumPublication"}
          onClick={() => runAction("rejectAnlassraumPublication")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Veröffentlichung ablehnen
        </button>
        <button
          type="button"
          data-testid={`publish-anlassraum-${record.sourceHandoffId}`}
          disabled={!canPublish || pendingAction === "publishApprovedAnlassraum"}
          onClick={() => runAction("publishApprovedAnlassraum")}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-60"
        >
          Öffentlich veröffentlichen
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
