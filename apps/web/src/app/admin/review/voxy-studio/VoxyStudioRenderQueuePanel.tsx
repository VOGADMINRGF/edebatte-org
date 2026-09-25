"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DraftSummary = {
  draft: {
    draftId: string;
    revision: number;
    title: string;
    status: string;
    selectedFormat: string;
    storyPlan: {
      revision: number;
      outputLanguage: string;
      durationClass: string;
    };
  };
};

type StudioListResponse = {
  ok: boolean;
  items: DraftSummary[];
};

type AudioSummary = {
  assetId: string;
  locale: string;
  voiceProfileId: string;
  sha256: string;
  durationMs: number;
  timelineVersion: string;
  storyPlanRevision: number;
  approvedByUserId: string;
  approvedAt: string;
  chapterCount: number;
  captionCueCount: number;
  absolutePathExposed: false;
  storageKeyExposed: false;
};

type RenderJobSummary = {
  jobId: string;
  outputId: string;
  status: "queued" | "rendering" | "rendered" | "failed" | "review_ready";
  renderProfile: string;
  format: string;
  locale: string;
  scriptVersion: string;
  audioAssetId: string;
  durationMs: number | null;
  attempt: number;
  updatedAt: string;
  completedAt: string | null;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
  previewReviewFlowId: string;
  decisionGateId: string;
  reviewRequired: true;
  output: {
    masterSha256: string;
    previewSha256: string;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    createdAt: string;
    publicAsset: false;
    uploaded: false;
    published: false;
  } | null;
  bindAllowed: boolean;
  storageKeyExposed: false;
  absolutePathExposed: false;
};

type RenderReadiness = {
  ok: boolean;
  draftId: string;
  revision: number;
  status: string;
  scriptVersion: string;
  locale: string;
  renderProfile: "editorial_v1";
  audioInputs: AudioSummary[];
  renderJobs: RenderJobSummary[];
  audioPersistence: { mode: string; productionTruth: boolean };
  runtimePersistence: {
    mode: string;
    productionTruth: boolean;
    restartReconstructable: boolean;
  };
  manualQueueAllowed: boolean;
  renderExecutedByHttp: false;
  autoRender: false;
};

type QueueResult = {
  jobId: string;
  outputId: string;
  status: string;
  renderProfile: string;
  durationMs: number;
  audioAssetId: string;
  previewReviewFlowId: string;
};

