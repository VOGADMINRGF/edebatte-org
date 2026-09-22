import "server-only";

import { stableHash } from "@core/utils/hash";
import { VOXY_FINAL_CANON } from "./finalCanon";
import {
  buildVoxyEditorialTimeline,
  type VoxyEditorialTimeline,
} from "./editorialStoryPlan";
import {
  buildVoxyEditorialRenderableStoryPlan,
  type VoxyEditorialRenderableStoryPlan,
} from "./editorialRenderEvidence";
import {
  buildVoxyLocalCompositionTimelineHash,
  validateVoxyLocalCompositionRequest,
  type VoxyLocalCompositionApprovalSnapshot,
  type VoxyLocalCompositionCaptionCue,
  type VoxyLocalCompositionEditorialBinding,
  type VoxyLocalCompositionRequest,
} from "./localCompositionRuntime";
import {
  assertVoxyLocalCompositionAudioInputRecord,
  resolveVoxyLocalCompositionAudioAssetFromRecord,
  type VoxyLocalCompositionAudioInputRecord,
  type VoxyLocalCompositionAudioInputRepository,
} from "./localCompositionAudioAssetStore";
import type { VoxyLocalCompositionAudioResolver } from "./localCompositionRuntimeService";
import type { VoxyStudioEvidenceSnapshot } from "./studioEvidenceReview";
import {
  assertVoxyStudioAllFormatLayoutSafety,
  assertVoxyStudioCaptionLayoutSafety,
} from "./studioLayoutSafety";
import {
  buildVoxyVoiceLocaleReadiness,
  isVoxyVideoOutputLocale,
} from "./voiceLocaleMatrix";
import {
  validateVoxyStudioDraft,
  type VoxyStudioCaptionAdjustment,
  type VoxyStudioDraft,
} from "./studioDraft";

export type VoxyStudioEditorialCompositionBinding = {
  studioDraftId: string;
  studioDraftRevision: number;
  storyPlanId: string;
  storyPlanRevision: number;
  timelineVersion: string;
  timelineHash: string;
  durationMs: number;
  chapterBoundaries: Array<{
    chapterId: string;
    startMs: number;
    endMs: number;
    motion: VoxyEditorialTimeline["chapters"][number]["motion"];
  }>;
  evidenceSourcePackId: string;
  evidenceDecisionGateId: string;
  approvalSource: "human" | "agent_council";
  councilArtifactId: string | null;
  format: VoxyStudioDraft["selectedFormat"];
  locale: string;
  finalCanonId: string;
};

export type VoxyStudioEditorialTimelineSnapshot = {
  audioInput: VoxyLocalCompositionAudioInputRecord;
  timeline: VoxyEditorialTimeline;
  captionCues: VoxyLocalCompositionCaptionCue[];
  renderStoryPlan: VoxyEditorialRenderableStoryPlan;
  evidenceSourcePackId: string;
};

