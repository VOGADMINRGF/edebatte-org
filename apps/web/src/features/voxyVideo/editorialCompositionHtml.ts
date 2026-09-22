import { VOXY_FINAL_CANON } from "./finalCanon";
import {
  VOXY_HOMEPAGE_FILM_LAYOUTS,
  type HomepageFilmLayoutProfile,
} from "./homepageReferenceFilmLayouts";
import { buildVoxyMotionV4Plan } from "./motionV4";
import {
  renderVoxyMotionV4FrameHtml,
  type VoxyMotionV4EmbeddedAssets,
  type VoxyMotionV4ViewportGeometry,
} from "./motionV4Html";
import { buildVoxyAudioMouthFrame } from "./voicedExplainerV1Html";
import type {
  VoxyEditorialMotion,
  VoxyEditorialStoryChapter,
  VoxyEditorialStoryPlan,
  VoxyEditorialTimeline,
} from "./editorialStoryPlan";
import type {
  VoxyLocalCompositionCaptionCue,
} from "./localCompositionRuntime";
import type { VoxyVideoFormat } from "./modernCharacterContracts";

const FORMAT_TO_LAYOUT: Readonly<Record<VoxyVideoFormat, HomepageFilmLayoutProfile>> = {
  "16:9": "landscape_16_9",
  "9:16": "vertical_9_16",
  "1:1": "square_1_1",
};

const MOTION_WINDOWS_MS: Readonly<
  Record<VoxyEditorialMotion, { start: number; end: number }>
> = {
  neutral_idle: { start: 500, end: 1_800 },
  listening: { start: 2_200, end: 3_800 },
  explaining: { start: 4_600, end: 7_600 },
  questioning: { start: 9_000, end: 12_000 },
  highlighting_source: { start: 13_500, end: 17_800 },
  showing_contrast: { start: 5_600, end: 7_900 },
  inviting_participation: { start: 19_000, end: 21_400 },
};

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function currentChapter(input: {
  plan: VoxyEditorialStoryPlan;
  timeline: VoxyEditorialTimeline;
  atMs: number;
}): { chapter: VoxyEditorialStoryChapter; startMs: number; endMs: number } {
  const timelineEntry =
    input.timeline.chapters.find(
      (entry) => input.atMs >= entry.startMs && input.atMs < entry.endMs,
    ) ?? input.timeline.chapters.at(-1);
  if (!timelineEntry) throw new Error("editorial_composition_timeline_empty");
  const chapter = input.plan.chapters.find(
    (entry) => entry.chapterId === timelineEntry.chapterId,
  );
  if (!chapter) {
    throw new Error(`editorial_composition_chapter_missing:${timelineEntry.chapterId}`);
  }
  return {
    chapter,
    startMs: timelineEntry.startMs,
    endMs: timelineEntry.endMs,
  };
}

function currentCaption(
  captions: readonly VoxyLocalCompositionCaptionCue[],
  atMs: number,
): VoxyLocalCompositionCaptionCue | null {
  return (
    captions.find((cue) => atMs >= cue.startMs && atMs < cue.endMs) ??
    captions.at(-1) ??
    null
  );
}

function sourceFrameIndex(input: {
  motion: VoxyEditorialMotion;
  chapterStartMs: number;
  atMs: number;
  fps: number;
}): number {
  const window = MOTION_WINDOWS_MS[input.motion];
  const span = Math.max(1, window.end - window.start);
  const local = Math.max(0, input.atMs - input.chapterStartMs);
  const sourceMs = window.start + (local % span);
  return Math.floor((sourceMs / 1_000) * input.fps);
}

function viewportGeometry(format: VoxyVideoFormat): VoxyMotionV4ViewportGeometry {
  const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[FORMAT_TO_LAYOUT[format]];
  return {
    width: layout.output.width,
    height: layout.output.height,
    scale: layout.stageGeometry.scale,
    translateX: layout.stageGeometry.translateX,
  };
}

function renderSourceWindow(chapter: VoxyEditorialStoryChapter): string {
  if (chapter.evidenceWindow.visible === false) return "";
  const sourceIds = Array.from(
    new Set([...chapter.sourceIds, ...chapter.evidenceWindow.sourceIds]),
  ).filter(Boolean);
  const findingIds = Array.from(
    new Set([...chapter.findingIds, ...chapter.evidenceWindow.findingIds]),
  ).filter(Boolean);
  const questions = chapter.openQuestionIds.filter(Boolean);
  const kind = chapter.evidenceWindow.kind;
  if (kind === "none" && sourceIds.length === 0 && findingIds.length === 0 && questions.length === 0) {
    return `<aside class="editorial-source-window is-empty" data-evidence-window-kind="none"><small>QUELLENFENSTER</small><strong>Kontextkapitel</strong><span>Keine zusätzliche Evidenzkarte in diesem Abschnitt.</span></aside>`;
  }
  return `<aside class="editorial-source-window" data-evidence-window-kind="${escapeHtml(kind)}">
    <small>${kind === "comparison" ? "QUELLENVERGLEICH" : "QUELLENFENSTER"}</small>
    <strong>${escapeHtml(sourceIds.slice(0, 2).join(" · ") || "Revisionsgebundene Evidenz")}</strong>
    <span>${sourceIds.length} Quelle(n) · ${findingIds.length} Finding(s) · ${questions.length} offene Frage(n)</span>
  </aside>`;
}

