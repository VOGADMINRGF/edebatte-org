"use client";

import { useMemo, useState } from "react";
import {
  buildVoxyVisualQaHumanReviewCommand,
  isVoxyVisualQaReviewDecisionGateId,
  type VoxyVisualQaHumanDecision,
} from "@/features/voxyVideo/visualQaHumanReviewCommand";

type SaveResult = {
  decisionRecordId: string | null;
  persistedAt: string | null;
  persistedBy: string | null;
  persistenceMode: string | null;
  decisionType: string | null;
};

const DECISIONS: Array<{
  decision: VoxyVisualQaHumanDecision;
  label: string;
  pendingLabel: string;
}> = [
  { decision: "approved", label: "Visuell freigeben", pendingLabel: "Freigabe wird gespeichert …" },
  { decision: "needs_changes", label: "Änderungen nötig", pendingLabel: "Änderungsbedarf wird gespeichert …" },
  { decision: "rejected", label: "Ablehnen", pendingLabel: "Ablehnung wird gespeichert …" },
];

export default function VoxyVisualQaHumanReviewActions() {
  const [decisionGateId, setDecisionGateId] = useState("");
  const [reviewerComment, setReviewerComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState<VoxyVisualQaHumanDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);

  const gateValid = useMemo(
    () => isVoxyVisualQaReviewDecisionGateId(decisionGateId),
    [decisionGateId],
  );
  const canSubmit = gateValid && reviewerComment.trim().length > 0 && confirmed && !submitting;

  async function submit(decision: VoxyVisualQaHumanDecision) {
    if (!canSubmit) return;
    setSubmitting(decision);
    setError(null);
    setSaved(null);

    try {
      const command = buildVoxyVisualQaHumanReviewCommand({
        decisionGateId,
        decision,
        reviewerComment,
      });
      const response = await fetch("/api/admin/voxy-render-preview-review-decisions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.result?.record) {
        throw new Error(
          payload?.result?.errors?.join(", ") ||
            payload?.error ||
            "visual_qa_review_decision_not_persisted",
        );
      }

      setSaved({
        decisionRecordId: payload.result.record.decisionRecordId ?? null,
        persistedAt: payload.result.record.persistedAt ?? null,
        persistedBy: payload.result.record.persistedBy ?? null,
        persistenceMode: payload.persistence?.mode ?? null,
        decisionType: payload.result.record.decisionType ?? null,
      });
      setConfirmed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "visual_qa_review_decision_failed");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Revisionsgebundener Human-Gate
        </p>
        <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">200-%-Evidence entscheiden</h2>
        <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
          Trage ausschließlich die <strong>Required decision gate ID</strong> aus dem aktuellen
          revisionsgebundenen Voxy-QA-Artefakt ein. Eine alte, erfundene oder anders revisionierte
          Gate-ID kann den Checkpoint nicht freigeben.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[rgb(var(--fg))]">Required decision gate ID</span>
        <textarea
          value={decisionGateId}
          onChange={(event) => setDecisionGateId(event.target.value)}
          rows={3}
          spellCheck={false}
          placeholder="voxy-visual-qa:<commit>:r1:voxy-visual-qa-checkpoint-v4:r1:<evidence>"
          className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 font-mono text-xs text-[rgb(var(--fg))] outline-none focus:border-sky-400"
        />
        {decisionGateId.trim() && !gateValid ? (
          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
            Die Gate-ID entspricht nicht dem revisionsgebundenen V4-Format.
          </span>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[rgb(var(--fg))]">Review-Kommentar</span>
        <textarea
          value={reviewerComment}
          onChange={(event) => setReviewerComment(event.target.value)}
          rows={4}
          maxLength={3000}
          placeholder="Was wurde in 16:9, 9:16 und 1:1 geprüft? Welche Auffälligkeiten gibt es?"
          className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none focus:border-sky-400"
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/25 dark:text-amber-100">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          Ich habe die zu dieser Gate-ID gehörende 200-%-Evidence für <strong>16:9, 9:16 und 1:1</strong>
          tatsächlich gesichtet. Die Entscheidung ist menschlich und darf weder von CI noch von einem Agenten gesetzt werden.
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        {DECISIONS.map((item) => (
          <button
            key={item.decision}
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit(item.decision)}
            className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting === item.decision ? item.pendingLabel : item.label}
          </button>
        ))}
      </div>

      <p className="text-xs leading-5 text-[rgb(var(--muted))]">
        Diese Aktion speichert ausschließlich einen Audit-/Review-Record im bestehenden Voxy-Decision-Store.
        Sie startet keinen Renderjob, keinen Provider, keinen Upload, kein Scheduling und kein Publishing.
      </p>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-100">
          Speichern fehlgeschlagen: {error}
        </div>
      ) : null}

      {saved ? (
        <div className="space-y-1 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="font-semibold">Review-Entscheidung gespeichert.</p>
          <p>Persistence: {saved.persistenceMode ?? "unbekannt"}</p>
          <p>Decision: {saved.decisionType ?? "unbekannt"}</p>
          <p>Record: {saved.decisionRecordId ?? "unbekannt"}</p>
          <p>Reviewer: {saved.persistedBy ?? "unbekannt"}</p>
          <p>Zeitpunkt: {saved.persistedAt ?? "unbekannt"}</p>
        </div>
      ) : null}
    </section>
  );
}