function durationLabel(durationMs: number | null | undefined) {
  if (!Number.isFinite(durationMs)) return "–";
  const seconds = Math.round(Number(durationMs) / 1_000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")} min`;
}

function jobStatusLabel(status: RenderJobSummary["status"]) {
  if (status === "queued") return "wartet auf Worker";
  if (status === "rendering") return "wird gerendert";
  if (status === "rendered") return "Output persistiert";
  if (status === "review_ready") return "für Preview Review bereit";
  return "fehlgeschlagen";
}

export default function VoxyStudioRenderQueuePanel() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [readiness, setReadiness] = useState<Record<string, RenderReadiness>>({});
  const [audioSelection, setAudioSelection] = useState<Record<string, string>>({});
  const [queueResults, setQueueResults] = useState<Record<string, QueueResult>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const approvedDrafts = useMemo(
    () => drafts.filter((item) => item.draft.status === "approved_for_render"),
    [drafts],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as StudioListResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_render_queue_drafts_not_loaded");
      }
      setDrafts(payload.items ?? []);
      const approved = (payload.items ?? []).filter(
        (item) => item.draft.status === "approved_for_render",
      );
      const entries = await Promise.all(
        approved.map(async (item) => {
          const statusResponse = await fetch(
            `/api/admin/voxy-studio/${encodeURIComponent(item.draft.draftId)}/render`,
            { cache: "no-store" },
          );
          const statusPayload = (await statusResponse.json().catch(() => null)) as
            | RenderReadiness
            | null;
          if (!statusResponse.ok || !statusPayload?.ok) return null;
          return [item.draft.draftId, statusPayload] as const;
        }),
      );
      const nextReadiness = Object.fromEntries(
        entries.filter(Boolean) as Array<readonly [string, RenderReadiness]>,
      );
      setReadiness(nextReadiness);
      setAudioSelection((current) => {
        const next = { ...current };
        for (const [draftId, status] of Object.entries(nextReadiness)) {
          if (!next[draftId] && status.audioInputs[0]) {
            next[draftId] = status.audioInputs[0].assetId;
          }
        }
        return next;
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_render_queue_not_loaded");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function queueRender(item: DraftSummary) {
    const draft = item.draft;
    const audioAssetId = audioSelection[draft.draftId]?.trim();
    if (!audioAssetId || busy) return;
    setBusy(`${draft.draftId}:queue`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(draft.draftId)}/render`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: draft.revision,
            audioAssetId,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || !payload?.job) {
        throw new Error(payload?.error || "voxy_studio_render_queue_failed");
      }
      setQueueResults((current) => ({
        ...current,
        [draft.draftId]: payload.job as QueueResult,
      }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_render_queue_failed");
    } finally {
      setBusy(null);
    }
  }

  async function bindRender(item: DraftSummary, job: RenderJobSummary) {
    const draft = item.draft;
    if (!job.bindAllowed || busy) return;
    setBusy(`${draft.draftId}:bind:${job.jobId}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(draft.draftId)}/render/bind`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedRevision: draft.revision,
            jobId: job.jobId,
            outputId: job.outputId,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_render_binding_failed");
      }
      setQueueResults((current) => {
        const next = { ...current };
        delete next[draft.draftId];
        return next;
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_render_binding_failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Voxy · Manual Render Queue
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Freigegebenen Entwurf rendern
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Nach der redaktionellen Freigabe kann hier ausschließlich ein revisionsgebundenes,
            bereits registriertes Audio-Asset gewählt werden. Der Klick legt einen persistenten
            #568-Job an; der HTTP-Request rendert nicht selbst. Ein fertiger Worker-Output wird erst
            nach Hash-/Revision-/Gate-Prüfung an den Draft gebunden. Upload und Publishing bleiben aus.
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

      {approvedDrafts.length === 0 ? (
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--muted))]">
          Noch kein Draft wartet auf einen Render. Erst Dossier-/Evidenzprüfung und Editorial Review abschließen; bereits gebundene Outputs erscheinen im Draft selbst als „Gerendert“.
        </div>
      ) : null}

      {approvedDrafts.map((item) => {
        const draft = item.draft;
        const status = readiness[draft.draftId];
        const selectedAssetId = audioSelection[draft.draftId] ?? "";
        const selectedAudio = status?.audioInputs.find(
          (audio) => audio.assetId === selectedAssetId,
        );
        const result = queueResults[draft.draftId];
        const persistent =
          status?.audioPersistence.mode === "persistent_primary" &&
          status?.runtimePersistence.mode === "persistent_primary" &&
          status?.runtimePersistence.restartReconstructable === true;
        const queueBusy = busy === `${draft.draftId}:queue`;

        return (
          <article
            key={draft.draftId}
            className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[rgb(var(--fg))]">{draft.title}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Draft r{draft.revision} · Story r{draft.storyPlan.revision} · {draft.selectedFormat} · {draft.storyPlan.outputLanguage}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${persistent ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"}`}>
                {persistent ? "persistent_primary" : "Render-Queue blockiert"}
              </span>
            </div>

            {!status ? (
              <p className="text-sm text-[rgb(var(--muted))]">Render-Bindung wird geprüft …</p>
            ) : status.audioInputs.length === 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                Für diese exakte Story-Revision ist noch kein freigegebenes Audio-Asset registriert. Kein Locale-Fallback und kein freier Dateipfad werden verwendet.
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
                  <span>Freigegebenes Audio</span>
                  <select
                    value={selectedAssetId}
                    onChange={(event) =>
                      setAudioSelection((current) => ({
                        ...current,
                        [draft.draftId]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                  >
                    {status.audioInputs.map((audio) => (
                      <option key={audio.assetId} value={audio.assetId}>
                        {audio.assetId} · {audio.locale} · {durationLabel(audio.durationMs)} · {audio.timelineVersion}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!status.manualQueueAllowed || !selectedAssetId || Boolean(busy)}
                  onClick={() => void queueRender(item)}
                  className="self-end rounded-full border border-sky-400 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 disabled:opacity-40 dark:bg-sky-950/30 dark:text-sky-100"
                >
                  {queueBusy ? "Job wird angelegt …" : "Render-Job anlegen"}
                </button>
              </div>
            )}

            {selectedAudio ? (
              <div className="grid gap-2 text-xs text-[rgb(var(--muted))] sm:grid-cols-2 lg:grid-cols-4">
                <span>Voice: {selectedAudio.voiceProfileId}</span>
                <span>Dauer: {durationLabel(selectedAudio.durationMs)}</span>
                <span>Kapitel: {selectedAudio.chapterCount}</span>
                <span>Captions: {selectedAudio.captionCueCount}</span>
                <span className="sm:col-span-2 lg:col-span-4">
                  SHA256: <code>{selectedAudio.sha256}</code>
                </span>
              </div>
            ) : null}

            {result ? (
              <div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-500/40 dark:bg-sky-950/25 dark:text-sky-100">
                Job <code>{result.jobId}</code> · {result.status} · {result.renderProfile} · {durationLabel(result.durationMs)}. Der persistente Worker übernimmt die Ausführung.
              </div>
            ) : null}

            {status?.renderJobs.length ? (
              <div className="space-y-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted))]">
                  Persistente #568-Jobs
                </p>
                {status.renderJobs.map((job) => {
                  const bindBusy = busy === `${draft.draftId}:bind:${job.jobId}`;
                  return (
                    <div
                      key={job.jobId}
                      className="grid gap-2 rounded-lg border border-[rgb(var(--border))] p-3 text-xs text-[rgb(var(--muted))] lg:grid-cols-[1fr_auto]"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-[rgb(var(--fg))]">
                          {jobStatusLabel(job.status)} · Versuch {job.attempt}
                        </p>
                        <p>
                          <code>{job.jobId}</code> · {job.renderProfile} · {job.audioAssetId} · {durationLabel(job.durationMs)}
                        </p>
                        {job.output ? (
                          <p>
                            Preview {job.output.width ?? "?"}×{job.output.height ?? "?"} · SHA <code>{job.output.previewSha256.slice(0, 16)}…</code> · privat={String(job.output.publicAsset === false)}
                          </p>
                        ) : null}
                        {job.status === "failed" ? (
                          <p className="text-rose-700 dark:text-rose-300">
                            {job.safeErrorCode ?? "render_failed"}
                            {job.safeErrorMessage ? ` · ${job.safeErrorMessage}` : ""}
                          </p>
                        ) : null}
                        {job.status === "review_ready" ? (
                          <p className="text-emerald-700 dark:text-emerald-300">
                            Render ist technisch verifiziert. Das Binden bestätigt **nicht** den Human Preview Review; dieser bleibt der nächste Gate-Schritt.
                          </p>
                        ) : null}
                      </div>
                      {job.bindAllowed ? (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          onClick={() => void bindRender(item, job)}
                          className="self-center rounded-full border border-emerald-400 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40 dark:bg-emerald-950/30 dark:text-emerald-100"
                        >
                          {bindBusy ? "Bindet …" : "Render an Draft binden"}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
