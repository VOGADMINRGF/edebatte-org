import { describe, expect, it } from "vitest";

import type { VoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import {
  bindVoxyEditorialLanguageVariant,
  buildVoxyEditorialScriptVersion,
  computeVoxyEditorialTranslationHash,
  evaluateVoxyEditorialLanguageVariantFreshness,
  validateVoxyEditorialLanguageVariantBinding,
} from "@/features/voxyVideo/editorialLanguageVariant";

function plan(overrides: Partial<VoxyEditorialStoryPlan> = {}): VoxyEditorialStoryPlan {
  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: "story-master-1",
    revision: 4,
    briefingId: "brief-1",
    dossierId: "dossier-1",
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
        evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: ["finding-1"] },
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

function frenchVariant(master = plan()) {
  const translated = plan({
    storyPlanId: "story-fr-1",
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
  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: "source-pack-abc",
    translationRevision: 2,
    translationStatus: "approved",
  });
}

describe("Voxy editorial language variant revision contract", () => {
  it("binds a target-language representation to exact master and evidence truth", () => {
    const master = plan();
    const variant = frenchVariant(master);
    expect(variant.languageVariant).toMatchObject({
      sourceLanguage: "de",
      targetLanguage: "fr",
      translatedFromStoryPlanId: master.storyPlanId,
      translatedFromStoryPlanRevision: master.revision,
      evidenceSourcePackId: "source-pack-abc",
      translationRevision: 2,
      translationStatus: "approved",
      reviewRequired: true,
      autoRender: false,
      autoPublish: false,
    });
    expect(variant.languageVariant.translationHash).toMatch(/^[0-9a-f]{64}$/);
    expect(variant.languageVariant.translationHash).toBe(computeVoxyEditorialTranslationHash(variant));
    expect(validateVoxyEditorialLanguageVariantBinding(variant)).toEqual([]);
  });

  it("changes script identity when translation revision or translated copy changes", () => {
    const master = plan();
    const variant = frenchVariant(master);
    const firstScriptVersion = buildVoxyEditorialScriptVersion(variant);
    expect(firstScriptVersion).toMatch(/^story-r1-tr2-[0-9a-f]{16}$/);

    const nextRevision = bindVoxyEditorialLanguageVariant({
      masterPlan: master,
      translatedPlan: {
        ...variant,
        chapters: variant.chapters.map((chapter) => ({
          ...chapter,
          narration: `${chapter.narration} Mise à jour.`,
        })),
      },
      evidenceSourcePackId: "source-pack-abc",
      translationRevision: 3,
      translationStatus: "needs_review",
    });
    expect(buildVoxyEditorialScriptVersion(nextRevision)).not.toBe(firstScriptVersion);
    expect(nextRevision.languageVariant.translationHash).not.toBe(variant.languageVariant.translationHash);
  });

  it("marks master or evidence drift and non-approved translation fail-closed", () => {
    const variant = frenchVariant();
    const stale = evaluateVoxyEditorialLanguageVariantFreshness({
      plan: { ...variant, languageVariant: { ...variant.languageVariant, translationStatus: "needs_review" } },
      masterStoryPlanId: "story-master-1",
      masterStoryPlanRevision: 5,
      evidenceSourcePackId: "source-pack-new",
    });
    expect(stale.current).toBe(false);
    expect(stale.blockers).toEqual(
      expect.arrayContaining([
        "language_variant_master_revision_changed",
        "language_variant_evidence_fingerprint_changed",
        "language_variant_translation_not_approved:needs_review",
      ]),
    );
  });

  it("keeps canonical claim/source/evidence references outside the translation hash", () => {
    const variant = frenchVariant();
    const presentationHash = variant.languageVariant.translationHash;
    const evidenceOnlyChange = {
      ...variant,
      chapters: variant.chapters.map((chapter) => ({
        ...chapter,
        claimBindings: [{ claimId: "claim-other", presentation: "confirmed_fact" as const }],
        sourceIds: ["source-other"],
        findingIds: ["finding-other"],
      })),
    };
    expect(computeVoxyEditorialTranslationHash(evidenceOnlyChange)).toBe(presentationHash);
  });

  it("preserves the legacy script version for non-translated master plans", () => {
    expect(buildVoxyEditorialScriptVersion(plan())).toBe("story-r4");
  });
});
