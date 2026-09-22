import { describe, expect, it } from "vitest";

import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import { VOXY_FINAL_CANON } from "@/features/voxyVideo/finalCanon";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  createInMemoryVoxyLocalCompositionAudioInputRepository,
  resolveVoxyLocalCompositionAudioAssetFromRecord,
  validateVoxyLocalCompositionAudioInputRecord,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  buildQueuedVoxyLocalCompositionJob,
  buildVoxyLocalCompositionInputFingerprint,
  getVoxyLocalCompositionDimensions,
  type VoxyLocalCompositionOutput,
} from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import {
  buildVoxyStudioEditorialCompositionHandoff,
  buildVoxyStudioPreviewReviewFlowId,
} from "@/features/voxyVideo/studioRenderHandoff";
import { validateVoxyStudioEditorialRenderCandidate } from "@/features/voxyVideo/studioRenderBindingGuard";

const EVIDENCE_SOURCE_PACK_ID = "voxy-studio-dossier:dossier-1:evidence-r1";

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
      approvalSource: "human",
      reviewDecisionRecordId: "review-audit-1",
      decisionGateId: "voxy-studio-render:studio-draft-1:r4:story-r3:evidence-1234567890abcdef",
      approvedByUserId: "admin-2",
      councilArtifactId: null,
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

function handoffInput(overrides?: { evidenceSourcePackId?: string }) {
  return {
    draft: draft(),
    audioInput: audioInput(),
    requestedByUserId: "admin-2",
    evidenceSourcePackId: overrides?.evidenceSourcePackId ?? EVIDENCE_SOURCE_PACK_ID,
  };
}

function editorialRenderCandidate() {
  const handoff = buildVoxyStudioEditorialCompositionHandoff(handoffInput());
  const queued = buildQueuedVoxyLocalCompositionJob({
    request: handoff.request,
    approval: handoff.approval,
    now: "2026-09-22T04:05:00.000Z",
  });
  const job = {
    ...queued,
    status: "review_ready" as const,
    startedAt: "2026-09-22T04:06:00.000Z",
    completedAt: "2026-09-22T04:10:00.000Z",
    updatedAt: "2026-09-22T04:10:00.000Z",
  };
  const dimensions = getVoxyLocalCompositionDimensions(job.format, job.renderProfile);
  const video = (storageKey: string, mimeType: string) => ({
    storageKey,
    sha256: "b".repeat(64),
    sizeBytes: 10_000,
    durationMs: job.durationMs ?? 120_000,
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
  });
  const caption = (storageKey: string, mimeType: string) => ({
    storageKey,
    sha256: "c".repeat(64),
    sizeBytes: 500,
    durationMs: null,
    width: null,
    height: null,
    mimeType,
  });
  const output: VoxyLocalCompositionOutput = {
    outputId: job.outputId,
    jobId: job.jobId,
    identityKey: job.identityKey,
    inputFingerprint: job.inputFingerprint,
    reviewBindingHash: job.reviewBindingHash,
    timelineHash: job.timelineHash,
    format: job.format,
    renderProfile: job.renderProfile,
    locale: job.locale,
    previewReviewFlowId: job.previewReviewFlowId,
    decisionGateId: job.decisionGateId,
    dossierRefId: job.dossierRefId,
    masterMp4: video("render/master.mp4", "video/mp4"),
    previewWebm: video("render/preview.webm", "video/webm"),
    captionsVtt: caption("render/captions.vtt", "text/vtt"),
    captionsSrt: caption("render/captions.srt", "application/x-subrip"),
    createdAt: "2026-09-22T04:10:00.000Z",
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
  return { job, output };
}

describe("Voxy Studio render handoff", () => {
  it("binds an approved Studio revision to the existing editorial_v1 runtime", () => {
    const studioDraft = draft();
    const handoff = buildVoxyStudioEditorialCompositionHandoff({
      draft: studioDraft,
      audioInput: audioInput(),
      requestedByUserId: "admin-2",
      evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
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
      editorialBinding: {
        studioDraftId: studioDraft.draftId,
        studioDraftRevision: studioDraft.revision,
        storyPlanId: studioDraft.storyPlan.storyPlanId,
        storyPlanRevision: studioDraft.storyPlan.revision,
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
        evidenceDecisionGateId: studioDraft.renderApproval?.decisionGateId,
        finalCanonId: VOXY_FINAL_CANON.canonId,
      },
    });
    expect(handoff.timeline.durationMs).toBe(120_000);
    expect(handoff.timelineHash).toMatch(/^[a-f0-9]{64}$/);
    expect(handoff.binding).toMatchObject({
      studioDraftId: studioDraft.draftId,
      studioDraftRevision: 4,
      storyPlanId: "story-plan-1",
      storyPlanRevision: 3,
      timelineVersion: "audio-timeline-r1",
      timelineHash: handoff.timelineHash,
      durationMs: 120_000,
      evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
      evidenceDecisionGateId: studioDraft.renderApproval?.decisionGateId,
      format: "16:9",
      locale: "de",
      finalCanonId: VOXY_FINAL_CANON.canonId,
    });
    expect(handoff.binding.chapterBoundaries).toEqual([
      {
        chapterId: "what-happened",
        startMs: 0,
        endMs: 60_000,
        motion: "highlighting_source",
      },
      {
        chapterId: "evidence",
        startMs: 60_000,
        endMs: 120_000,
        motion: "explaining",
      },
    ]);
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

  it("changes the immutable request fingerprint when the evidence binding changes", () => {
    const first = buildVoxyStudioEditorialCompositionHandoff(handoffInput());
    const second = buildVoxyStudioEditorialCompositionHandoff(
      handoffInput({ evidenceSourcePackId: "voxy-studio-dossier:dossier-1:evidence-r2" }),
    );

    expect(buildVoxyLocalCompositionInputFingerprint(first.request)).not.toBe(
      buildVoxyLocalCompositionInputFingerprint(second.request),
    );
    expect(
      buildQueuedVoxyLocalCompositionJob({
        request: first.request,
        approval: first.approval,
        now: "2026-09-22T04:05:00.000Z",
      }).identityKey,
    ).not.toBe(
      buildQueuedVoxyLocalCompositionJob({
        request: second.request,
        approval: second.approval,
        now: "2026-09-22T04:05:00.000Z",
      }).identityKey,
    );
  });

  it("accepts only internally consistent editorial_v1 outputs for Studio binding", () => {
    const candidate = editorialRenderCandidate();
    expect(validateVoxyStudioEditorialRenderCandidate(candidate)).toEqual([]);
  });

  it("rejects the historical local_review_v1 fixture at the Studio bind gate", () => {
    const candidate = editorialRenderCandidate();
    const legacyJob = {
      ...candidate.job,
      renderProfile: "local_review_v1" as const,
    };
    const legacyOutput = {
      ...candidate.output,
      renderProfile: "local_review_v1" as const,
    };
    expect(
      validateVoxyStudioEditorialRenderCandidate({
        job: legacyJob,
        output: legacyOutput,
      }),
    ).toEqual(
      expect.arrayContaining([
        "studio_render_requires_editorial_v1_job",
        "studio_render_requires_editorial_v1_output",
      ]),
    );
  });

  it("fails closed when audio is bound to an older story revision", () => {
    const stale = { ...audioInput(), storyPlanRevision: 2, scriptVersion: "story-r2" };
    expect(() =>
      buildVoxyStudioEditorialCompositionHandoff({
        draft: draft(),
        audioInput: stale,
        requestedByUserId: "admin-2",
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
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
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
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
