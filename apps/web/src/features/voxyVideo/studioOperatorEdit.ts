import type { VoxyVideoFormat } from "./modernCharacterContracts";
import {
  VOXY_EDITORIAL_ALLOWED_MOTIONS,
  type VoxyEditorialMotion,
} from "./editorialStoryPlan";
import type {
  VoxyStudioCaptionAdjustment,
  VoxyStudioDraft,
  VoxyStudioDraftEditablePatch,
  VoxyStudioSafeZoneProfile,
} from "./studioDraft";

export type VoxyStudioOperatorChapterUpdate = {
  chapterId: string;
  headline?: string;
  narration?: string;
  motion?: VoxyEditorialMotion;
  evidenceWindowVisible?: boolean;
  evidenceWindowSourceId?: string;
};

export type VoxyStudioOperatorEditCommand = {
  title?: string;
  selectedFormat?: VoxyVideoFormat;
  safeZoneProfile?: VoxyStudioSafeZoneProfile;
  chapterOrder?: string[];
  chapterUpdates?: VoxyStudioOperatorChapterUpdate[];
  captionAdjustments?: VoxyStudioCaptionAdjustment[];
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

export function buildVoxyStudioOperatorEditablePatch(input: {
  draft: VoxyStudioDraft;
  command: VoxyStudioOperatorEditCommand;
}): VoxyStudioDraftEditablePatch {
  const patch: VoxyStudioDraftEditablePatch = {};
  const command = input.command;
  const nextTitle = command.title === undefined ? undefined : normalized(command.title);
  const chapterUpdates = command.chapterUpdates ?? [];
  const chapterOrder = command.chapterOrder ?? null;
  const storyTouched =
    nextTitle !== undefined || chapterUpdates.length > 0 || chapterOrder !== null;

  if (nextTitle !== undefined) {
    if (!nextTitle) throw new Error("voxy_studio_operator_title_missing");
    patch.title = nextTitle;
  }
  if (command.selectedFormat !== undefined) patch.selectedFormat = command.selectedFormat;
  if (command.safeZoneProfile !== undefined) patch.safeZoneProfile = command.safeZoneProfile;
  if (command.captionAdjustments !== undefined) {
    patch.captionAdjustments = command.captionAdjustments.map((item) => ({ ...item }));
  }

  if (storyTouched) {
    const currentChapters = input.draft.storyPlan.chapters;
    const currentIds = currentChapters.map((chapter) => chapter.chapterId);
    const currentIdSet = new Set(currentIds);
    const updateIds = chapterUpdates.map((update) => normalized(update.chapterId));
    if (!unique(updateIds)) throw new Error("voxy_studio_operator_chapter_update_duplicate");
    for (const chapterId of updateIds) {
      if (!currentIdSet.has(chapterId)) {
        throw new Error(`voxy_studio_operator_chapter_missing:${chapterId}`);
      }
    }

    const updates = new Map(
      chapterUpdates.map((update) => [normalized(update.chapterId), update] as const),
    );
    const updatedChapters = currentChapters.map((chapter) => {
      const update = updates.get(chapter.chapterId);
      if (!update) return chapter;
      const headline =
        update.headline === undefined ? chapter.headline : normalized(update.headline);
      const narration =
        update.narration === undefined ? chapter.narration : normalized(update.narration);
      const motion = update.motion ?? chapter.motion;
      const requestedSourceId =
        update.evidenceWindowSourceId === undefined
          ? undefined
          : normalized(update.evidenceWindowSourceId);
      if (update.evidenceWindowSourceId !== undefined && !requestedSourceId) {
        throw new Error(
          `voxy_studio_operator_evidence_source_missing:${chapter.chapterId}`,
        );
      }
      if (requestedSourceId) {
        if (chapter.evidenceWindow.kind === "none") {
          throw new Error(
            `voxy_studio_operator_evidence_source_window_missing:${chapter.chapterId}`,
          );
        }
        if (chapter.evidenceWindow.kind === "comparison") {
          throw new Error(
            `voxy_studio_operator_comparison_source_edit_forbidden:${chapter.chapterId}`,
          );
        }
        if (!chapter.sourceIds.includes(requestedSourceId)) {
          throw new Error(
            `voxy_studio_operator_evidence_source_not_bound:${chapter.chapterId}:${requestedSourceId}`,
          );
        }
      }
      const evidenceWindow = {
        ...chapter.evidenceWindow,
        ...(update.evidenceWindowVisible === undefined
          ? {}
          : { visible: update.evidenceWindowVisible }),
        ...(requestedSourceId ? { sourceIds: [requestedSourceId] } : {}),
      };
      if (!headline) {
        throw new Error(`voxy_studio_operator_chapter_headline_missing:${chapter.chapterId}`);
      }
      if (!narration) {
        throw new Error(`voxy_studio_operator_chapter_narration_missing:${chapter.chapterId}`);
      }
      if (!VOXY_EDITORIAL_ALLOWED_MOTIONS.includes(motion)) {
        throw new Error(`voxy_studio_operator_chapter_motion_invalid:${chapter.chapterId}`);
      }
      return { ...chapter, headline, narration, motion, evidenceWindow };
    });

    let chapters = updatedChapters;
    if (chapterOrder) {
      const normalizedOrder = chapterOrder.map(normalized);
      if (
        normalizedOrder.length !== currentIds.length ||
        !unique(normalizedOrder) ||
        normalizedOrder.some((chapterId) => !currentIdSet.has(chapterId))
      ) {
        throw new Error("voxy_studio_operator_chapter_order_invalid");
      }
      const byId = new Map(updatedChapters.map((chapter) => [chapter.chapterId, chapter]));
      chapters = normalizedOrder.map((chapterId) => byId.get(chapterId)!);
    }

    patch.storyPlan = {
      ...input.draft.storyPlan,
      revision: input.draft.storyPlan.revision + 1,
      title: nextTitle ?? input.draft.storyPlan.title,
      chapters,
    };
  }

  if (Object.keys(patch).length === 0) {
    throw new Error("voxy_studio_operator_patch_empty");
  }
  return patch;
}