export function renderVoxyEditorialCompositionFrameHtml(input: {
  plan: VoxyEditorialStoryPlan;
  timeline: VoxyEditorialTimeline;
  captions: readonly VoxyLocalCompositionCaptionCue[];
  assets: VoxyMotionV4EmbeddedAssets;
  format: VoxyVideoFormat;
  frameIndex: number;
  amplitude: number;
}): string {
  const fps = 24;
  const atMs = Math.min(
    input.timeline.durationMs - 1,
    Math.max(0, Math.floor((input.frameIndex * 1_000) / fps)),
  );
  const active = currentChapter({
    plan: input.plan,
    timeline: input.timeline,
    atMs,
  });
  const caption = currentCaption(input.captions, atMs);
  const motionPlan = buildVoxyMotionV4Plan(VOXY_FINAL_CANON.referenceRenderHeadSha);
  const audioMouth = buildVoxyAudioMouthFrame(input.amplitude);
  const sourceFrame = sourceFrameIndex({
    motion: active.chapter.motion,
    chapterStartMs: active.startMs,
    atMs,
    fps,
  });
  const layout = VOXY_HOMEPAGE_FILM_LAYOUTS[FORMAT_TO_LAYOUT[input.format]];
  const baseHtml = renderVoxyMotionV4FrameHtml({
    plan: motionPlan,
    assets: input.assets,
    frameIndex: sourceFrame,
    displayFrameIndex: input.frameIndex,
    format: input.format,
    viewportGeometry: viewportGeometry(input.format),
    mouthProfile: "v4.1",
    mouthOverride: {
      mouthState: audioMouth.mouthState,
      mouthNextState: audioMouth.mouthNextState,
      mouthMix: audioMouth.mouthMix,
    },
    waveformAmplitude: input.amplitude,
    editorialOverride: {
      kicker: active.chapter.role.replaceAll("_", " ").toUpperCase(),
      title: active.chapter.headline,
      brand: "eDebatte",
      caption: caption?.text ?? active.chapter.narration,
    },
  });

  const overlayCss = `
.editorial-cue,.caption-bar,.portrait-title,.portrait-caption{display:none!important}
.editorial-story-overlay{position:absolute;z-index:60;inset:0;pointer-events:none;color:#f7fbff;font-family:Inter,Arial,sans-serif}
.editorial-story-header{position:absolute;left:${layout.regions.brand.x}px;top:${layout.regions.brand.y}px;width:${layout.regions.brand.width}px;min-height:${layout.regions.brand.height}px;padding:16px 18px;border-left:4px solid #46ddd4;border-radius:12px;background:linear-gradient(90deg,rgba(1,8,23,.95),rgba(1,8,23,.72) 78%,transparent)}
.editorial-story-header small{display:block;color:#66e9e1;font-size:${Math.max(12, layout.typography.descriptorPx - 4)}px;font-weight:900;letter-spacing:.11em}.editorial-story-header strong{display:block;margin-top:8px;font-size:${layout.typography.brandPx}px;line-height:1.04;letter-spacing:-.025em}.editorial-story-header span{display:block;margin-top:8px;color:#b8cede;font-size:${Math.max(13, layout.typography.descriptorPx - 2)}px;font-weight:750}
.editorial-source-window{position:absolute;left:${layout.regions.evidence.x}px;top:${layout.regions.evidence.y}px;width:${layout.regions.evidence.width}px;min-height:${layout.regions.evidence.height}px;padding:18px 20px;border:1px solid rgba(91,171,225,.52);border-radius:16px;background:linear-gradient(145deg,rgba(4,20,44,.97),rgba(2,11,27,.985));box-shadow:0 18px 42px rgba(0,0,0,.28)}.editorial-source-window small{display:block;color:#62e4dc;font-size:${Math.max(10, layout.typography.navigationPx - 2)}px;font-weight:900;letter-spacing:.1em}.editorial-source-window strong{display:block;margin-top:10px;font-size:${Math.max(15, layout.typography.statementPx - 5)}px;line-height:1.08}.editorial-source-window span{display:block;margin-top:10px;color:#abc2d4;font-size:${Math.max(11, layout.typography.navigationPx - 1)}px;line-height:1.3}.editorial-source-window.is-empty{opacity:.62}
.editorial-story-caption{position:absolute;left:${layout.regions.caption.x}px;top:${layout.regions.caption.y}px;width:${layout.regions.caption.width}px;min-height:${layout.regions.caption.height}px;display:flex;align-items:center;padding:16px 22px;border-left:4px solid #2e79ff;border-radius:12px;background:rgba(2,9,24,.965);box-shadow:0 16px 44px rgba(0,0,0,.3);font-size:${layout.typography.captionPx}px;font-weight:760;line-height:1.22}
`;
  const overlayHtml = `<div class="editorial-story-overlay" data-editorial-story-plan-id="${escapeHtml(input.plan.storyPlanId)}" data-editorial-story-revision="${input.plan.revision}" data-editorial-chapter-id="${escapeHtml(active.chapter.chapterId)}" data-editorial-motion="${escapeHtml(active.chapter.motion)}" data-final-canon-id="${VOXY_FINAL_CANON.canonId}">
    <section class="editorial-story-header"><small>${escapeHtml(active.chapter.role.replaceAll("_", " ").toUpperCase())}</small><strong>${escapeHtml(active.chapter.headline)}</strong><span>VOXY · eDebatte · ${escapeHtml(input.plan.title)}</span></section>
    ${renderSourceWindow(active.chapter)}
    <section class="editorial-story-caption">${escapeHtml(caption?.text ?? active.chapter.narration)}</section>
  </div>`;

  return baseHtml
    .replace("</style>", `${overlayCss}</style>`)
    .replace("</main></body>", `${overlayHtml}</main></body>`)
    .replace(
      "<main class=\"viewport\"",
      `<main class="viewport" data-editorial-runtime="editorial_v1" data-final-canon-reference-head="${VOXY_FINAL_CANON.referenceRenderHeadSha}" data-final-canon-source-pr="${VOXY_FINAL_CANON.sourcePullRequest}"`,
    );
}