export type VoxyStudioEditorialCompositionHandoff = {
  request: VoxyLocalCompositionRequest;
  approval: VoxyLocalCompositionApprovalSnapshot;
  audioInput: VoxyLocalCompositionAudioInputRecord;
  timeline: VoxyEditorialTimeline;
  timelineHash: string;
  captionCues: VoxyLocalCompositionCaptionCue[];
  binding: VoxyStudioEditorialCompositionBinding;
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

export function buildVoxyStudioEditorialTimelineSnapshot(input: {
  draft: VoxyStudioDraft;
  audioInput: VoxyLocalCompositionAudioInputRecord;
  evidenceSourcePackId: string;
  evidenceSources: VoxyStudioEvidenceSnapshot["sources"];
}): VoxyStudioEditorialTimelineSnapshot {
  const draftErrors = validateVoxyStudioDraft(input.draft);
  if (draftErrors.length) {
    throw new Error(`voxy_studio_timeline_snapshot_draft_invalid:${draftErrors.join(",")}`);
  }
  const evidenceSourcePackId = normalized(input.evidenceSourcePackId);
  if (!evidenceSourcePackId) {
    throw new Error("voxy_studio_timeline_snapshot_evidence_binding_missing");
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
  const renderStoryPlan = buildVoxyEditorialRenderableStoryPlan({
    plan: input.draft.storyPlan,
    sourcePackId: evidenceSourcePackId,
    sources: input.evidenceSources,
  });

  return {
    audioInput: input.audioInput,
    timeline,
    captionCues,
    renderStoryPlan,
    evidenceSourcePackId,
  };
}

export function buildVoxyStudioEditorialCompositionHandoff(input: {
  draft: VoxyStudioDraft;
  audioInput: VoxyLocalCompositionAudioInputRecord;
  requestedByUserId: string;
  evidenceSourcePackId: string;
  evidenceSources: VoxyStudioEvidenceSnapshot["sources"];
}): VoxyStudioEditorialCompositionHandoff {
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

  const snapshot = buildVoxyStudioEditorialTimelineSnapshot({
    draft: input.draft,
    audioInput: input.audioInput,
    evidenceSourcePackId: input.evidenceSourcePackId,
    evidenceSources: input.evidenceSources,
  });
  assertVoxyStudioAllFormatLayoutSafety(input.draft);
  assertVoxyStudioCaptionLayoutSafety({
    format: input.draft.selectedFormat,
    captionCues: snapshot.captionCues,
  });

  const renderApproval = input.draft.renderApproval;
  const editorialBinding: VoxyLocalCompositionEditorialBinding = {
    studioDraftId: input.draft.draftId,
    studioDraftRevision: input.draft.revision,
    storyPlanId: input.draft.storyPlan.storyPlanId,
    storyPlanRevision: input.draft.storyPlan.revision,
    evidenceSourcePackId: snapshot.evidenceSourcePackId,
    evidenceDecisionGateId: renderApproval.decisionGateId,
    approvalSource: renderApproval.approvalSource,
    councilArtifactId: renderApproval.councilArtifactId,
    finalCanonId: VOXY_FINAL_CANON.canonId,
  };
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
    captionCues: snapshot.captionCues,
    editorialStoryPlan: snapshot.renderStoryPlan,
    editorialTimeline: snapshot.timeline,
    editorialBinding,
  };
  const requestErrors = validateVoxyLocalCompositionRequest(request);
  if (requestErrors.length) {
    throw new Error(`voxy_studio_render_handoff_request_invalid:${requestErrors.join(",")}`);
  }
  const timelineHash = buildVoxyLocalCompositionTimelineHash(request);

  const approval: VoxyLocalCompositionApprovalSnapshot = {
    approved: true,
    approvalRef: renderApproval.reviewDecisionRecordId,
    approvedBy: renderApproval.approvedByUserId,
    approvedAt: renderApproval.approvedAt,
    previewReviewFlowId: buildVoxyStudioPreviewReviewFlowId(input.draft),
    decisionGateId: renderApproval.decisionGateId,
    dossierRefId: input.draft.dossierId,
    approvalSource: renderApproval.approvalSource,
    councilArtifactId: renderApproval.councilArtifactId,
    authority: "trusted_review_authority",
  };

  return {
    request,
    approval,
    audioInput: snapshot.audioInput,
    timeline: snapshot.timeline,
    timelineHash,
    captionCues: snapshot.captionCues,
    binding: {
      studioDraftId: input.draft.draftId,
      studioDraftRevision: input.draft.revision,
      storyPlanId: input.draft.storyPlan.storyPlanId,
      storyPlanRevision: input.draft.storyPlan.revision,
      timelineVersion: input.audioInput.timelineVersion,
      timelineHash,
      durationMs: snapshot.timeline.durationMs,
      chapterBoundaries: snapshot.timeline.chapters.map((chapter) => ({
        chapterId: chapter.chapterId,
        startMs: chapter.startMs,
        endMs: chapter.endMs,
        motion: chapter.motion,
      })),
      evidenceSourcePackId: snapshot.evidenceSourcePackId,
      evidenceDecisionGateId: renderApproval.decisionGateId,
      approvalSource: renderApproval.approvalSource,
      councilArtifactId: renderApproval.councilArtifactId,
      format: input.draft.selectedFormat,
      locale: input.draft.storyPlan.outputLanguage.toLowerCase(),
      finalCanonId: VOXY_FINAL_CANON.canonId,
    },
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
