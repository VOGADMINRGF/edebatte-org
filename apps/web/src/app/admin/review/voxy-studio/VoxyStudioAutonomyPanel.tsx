"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Mode = "human" | "shadow" | "hybrid" | "autonomous";
type Quality = "standard" | "high" | "maximum";

type Policy = {
  policyRevision: number;
  qualityLevel: Quality;
  modes: {
    dossier: Mode;
    editorial: Mode;
    translation: Mode;
    voiceAv: Mode;
    distributionQa: Mode;
  };
  minIndependentReviewRuns: number;
  requiredDistinctModelFamilies: number;
  maxUnresolvedWarningsForAutonomy: number;
  learningMode: "propose_validate_promote";
};

type CouncilRole = {
  id: string;
  alpha2RoleId: string;
  mission: string;
  adversarialQuestion: string;
  mayApprove: boolean;
  requiredAtQuality: Quality[];
};

type AutonomyResponse = {
  ok: boolean;
  configured: boolean;
  record: {
    policy: Policy;
    policyHash: string;
    updatedByUserId: string;
    updatedAt: string;
  };
  persistence: {
    mode: string;
    productionTruth: boolean;
  };
  councilRoles: CouncilRole[];
  criticalRiskFlags: string[];
  hardInvariants: Record<string, boolean>;
  audit: Array<{
    auditId: string;
    previousRevision: number;
    nextRevision: number;
    changedAt: string;
    changedByUserId: string;
    reason: string;
  }>;
};

const MODE_OPTIONS: Array<{ value: Mode; label: string }> = [
  { value: "human", label: "Human" },
  { value: "shadow", label: "Shadow" },
  { value: "hybrid", label: "Hybrid" },
  { value: "autonomous", label: "Autonomous" },
];

const STAGE_LABELS: Record<keyof Policy["modes"], string> = {
  dossier: "Dossier QA",
  editorial: "Editorial QA",
  translation: "Translation QA",
  voiceAv: "Voice / AV QA",
  distributionQa: "Distribution QA",
};

