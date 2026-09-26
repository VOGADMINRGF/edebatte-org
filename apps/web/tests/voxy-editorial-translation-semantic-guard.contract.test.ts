import { describe, expect, it } from "vitest";

import type { CanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  bindVoxyEditorialLanguageVariant,
  type VoxyEditorialLanguageVariantPlan,
} from "@/features/voxyVideo/editorialLanguageVariant";
import {
  evaluateVoxyEditorialTranslationEvidenceTrust,
  evaluateVoxyEditorialTranslationSemanticGuard,
} from "@/features/voxyVideo/editorialTranslationSemanticGuard";
import {
  validateVoxyEditorialStoryPlan,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";

function masterPlan(overrides: Partial<VoxyEditorialStoryPlan> = {}): VoxyEditorialStoryPlan {
  return {
    version: "voxy-editorial-story-plan-v1",
    storyPlanId: "story-master-1",
    revision: 7,
    briefingId: "brief-1",
    dossierId: "dossier-1",
    title: "EU-Investition: 20 % für 10 km",
    locale: "de",
    originalLanguage: "de",
    outputLanguage: "de",
    archetype: "explainer",
    durationClass: "preview",
    chapters: [
      {
        chapterId: "chapter-1",
        role: "what_happened",
        headline: "EU investiert 20 %",
        narration: "Die EU könnte nicht mehr als 5 EUR pro 10 km investieren.",
        claimBindings: [{ claimId: "claim-1", presentation: "uncertainty" }],
        sourceIds: ["source-1"],
        findingIds: ["finding-1"],
        openQuestionIds: ["question-1"],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-1"],
          findingIds: ["finding-1"],
        },
        consequences: [
          {
            consequenceId: "consequence-1",
            kind: "scenario",
            text: "„EU“ könnte 2 km später starten.",
            claimIds: ["claim-1"],
            sourceIds: ["source-1"],
          },
        ],
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

function frenchPlan(master: VoxyEditorialStoryPlan, overrides: Partial<VoxyEditorialStoryPlan> = {}) {
  return masterPlan({
    storyPlanId: "story-fr-1",
    revision: 1,
    title: "Investissement EU : 20 % pour 10 km",
    locale: "fr",
    originalLanguage: "de",
    outputLanguage: "fr",
    chapters: [
      {
        ...master.chapters[0]!,
        headline: "EU investit 20 %",
        narration: "L’EU pourrait ne pas investir plus de 5 EUR pour 10 km.",
        consequences: [
          {
            ...master.chapters[0]!.consequences[0]!,
            text: "« EU » pourrait commencer 2 km plus tard.",
          },
        ],
      },
    ],
    derivedFromStoryPlanId: master.storyPlanId,
    derivedFromRevision: master.revision,
    ...overrides,
  });
}

function englishPlan(master: VoxyEditorialStoryPlan, narration: string) {
  return frenchPlan(master, {
    storyPlanId: "story-en-1",
    locale: "en",
    outputLanguage: "en",
    title: "EU investment: 20 % for 10 km",
    chapters: [
      {
        ...master.chapters[0]!,
        headline: "EU invests 20 %",
        narration,
        consequences: [
          {
            ...master.chapters[0]!.consequences[0]!,
            text: "“EU” could start 2 km later.",
          },
        ],
      },
    ],
  });
}

function bind(master: VoxyEditorialStoryPlan, translated: VoxyEditorialStoryPlan) {
  return bindVoxyEditorialLanguageVariant({
    masterPlan: master,
    translatedPlan: translated,
    evidenceSourcePackId: "source-pack-1",
    translationRevision: 3,
    translationStatus: "approved",
  });
}

function sourcePack(translationStatus: "not_needed" | "translated" | "needs_review" | "uncertain"): CanonicalSourcePack {
  return {
    sourcePackId: "source-pack-1",
    sources: [
      {
        sourceId: "source-1",
        title: "Quelle",
        sourceLocale: "de",
        regionCode: "DE",
        sourceType: "official",
        reliabilityHint: "primary",
        originalSnippet: "Original",
        translatedSnippet: translationStatus === "not_needed" ? null : "Traduction",
        translationStatus,
        evidenceState: "supported",
        reviewState: "approved",
      },
    ],
    openGaps: [],
    reviewState: "approved",
    reviewRequired: true,
    autoPublish: false,
  };
}

describe("Voxy editorial translation semantic guard", () => {
  it("keeps an aligned language variant approval-eligible without auto-approving it", () => {
    const master = masterPlan();
    const translated = frenchPlan(master);
    const report = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: master,
      translatedPlan: translated,
    });

    expect(report.hardBlockers).toEqual([]);
    expect(report.reviewFlags).toEqual([]);
    expect(report.safeForBinding).toBe(true);
    expect(report.requiresReview).toBe(false);

    const variant = bind(master, translated);
    expect(variant.languageVariant.translationStatus).toBe("approved");
    expect(variant.languageVariant.semanticGuard).toMatchObject({
      reviewFlags: [],
      reviewRequired: true,
      autoApprove: false,
    });
  });

  it("rejects canonical claim-presentation changes instead of translating them away", () => {
    const master = masterPlan();
    const translated = frenchPlan(master, {
      chapters: [
        {
          ...frenchPlan(master).chapters[0]!,
          claimBindings: [{ claimId: "claim-1", presentation: "confirmed_fact" }],
        },
      ],
    });

    expect(() => bind(master, translated)).toThrow(
      /voxy_language_variant_semantic_invariant_failed:.*semantic_guard_claim_presentation_changed/,
    );
  });

  it("downgrades an attempted approval when numbers, units, quotes, modality or acronyms drift", () => {
    const master = masterPlan();
    const translated = frenchPlan(master, {
      title: "Investissement UE : 30 % pour 12 km",
      chapters: [
        {
          ...frenchPlan(master).chapters[0]!,
          headline: "UE investit 30 %",
          narration: "L’UE investit 6 EUR pour 12 km.",
          consequences: [
            {
              ...frenchPlan(master).chapters[0]!.consequences[0]!,
              text: "UE commence 3 km plus tard.",
            },
          ],
        },
      ],
    });

    const variant = bind(master, translated);
    expect(variant.languageVariant.translationStatus).toBe("uncertain");
    expect(variant.languageVariant.semanticGuard?.reviewFlags).toEqual(
      expect.arrayContaining([
        "semantic_guard_number_changed:story:title",
        "semantic_guard_acronym_changed:story:title",
        "semantic_guard_negation_risk:chapter:chapter-1:narration",
        "semantic_guard_modality_uncertainty_risk:chapter:chapter-1:narration",
        "semantic_guard_quote_mode_changed:chapter:chapter-1:consequence:consequence-1",
      ]),
    );
  });

  it("detects decimal-comma magnitude drift instead of collapsing 1,5 and 15", () => {
    const master = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const translated = englishPlan(master, "The distance could be 15 km long.");

    const variant = bind(master, translated);
    expect(variant.languageVariant.translationStatus).toBe("uncertain");
    expect(variant.languageVariant.semanticGuard?.reviewFlags).toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
  });

  it("accepts equivalent locale decimal and grouping renderings when they are unambiguous", () => {
    const decimalMaster = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const decimalReport = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: decimalMaster,
      translatedPlan: englishPlan(decimalMaster, "The distance could be 1.5 km long."),
    });
    expect(decimalReport.reviewFlags).not.toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
    expect(decimalReport.reviewFlags).not.toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );

    const groupedMaster = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1.500 km lang sein.",
        },
      ],
    });
    const groupedReport = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: groupedMaster,
      translatedPlan: englishPlan(groupedMaster, "The distance could be 1,500 km long."),
    });
    expect(groupedReport.reviewFlags).not.toContain(
      "semantic_guard_number_changed:chapter:chapter-1:narration",
    );
    expect(groupedReport.reviewFlags).not.toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );
  });

  it("fails closed on locale-ambiguous numeric separators", () => {
    const master = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          narration: "Die Strecke könnte 1,5 km lang sein.",
        },
      ],
    });
    const report = evaluateVoxyEditorialTranslationSemanticGuard({
      masterPlan: master,
      translatedPlan: englishPlan(master, "The distance could be 1,5 km long."),
    });

    expect(report.reviewFlags).toContain(
      "semantic_guard_number_ambiguous:chapter:chapter-1:narration",
    );
    expect(report.requiresReview).toBe(true);
  });

  it("treats source-pack translation review state as an existing fail-closed trust signal", () => {
    expect(
      evaluateVoxyEditorialTranslationEvidenceTrust({
        sourcePack: sourcePack("uncertain"),
        targetLanguage: "fr",
      }),
    ).toEqual(
      expect.arrayContaining([
        "language_variant_source_translation_uncertain:source-1",
        "language_variant_source_pack_translation_uncertain",
      ]),
    );
    expect(
      evaluateVoxyEditorialTranslationEvidenceTrust({
        sourcePack: sourcePack("needs_review"),
        targetLanguage: "fr",
      }),
    ).toContain("language_variant_source_translation_needs_review:source-1");
  });

  it("blocks render eligibility when bound source translation trust becomes uncertain", () => {
    const master = masterPlan({
      chapters: [
        {
          ...masterPlan().chapters[0]!,
          role: "what_happened",
          claimBindings: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
          consequences: [],
        },
        {
          ...masterPlan().chapters[0]!,
          chapterId: "chapter-2",
          role: "what_is_supported",
          claimBindings: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "source", sourceIds: ["source-1"], findingIds: [] },
          consequences: [],
        },
      ],
    });
    const translatedBase = frenchPlan(master, {
      chapters: master.chapters.map((chapter) => ({
        ...chapter,
        headline: `FR ${chapter.headline}`,
        narration: `FR ${chapter.narration}`,
      })),
    });
    const variant = bindVoxyEditorialLanguageVariant({
      masterPlan: master,
      translatedPlan: translatedBase,
      evidenceSourcePackId: "source-pack-1",
      translationRevision: 1,
      translationStatus: "approved",
    }) as VoxyEditorialLanguageVariantPlan;

    const validation = validateVoxyEditorialStoryPlan(variant, {
      sourcePack: sourcePack("uncertain"),
      claims: [],
      findings: [],
      openQuestions: [],
    });
    expect(validation.approvalBlockers).toEqual(
      expect.arrayContaining([
        "language_variant_source_translation_uncertain:source-1",
        "language_variant_source_pack_translation_uncertain",
      ]),
    );
    expect(validation.renderEligible).toBe(false);
  });
});
