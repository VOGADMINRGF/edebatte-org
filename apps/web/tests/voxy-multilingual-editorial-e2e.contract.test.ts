import { describe, expect, it } from "vitest";

import {
  buildCanonicalSourcePack,
  type CanonicalSourcePack,
} from "@/features/create/canonicalSourcePackContract";
import type { VoxyLocalCompositionAudioInputRecord } from "@/features/voxyVideo/localCompositionAudioAssetStore";
import {
  bindVoxyEditorialLanguageVariant,
  buildVoxyEditorialScriptVersion,
  evaluateVoxyEditorialLanguageVariantFreshness,
} from "@/features/voxyVideo/editorialLanguageVariant";
import {
  validateVoxyEditorialStoryPlan,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import { evaluateVoxyVoiceCaptionReadiness } from "@/features/voxyVideo/voiceCaptionReadiness";

type SourceFixture = {
  sourceId: string;
  locale: string;
  title: string;
};

function sourcePack(
  sourcePackId: string,
  sources: readonly SourceFixture[],
): CanonicalSourcePack {
  return buildCanonicalSourcePack({
    sourcePackId,
    reviewState: "approved",
    sources: sources.map((source) => ({
      sourceId: source.sourceId,
      title: source.title,
      sourceLocale: source.locale,
      sourceType: "official",
      reliabilityHint: "primary",
      originalSnippet: `Original ${source.sourceId}`,
      translatedSnippet: `Geprüfte Lesefassung ${source.sourceId}`,
      translationStatus: "translated",
      evidenceState: "supported",
      reviewState: "approved",
    })),
  });
}

function evidenceContext(input: {
  dossierId: string;
  sourcePack: CanonicalSourcePack;
  claimId: string;
  findingId: string;
  questionId: string;
}): VoxyEditorialEvidenceContext {
  return {
    sourcePack: input.sourcePack,
    claims: [
      {
        claimId: input.claimId,
        dossierId: input.dossierId,
        text: "Der dokumentierte Sachverhalt ist belegt.",
        kind: "fact",
        status: "supported",
        createdByRole: "editor",
      },
    ],
    findings: [
      {
        findingId: input.findingId,
        dossierId: input.dossierId,
        claimId: input.claimId,
        verdict: "supports",
        rationale: ["Die freigegebenen Quellen tragen den Sachverhalt."],
        citations: input.sourcePack.sources.map((source) => ({
          sourceId: source.sourceId,
          locator: `Abschnitt ${source.sourceId}`,
        })),
        producedBy: "editor",
      },
    ],
    openQuestions: [
      {
        questionId: input.questionId,
        dossierId: input.dossierId,
        text: "Welche Entwicklung ist als Nächstes zu beobachten?",
        status: "answered",
        createdByRole: "editor",
      },
    ],
  };
}

function masterPlan(input: {
  storyPlanId: string;
  dossierId: string;
  sourceIds: readonly string[];
  claimId: string;
  findingId: string;
  questionId: string;
}): VoxyEditorialStoryPlan {
  const [primarySourceId, ...otherSourceIds] = input.sourceIds;
  if (!primarySourceId) throw new Error("source_fixture_missing");

  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: input.storyPlanId,
    revision: 4,
    briefingId: `brief-${input.storyPlanId}`,
    dossierId: input.dossierId,
    title: "Belegter Ausgangspunkt und offene Entwicklung",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "preview",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "what-happened",
        role: "what_happened",
        headline: "Der belegte Ausgangspunkt",
        narration: "Die geprüfte Grundlage bleibt an dieselben Quellen gebunden.",
        claimBindings: [{ claimId: input.claimId, presentation: "confirmed_fact" }],
        sourceIds: [primarySourceId],
        findingIds: [input.findingId],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: [primarySourceId],
          findingIds: [input.findingId],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "evidence",
        role: "source_evidence",
        headline: "Die gemeinsame Evidenz",
        narration: "Die Sprachfassung ändert keine kanonische Referenz.",
        claimBindings: [{ claimId: input.claimId, presentation: "confirmed_fact" }],
        sourceIds: [primarySourceId],
        findingIds: [input.findingId],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: [primarySourceId],
          findingIds: [input.findingId],
        },
        consequences: [],
        motion: "explaining",
      },
      ...otherSourceIds.map((sourceId, index) => ({
        chapterId: `evidence-${index + 2}`,
        role: "source_evidence" as const,
        headline: `Weitere Quelle ${index + 2}`,
        narration: "Auch diese Quelle bleibt dieselbe kanonische Evidence-Referenz.",
        claimBindings: [{ claimId: input.claimId, presentation: "confirmed_fact" as const }],
        sourceIds: [sourceId],
        findingIds: [input.findingId],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source" as const,
          sourceIds: [sourceId],
          findingIds: [input.findingId],
        },
        consequences: [],
        motion: "explaining" as const,
      })),
      {
        chapterId: "watch-next",
        role: "what_to_watch_next",
        headline: "Was als Nächstes zu beobachten ist",
        narration: "Die offene Entwicklung bleibt ausdrücklich als Frage referenziert.",
        claimBindings: [],
        sourceIds: [],
        findingIds: [],
        openQuestionIds: [input.questionId],
        evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
        consequences: [],
        motion: "inviting_participation",
      },
    ],
  };
}

