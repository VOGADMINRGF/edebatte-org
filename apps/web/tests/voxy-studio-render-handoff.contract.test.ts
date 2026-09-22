import { describe, expect, it } from "vitest";

import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  createInMemoryVoxyLocalCompositionAudioInputRepository,
  resolveVoxyLocalCompositionAudioAssetFromRecord,
  validateVoxyLocalCompositionAudioInputRecord,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import {
  buildVoxyStudioEditorialCompositionHandoff,
  buildVoxyStudioPreviewReviewFlowId,
} from "@/features/voxyVideo/studioRenderHandoff";

function storyPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 3,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Belegter Longform-Explainer",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "what-happened",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der belegte Ausgangspunkt.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: ["finding-1"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: ["finding-1"],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        narration: "Quelle und Prüfpfad bleiben sichtbar.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: ["finding-1"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: ["finding-1"],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function draft(): VoxyStudioDraft {
  const plan = storyPlan();
  return {
    version: "voxy-studio-draft-v1",
    draftId: "studio-draft-1",
    revision: 4,
    sourceKind: "dossier",
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    title: "Belegter Longform-Explainer",
    storyPlan: plan,
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status: "approved_for_render",
    renderApproval: {
      reviewDecisionRecordId: "review-audit-1",
      decisionGateId: "voxy-studio-render:studio-draft-1:r4:story-r3",
      approvedByUserId: "admin-2",
      approvedAt: "2026-09-22T04:00:00.000Z",
      studioDraftRevision: 4,
      storyPlanRevision: 3,
    },
    renderBinding: null,
    publishApproval: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-2",
    createdAt: "2026-09-22T03:00:00.000Z",
    updatedAt: "2026-09-22T04:00:00.000Z",
    guardrails: {
      reviewRequired: true,
      requestCannotSetApproval: true,
      noAutoRender: true,
      noAutoPublish: true,
      noUpload: true,
      noScheduling: true,
      noSocialPost: true,
    },
  };
}

function audioInput(): VoxyLocalCompositionAudioInputRecord {
  return {
    version: VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
    assetId: "audio-input-1",
    artifactId: "studio-draft-1",
    briefingId: "briefing-1",
    scriptVersion: "story-r3",
    storyPlanId: "story-plan-1",
    storyPlanRevision: 3,
    locale: "de",
    voiceProfileId: "voice-de-approved-1",
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "studio-draft-1/story-r3/audio.wav",
    sha256: "a".repeat(64),
    durationMs: 120_000,
    timelineVersion: "audio-timeline-r1",
    chapterTimings: [
      { chapterId: "what-happened", durationMs: 60_000 },
      { chapterId: "evidence", durationMs: 60_000 },
    ],
    captionCues: [
      {
        id: "caption-1",
        startMs: 0,
        endMs: 60_000,
        text: "Der belegte Ausgangspunkt.",
      },
      {
        id: "caption-2",
        startMs: 60_000,
        endMs: 120_000,
        text: "Quelle und Prüfpfad bleiben sichtbar.",
      },
    ],
    approvalRef: "voice-review-1",
    approvedByUserId: "admin-2",
    approvedAt: "2026-09-22T03:55:00.000Z",
    createdAt: "2026-09-22T03:56:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

describe("Voxy Studio render handoff", () => {
  it("binds an approved Studio revision to the existing editorial_v1 runtime", () => {
    const studioDraft = draft();
    const handoff = buildVoxyStudioEditorialCompositionHandoff({
      draft: studioDraft,
      audioInput: audioInput(),
      requestedByUserId: "admin-2",
    });

    expect(handoff.request).toMatchObject({
      artifactId: studioDraft.draftId,
      briefingId: studioDraft.briefingId,
      scriptVersion: "story-r3",
      renderProfile: "editorial_v1",
      audioAssetId: "audio-input-1",
      locale: "de",
      format: "16:9",
      sceneContent: [],
    });
    expect(handoff.timeline.durationMs).toBe(120_000);
    expect(handoff.timeline.chapters.map((chapter) => chapter.chapterId)).toEqual([
      "what-happened",
      "evidence",
    ]);
    expect(handoff.captionCues.at(-1)?.endMs).toBe(120_000);
    expect(handoff.approval).toMatchObject({
      approved: true,
      approvalRef: "review-audit-1",
      approvedBy: "admin-2",
      decisionGateId: studioDraft.renderApproval?.decisionGateId,
      dossierRefId: "dossier-1",
    });
    expect(handoff.approval.previewReviewFlowId).toBe(
      buildVoxyStudioPreviewReviewFlowId(studioDraft),
    );
  });

  it("fails closed when audio is bound to an older story revision", () => {
    const stale = { ...audioInput(), storyPlanRevision: 2, scriptVersion: "story-r2" };
    expect(() =>
      buildVoxyStudioEditorialCompositionHandoff({
        draft: draft(),
        audioInput: stale,
        requestedByUserId: "admin-2",
      }),
    ).toThrow(/voxy_studio_audio_script_revision_mismatch|voxy_studio_audio_story_revision_mismatch/);
  });

  it("fails closed when a caption correction creates a gap in the approved audio timeline", () => {
    const studioDraft = {
      ...draft(),
      captionAdjustments: [
        {
          cueId: "caption-2",
          startDeltaMs: 250,
          endDeltaMs: 0,
          textOverride: null,
        },
      ],
    } satisfies VoxyStudioDraft;
    expect(() =>
      buildVoxyStudioEditorialCompositionHandoff({
        draft: studioDraft,
        audioInput: audioInput(),
        requestedByUserId: "admin-2",
      }),
    ).toThrow("voxy_studio_caption_adjustment_breaks_timeline:caption-2");
  });

  it("rejects missing exact-locale voice approval instead of falling back", () => {
    const invalid = {
      ...audioInput(),
      voiceUsageApproved: false,
    } as unknown as VoxyLocalCompositionAudioInputRecord;
    expect(validateVoxyLocalCompositionAudioInputRecord(invalid)).toContain(
      "audio_input_voice_approval_invalid",
    );
  });

  it("keeps registered input assets immutable under the same asset id", async () => {
    const repository = createInMemoryVoxyLocalCompositionAudioInputRepository();
    const original = audioInput();
    await repository.registerOrGet(original);
    await expect(
      repository.registerOrGet({
        ...original,
        sha256: "b".repeat(64),
      }),
    ).rejects.toThrow("voxy_local_composition_audio_input_immutable_conflict");
  });

  it("resolves only a trusted root plus the registered relative storage key", () => {
    const asset = resolveVoxyLocalCompositionAudioAssetFromRecord({
      record: audioInput(),
      trustedAudioRoot: "/srv/voxy-audio",
    });
    expect(asset).toEqual({
      assetId: "audio-input-1",
      absolutePath: "/srv/voxy-audio/studio-draft-1/story-r3/audio.wav",
      allowedRoot: "/srv/voxy-audio",
      sha256: "a".repeat(64),
      durationMs: 120_000,
    });
  });
});
