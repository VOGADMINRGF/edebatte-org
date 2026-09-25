import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/config/locales";
import { VOXY_EDITORIAL_STORY_PLAN_VERSION } from "@/features/voxyVideo/editorialStoryPlan";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  VOXY_STUDIO_DRAFT_GUARDRAILS,
  VOXY_STUDIO_DRAFT_VERSION,
  type VoxyStudioDraft,
} from "@/features/voxyVideo/studioDraft";
import { buildVoxyStudioLocaleReviewMatrices } from "@/features/voxyVideo/studioLocaleReviewMatrix";

function draft(input: {
  id: string;
  locale: "de" | "ar";
  status: VoxyStudioDraft["status"];
  approved?: boolean;
}): VoxyStudioDraft {
  const revision = 2;
  const storyRevision = 3;
  return {
    version: VOXY_STUDIO_DRAFT_VERSION,
    draftId: input.id,
    revision,
    sourceKind: "dossier",
    dossierId: "dossier-1",
    briefingId: "briefing-1",
    title: `Matrix ${input.locale}`,
    storyPlan: {
      version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
      storyPlanId: `story-${input.locale}`,
      revision: storyRevision,
      briefingId: "briefing-1",
      dossierId: "dossier-1",
      title: `Matrix ${input.locale}`,
      locale: input.locale,
      originalLanguage: "de",
      outputLanguage: input.locale,
      archetype: "explainer",
      durationClass: "explainer",
      chapters: [
        {
          chapterId: "chapter-1",
          role: "what_happened",
          headline: "Kurze Headline",
          narration: "Kurzer revisionsgebundener Sprechertext.",
          claimBindings: [],
          sourceIds: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
          consequences: [],
          motion: "explaining",
        },
      ],
      derivedFromStoryPlanId: null,
      derivedFromRevision: null,
      reviewRequired: true,
      autoRender: false,
      autoPublish: false,
    },
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status: input.status,
    renderApproval: input.approved
      ? {
          approvalSource: "human",
          reviewDecisionRecordId: `review-${input.locale}`,
          decisionGateId: `gate-${input.locale}`,
          approvedByUserId: "admin-1",
          councilArtifactId: null,
          approvedAt: "2026-09-22T12:00:00.000Z",
          studioDraftRevision: revision,
          storyPlanRevision: storyRevision,
        }
      : null,
    renderBinding: null,
    publishApproval: null,
    createdByUserId: "admin-1",
    updatedByUserId: "admin-1",
    createdAt: "2026-09-22T11:00:00.000Z",
    updatedAt: "2026-09-22T12:00:00.000Z",
    guardrails: VOXY_STUDIO_DRAFT_GUARDRAILS,
  };
}