function translatedPlan(input: {
  master: VoxyEditorialStoryPlan;
  storyPlanId: string;
  locale: "fr" | "it" | "bg";
  title: string;
  headlinePrefix: string;
  narration: string;
}): VoxyEditorialStoryPlan {
  return {
    ...input.master,
    storyPlanId: input.storyPlanId,
    revision: 1,
    title: input.title,
    locale: input.locale,
    originalLanguage: "de",
    outputLanguage: input.locale,
    derivedFromStoryPlanId: input.master.storyPlanId,
    derivedFromRevision: input.master.revision,
    languageVariant: null,
    chapters: input.master.chapters.map((chapter, index) => ({
      ...chapter,
      headline: `${input.headlinePrefix} ${index + 1}`,
      narration: input.narration,
    })),
  };
}

function canonicalRefs(plan: VoxyEditorialStoryPlan) {
  return {
    claims: plan.chapters.flatMap((chapter) => chapter.claimBindings.map((item) => item.claimId)),
    sources: plan.chapters.flatMap((chapter) => [
      ...chapter.sourceIds,
      ...chapter.evidenceWindow.sourceIds,
    ]),
    findings: plan.chapters.flatMap((chapter) => [
      ...chapter.findingIds,
      ...chapter.evidenceWindow.findingIds,
    ]),
    questions: plan.chapters.flatMap((chapter) => chapter.openQuestionIds),
  };
}

function audioFor(storyPlan: VoxyEditorialStoryPlan): VoxyLocalCompositionAudioInputRecord {
  return {
    version: "voxy-local-composition-audio-input-v1",
    assetId: "audio-bg-e2e",
    artifactId: "artifact-bg-e2e",
    briefingId: storyPlan.briefingId,
    scriptVersion: buildVoxyEditorialScriptVersion(storyPlan),
    storyPlanId: storyPlan.storyPlanId,
    storyPlanRevision: storyPlan.revision,
    locale: storyPlan.outputLanguage,
    voiceProfileId: "voice-bg-approved",
    voiceUsageApproved: true,
    fallbackLocale: null,
    storageKey: "voxy/e2e/audio-bg.wav",
    sha256: "b".repeat(64),
    durationMs: 8_000,
    timelineVersion: "timeline-e2e-v1",
    chapterTimings: storyPlan.chapters.map((chapter, index) => ({
      chapterId: chapter.chapterId,
      durationMs: index === storyPlan.chapters.length - 1 ? 8_000 : 0,
    })),
    captionCues: [
      {
        id: "caption-bg-e2e",
        startMs: 0,
        endMs: 8_000,
        text: "Проверената езикова версия остава свързана със същите доказателства.",
      },
    ],
    approvalRef: "approval-bg-e2e",
    approvedByUserId: "editor-bg-e2e",
    approvedAt: "2026-09-25T16:00:00.000Z",
    createdAt: "2026-09-25T16:00:00.000Z",
    reviewRequired: true,
    externalProviderUsed: false,
    autoRender: false,
    autoPublish: false,
  };
}

