import { describe, expect, it } from "vitest";

import type { VoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import {
  bindVoxyEditorialLanguageVariant,
  buildVoxyEditorialScriptVersion,
} from "@/features/voxyVideo/editorialLanguageVariant";
import type { VoxyLocalCompositionAudioInputRecord } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  VOXY_VIDEO_OUTPUT_LOCALES,
} from "@/features/voxyVideo/voiceLocaleMatrix";
import { evaluateVoxyVoiceCaptionReadiness } from "@/features/voxyVideo/voiceCaptionReadiness";

function plan(overrides: Partial<VoxyEditorialStoryPlan> = {}): VoxyEditorialStoryPlan {
  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: "story-master-voice-1",
    revision: 4,
    briefingId: "brief-voice-1",
    dossierId: "dossier-voice-1",
    title: "Was ist passiert?",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "preview",
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "Ausgangslage",
        narration: "Die Ausgangslage wird erklärt.",
        claimBindings: [{ claimId: "claim-1", presentation: "confirmed_fact" }],
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
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    ...overrides,
  };
}

function frenchVariant() {
  const master = plan();
  const translated = plan({
    storyPlanId: "story-fr-voice-1",
    revision: 1,
    title: "Que s’est-il passé ?",
    locale: "fr",
    originalLanguage: "de",
    outputLanguage: "fr",
    chapters: [
      {
        ...master.chapters[0]!,
        headline: "Situation initiale",
        narration: "La situation initiale est expliquée.",
      },
    ],
    derivedFromStoryPlanId: master.storyPlanId,
    derivedFromRevision: master.revision,
  });
  return {
    master,
    variant: bindVoxyEditorialLanguageVariant({
      masterPlan: master,
      translatedPlan: translated,
      evidenceSourcePackId: "source-pack-voice",
      translationRevision: 2,
      translationStatus: "approved",
    }),
  };
}

function audio(
  storyPlan: VoxyEditorialStoryPlan,
  overrides: Partial<VoxyLocalCompositionAudioInputRecord> = {},
): VoxyLocalCompositionAudioInputRecord {
  return {
    version: "voxy-local-composition-audio-input-v1",
    assetId: "audio-voice-1",
    artifactId: "draft-voice-1",
    briefingId: storyPlan.briefingId,
    scriptVersion: buildVoxyEditorialScriptVersion(storyPlan),
    storyPlanId: storyPlan.storyPlanId,
    storyPlanRevision: storyPlan.revision,
    locale: storyPlan.outputLanguage,
    voiceProfileId: `voice-${storyPlan.outputLanguage}-approved`,
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "voxy/audio-voice-1.wav",
    sha256: "a".repeat(64),
    durationMs: 8_000,
    timelineVersion: "timeline-v1",
    chapterTimings: [{ chapterId: "chapter-1", durationMs: 8_000 }],
    captionCues: [
      {
        id: "caption-1",
        startMs: 0,
        endMs: 8_000,
        text: "Kurzer, revisionsgebundener Untertitel.",
      },
    ],
    approvalRef: "approval-voice-1",
    approvedByUserId: "editor-voice-1",
    approvedAt: "2026-09-25T14:00:00.000Z",
    createdAt: "2026-09-25T14:00:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
    ...overrides,
  };
}

