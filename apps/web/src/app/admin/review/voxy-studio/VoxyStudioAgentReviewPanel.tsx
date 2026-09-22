"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DraftItem = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    status: string;
    storyPlan: { storyPlanId: string; revision: number; outputLanguage: string };
  };
  reviewItemId: string;
  decisionGateId: string;
};

type Objection = {
  objectionId: string;
  raisedByRole: string;
  severity: string;
  category: string;
  publicReasonSummary: string;
  evidenceRefs: string[];
  affectedClaimIds: string[];
  affectedSourceIds: string[];
  state: string;
  defenseSummary: string | null;
  defenseEvidenceRefs: string[];
  resolutionSummary: string | null;
};

type CouncilRun = {
  runId: string;
  roleId: string;
  reviewerActorId: string;
  providerId: string;
  modelFamily: string;
  modelId: string;
  instructionVersion: string;
  publicReasonSummary: string;
  checksPerformed: string[];
  evidenceRefs: string[];
  objections: Objection[];
  verdict: string;
};

type CouncilArtifact = {
  artifactId: string;
  inputFingerprint: string;
  policyRevision: number;
  qualityLevel: string;
  completedAt: string;
  binding: {
    studioDraftId: string;
    studioDraftRevision: number;
    storyPlanId: string;
    storyPlanRevision: number;
    evidenceSourcePackId: string;
    evidenceFingerprint: string;
    locale: string;
  };
  criticRuns: CouncilRun[];
  defense: {
    defenseRunId: string;
    providerId: string;
    modelId: string;
    publicReasonSummary: string;
  } | null;
  decision: {
    decisionId: string;
    stage: string;
    outcome: string;
    reasonCodes: string[];
    publicDecisionSummary: string;
    unresolvedObjectionIds: string[];
    criticalRiskFlags: string[];
    reviewRunIds: string[];
    modelFamilies: string[];
    auditComplete: boolean;
  };
};

function label(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-0.5 text-xs text-[rgb(var(--muted))]">
      {children}
    </span>
  );
}

