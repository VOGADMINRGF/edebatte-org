import "server-only";

import { stableHash } from "@core/utils/hash";
import {
  buildVoxyEditorialTimeline,
  type VoxyEditorialTimeline,
} from "./editorialStoryPlan";
import {
  validateVoxyLocalCompositionRequest,
  type VoxyLocalCompositionApprovalSnapshot,
  type VoxyLocalCompositionCaptionCue,
  type VoxyLocalCompositionRequest,
} from "./localCompositionRuntime";
import {
  assertVoxyLocalCompositionAudioInputRecord,
  resolveVoxyLocalCompositionAudioAssetFromRecord,
  type VoxyLocalCompositionAudioInputRecord,
  type VoxyLocalCompositionAudioInputRepository,
} from "./localCompositionAudioAssetStore";
import type { VoxyLocalCompositionAudioResolver } from "./localCompositionRuntimeService";
import {
  buildVoxyVoiceLocaleReadiness,
  isVoxyVideoOutputLocale,
} from "./voiceLocaleMatrix";
import {
  validateVoxyStudioDraft,
  type VoxyStudioCaptionAdjustment,
  type VoxyStudioDraft,
} from "./studioDraft";

export type VoxyStudioEditorialCompositionHandoff = {
  request: VoxyLocalCompositionRequest;
  approval: VoxyLocalCompositionApprovalSnapshot;
  audioInput: VoxyLocalCompositionAudioInputRecord;
  timeline: VoxyEditorialTimeline;
  captionCues: VoxyLocalCompositionCaptionCue[];
};