function compact(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

export default function VoxyStudioAutonomyPanel() {
  const [data, setData] = useState<AutonomyResponse | null>(null);
  const [draft, setDraft] = useState<Policy | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio/autonomy", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "voxy_autonomy_not_loaded");
      setData(payload as AutonomyResponse);
      setDraft((payload as AutonomyResponse).record.policy);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_autonomy_not_loaded");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changed = useMemo(() => {
    if (!data || !draft) return false;
    return JSON.stringify(data.record.policy) !== JSON.stringify(draft);
  }, [data, draft]);

  async function save() {
    if (!data || !draft || busy || !changed) return;
    if (reason.trim().length < 3) {
      setError("Bitte dokumentiere, warum die Agent-Policy geändert wird.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio/autonomy", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: data.configured ? data.record.policy.policyRevision : 0,
          reason: reason.trim(),
          qualityLevel: draft.qualityLevel,
          modes: draft.modes,
          minIndependentReviewRuns: draft.minIndependentReviewRuns,
          requiredDistinctModelFamilies: draft.requiredDistinctModelFamilies,
          maxUnresolvedWarningsForAutonomy: draft.maxUnresolvedWarningsForAutonomy,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "voxy_autonomy_update_failed");
      setReason("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_autonomy_update_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
            AI Operations · Adversarial Council
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--fg))]">Autonomie & Qualitätskontrolle</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Die Agenten sollen nicht bestätigen, dass ein Beitrag gut ist, sondern systematisch Gründe suchen,
            warum Claims, Dossier, Redaktion, Übersetzung, Voice oder Distribution gestoppt werden sollten.
            Freigaben sind nur auf exakt derselben Revision gültig. Interne verborgene Gedankenschritte werden
            nicht gespeichert; sichtbar bleiben Prüffrage, Befund, Evidenz, Einwand, Gegenprüfung, Entscheidung
            und Änderungsgrund.
          </p>
        </div>
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
          <div>Policy r{data?.record.policy.policyRevision ?? "–"}</div>
          <div>{data?.persistence.mode ?? "wird geladen"}</div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-100">
          {compact(error)}
        </div>
      ) : null}

      {draft ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[rgb(var(--fg))]">Quality Budget</span>
              <select
                value={draft.qualityLevel}
                onChange={(event) => setDraft({ ...draft, qualityLevel: event.target.value as Quality })}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))]"
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="maximum">Maximum</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[rgb(var(--fg))]">Mindestzahl unabhängiger Reviews</span>
              <input
                type="number"
                min={3}
                max={32}
                value={draft.minIndependentReviewRuns}
                onChange={(event) => setDraft({ ...draft, minIndependentReviewRuns: Number(event.target.value) })}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-semibold text-[rgb(var(--fg))]">Ungelöste Warnungen für Autonomie</span>
              <input
                type="number"
                min={0}
                max={20}
                value={draft.maxUnresolvedWarningsForAutonomy}
                onChange={(event) => setDraft({ ...draft, maxUnresolvedWarningsForAutonomy: Number(event.target.value) })}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-[rgb(var(--fg))]"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {(Object.keys(draft.modes) as Array<keyof Policy["modes"]>).map((stage) => (
              <label key={stage} className="space-y-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
                <span className="font-semibold text-[rgb(var(--fg))]">{STAGE_LABELS[stage]}</span>
                <select
                  value={draft.modes[stage]}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      modes: { ...draft.modes, [stage]: event.target.value as Mode },
                    })
                  }
                  className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-[rgb(var(--fg))]"
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/25 dark:text-emerald-100">
              <p className="font-semibold">Nicht abschaltbare Invarianten</p>
              <ul className="mt-2 space-y-1">
                {Object.entries(data?.hardInvariants ?? {}).filter(([, enabled]) => enabled).map(([key]) => (
                  <li key={key}>• {compact(key)}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
              <p className="font-semibold">Critical → Human Gate</p>
              <ul className="mt-2 space-y-1">
                {(data?.criticalRiskFlags ?? []).map((flag) => <li key={flag}>• {compact(flag)}</li>)}
              </ul>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-[rgb(var(--fg))]">Council-Rollen</h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {(data?.councilRoles ?? []).map((role) => (
                <article key={role.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[rgb(var(--fg))]">{compact(role.id)}</p>
                    <span className="text-xs text-[rgb(var(--muted))]">{role.alpha2RoleId}</span>
                  </div>
                  <p className="mt-2 text-[rgb(var(--muted))]">{role.mission}</p>
                  <p className="mt-2 border-l-2 border-violet-400 pl-3 text-[rgb(var(--fg))]">
                    {role.adversarialQuestion}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <label className="block text-sm font-semibold text-[rgb(var(--fg))]" htmlFor="voxy-autonomy-reason">
              Warum wird die Policy geändert?
            </label>
            <textarea
              id="voxy-autonomy-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Pflichtfeld: fachlicher Grund, beobachteter Fehler oder gewünschte Qualitätsänderung"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
            />
            <button
              type="button"
              disabled={!changed || busy}
              onClick={() => void save()}
              className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Speichert …" : "Neue Policy-Version aktivieren"}
            </button>
          </div>

          {(data?.audit.length ?? 0) > 0 ? (
            <div>
              <h3 className="text-base font-semibold text-[rgb(var(--fg))]">Policy-Änderungen</h3>
              <div className="mt-2 space-y-2">
                {data!.audit.slice(0, 8).map((event) => (
                  <div key={event.auditId} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-sm">
                    <div className="font-semibold text-[rgb(var(--fg))]">r{event.previousRevision} → r{event.nextRevision}</div>
                    <div className="mt-1 text-[rgb(var(--muted))]">{event.reason}</div>
                    <div className="mt-1 text-xs text-[rgb(var(--muted))]">{event.changedAt}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
