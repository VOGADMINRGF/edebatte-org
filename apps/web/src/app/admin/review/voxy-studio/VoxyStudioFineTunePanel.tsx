"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  VOXY_EDITORIAL_ALLOWED_MOTIONS,
  type VoxyEditorialMotion,
} from "@/features/voxyVideo/editorialStoryPlan";

type CaptionAdjustment = {
  cueId: string;
  startDeltaMs: number;
  endDeltaMs: number;
  textOverride: string | null;
};

type StudioDraft = {
  draftId: string;
  revision: number;
  title: string;
  status: string;
  captionAdjustments: CaptionAdjustment[];
  storyPlan: {
    revision: number;
    outputLanguage: string;
    chapters: Array<{
      chapterId: string;
      role: string;
      headline: string;
      motion: VoxyEditorialMotion;
    }>;
  };
};

type StudioListResponse = {
  ok: boolean;
  items: Array<{ draft: StudioDraft }>;
};

type CaptionCue = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

type AudioInput = {
  assetId: string;
  voiceProfileId: string;
  sha256: string;
  durationMs: number;
  timelineVersion: string;
  captionCues: CaptionCue[];
  approvalRef: string;
  approvedByUserId: string;
  approvedAt: string;
};

type AudioInputsResponse = {
  ok: boolean;
  usableForProduction: boolean;
  persistence: { mode: string; productionTruth: boolean };
  inputs: AudioInput[];
};

type BoundaryState = Record<number, number>;
type TextOverrideState = Record<string, string>;

const MOTION_LABELS: Record<VoxyEditorialMotion, string> = {
  neutral_idle: "Neutral / ruhig",
  listening: "Zuhörend",
  explaining: "Erklärend",
  questioning: "Fragend",
  highlighting_source: "Quelle hervorheben",
  showing_contrast: "Kontrast zeigen",
  inviting_participation: "Beteiligung einladen",
};

function clampBoundary(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1_500, Math.min(1_500, Math.trunc(value)));
}

function shortHash(value: string) {
  return value.length > 16 ? `${value.slice(0, 16)}…` : value;
}

function initialMotionState(draft: StudioDraft | null) {
  return Object.fromEntries(
    (draft?.storyPlan.chapters ?? []).map((chapter) => [chapter.chapterId, chapter.motion]),
  ) as Record<string, VoxyEditorialMotion>;
}

function captionEditorState(draft: StudioDraft, input: AudioInput) {
  const byCue = new Map(draft.captionAdjustments.map((item) => [item.cueId, item]));
  const boundaries: BoundaryState = {};
  const textOverrides: TextOverrideState = {};
  for (let index = 0; index < input.captionCues.length; index += 1) {
    const cue = input.captionCues[index]!;
    const adjustment = byCue.get(cue.id);
    textOverrides[cue.id] = adjustment?.textOverride ?? "";
    if (index < input.captionCues.length - 1) {
      boundaries[index] = clampBoundary(adjustment?.endDeltaMs ?? 0);
    }
  }
  return { boundaries, textOverrides };
}

