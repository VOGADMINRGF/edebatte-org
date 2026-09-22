import { describe, expect, it } from "vitest";

import { renderVoxyEditorialCompositionFrameHtml } from "@/features/voxyVideo/editorialCompositionHtml";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import { VOXY_FINAL_CANON } from "@/features/voxyVideo/finalCanon";
import {
  VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
  type VoxyLocalCompositionAudioInputRecord,
} from "@/features/voxyVideo/localCompositionAudioAssetStore";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";
import type { VoxyStudioEvidenceSnapshot } from "@/features/voxyVideo/studioEvidenceReview";
import {
  buildVoxyStudioEditorialCompositionHandoff,
  buildVoxyStudioEditorialTimelineSnapshot,
} from "@/features/voxyVideo/studioRenderHandoff";

const SOURCE_PACK_ID = "voxy-studio-dossier:preview-dossier:evidence-r1";

function plan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "preview-story",
    revision: 2,
    briefingId: "preview-briefing",
    dossierId: "preview-dossier",
    title: "Same renderer preview",
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
        narration: "Der revisionsgebundene Ausgangspunkt.",
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
        narration: "Die Quelle bleibt im selben Timeline-Snapshot sichtbar.",
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

function draft(status: "needs_review" | "approved_for_render"): VoxyStudioDraft {
  const approved = status === "approved_for_render";
  return {
    version: "voxy-studio-draft-v1",
    draftId: "preview-draft",
    revision: 3,
    sourceKind: "dossier",
    dossierId: "preview-dossier",
    briefingId: "preview-briefing",
    title: "Same renderer preview",
    storyPlan: plan(),
    selectedFormat: "16:9",
    safeZoneProfile: "video",
    captionAdjustments: [],
    status,
    renderApproval: approved
      ? {
          approvalSource: "human",
          reviewDecisionRecordId: "review-ready-1",
          decisionGateId: "preview-decision-gate",
          approvedByUserId: "preview-reviewer",
          councilArtifactId: null,
          approvedAt: "2026-09-22T19:45:00.000Z",
          studioDraftRevision: 3,
          storyPlanRevision: 2,
        }
      : null,
    renderBinding: null,
    publishApproval: null,
    createdByUserId: "preview-author",
    updatedByUserId: "preview-reviewer",
    createdAt: "2026-09-22T19:00:00.000Z",
    updatedAt: "2026-09-22T19:45:00.000Z",
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

function audio(): VoxyLocalCompositionAudioInputRecord {
  return {
    version: VOXY_LOCAL_COMPOSITION_AUDIO_INPUT_VERSION,
    assetId: "preview-audio",
    artifactId: "preview-draft",
    briefingId: "preview-briefing",
    scriptVersion: "story-r2",
    storyPlanId: "preview-story",
    storyPlanRevision: 2,
    locale: "de",
    voiceProfileId: "voice-de-approved",
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "preview-draft/story-r2/audio.wav",
    sha256: "a".repeat(64),
    durationMs: 120_000,
    timelineVersion: "preview-timeline-r1",
    chapterTimings: [
      { chapterId: "chapter-1", durationMs: 55_000 },
      { chapterId: "chapter-2", durationMs: 65_000 },
    ],
    captionCues: [
      {
        id: "caption-1",
        startMs: 0,
        endMs: 55_000,
        text: "Der revisionsgebundene Ausgangspunkt.",
      },
      {
        id: "caption-2",
        startMs: 55_000,
        endMs: 120_000,
        text: "Die Quelle bleibt im selben Timeline-Snapshot sichtbar.",
      },
    ],
    approvalRef: "voice-review",
    approvedByUserId: "voice-reviewer",
    approvedAt: "2026-09-22T18:55:00.000Z",
    createdAt: "2026-09-22T18:56:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

function sources(): VoxyStudioEvidenceSnapshot["sources"] {
  return [
    {
      sourceId: "source-1",
      canonicalUrlHash: "source-hash-1",
      url: "https://example.org/evidence",
      title: "Amtliche Evidenzquelle",
      publisher: "Beispielbehörde",
      type: "official",
      language: "de",
      snippet: null,
      publishedAt: null,
      retrievedAt: "2026-09-22T18:00:00.000Z",
    },
  ];
}

const assets = {
  canonStageDataUrl: "data:image/png;base64,Y2Fub24=",
  canonicalCleanStudioBackgroundDataUrl: "data:image/svg+xml;base64,c3R1ZGlv",
  studioLockupDataUrl: "data:image/svg+xml;base64,bG9ja3Vw",
  lapelPinDataUrl: "data:image/svg+xml;base64,cGlu",
  edebattePocketMarkDataUrl: "data:image/svg+xml;base64,bWFyaw==",
} as const;

describe("Voxy Studio same-renderer frame preview", () => {
  it("builds the exact render timeline before editorial approval exists", () => {
    const snapshot = buildVoxyStudioEditorialTimelineSnapshot({
      draft: draft("needs_review"),
      audioInput: audio(),
      evidenceSourcePackId: SOURCE_PACK_ID,
      evidenceSources: sources(),
    });

    expect(snapshot.timeline.durationMs).toBe(120_000);
    expect(snapshot.timeline.chapters).toEqual([
      expect.objectContaining({ chapterId: "chapter-1", startMs: 0, endMs: 55_000 }),
      expect.objectContaining({ chapterId: "chapter-2", startMs: 55_000, endMs: 120_000 }),
    ]);
    expect(snapshot.renderStoryPlan.renderEvidenceProjection.sourcePackId).toBe(SOURCE_PACK_ID);
  });

  it("uses the same timeline, captions and render evidence projection as the later #568 handoff", () => {
    const preview = buildVoxyStudioEditorialTimelineSnapshot({
      draft: draft("needs_review"),
      audioInput: audio(),
      evidenceSourcePackId: SOURCE_PACK_ID,
      evidenceSources: sources(),
    });
    const handoff = buildVoxyStudioEditorialCompositionHandoff({
      draft: draft("approved_for_render"),
      audioInput: audio(),
      requestedByUserId: "preview-reviewer",
      evidenceSourcePackId: SOURCE_PACK_ID,
      evidenceSources: sources(),
    });

    expect(handoff.timeline).toEqual(preview.timeline);
    expect(handoff.captionCues).toEqual(preview.captionCues);
    expect(handoff.request.editorialStoryPlan).toEqual(preview.renderStoryPlan);
  });

  it.each(["16:9", "9:16", "1:1"] as const)(
    "renders %s through the final-canon editorial compositor without external resource attributes",
    (format) => {
      const snapshot = buildVoxyStudioEditorialTimelineSnapshot({
        draft: draft("needs_review"),
        audioInput: audio(),
        evidenceSourcePackId: SOURCE_PACK_ID,
        evidenceSources: sources(),
      });
      const html = renderVoxyEditorialCompositionFrameHtml({
        plan: snapshot.renderStoryPlan,
        timeline: snapshot.timeline,
        captions: snapshot.captionCues,
        assets,
        format,
        frameIndex: 24,
        amplitude: 0,
      });

      expect(html).toContain('data-editorial-runtime="editorial_v1"');
      expect(html).toContain(`data-final-canon-id="${VOXY_FINAL_CANON.canonId}"`);
      expect(html).toContain("Amtliche Evidenzquelle");
      expect(html).toContain("https://example.org/evidence");
      expect(html).not.toMatch(/\b(?:src|href)\s*=\s*["']https?:/i);
      expect(html).not.toContain("<script");
    },
  );

  it("fails closed when the selected audio belongs to an older story revision", () => {
    expect(() =>
      buildVoxyStudioEditorialTimelineSnapshot({
        draft: draft("needs_review"),
        audioInput: { ...audio(), storyPlanRevision: 1, scriptVersion: "story-r1" },
        evidenceSourcePackId: SOURCE_PACK_ID,
        evidenceSources: sources(),
      }),
    ).toThrow(/voxy_studio_audio_script_revision_mismatch|voxy_studio_audio_story_revision_mismatch/);
  });
});
