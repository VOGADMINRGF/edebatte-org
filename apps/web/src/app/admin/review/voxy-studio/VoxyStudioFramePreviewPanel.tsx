"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";

type StudioFormat = (typeof VOXY_VIDEO_FORMATS)[number];

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
    };
  };
  evidenceReview: {
    approved: boolean;
  } | null;
};

type StudioListResponse = {
  ok: boolean;
  items: DraftSummary[];
};

type AudioInput = {
  assetId: string;
  locale: string;
  voiceProfileId: string;
  durationMs: number;
  timelineVersion: string;
  storyPlanRevision: number;
  chapterTimings: Array<{ chapterId: string; durationMs: number }>;
  captionCues: Array<{ id: string; startMs: number; endMs: number; text: string }>;
};

type AudioInputsResponse = {
  ok: boolean;
  draftId: string;
  revision: number;
  storyPlanRevision: number;
  usableForProduction: boolean;
  inputs: AudioInput[];
};

const DIMENSIONS: Record<StudioFormat, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

function durationLabel(value: number) {
  const seconds = Math.max(0, Math.round(value / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function isStudioFormat(value: string): value is StudioFormat {
  return (VOXY_VIDEO_FORMATS as readonly string[]).includes(value);
}

export default function VoxyStudioFramePreviewPanel() {
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [audioState, setAudioState] = useState<AudioInputsResponse | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [format, setFormat] = useState<StudioFormat>("16:9");
  const [atMs, setAtMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as StudioListResponse | null;
      if (!response.ok || !payload?.ok) {
        throw new Error("voxy_studio_frame_preview_drafts_not_loaded");
      }
      const items = payload.items ?? [];
      setDrafts(items);
      setSelectedDraftId((current) =>
        current && items.some((item) => item.draft.draftId === current)
          ? current
          : items[0]?.draft.draftId ?? "",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_frame_preview_drafts_not_loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const selectedDraft = useMemo(
    () => drafts.find((item) => item.draft.draftId === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );

  useEffect(() => {
    if (!selectedDraft) {
      setAudioState(null);
      setSelectedAudioId("");
      return;
    }
    const preferredFormat = isStudioFormat(selectedDraft.draft.selectedFormat)
      ? selectedDraft.draft.selectedFormat
      : "16:9";
    setFormat(preferredFormat);
    setAtMs(0);
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/voxy-studio/${encodeURIComponent(selectedDraft.draft.draftId)}/audio-inputs`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as AudioInputsResponse | null;
        if (!response.ok || !payload?.ok) {
          throw new Error("voxy_studio_frame_preview_audio_not_loaded");
        }
        if (cancelled) return;
        setAudioState(payload);
        setSelectedAudioId((current) =>
          current && payload.inputs.some((input) => input.assetId === current)
            ? current
            : payload.inputs[0]?.assetId ?? "",
        );
      } catch (caught) {
        if (cancelled) return;
        setAudioState(null);
        setSelectedAudioId("");
        setError(caught instanceof Error ? caught.message : "voxy_studio_frame_preview_audio_not_loaded");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDraft]);

  const selectedAudio = useMemo(
    () => audioState?.inputs.find((input) => input.assetId === selectedAudioId) ?? null,
    [audioState, selectedAudioId],
  );
  const dimensions = DIMENSIONS[format];
  const previewWidth = format === "9:16" ? 360 : 520;
  const scale = previewWidth / dimensions.width;
  const previewHeight = Math.round(dimensions.height * scale);
  const maxAtMs = Math.max(0, (selectedAudio?.durationMs ?? 1) - 1);
  const evidenceApproved = selectedDraft?.evidenceReview?.approved === true;
  const previewReady = Boolean(
    selectedDraft &&
      selectedAudio &&
      evidenceApproved &&
      audioState?.usableForProduction,
  );
  const previewUrl =
    previewReady && selectedDraft && selectedAudio
      ? `/api/admin/voxy-studio/${encodeURIComponent(selectedDraft.draft.draftId)}/frame-preview?audioAssetId=${encodeURIComponent(selectedAudio.assetId)}&format=${encodeURIComponent(format)}&atMs=${atMs}`
      : null;

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
            Voxy · Same-Renderer Preview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
            Kanonischen Timeline-Frame prüfen
          </h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
            Diese Vorschau erzeugt keinen Render-Job und keine Freigabe. Sie liest dieselbe revisionsgebundene Audio-Timeline, dieselben Caption-Korrekturen und denselben approved Evidence-Snapshot wie der spätere `editorial_v1`-Handoff und rendert denselben Final-Canon-Compositor in 16:9, 9:16 oder 1:1.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDrafts()}
          className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
        >
          Drafts aktualisieren
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[rgb(var(--muted))]">Preview-Drafts werden geladen …</p>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-[rgb(var(--muted))]">Noch kein Voxy-Studio-Draft vorhanden.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
              <span>Draft</span>
              <select
                value={selectedDraftId}
                onChange={(event) => setSelectedDraftId(event.target.value)}
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
              >
                {drafts.map((item) => (
                  <option key={item.draft.draftId} value={item.draft.draftId}>
                    {item.draft.title} · r{item.draft.revision} · {item.draft.status}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
              <span>Revisionsgebundenes Audio</span>
              <select
                value={selectedAudioId}
                disabled={!audioState?.inputs.length}
                onChange={(event) => {
                  setSelectedAudioId(event.target.value);
                  setAtMs(0);
                }}
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))] disabled:opacity-50"
              >
                {audioState?.inputs.length ? (
                  audioState.inputs.map((input) => (
                    <option key={input.assetId} value={input.assetId}>
                      {input.assetId} · {input.voiceProfileId} · {durationLabel(input.durationMs)}
                    </option>
                  ))
                ) : (
                  <option value="">Kein Audio für diese Story-Revision</option>
                )}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-2" aria-label="Preview-Format">
              {VOXY_VIDEO_FORMATS.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setFormat(candidate)}
                  aria-pressed={format === candidate}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    format === candidate
                      ? "border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100"
                      : "border-[rgb(var(--border))] text-[rgb(var(--fg))]"
                  }`}
                >
                  {candidate}
                </button>
              ))}
            </div>

            {selectedAudio ? (
              <label className="space-y-2 text-xs text-[rgb(var(--muted))]">
                <span className="flex justify-between gap-2">
                  <span>Timeline-Position</span>
                  <strong className="text-[rgb(var(--fg))]">
                    {durationLabel(atMs)} / {durationLabel(selectedAudio.durationMs)}
                  </strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={maxAtMs}
                  step={500}
                  value={Math.min(atMs, maxAtMs)}
                  onChange={(event) => setAtMs(Number(event.target.value))}
                  className="w-full"
                />
              </label>
            ) : null}

            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-xs leading-5 text-[rgb(var(--muted))]">
              <p>
                Evidence: {evidenceApproved ? "approved Snapshot gebunden" : "nicht freigegeben · Preview blockiert"}
              </p>
              <p>
                Audio: {audioState?.usableForProduction ? "persistent_primary" : "nicht produktionsfest · Preview blockiert"}
              </p>
              {selectedDraft ? (
                <p>
                  Draft r{selectedDraft.draft.revision} · Story r{selectedDraft.draft.storyPlan.revision} · {selectedDraft.draft.storyPlan.outputLanguage}
                </p>
              ) : null}
              {selectedAudio ? (
                <p>
                  Timeline {selectedAudio.timelineVersion} · {selectedAudio.chapterTimings.length} Kapitel · {selectedAudio.captionCues.length} Caption-Cues
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            {previewUrl ? (
              <div className="mx-auto" style={{ width: previewWidth, maxWidth: "100%" }}>
                <div
                  className="relative overflow-hidden rounded-lg border border-[rgb(var(--border))] bg-black"
                  style={{ width: previewWidth, height: previewHeight, maxWidth: "100%" }}
                >
                  <iframe
                    key={previewUrl}
                    title={`Voxy ${format} Final-Canon-Preview`}
                    src={previewUrl}
                    sandbox=""
                    referrerPolicy="no-referrer"
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      border: 0,
                    }}
                  />
                </div>
                <p className="mt-2 text-center text-xs text-[rgb(var(--muted))]">
                  {format} · {dimensions.width}×{dimensions.height} · statischer 24-fps-Timeline-Frame · keine Freigabe-/Publish-Nebenwirkung
                </p>
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-[rgb(var(--border))] p-6 text-center text-sm leading-6 text-[rgb(var(--muted))]">
                Die echte Frame-Vorschau wird erst geladen, wenn approved Evidence und ein persistentes, exakt an diese Story-Revision gebundenes Audio vorliegen. Text- und Kartenbearbeitung bleibt davon unabhängig möglich.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
