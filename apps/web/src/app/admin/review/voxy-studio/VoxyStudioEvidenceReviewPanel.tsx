"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EvidenceSource = {
  sourceId: string;
  title: string;
  publisher: string;
  type: string;
  language: string | null;
  snippet: string | null;
};

type EvidenceClaim = {
  claimId: string;
  text: string;
  kind: string;
  status: string;
};

type EvidenceFinding = {
  findingId: string;
  claimId: string;
  verdict: string;
  producedBy: string;
  citations: Array<{
    sourceId: string;
    quote: string | null;
    locator: string | null;
  }>;
};

type EvidenceQuestion = {
  questionId: string;
  text: string;
  status: string;
};

type EvidenceReviewState = {
  snapshot: {
    dossierId: string;
    fingerprint: string;
    reviewItemId: string;
    sources: EvidenceSource[];
    claims: EvidenceClaim[];
    findings: EvidenceFinding[];
    openQuestions: EvidenceQuestion[];
  };
  approved: boolean;
  reviewRecord: {
    operationalStatus: string;
    latestAction: string | null;
    latestActionByUserId: string | null;
    latestActionAt: string | null;
  } | null;
  persistence: {
    mode: string;
    productionTruth: boolean;
  };
};

type StudioItem = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    dossierId: string | null;
    status: string;
    storyPlan: {
      revision: number;
      outputLanguage: string;
    };
  };
  evidenceReview: EvidenceReviewState | null;
  validation: {
    errors: string[];
    approvalBlockers: string[];
    warnings: string[];
    renderEligible: boolean;
  };
};

type StudioResponse = {
  ok: boolean;
  items: StudioItem[];
};

type EvidenceAction = "mark_in_review" | "request_changes" | "mark_ready";