export default function VoxyStudioAgentReviewPanel() {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [artifact, setArtifact] = useState<CouncilArtifact | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((item) => item.draft.draftId === selectedDraftId) ?? null,
    [items, selectedDraftId],
  );

  const loadDrafts = useCallback(async () => {
    const response = await fetch("/api/admin/voxy-studio?limit=100", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "voxy_studio_not_loaded");
    const next = (payload.items ?? []) as DraftItem[];
    setItems(next);
    setSelectedDraftId((current) => {
      if (current && next.some((item) => item.draft.draftId === current)) return current;
      return next.find((item) => item.draft.status === "needs_review")?.draft.draftId ?? next[0]?.draft.draftId ?? "";
    });
  }, []);

  const loadArtifact = useCallback(async (draftId: string) => {
    if (!draftId) {
      setArtifact(null);
      return;
    }
    const response = await fetch(
      `/api/admin/voxy-studio/${encodeURIComponent(draftId)}/agent-review`,
      { cache: "no-store" },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "voxy_agent_review_not_loaded");
    setArtifact((payload.latest ?? null) as CouncilArtifact | null);
  }, []);

  useEffect(() => {
    void loadDrafts().catch((caught) =>
      setError(caught instanceof Error ? caught.message : "voxy_studio_not_loaded"),
    );
  }, [loadDrafts]);

  useEffect(() => {
    setError(null);
    void loadArtifact(selectedDraftId).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "voxy_agent_review_not_loaded"),
    );
  }, [loadArtifact, selectedDraftId]);

  async function runCouncil() {
    if (!selected || selected.draft.status !== "needs_review" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(selected.draft.draftId)}/agent-review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedRevision: selected.draft.revision }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "voxy_agent_review_failed");
      setArtifact((payload.artifact ?? null) as CouncilArtifact | null);
      await loadDrafts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_agent_review_failed");
    } finally {
      setBusy(false);
    }
  }

  const objections = artifact?.criticRuns.flatMap((run) => run.objections) ?? [];

  return (
    <section className="space-y-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
          Agent Council · Audit Console
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--fg))]">Warum wurde freigegeben, blockiert oder eskaliert?</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Diese Ansicht zeigt die überprüfbaren Entscheidungsgrundlagen jedes Agenten: Prüfschritte, Evidenzreferenzen,
          Einwände, Gegenprüfung, Auflösung und finale Reason Codes. Verborgene interne Gedankenschritte werden weder
          gespeichert noch angezeigt.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-100">
          {label(error)}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span className="font-semibold text-[rgb(var(--fg))]">Studio Draft</span>
          <select
            value={selectedDraftId}
            onChange={(event) => setSelectedDraftId(event.target.value)}
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))]"
          >
            {items.map((item) => (
              <option key={item.draft.draftId} value={item.draft.draftId}>
                {item.draft.title} · r{item.draft.revision} · {item.draft.status}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void runCouncil()}
          disabled={!selected || selected.draft.status !== "needs_review" || busy}
          className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Council prüft …" : "Agent Council erneut ausführen"}
        </button>
      </div>

      {artifact ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <div className="text-xs text-[rgb(var(--muted))]">Outcome</div>
              <div className="mt-1 font-semibold text-[rgb(var(--fg))]">{label(artifact.decision.outcome)}</div>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <div className="text-xs text-[rgb(var(--muted))]">Policy</div>
              <div className="mt-1 font-semibold text-[rgb(var(--fg))]">r{artifact.policyRevision} · {artifact.qualityLevel}</div>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <div className="text-xs text-[rgb(var(--muted))]">Review Runs</div>
              <div className="mt-1 font-semibold text-[rgb(var(--fg))]">{artifact.decision.reviewRunIds.length}</div>
            </div>
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
              <div className="text-xs text-[rgb(var(--muted))]">Model families</div>
              <div className="mt-1 font-semibold text-[rgb(var(--fg))]">{artifact.decision.modelFamilies.join(", ") || "–"}</div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm">
            <p className="font-semibold text-[rgb(var(--fg))]">Finale Entscheidung</p>
            <p className="mt-2 leading-6 text-[rgb(var(--muted))]">{artifact.decision.publicDecisionSummary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(artifact.decision.reasonCodes.length ? artifact.decision.reasonCodes : ["clean_pass"]).map((code) => (
                <Badge key={code}>{label(code)}</Badge>
              ))}
            </div>
            {artifact.decision.criticalRiskFlags.length ? (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                Human escalation: {artifact.decision.criticalRiskFlags.map(label).join(", ")}
              </div>
            ) : null}
          </div>

          <details className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm">
            <summary className="cursor-pointer font-semibold text-[rgb(var(--fg))]">Revision & Fingerprints</summary>
            <div className="mt-3 space-y-1 break-all text-xs text-[rgb(var(--muted))]">
              <div>artifact: {artifact.artifactId}</div>
              <div>input: {artifact.inputFingerprint}</div>
              <div>evidence: {artifact.binding.evidenceFingerprint}</div>
              <div>draft: {artifact.binding.studioDraftId} r{artifact.binding.studioDraftRevision}</div>
              <div>story: {artifact.binding.storyPlanId} r{artifact.binding.storyPlanRevision}</div>
              <div>source pack: {artifact.binding.evidenceSourcePackId}</div>
              <div>locale: {artifact.binding.locale}</div>
            </div>
          </details>

          <div>
            <h3 className="text-base font-semibold text-[rgb(var(--fg))]">Einwände & Gegenprüfung</h3>
            {objections.length === 0 ? (
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">Keine materiellen Einwände in dieser Council-Ausführung.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {objections.map((objection) => (
                  <article key={objection.objectionId} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[rgb(var(--fg))]">{label(objection.category)}</strong>
                      <Badge>{objection.severity}</Badge>
                      <Badge>{label(objection.state)}</Badge>
                      <Badge>{label(objection.raisedByRole)}</Badge>
                    </div>
                    <p className="mt-2 leading-6 text-[rgb(var(--fg))]">{objection.publicReasonSummary}</p>
                    {objection.evidenceRefs.length ? (
                      <p className="mt-2 text-xs text-[rgb(var(--muted))]">Evidenz: {objection.evidenceRefs.join(", ")}</p>
                    ) : null}
                    {objection.defenseSummary ? (
                      <div className="mt-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                        <div className="font-semibold text-[rgb(var(--fg))]">Defense</div>
                        <p className="mt-1 text-[rgb(var(--muted))]">{objection.defenseSummary}</p>
                        {objection.defenseEvidenceRefs.length ? (
                          <p className="mt-1 text-xs text-[rgb(var(--muted))]">Defense-Evidenz: {objection.defenseEvidenceRefs.join(", ")}</p>
                        ) : null}
                        {objection.resolutionSummary ? (
                          <p className="mt-1 text-xs text-[rgb(var(--muted))]">Auflösung: {objection.resolutionSummary}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-[rgb(var(--fg))]">Agentenläufe</h3>
            <div className="mt-3 space-y-3">
              {artifact.criticRuns.map((run) => (
                <details key={run.runId} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm">
                  <summary className="cursor-pointer">
                    <span className="font-semibold text-[rgb(var(--fg))]">{label(run.roleId)}</span>
                    <span className="ml-2 text-[rgb(var(--muted))]">· {run.providerId} · {run.modelId} · {run.verdict}</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="leading-6 text-[rgb(var(--muted))]">{run.publicReasonSummary}</p>
                    <div className="flex flex-wrap gap-2">
                      {run.checksPerformed.map((check) => <Badge key={check}>{label(check)}</Badge>)}
                    </div>
                    {run.evidenceRefs.length ? (
                      <p className="text-xs text-[rgb(var(--muted))]">Evidenz: {run.evidenceRefs.join(", ")}</p>
                    ) : null}
                    <p className="text-xs text-[rgb(var(--muted))]">
                      {run.instructionVersion} · actor {run.reviewerActorId}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-[rgb(var(--muted))]">Für diesen Draft liegt noch keine persistierte Council-Akte vor.</p>
      )}
    </section>
  );
}
