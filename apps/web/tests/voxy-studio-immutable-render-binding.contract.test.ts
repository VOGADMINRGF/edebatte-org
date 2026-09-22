import { describe, expect, it } from "vitest";

import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  buildQueuedVoxyLocalCompositionJob,
  getVoxyLocalCompositionDimensions,
  type VoxyLocalCompositionOutput,
} from "@/features/voxyVideo/localCompositionRuntime";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import {
  validateVoxyStudioImmutableEditorialBinding,
} from "@/features/voxyVideo/studioRenderBindingGuard";
import { buildVoxyStudioEditorialCompositionHandoff } from "@/features/voxyVideo/studioRenderHandoff";

const EVIDENCE_SOURCE_PACK_ID = "voxy-studio-dossier:dossier-1:evidence-r1";
const DECISION_GATE_ID = "voxy-studio-render:studio-draft-1:r4:story-r3:evidence-a1b2c3";

function storyPlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 3,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Immutable Binding Test",
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
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Was ist passiert?",
        narration: "Der belegte Ausgangspunkt.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: [],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "chapter-2",
        role: "source_evidence",
        headline: "Was belegt das?",
        narration: "Die Quelle bleibt sichtbar.",
        claimBindings: [],
        sourceIds: ["source-1"],
        findingIds: [],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: [],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

function studioDraft(): VoxyStudioDraft {
  return {
    version: "voxy-studio-draft-v1",
    draftId: "studio-draft-1",
    revision: 4,
    sourceKind: "dossier",
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    title: "Immutable Binding Test",
    storyPlan: storyPlan(),
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status: "approved_for_render",
    renderApproval: {
      approvalSource: "human",
      reviewDecisionRecordId: "review-audit-1",
      decisionGateId: DECISION_GATE_ID,
      approvedByUserId: "admin-1",
      councilArtifactId: null,
      approvedAt: "2026-09-22T10:00:00.000Z",
      studioDraftRevision: 4,
      storyPlanRevision: 3,
    },
    renderBinding: null,
    publishApproval: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    createdAt: "2026-09-22T09:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
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
    assetId: "audio-1",
    artifactId: "studio-draft-1",
    briefingId: "briefing-1",
    scriptVersion: "story-r3",
    storyPlanId: "story-plan-1",
    storyPlanRevision: 3,
    locale: "de",
    voiceProfileId: "voice-de-approved",
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "studio-draft-1/story-r3/audio.wav",
    sha256: "a".repeat(64),
    durationMs: 120_000,
    timelineVersion: "timeline-r1",
    chapterTimings: [
      { chapterId: "chapter-1", durationMs: 60_000 },
      { chapterId: "chapter-2", durationMs: 60_000 },
    ],
    captionCues: [
      { id: "caption-1", startMs: 0, endMs: 60_000, text: "Der belegte Ausgangspunkt." },
      { id: "caption-2", startMs: 60_000, endMs: 120_000, text: "Die Quelle bleibt sichtbar." },
    ],
    approvalRef: "voice-review-1",
    approvedByUserId: "admin-1",
    approvedAt: "2026-09-22T09:55:00.000Z",
    createdAt: "2026-09-22T09:56:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

function candidate() {
  const draft = studioDraft();
  const handoff = buildVoxyStudioEditorialCompositionHandoff({
    draft,
    audioInput: audioInput(),
    requestedByUserId: "admin-1",
    evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
  });
  const queued = buildQueuedVoxyLocalCompositionJob({
    request: handoff.request,
    approval: handoff.approval,
    now: "2026-09-22T10:01:00.000Z",
  });
  const job = {
    ...queued,
    status: "review_ready" as const,
    startedAt: "2026-09-22T10:02:00.000Z",
    completedAt: "2026-09-22T10:03:00.000Z",
    updatedAt: "2026-09-22T10:03:00.000Z",
  };
  const dimensions = getVoxyLocalCompositionDimensions(job.format, job.renderProfile);
  const video = (name: string, mimeType: string) => ({
    storageKey: `private/${name}`,
    sha256: "b".repeat(64),
    sizeBytes: 10_000,
    durationMs: 120_000,
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
  });
  const caption = (name: string, mimeType: string) => ({
    storageKey: `private/${name}`,
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
    masterMp4: video("master.mp4", "video/mp4"),
    previewWebm: video("preview.webm", "video/webm"),
    captionsVtt: caption("captions.vtt", "text/vtt"),
    captionsSrt: caption("captions.srt", "application/x-subrip"),
    createdAt: "2026-09-22T10:03:00.000Z",
    reviewStatus: "needs_review",
    reviewRequired: true,
    publicAsset: false,
    uploaded: false,
    scheduled: false,
    socialPosted: false,
    published: false,
  };
  return { draft, handoff, job, output };
}

describe("Voxy Studio immutable render binding", () => {
  it("accepts only the exact draft/story/evidence/final-canon request snapshot", () => {
    const { draft, handoff, job, output } = candidate();
    expect(
      validateVoxyStudioImmutableEditorialBinding({
        draft,
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
        currentDecisionGateId: DECISION_GATE_ID,
        request: handoff.request,
        job,
        output,
      }),
    ).toEqual([]);
  });

  it("rejects an output after the authoritative evidence snapshot changed", () => {
    const { draft, handoff, job, output } = candidate();
    expect(
      validateVoxyStudioImmutableEditorialBinding({
        draft,
        evidenceSourcePackId: "voxy-studio-dossier:dossier-1:evidence-r2",
        currentDecisionGateId: "voxy-studio-render:studio-draft-1:r4:story-r3:evidence-r2",
        request: handoff.request,
        job,
        output,
      }),
    ).toEqual(
      expect.arrayContaining([
        "studio_render_evidence_source_pack_binding_mismatch",
        "studio_render_evidence_gate_binding_mismatch",
        "studio_render_output_evidence_gate_mismatch",
      ]),
    );
  });

  it("rejects an old output after the Studio draft revision changed", () => {
    const { draft, handoff, job, output } = candidate();
    expect(
      validateVoxyStudioImmutableEditorialBinding({
        draft: { ...draft, revision: draft.revision + 1 },
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
        currentDecisionGateId: DECISION_GATE_ID,
        request: handoff.request,
        job,
        output,
      }),
    ).toContain("studio_render_draft_revision_binding_mismatch");
  });

  it("rejects a render snapshot whose approval provenance no longer matches the draft", () => {
    const { draft, handoff, job, output } = candidate();
    const changedApprovalDraft: VoxyStudioDraft = {
      ...draft,
      renderApproval: {
        ...draft.renderApproval!,
        approvalSource: "agent_council",
        approvedByUserId: "agent:voxy-chief-judge:decision-new",
        councilArtifactId: "voxy-council-artifact-new",
      },
    };
    expect(
      validateVoxyStudioImmutableEditorialBinding({
        draft: changedApprovalDraft,
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
        currentDecisionGateId: DECISION_GATE_ID,
        request: handoff.request,
        job,
        output,
      }),
    ).toEqual(
      expect.arrayContaining([
        "studio_render_approval_source_binding_mismatch",
        "studio_render_council_artifact_binding_mismatch",
      ]),
    );
  });

  it("fails closed when the immutable request snapshot is unavailable", () => {
    const { draft, job, output } = candidate();
    expect(
      validateVoxyStudioImmutableEditorialBinding({
        draft,
        evidenceSourcePackId: EVIDENCE_SOURCE_PACK_ID,
        currentDecisionGateId: DECISION_GATE_ID,
        request: null,
        job,
        output,
      }),
    ).toContain("studio_render_request_snapshot_missing");
  });
});