function shortFingerprint(value: string) {
  return value.length > 24 ? `${value.slice(0, 24)}…` : value;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

export default function VoxyStudioEvidenceReviewPanel() {
  const [items, setItems] = useState<StudioItem[]>([]);
  const [noteByDraft, setNoteByDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as StudioResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_evidence_review_not_loaded");
      }
      setItems(payload.items ?? []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "voxy_studio_evidence_review_not_loaded",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reviewable = useMemo(
    () => items.filter((item) => item.draft.dossierId && item.evidenceReview),
    [items],
  );

  async function reviewEvidence(item: StudioItem, action: EvidenceAction) {
    const state = item.evidenceReview;
    if (!state || busy) return;
    const note = noteByDraft[item.draft.draftId]?.trim() || null;
    if (action === "request_changes" && !note) {
      setError("Für Evidenz-Änderungsbedarf ist ein konkreter Hinweis erforderlich.");
      return;
    }

    setBusy(`${item.draft.draftId}:${action}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(item.draft.draftId)}/evidence-review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            expectedRevision: item.draft.revision,
            expectedFingerprint: state.snapshot.fingerprint,
            note,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_evidence_review_action_failed");
      }
      setNoteByDraft((current) => ({ ...current, [item.draft.draftId]: "" }));
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "voxy_studio_evidence_review_action_failed",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">
            Voxy · Dossier Evidence Review
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Exakten Evidenz-Snapshot prüfen
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Quellen werden nicht allein deshalb freigegeben, weil sie im Dossier vorhanden sind. Die
            Freigabe gilt ausschließlich für den unten gezeigten Fingerprint aus Quellen, Claims,
            Findings und offenen Fragen. Jede relevante Dossier-Änderung erzeugt automatisch einen
            neuen Fingerprint und entwertet die alte Freigabe für den Renderpfad.
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

      {reviewable.length === 0 ? (
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein dossiergebundener Studio-Draft mit prüfbarem Evidenz-Snapshot vorhanden.
        </div>
      ) : null}

      {reviewable.map((item) => {
        const state = item.evidenceReview!;
        const snapshot = state.snapshot;
        const itemBusy = busy?.startsWith(`${item.draft.draftId}:`) ?? false;
        const persistent =
          state.persistence.mode === "persistent_primary" && state.persistence.productionTruth === true;
        const canReady = persistent && snapshot.sources.length > 0 && !state.approved;

        return (
          <article
            key={item.draft.draftId}
            className="space-y-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[rgb(var(--fg))]">{item.draft.title}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  {snapshot.dossierId} · Draft r{item.draft.revision} · Story r
                  {item.draft.storyPlan.revision} · {item.draft.storyPlan.outputLanguage}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  state.approved
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                }`}
              >
                {state.approved ? "exakter Snapshot freigegeben" : "Evidenzfreigabe offen"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <p className="text-xs text-[rgb(var(--muted))]">Quellen</p>
                <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{snapshot.sources.length}</p>
              </div>
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <p className="text-xs text-[rgb(var(--muted))]">Claims</p>
                <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{snapshot.claims.length}</p>
              </div>
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <p className="text-xs text-[rgb(var(--muted))]">Findings</p>
                <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{snapshot.findings.length}</p>
              </div>
              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <p className="text-xs text-[rgb(var(--muted))]">Offene Fragen</p>
                <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{snapshot.openQuestions.length}</p>
              </div>
            </div>

            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-xs text-[rgb(var(--muted))]">
              <p className="font-semibold text-[rgb(var(--fg))]">Revisionsbindung</p>
              <p className="mt-1 break-all">Fingerprint: {snapshot.fingerprint}</p>
              <p className="mt-1 break-all">Review Item: {snapshot.reviewItemId}</p>
              <p className="mt-1">
                Persistenz: {state.persistence.mode} · Review Status:{" "}
                {state.reviewRecord?.operationalStatus ?? "noch nicht eröffnet"}
              </p>
              {state.reviewRecord?.latestActionByUserId ? (
                <p className="mt-1">
                  Letzte Aktion: {state.reviewRecord.latestAction ?? "–"} ·{" "}
                  {state.reviewRecord.latestActionByUserId} · {state.reviewRecord.latestActionAt ?? "–"}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted))]">
                  Quellen im Snapshot
                </p>
                {snapshot.sources.slice(0, 8).map((source) => (
                  <div
                    key={source.sourceId}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3"
                  >
                    <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      {source.publisher} · {humanize(source.type)} · {source.language ?? "Sprache offen"}
                    </p>
                    <p className="mt-1 font-semibold text-[rgb(var(--fg))]">{source.title}</p>
                    {source.snippet ? (
                      <p className="mt-1 line-clamp-3 text-sm leading-5 text-[rgb(var(--muted))]">
                        {source.snippet}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-[rgb(var(--muted))]">
                      ID {source.sourceId}
                    </p>
                  </div>
                ))}
                {snapshot.sources.length > 8 ? (
                  <p className="text-xs text-[rgb(var(--muted))]">
                    + {snapshot.sources.length - 8} weitere Quellen im selben Fingerprint.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted))]">
                  Claims und Findings
                </p>
                {snapshot.claims.slice(0, 6).map((claim) => {
                  const findings = snapshot.findings.filter(
                    (finding) => finding.claimId === claim.claimId,
                  );
                  return (
                    <div
                      key={claim.claimId}
                      className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3"
                    >
                      <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                        {humanize(claim.kind)} · {humanize(claim.status)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{claim.text}</p>
                      {findings.length ? (
                        <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                          Findings: {findings.map((finding) => `${finding.findingId} · ${humanize(finding.verdict)}`).join(" | ")}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          Kein Finding im aktuellen Snapshot.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {item.validation.approvalBlockers.length ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                <p className="font-semibold">Aktuelle Editorial-Blocker</p>
                <p className="mt-1">
                  {item.validation.approvalBlockers.map(humanize).join(" · ")}
                </p>
              </div>
            ) : null}

            <textarea
              value={noteByDraft[item.draft.draftId] ?? ""}
              onChange={(event) =>
                setNoteByDraft((current) => ({
                  ...current,
                  [item.draft.draftId]: event.target.value,
                }))
              }
              rows={3}
              maxLength={3000}
              placeholder="Was wurde geprüft? Bei Änderungsbedarf konkrete Quelle / Claim / Finding benennen."
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={itemBusy}
                onClick={() => void reviewEvidence(item, "mark_in_review")}
                className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] disabled:opacity-40"
              >
                Evidenz in Prüfung
              </button>
              <button
                type="button"
                disabled={itemBusy}
                onClick={() => void reviewEvidence(item, "request_changes")}
                className="rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-40 dark:text-amber-100"
              >
                Evidenzänderung anfordern
              </button>
              <button
                type="button"
                disabled={!canReady || itemBusy}
                onClick={() => void reviewEvidence(item, "mark_ready")}
                title={
                  persistent
                    ? "Exakten aktuellen Evidenz-Snapshot freigeben"
                    : "Freigabe benötigt persistent_primary Review-Wahrheit"
                }
                className="rounded-full border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-emerald-950/30 dark:text-emerald-100"
              >
                Exakten Snapshot freigeben
              </button>
            </div>

            <p className="text-xs leading-5 text-[rgb(var(--muted))]">
              Kurzfingerprint zur Orientierung: <code>{shortFingerprint(snapshot.fingerprint)}</code>.
              Die Aktion startet weder Render noch Upload oder Publishing; sie macht ausschließlich
              diesen Evidenzstand für die nachfolgende redaktionelle Prüfung verwendbar.
            </p>
          </article>
        );
      })}
    </section>
  );
}