function bindVariant(input: {
  master: VoxyEditorialStoryPlan;
  translated: VoxyEditorialStoryPlan;
  sourcePackId: string;
  translationRevision?: number;
  translationStatus?: "approved" | "needs_review" | "uncertain" | "stale";
}) {
  return bindVoxyEditorialLanguageVariant({
    masterPlan: input.master,
    translatedPlan: input.translated,
    evidenceSourcePackId: input.sourcePackId,
    translationRevision: input.translationRevision ?? 2,
    translationStatus: input.translationStatus ?? "approved",
  });
}

describe("Voxy multilingual editorial E2E", () => {
  it("proves source PL -> dossier DE -> approved video FR on one canonical evidence truth", () => {
    const pack = sourcePack("source-pack-pl-fr", [
      { sourceId: "source-pl", locale: "pl", title: "Polska podstawa źródłowa" },
    ]);
    const context = evidenceContext({
      dossierId: "dossier-pl-de-fr",
      sourcePack: pack,
      claimId: "claim-pl-fr",
      findingId: "finding-pl-fr",
      questionId: "question-pl-fr",
    });
    const master = masterPlan({
      storyPlanId: "story-de-from-pl",
      dossierId: "dossier-pl-de-fr",
      sourceIds: ["source-pl"],
      claimId: "claim-pl-fr",
      findingId: "finding-pl-fr",
      questionId: "question-pl-fr",
    });
    const variant = bindVariant({
      master,
      translated: translatedPlan({
        master,
        storyPlanId: "story-fr-from-pl",
        locale: "fr",
        title: "Point de départ vérifié et évolution ouverte",
        headlinePrefix: "Section vérifiée",
        narration: "La version française reste liée aux mêmes références canoniques.",
      }),
      sourcePackId: pack.sourcePackId,
    });

    expect(validateVoxyEditorialStoryPlan(master, context).renderEligible).toBe(true);
    expect(validateVoxyEditorialStoryPlan(variant, context)).toMatchObject({
      errors: [],
      approvalBlockers: [],
      renderEligible: true,
    });
    expect(variant.dossierId).toBe(master.dossierId);
    expect(canonicalRefs(variant)).toEqual(canonicalRefs(master));
    expect(variant.languageVariant.evidenceSourcePackId).toBe(pack.sourcePackId);
    expect(variant.languageVariant).toMatchObject({
      sourceLanguage: "de",
      targetLanguage: "fr",
      translatedFromStoryPlanId: master.storyPlanId,
      translatedFromStoryPlanRevision: master.revision,
      translationStatus: "approved",
      reviewRequired: true,
      autoRender: false,
      autoPublish: false,
    });
  });

  it("proves ET + EN + DE sources -> shared dossier -> approved video IT without changing canonical refs", () => {
    const pack = sourcePack("source-pack-et-en-de-it", [
      { sourceId: "source-et", locale: "et", title: "Eesti allikas" },
      { sourceId: "source-en", locale: "en", title: "English source" },
      { sourceId: "source-de", locale: "de", title: "Deutsche Quelle" },
    ]);
    const context = evidenceContext({
      dossierId: "dossier-et-en-de",
      sourcePack: pack,
      claimId: "claim-multi-it",
      findingId: "finding-multi-it",
      questionId: "question-multi-it",
    });
    const master = masterPlan({
      storyPlanId: "story-de-multi",
      dossierId: "dossier-et-en-de",
      sourceIds: pack.sources.map((source) => source.sourceId),
      claimId: "claim-multi-it",
      findingId: "finding-multi-it",
      questionId: "question-multi-it",
    });
    const variant = bindVariant({
      master,
      translated: translatedPlan({
        master,
        storyPlanId: "story-it-multi",
        locale: "it",
        title: "Punto di partenza verificato e sviluppo aperto",
        headlinePrefix: "Sezione verificata",
        narration: "La versione italiana conserva gli stessi riferimenti canonici.",
      }),
      sourcePackId: pack.sourcePackId,
    });

    const validation = validateVoxyEditorialStoryPlan(variant, context);
    expect(validation.errors).toEqual([]);
    expect(validation.approvalBlockers).toEqual([]);
    expect(validation.renderEligible).toBe(true);
    expect(canonicalRefs(variant)).toEqual(canonicalRefs(master));
    expect(new Set(canonicalRefs(variant).sources)).toEqual(
      new Set(["source-et", "source-en", "source-de"]),
    );
  });

  it("proves master DE -> approved BG variant -> voice/captions -> 9:16 / 16:9 / 1:1", () => {
    const pack = sourcePack("source-pack-de-bg", [
      { sourceId: "source-de-bg", locale: "de", title: "Deutsche Primärquelle" },
    ]);
    const master = masterPlan({
      storyPlanId: "story-de-bg-master",
      dossierId: "dossier-de-bg",
      sourceIds: ["source-de-bg"],
      claimId: "claim-de-bg",
      findingId: "finding-de-bg",
      questionId: "question-de-bg",
    });
    const variant = bindVariant({
      master,
      translated: translatedPlan({
        master,
        storyPlanId: "story-bg-variant",
        locale: "bg",
        title: "Проверена основа и отворено развитие",
        headlinePrefix: "Проверен раздел",
        narration: "Българската версия остава свързана със същите канонични източници.",
      }),
      sourcePackId: pack.sourcePackId,
      translationRevision: 5,
    });
    const readiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan: variant,
      audioInput: audioFor(variant),
    });

    expect(canonicalRefs(variant)).toEqual(canonicalRefs(master));
    expect(readiness).toMatchObject({
      locale: "bg",
      translationRevision: 5,
      voiceStatus: "voice_available",
      voiceProfileId: "voice-bg-approved",
      fallbackLocale: null,
      captionStatus: "ready",
      bindingCurrent: true,
      renderAllowed: true,
      blockers: [],
      formatSafety: {
        "16:9": true,
        "9:16": true,
        "1:1": true,
      },
    });
    expect(readiness.scriptVersion).toBe(buildVoxyEditorialScriptVersion(variant));
  });

  it("keeps stale, uncertain, review-pending and voice-unavailable chains fail-closed", () => {
    const pack = sourcePack("source-pack-fail-closed", [
      { sourceId: "source-fail", locale: "pl", title: "Źródło" },
    ]);
    const master = masterPlan({
      storyPlanId: "story-fail-master",
      dossierId: "dossier-fail",
      sourceIds: ["source-fail"],
      claimId: "claim-fail",
      findingId: "finding-fail",
      questionId: "question-fail",
    });
    const translated = translatedPlan({
      master,
      storyPlanId: "story-fail-fr",
      locale: "fr",
      title: "Point de départ vérifié",
      headlinePrefix: "Section",
      narration: "La variante reste soumise à une validation explicite.",
    });
    const approved = bindVariant({ master, translated, sourcePackId: pack.sourcePackId });
    const needsReview = bindVariant({
      master,
      translated,
      sourcePackId: pack.sourcePackId,
      translationRevision: 3,
      translationStatus: "needs_review",
    });

    expect(
      evaluateVoxyEditorialLanguageVariantFreshness({
        plan: approved,
        masterStoryPlanId: master.storyPlanId,
        masterStoryPlanRevision: master.revision + 1,
        evidenceSourcePackId: pack.sourcePackId,
      }),
    ).toMatchObject({ current: false });
    expect(
      evaluateVoxyEditorialLanguageVariantFreshness({
        plan: approved,
        masterStoryPlanId: master.storyPlanId,
        masterStoryPlanRevision: master.revision,
        evidenceSourcePackId: "source-pack-changed",
      }),
    ).toMatchObject({ current: false });

    const reviewReadiness = evaluateVoxyVoiceCaptionReadiness({
      storyPlan: needsReview,
      audioInput: audioFor(needsReview),
    });
    expect(reviewReadiness.renderAllowed).toBe(false);
    expect(reviewReadiness.blockers).toContain(
      "language_variant_translation_not_approved:needs_review",
    );

    const noVoice = evaluateVoxyVoiceCaptionReadiness({ storyPlan: approved });
    expect(noVoice.renderAllowed).toBe(false);
    expect(noVoice.fallbackLocale).toBeNull();
    expect(noVoice.blockers).toEqual(
      expect.arrayContaining(["voice_unavailable", "caption_preparation_pending"]),
    );
  });
});