export default function VoxyStudioFineTunePanel() {
  const [drafts, setDrafts] = useState<StudioDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const [motionState, setMotionState] = useState<Record<string, VoxyEditorialMotion>>({});
  const [audio, setAudio] = useState<AudioInputsResponse | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState("");
  const [boundaries, setBoundaries] = useState<BoundaryState>({});
  const [textOverrides, setTextOverrides] = useState<TextOverrideState>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.draftId === selectedDraftId) ?? null,
    [drafts, selectedDraftId],
  );
  const selectedAudio = useMemo(
    () => audio?.inputs.find((input) => input.assetId === selectedAudioId) ?? null,
    [audio, selectedAudioId],
  );

  const loadDrafts = useCallback(async () => {
    const response = await fetch("/api/admin/voxy-studio?limit=50", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as StudioListResponse | null;
    if (!response.ok || !payload?.ok) throw new Error("voxy_studio_fine_tune_drafts_not_loaded");
    const nextDrafts = (payload.items ?? []).map((item) => item.draft);
    setDrafts(nextDrafts);
    setSelectedDraftId((current) =>
      current && nextDrafts.some((draft) => draft.draftId === current)
        ? current
        : nextDrafts[0]?.draftId ?? "",
    );
  }, []);

  const loadAudio = useCallback(async (draft: StudioDraft | null) => {
    if (!draft) {
      setAudio(null);
      setSelectedAudioId("");
      return;
    }
    const response = await fetch(
      `/api/admin/voxy-studio/${encodeURIComponent(draft.draftId)}/audio-inputs`,
      { cache: "no-store" },
    );
    const payload = (await response.json().catch(() => null)) as AudioInputsResponse | null;
    if (!response.ok || !payload?.ok) throw new Error("voxy_studio_caption_inputs_not_loaded");
    setAudio(payload);
    setSelectedAudioId((current) =>
      current && payload.inputs.some((input) => input.assetId === current)
        ? current
        : payload.inputs[0]?.assetId ?? "",
    );
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await loadDrafts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_fine_tune_not_loaded");
    }
  }, [loadDrafts]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setMotionState(initialMotionState(selectedDraft));
    void loadAudio(selectedDraft).catch((caught) =>
      setError(caught instanceof Error ? caught.message : "voxy_studio_caption_inputs_not_loaded"),
    );
  }, [selectedDraft, loadAudio]);

  useEffect(() => {
    if (!selectedDraft || !selectedAudio) {
      setBoundaries({});
      setTextOverrides({});
      return;
    }
    const state = captionEditorState(selectedDraft, selectedAudio);
    setBoundaries(state.boundaries);
    setTextOverrides(state.textOverrides);
  }, [selectedDraft, selectedAudio]);

  async function patchDraft(body: Record<string, unknown>, busyKey: string) {
    if (!selectedDraft || busy) return;
    setBusy(busyKey);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(selectedDraft.draftId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expectedRevision: selectedDraft.revision, ...body }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_fine_tune_not_saved");
      }
      await loadDrafts();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_fine_tune_not_saved");
    } finally {
      setBusy(null);
    }
  }

  async function saveMotions() {
    if (!selectedDraft) return;
    const chapterUpdates = selectedDraft.storyPlan.chapters.flatMap((chapter) => {
      const motion = motionState[chapter.chapterId] ?? chapter.motion;
      return motion === chapter.motion ? [] : [{ chapterId: chapter.chapterId, motion }];
    });
    if (chapterUpdates.length === 0) {
      setError("Keine Motion-Änderung vorhanden.");
      return;
    }
    await patchDraft({ chapterUpdates }, "motion");
  }

  async function saveCaptions() {
    if (!selectedDraft || !selectedAudio) return;
    if (!audio?.usableForProduction) {
      setError("Caption-Korrekturen benötigen einen persistenten revisionsgebundenen Audio-Input.");
      return;
    }
    const cues = selectedAudio.captionCues;
    const captionAdjustments: CaptionAdjustment[] = cues.map((cue, index) => ({
      cueId: cue.id,
      startDeltaMs: index === 0 ? 0 : clampBoundary(boundaries[index - 1] ?? 0),
      endDeltaMs:
        index === cues.length - 1 ? 0 : clampBoundary(boundaries[index] ?? 0),
      textOverride: textOverrides[cue.id]?.trim() || null,
    }));
    const current = new Map(selectedDraft.captionAdjustments.map((item) => [item.cueId, item]));
    const changed = captionAdjustments.some((item) => {
      const before = current.get(item.cueId);
      return (
        (before?.startDeltaMs ?? 0) !== item.startDeltaMs ||
        (before?.endDeltaMs ?? 0) !== item.endDeltaMs ||
        (before?.textOverride ?? null) !== item.textOverride
      );
    }) || selectedDraft.captionAdjustments.some((item) => !captionAdjustments.some((next) => next.cueId === item.cueId));
    if (!changed) {
      setError("Keine Caption-Änderung vorhanden.");
      return;
    }
    await patchDraft({ captionAdjustments }, "captions");
  }

  return (
    <section className="mt-5 space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
          Voxy · Begrenzte Feinabstimmung
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[rgb(var(--fg))]">
          Motion und Captions ohne Schnittprogramm
        </h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Motion bleibt auf die kanonischen Zustände beschränkt. Caption-Grenzen dürfen höchstens ±1,5 Sekunden verschoben werden; benachbarte Cues bleiben gekoppelt. Jede Änderung erzeugt eine neue Draft-Revision und entwertet alte Freigaben.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      <label className="grid max-w-2xl gap-1 text-xs text-[rgb(var(--muted))]">
        <span>Studio-Draft</span>
        <select
          value={selectedDraftId}
          onChange={(event) => setSelectedDraftId(event.target.value)}
          className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
        >
          {drafts.map((draft) => (
            <option key={draft.draftId} value={draft.draftId}>
              {draft.title} · r{draft.revision} · {draft.status}
            </option>
          ))}
        </select>
      </label>

      {!selectedDraft ? (
        <p className="text-sm text-[rgb(var(--muted))]">Noch kein Studio-Draft vorhanden.</p>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <div>
              <h3 className="font-semibold text-[rgb(var(--fg))]">Kanonische Motion-Zustände</h3>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Keine freie Pose, keine Anatomie-Manipulation. Fachliche Story-Guards prüfen unzulässige Kombinationen weiterhin serverseitig.
              </p>
            </div>
            {selectedDraft.storyPlan.chapters.map((chapter) => (
              <label key={chapter.chapterId} className="grid gap-1 rounded-lg border border-[rgb(var(--border))] p-3">
                <span className="text-xs font-semibold text-[rgb(var(--fg))]">{chapter.headline}</span>
                <span className="text-[11px] text-[rgb(var(--muted))]">{chapter.role}</span>
                <select
                  value={motionState[chapter.chapterId] ?? chapter.motion}
                  disabled={Boolean(busy)}
                  onChange={(event) =>
                    setMotionState((current) => ({
                      ...current,
                      [chapter.chapterId]: event.target.value as VoxyEditorialMotion,
                    }))
                  }
                  className="mt-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                >
                  {VOXY_EDITORIAL_ALLOWED_MOTIONS.map((motion) => (
                    <option key={motion} value={motion}>{MOTION_LABELS[motion]}</option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void saveMotions()}
              className="rounded-full border border-violet-400 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-950 disabled:opacity-40 dark:bg-violet-950/30 dark:text-violet-100"
            >
              {busy === "motion" ? "Motion wird gespeichert …" : "Motion-Änderungen speichern"}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <div>
              <h3 className="font-semibold text-[rgb(var(--fg))]">Caption-Text und gekoppelte Timing-Grenzen</h3>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Audio fehlt? Dann bleibt nur dieser audioabhängige Teil blockiert; Text- und Motion-Editing funktionieren weiter.
              </p>
            </div>

            {audio?.inputs.length ? (
              <>
                <label className="grid gap-1 text-xs text-[rgb(var(--muted))]">
                  <span>Revisionsgebundener Audio-Input</span>
                  <select
                    value={selectedAudioId}
                    onChange={(event) => setSelectedAudioId(event.target.value)}
                    disabled={Boolean(busy)}
                    className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                  >
                    {audio.inputs.map((input) => (
                      <option key={input.assetId} value={input.assetId}>
                        {input.voiceProfileId} · {Math.round(input.durationMs / 1000)}s · {shortHash(input.sha256)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedAudio ? (
                  <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                    {selectedAudio.captionCues.map((cue, index) => (
                      <div key={cue.id} className="space-y-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-[rgb(var(--muted))]">
                          <code>{cue.id}</code>
                          <span>{cue.startMs}–{cue.endMs} ms</span>
                        </div>
                        <p className="text-sm text-[rgb(var(--fg))]">{cue.text}</p>
                        <input
                          value={textOverrides[cue.id] ?? ""}
                          maxLength={240}
                          disabled={Boolean(busy) || !audio.usableForProduction}
                          onChange={(event) =>
                            setTextOverrides((current) => ({ ...current, [cue.id]: event.target.value }))
                          }
                          placeholder="Optionaler korrigierter Caption-Text"
                          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                        />
                        {index < selectedAudio.captionCues.length - 1 ? (
                          <label className="grid gap-1 text-xs text-[rgb(var(--muted))]">
                            <span>Grenze zur nächsten Caption verschieben (ms)</span>
                            <input
                              type="number"
                              min={-1500}
                              max={1500}
                              step={50}
                              value={boundaries[index] ?? 0}
                              disabled={Boolean(busy) || !audio.usableForProduction}
                              onChange={(event) =>
                                setBoundaries((current) => ({
                                  ...current,
                                  [index]: clampBoundary(Number(event.target.value)),
                                }))
                              }
                              className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                            />
                          </label>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={Boolean(busy) || !audio.usableForProduction || !selectedAudio}
                  onClick={() => void saveCaptions()}
                  className="rounded-full border border-violet-400 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-950 disabled:opacity-40 dark:bg-violet-950/30 dark:text-violet-100"
                >
                  {busy === "captions" ? "Captions werden gespeichert …" : "Caption-Korrekturen speichern"}
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                Für Story r{selectedDraft.storyPlan.revision} ist noch kein passender registrierter Audio-Input vorhanden. Caption-Timing bleibt deshalb fail-closed.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