function normalized(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function expectedScriptVersion(draft: VoxyStudioDraft): string {
  return `story-r${draft.storyPlan.revision}`;
}

export function buildVoxyStudioPreviewReviewFlowId(
  draft: Pick<VoxyStudioDraft, "draftId" | "revision" | "storyPlan">,
): string {
  return `voxy-preview:${stableHash(
    [draft.draftId, draft.revision, draft.storyPlan.storyPlanId, draft.storyPlan.revision].join(":"),
  ).slice(0, 32)}`;
}

function applyCaptionAdjustments(input: {
  cues: readonly VoxyLocalCompositionCaptionCue[];
  adjustments: readonly VoxyStudioCaptionAdjustment[];
  durationMs: number;
}): VoxyLocalCompositionCaptionCue[] {
  const adjustments = new Map(
    input.adjustments.map((adjustment) => [adjustment.cueId, adjustment]),
  );
  const knownCueIds = new Set(input.cues.map((cue) => cue.id));
  for (const adjustment of input.adjustments) {
    if (!knownCueIds.has(adjustment.cueId)) {
      throw new Error(`voxy_studio_caption_adjustment_cue_missing:${adjustment.cueId}`);
    }
  }

  const cues = input.cues.map((cue) => {
    const adjustment = adjustments.get(cue.id);
    if (!adjustment) return { ...cue };
    return {
      ...cue,
      startMs: cue.startMs + adjustment.startDeltaMs,
      endMs: cue.endMs + adjustment.endDeltaMs,
      text: adjustment.textOverride?.trim() || cue.text,
    };
  });

  let cursor = 0;
  for (const cue of cues) {
    if (
      !Number.isInteger(cue.startMs) ||
      !Number.isInteger(cue.endMs) ||
      cue.startMs !== cursor ||
      cue.endMs <= cue.startMs ||
      !normalized(cue.text)
    ) {
      throw new Error(`voxy_studio_caption_adjustment_breaks_timeline:${cue.id}`);
    }
    cursor = cue.endMs;
  }
  if (cursor !== input.durationMs) {
    throw new Error("voxy_studio_caption_adjustment_breaks_duration");
  }
  return cues;
}

function assertAudioBinding(input: {
  draft: VoxyStudioDraft;
  audioInput: VoxyLocalCompositionAudioInputRecord;
}) {
  const { draft, audioInput } = input;
  assertVoxyLocalCompositionAudioInputRecord(audioInput);
  if (audioInput.artifactId !== draft.draftId) {
    throw new Error("voxy_studio_audio_artifact_binding_mismatch");
  }
  if (audioInput.briefingId !== draft.briefingId) {
    throw new Error("voxy_studio_audio_briefing_binding_mismatch");
  }
  if (audioInput.scriptVersion !== expectedScriptVersion(draft)) {
    throw new Error("voxy_studio_audio_script_revision_mismatch");
  }
  if (
    audioInput.storyPlanId !== draft.storyPlan.storyPlanId ||
    audioInput.storyPlanRevision !== draft.storyPlan.revision
  ) {
    throw new Error("voxy_studio_audio_story_revision_mismatch");
  }
  if (audioInput.locale.toLowerCase() !== draft.storyPlan.outputLanguage.toLowerCase()) {
    throw new Error("voxy_studio_audio_locale_binding_mismatch");
  }
  if (!isVoxyVideoOutputLocale(audioInput.locale.toLowerCase())) {
    throw new Error("voxy_studio_audio_locale_unsupported");
  }
  const readiness = buildVoxyVoiceLocaleReadiness({
    locale: audioInput.locale,
    voiceProfileId: audioInput.voiceProfileId,
    voiceUsageApproved: audioInput.voiceUsageApproved,
  });
  if (!readiness.renderAllowed || readiness.fallbackLocale !== null) {
    throw new Error("voxy_studio_audio_voice_not_render_eligible");
  }

  const expectedChapterIds = input.draft.storyPlan.chapters.map((chapter) => chapter.chapterId);
  const actualChapterIds = input.audioInput.chapterTimings.map((entry) => entry.chapterId);
  if (
    expectedChapterIds.length !== actualChapterIds.length ||
    expectedChapterIds.some((chapterId, index) => chapterId !== actualChapterIds[index])
  ) {
    throw new Error("voxy_studio_audio_chapter_binding_mismatch");
  }
}

export function buildVoxyStudioEditorialCompositionHandoff(input: {
  draft: VoxyStudioDraft;
  audioInput: VoxyLocalCompositionAudioInputRecord;
  requestedByUserId: string;
}): VoxyStudioEditorialCompositionHandoff {
  const draftErrors = validateVoxyStudioDraft(input.draft);
  if (draftErrors.length) {
    throw new Error(`voxy_studio_render_handoff_draft_invalid:${draftErrors.join(",")}`);
  }
  if (input.draft.status !== "approved_for_render" || !input.draft.renderApproval) {
    throw new Error(`voxy_studio_render_handoff_not_allowed:${input.draft.status}`);
  }
  if (input.draft.renderBinding) {
    throw new Error("voxy_studio_render_handoff_already_bound");
  }
  const requestedByUserId = normalized(input.requestedByUserId);
  if (!requestedByUserId) {
    throw new Error("voxy_studio_render_handoff_operator_missing");
  }

  assertAudioBinding({ draft: input.draft, audioInput: input.audioInput });
  const chapterDurationsMs = Object.fromEntries(
    input.audioInput.chapterTimings.map((entry) => [entry.chapterId, entry.durationMs]),
  );
  const timeline = buildVoxyEditorialTimeline({
    plan: input.draft.storyPlan,
    chapterDurationsMs,
  });
  if (timeline.durationMs !== input.audioInput.durationMs) {
    throw new Error("voxy_studio_audio_timeline_duration_mismatch");
  }
  const captionCues = applyCaptionAdjustments({
    cues: input.audioInput.captionCues,
    adjustments: input.draft.captionAdjustments,
    durationMs: timeline.durationMs,
  });

  const request: VoxyLocalCompositionRequest = {
    requestedByUserId,
    artifactId: input.draft.draftId,
    briefingId: input.draft.briefingId,
    scriptVersion: expectedScriptVersion(input.draft),
    locale: input.draft.storyPlan.outputLanguage,
    format: input.draft.selectedFormat,
    renderProfile: "editorial_v1",
    timelineVersion: input.audioInput.timelineVersion,
    audioAssetId: input.audioInput.assetId,
    sceneContent: [],
    captionCues,
    editorialStoryPlan: input.draft.storyPlan,
    editorialTimeline: timeline,
  };
  const requestErrors = validateVoxyLocalCompositionRequest(request);
  if (requestErrors.length) {
    throw new Error(`voxy_studio_render_handoff_request_invalid:${requestErrors.join(",")}`);
  }

  const approval: VoxyLocalCompositionApprovalSnapshot = {
    approved: true,
    approvalRef: input.draft.renderApproval.reviewDecisionRecordId,
    approvedBy: input.draft.renderApproval.approvedByUserId,
    approvedAt: input.draft.renderApproval.approvedAt,
    previewReviewFlowId: buildVoxyStudioPreviewReviewFlowId(input.draft),
    decisionGateId: input.draft.renderApproval.decisionGateId,
    dossierRefId: input.draft.dossierId,
    authority: "trusted_review_authority",
  };

  return {
    request,
    approval,
    audioInput: input.audioInput,
    timeline,
    captionCues,
  };
}

export function createVoxyRegisteredCompositionAudioResolver(input: {
  repository: VoxyLocalCompositionAudioInputRepository;
  trustedAudioRoot: string;
  requirePersistentPrimary?: boolean;
}): VoxyLocalCompositionAudioResolver {
  const trustedAudioRoot = normalized(input.trustedAudioRoot);
  if (!trustedAudioRoot) throw new Error("voxy_local_composition_trusted_audio_root_missing");
  return {
    async resolveAudioAsset(audioAssetId) {
      const persistence = input.repository.getPersistenceState();
      if (
        input.requirePersistentPrimary !== false &&
        (persistence.mode !== "persistent_primary" || persistence.productionTruth !== true)
      ) {
        throw new Error("voxy_local_composition_audio_registry_not_persistent");
      }
      const record = await input.repository.getByAssetId(audioAssetId);
      if (!record) throw new Error("voxy_local_composition_audio_input_missing");
      return resolveVoxyLocalCompositionAudioAssetFromRecord({
        record,
        trustedAudioRoot,
      });
    },
  };
}
