import { describe, expect, it } from "vitest";

import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import { buildVoxyEditorialEvidenceWindowView } from "@/features/voxyVideo/editorialEvidenceWindow";
import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";

function context(): VoxyEditorialEvidenceContext {
  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: "pack",
      reviewState: "approved",
      sources: [
        {
          sourceId: "official",
          title: "Official document",
          sourceLocale: "en",
          sourceType: "official",
          reliabilityHint: "primary",
          originalSnippet: "Original excerpt",
          translatedSnippet: "Übersetzter Auszug",
          translationStatus: "translated",
          evidenceState: "supported",
          reviewState: "approved",
          retrievedAt: "2026-09-21T12:00:00.000Z",
        },
        {
          sourceId: "position",
          title: "Documented position",
          sourceLocale: "de",
          sourceType: "civil_society",
          reliabilityHint: "secondary",
          originalSnippet: "Dokumentierte Position",
          translationStatus: "not_needed",
          evidenceState: "contested",
          reviewState: "review_required",
        },
      ],
    }),
    claims: [],
    findings: [
      {
        findingId: "finding-support",
        dossierId: "dossier",
        claimId: "claim",
        verdict: "supports",
        rationale: ["supported"],
        citations: [{ sourceId: "official", locator: "section 1" }],
        producedBy: "editor",
      },
      {
        findingId: "finding-refute",
        dossierId: "dossier",
        claimId: "claim",
        verdict: "refutes",
        rationale: ["counter"],
        citations: [{ sourceId: "position", locator: "section 2" }],
        producedBy: "editor",
      },
    ],
    openQuestions: [],
  };
}

function plan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story",
    revision: 1,
    briefingId: "briefing",
    dossierId: "dossier",
    title: "Comparison",
    locale: "de",
    originalLanguage: "en",
    outputLanguage: "de",
    archetype: "controversy",
    durationClass: "explainer",
    derivedFromStoryPlanId: null,
    derivedFromRevision: null,
    reviewRequired: true,
    autoRender: false,
    autoPublish: false,
    chapters: [
      {
        chapterId: "compare",
        role: "relevant_positions",
        headline: "Was tragen die Quellen?",
        narration: "Die Evidenzrollen bleiben sichtbar.",
        claimBindings: [],
        sourceIds: ["official", "position"],
        findingIds: ["finding-support", "finding-refute"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "comparison",
          sourceIds: ["official", "position"],
          findingIds: ["finding-support", "finding-refute"],
        },
        consequences: [],
        motion: "showing_contrast",
      },
    ],
  };
}

describe("Voxy Editorial Evidence Window", () => {
  it("shows both comparison sources in 16:9 with their actual evidence roles", () => {
    const view = buildVoxyEditorialEvidenceWindowView({
      chapter: plan().chapters[0],
      context: context(),
      format: "16:9",
      outputLanguage: "de",
    });
    expect(view.presentation).toBe("side_by_side");
    expect(view.sources).toHaveLength(2);
    expect(view.sources[0]).toMatchObject({
      sourceId: "official",
      evidenceRole: "supports",
      snippet: "Übersetzter Auszug",
      snippetOrigin: "translated",
      evidenceState: "supported",
      reviewState: "approved",
    });
    expect(view.sources[1]).toMatchObject({
      sourceId: "position",
      evidenceRole: "refutes",
      evidenceState: "contested",
      reviewState: "review_required",
    });
    expect(view.hasPendingReview).toBe(true);
    expect(view.hasEvidenceCaveat).toBe(true);
  });

  it("never shrinks a comparison into a two-column phone mosaic", () => {
    const chapter = plan().chapters[0];
    const evidence = context();
    const first = buildVoxyEditorialEvidenceWindowView({
      chapter,
      context: evidence,
      format: "9:16",
      outputLanguage: "de",
      sequenceIndex: 0,
    });
    const second = buildVoxyEditorialEvidenceWindowView({
      chapter,
      context: evidence,
      format: "9:16",
      outputLanguage: "de",
      sequenceIndex: 1,
    });
    expect(first.presentation).toBe("sequence");
    expect(first.sources.map((source) => source.sourceId)).toEqual(["official"]);
    expect(second.sources.map((source) => source.sourceId)).toEqual(["position"]);
  });

  it("does not invent a publication date when only retrieval time is known", () => {
    const view = buildVoxyEditorialEvidenceWindowView({
      chapter: plan().chapters[0],
      context: context(),
      format: "16:9",
      outputLanguage: "de",
    });
    expect(view.sources[0].retrievedAt).toBe("2026-09-21T12:00:00.000Z");
    expect(view.sources[0]).not.toHaveProperty("publishedAt");
  });
});