function audio(draftRecord: VoxyStudioDraft): VoxyLocalCompositionAudioInputRecord {
  return {
    version: VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
    assetId: `audio-${draftRecord.storyPlan.outputLanguage}`,
    artifactId: draftRecord.draftId,
    briefingId: draftRecord.briefingId,
    scriptVersion: `story-r${draftRecord.storyPlan.revision}`,
    storyPlanId: draftRecord.storyPlan.storyPlanId,
    storyPlanRevision: draftRecord.storyPlan.revision,
    locale: draftRecord.storyPlan.outputLanguage,
    voiceProfileId: `voice-${draftRecord.storyPlan.outputLanguage}`,
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: `${draftRecord.draftId}/audio.wav`,
    sha256: "a".repeat(64),
    durationMs: 120_000,
    timelineVersion: "timeline-1",
    chapterTimings: [{ chapterId: "chapter-1", durationMs: 120_000 }],
    captionCues: [
      { id: "caption-1", startMs: 0, endMs: 120_000, text: "Caption" },
    ],
    approvalRef: "voice-review-1",
    approvedByUserId: "admin-1",
    approvedAt: "2026-09-22T11:55:00.000Z",
    createdAt: "2026-09-22T11:56:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

describe("Voxy Studio canonical locale review matrix", () => {
  it("covers exactly the public locale SSOT and never inherits approval across locales", () => {
    const de = draft({ id: "draft-de", locale: "de", status: "approved_for_render", approved: true });
    const ar = draft({ id: "draft-ar", locale: "ar", status: "needs_review" });
    const matrices = buildVoxyStudioLocaleReviewMatrices({
      drafts: [de, ar],
      audioInputsByDraftId: {
        [de.draftId]: [audio(de)],
        [ar.draftId]: [],
      },
      approvalCurrentByDraftId: {
        [de.draftId]: true,
        [ar.draftId]: false,
      },
    });

    expect(matrices).toHaveLength(1);
    const matrix = matrices[0]!;
    expect(matrix.totalLocales).toBe(SUPPORTED_LOCALES.length);
    expect(matrix.locales.map((entry) => entry.locale)).toEqual([...SUPPORTED_LOCALES]);
    expect(matrix.preparedLocales).toBe(2);
    expect(matrix.approvedLocales).toBe(1);

    const german = matrix.locales.find((entry) => entry.locale === "de")!;
    expect(german).toMatchObject({
      exactLocaleApprovalPresent: true,
      translationStatus: "not_needed",
      voiceStatus: "voice_available",
      voiceProfileId: "voice-de",
      fallbackLocale: null,
      captionStatus: "ready",
      rtlReviewRequired: false,
    });

    const arabic = matrix.locales.find((entry) => entry.locale === "ar")!;
    expect(arabic).toMatchObject({
      exactLocaleApprovalPresent: false,
      translationStatus: "needs_review",
      voiceStatus: "voice_unavailable",
      fallbackLocale: null,
      captionStatus: "preparation_pending",
      direction: "rtl",
      rtlReviewRequired: true,
      rtlReviewSatisfiedByExplicitLocaleApproval: false,
    });

    const unprepared = matrix.locales.find(
      (entry) => entry.locale !== "de" && entry.locale !== "ar",
    )!;
    expect(unprepared).toMatchObject({
      draftStatus: "not_prepared",
      exactLocaleApprovalPresent: false,
      translationStatus: "not_prepared",
      voiceStatus: "not_prepared",
      captionStatus: "not_prepared",
      fallbackLocale: null,
    });
  });

  it("fails closed when an approved RTL locale is stale against current Evidence", () => {
    const ar = draft({
      id: "draft-ar",
      locale: "ar",
      status: "approved_for_render",
      approved: true,
    });
    const matrix = buildVoxyStudioLocaleReviewMatrices({
      drafts: [ar],
      approvalCurrentByDraftId: { [ar.draftId]: false },
    })[0]!;
    const arabic = matrix.locales.find((entry) => entry.locale === "ar")!;

    expect(matrix.approvedLocales).toBe(0);
    expect(arabic).toMatchObject({
      draftStatus: "approved_for_render",
      exactLocaleApprovalPresent: false,
      translationStatus: "needs_review",
      rtlReviewRequired: true,
      rtlReviewSatisfiedByExplicitLocaleApproval: false,
    });
  });

  it("keeps rendered history visible without counting stale approval as current", () => {
    const de = draft({ id: "draft-de", locale: "de", status: "rendered", approved: true });
    const matrix = buildVoxyStudioLocaleReviewMatrices({
      drafts: [de],
      approvalCurrentByDraftId: { [de.draftId]: false },
    })[0]!;
    const german = matrix.locales.find((entry) => entry.locale === "de")!;

    expect(matrix.approvedLocales).toBe(0);
    expect(german).toMatchObject({
      draftStatus: "rendered",
      exactLocaleApprovalPresent: false,
      translationStatus: "not_needed",
    });
  });

  it("reports all three canonical format safety states for a prepared locale", () => {
    const de = draft({ id: "draft-de", locale: "de", status: "needs_review" });
    const matrix = buildVoxyStudioLocaleReviewMatrices({
      drafts: [de],
      approvalCurrentByDraftId: { [de.draftId]: false },
    })[0]!;
    const german = matrix.locales.find((entry) => entry.locale === "de")!;

    expect(Object.keys(german.formatSafety).sort()).toEqual(["16:9", "1:1", "9:16"].sort());
    expect(Object.values(german.formatSafety)).not.toContain("not_prepared");
  });
});