describe("Voxy EU24 voice/caption readiness", () => {
  it.each([...VOXY_VIDEO_OUTPUT_LOCALES])(
    "keeps %s visible and render-blocked without an explicitly approved voice",
    (locale) => {
      const storyPlan = plan({
        storyPlanId: `story-${locale}`,
        locale,
        originalLanguage: locale,
        outputLanguage: locale,
      });
      const readiness = evaluateVoxyVoiceCaptionReadiness({ storyPlan });

      expect(readiness).toMatchObject({
        locale,
        voiceStatus: "voice_unavailable",
        voiceProfileId: null,
        fallbackLocale: null,
        captionStatus: "preparation_pending",
        captionPreparationAllowed: true,
        bindingCurrent: false,
        renderAllowed: false,
      });
      expect(readiness.blockers).toEqual(
        expect.arrayContaining(["voice_unavailable", "caption_preparation_pending"]),
      );
    },
  );

  it("allows render only for current locale/revision/script bindings with approved voice and safe captions", () => {
    const { variant } = frenchVariant();
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan: variant,
      audioInput: audio(variant),
    });

    expect(readiness).toMatchObject({
      locale: "fr",
      storyPlanRevision: 1,
      translationRevision: 2,
      voiceStatus: "voice_available",
      voiceProfileId: "voice-fr-approved",
      fallbackLocale: null,
      captionStatus: "ready",
      bindingCurrent: true,
      renderAllowed: true,
      blockers: [],
    });
    expect(readiness.formatSafety).toEqual({
      "16:9": true,
      "9:16": true,
      "1:1": true,
    });
  });

  it("invalidates audio and captions when the translation revision changes", () => {
    const { master, variant } = frenchVariant();
    const staleAudio = audio(variant);
    const nextVariant = bindVoxyEditorialLanguageVariant({
      masterPlan: master,
      translatedPlan: variant,
      evidenceSourcePackId: "source-pack-voice",
      translationRevision: 3,
      translationStatus: "approved",
    });

    expect(buildVoxyEditorialScriptVersion(nextVariant)).not.toBe(staleAudio.scriptVersion);
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan: nextVariant,
      audioInput: staleAudio,
    });
    expect(readiness.renderAllowed).toBe(false);
    expect(readiness.bindingCurrent).toBe(false);
    expect(readiness.blockers).toContain("audio_script_revision_stale");
  });

  it("fails closed for cross-locale audio instead of falling back", () => {
    const { variant } = frenchVariant();
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan: variant,
      audioInput: audio(variant, { locale: "de", fallbackLocale: null }),
    });

    expect(readiness.renderAllowed).toBe(false);
    expect(readiness.blockers).toContain("audio_locale_binding_mismatch");
    expect(readiness.fallbackLocale).toBeNull();
  });

  it.each([
    ["bg", "Проверена информация с ясни надписи."],
    ["el", "Ελεγμένη πληροφορία με καθαρούς υπότιτλους."],
    ["hr", "Činjenice ostaju čitljive i jasno označene."],
    ["ar", "معلومة موثقة مع ترجمة واضحة."],
  ] as const)("preserves Unicode caption readiness for %s", (locale, text) => {
    const storyPlan = plan({
      storyPlanId: `story-unicode-${locale}`,
      locale,
      originalLanguage: locale,
      outputLanguage: locale,
    });
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan,
      audioInput: audio(storyPlan, {
        locale,
        voiceProfileId: `voice-${locale}-approved`,
        captionCues: [{ id: "caption-unicode", startMs: 0, endMs: 8_000, text }],
      }),
    });

    expect(readiness.blockers).toEqual([]);
    expect(readiness.renderAllowed).toBe(true);
  });

  it("blocks unsafe long captions across the canonical social formats", () => {
    const storyPlan = plan();
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan,
      audioInput: audio(storyPlan, {
        captionCues: [
          {
            id: "caption-long",
            startMs: 0,
            endMs: 8_000,
            text: "Sehr langer Untertitel ".repeat(40).trim(),
          },
        ],
      }),
    });

    expect(readiness.renderAllowed).toBe(false);
    expect(readiness.blockers.some((item) => item.startsWith("caption_layout:"))).toBe(true);
  });

  it("blocks timeline gaps even when a voice profile is approved", () => {
    const storyPlan = plan();
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan,
      audioInput: audio(storyPlan, {
        captionCues: [
          { id: "caption-1", startMs: 0, endMs: 3_000, text: "Erster Teil" },
          { id: "caption-2", startMs: 3_500, endMs: 8_000, text: "Zweiter Teil" },
        ],
      }),
    });

    expect(readiness.renderAllowed).toBe(false);
    expect(readiness.captionStatus).toBe("preparation_pending");
    expect(readiness.blockers).toContain("caption_timeline_invalid:caption-2");
  });
});
