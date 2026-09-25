import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/config/locales";
import { buildCanonicalSourcePack } from "@/features/create/canonicalSourcePackContract";
import {
  VOXY_EDITORIAL_SUPPORTED_LOCALES,
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  buildVoxyEditorialTimeline,
  resolveVoxyEvidenceWindowPresentation,
  validateVoxyEditorialStoryPlan,
  validateVoxyShortformDerivation,
  type VoxyEditorialEvidenceContext,
  type VoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";

function evidenceContext(): VoxyEditorialEvidenceContext {
  return {
    sourcePack: buildCanonicalSourcePack({
      sourcePackId: "source-pack-1",
      reviewState: "approved",
      sources: [
        {
          sourceId: "source-primary",
          title: "Primärdokument",
          sourceLocale: "de",
          sourceType: "official",
          reliabilityHint: "primary",
          translationStatus: "not_needed",
          evidenceState: "supported",
          reviewState: "approved",
        },
        {
          sourceId: "source-position",
          title: "Dokumentierte Gegenposition",
          sourceLocale: "de",
          sourceType: "civil_society",
          reliabilityHint: "secondary",
          translationStatus: "not_needed",
          evidenceState: "supported",
          reviewState: "approved",
        },
      ],
    }),
    claims: [
      {
        claimId: "claim-fact",
        dossierId: "dossier-1",
        text: "Der dokumentierte Sachverhalt ist belegt.",
        kind: "fact",
        status: "supported",
        createdByRole: "editor",
      },
      {
        claimId: "claim-position",
        dossierId: "dossier-1",
        text: "Eine relevante Position bewertet die Folge anders.",
        kind: "interpretation",
        status: "supported",
        createdByRole: "editor",
      },
    ],
    findings: [
      {
        findingId: "finding-fact",
        dossierId: "dossier-1",
        claimId: "claim-fact",
        verdict: "supports",
        rationale: ["Primärdokument trägt den Sachverhalt."],
        citations: [{ sourceId: "source-primary", locator: "Abschnitt 2" }],
        producedBy: "editor",
      },
    ],
    openQuestions: [],
  };
}

function basePlan(): VoxyEditorialStoryPlan {
  return {
    version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
    storyPlanId: "story-plan-1",
    revision: 3,
    briefingId: "briefing-1",
    dossierId: "dossier-1",
    title: "Was ist passiert und was ist belegt?",
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
        narration: "Zuerst der belegte Ausgangspunkt.",
        claimBindings: [
          { claimId: "claim-fact", presentation: "confirmed_fact" },
        ],
        sourceIds: ["source-primary"],
        findingIds: ["finding-fact"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-fact"],
        },
        consequences: [],
        motion: "highlighting_source",
      },
      {
        chapterId: "evidence",
        role: "source_evidence",
        headline: "Worauf stützt sich das?",
        narration: "Die Quelle und der Fundort bleiben sichtbar.",
        claimBindings: [
          { claimId: "claim-fact", presentation: "confirmed_fact" },
        ],
        sourceIds: ["source-primary"],
        findingIds: ["finding-fact"],
        openQuestionIds: [],
        evidenceWindow: {
          kind: "source",
          sourceIds: ["source-primary"],
          findingIds: ["finding-fact"],
        },
        consequences: [],
        motion: "explaining",
      },
    ],
  };
}

describe("Voxy Editorial Story Plan", () => {
  it("binds directly to the public supported locale SSOT", () => {
    expect(VOXY_EDITORIAL_SUPPORTED_LOCALES).toEqual(SUPPORTED_LOCALES);
    expect(VOXY_EDITORIAL_SUPPORTED_LOCALES).toEqual([
      "de",
      "en",
      "fr",
      "pl",
      "es",
      "it",
      "tr",
      "ar",
      "ru",
      "zh",
      "nl",
      "pt",
      "fi",
      "sv",
      "no",
      "cs",
      "hi",
      "ro",
      "el",
      "uk",
    ]);
  });

  it("allows a confirmed fact only when approved supporting evidence is bound", () => {
    const result = validateVoxyEditorialStoryPlan(basePlan(), evidenceContext());
    expect(result.errors).toEqual([]);
    expect(result.approvalBlockers).toEqual([]);
    expect(result.renderEligible).toBe(true);
  });

  it("fails closed when a confirmed fact loses supported approved evidence", () => {
    const context = evidenceContext();
    context.sourcePack.sources[0] = {
      ...context.sourcePack.sources[0],
      evidenceState: "contested",
    };
    const result = validateVoxyEditorialStoryPlan(basePlan(), context);
    expect(result.renderEligible).toBe(false);
    expect(result.approvalBlockers).toContain(
      "confirmed_fact_missing_approved_evidence:claim-fact",
    );
  });

  it("does not turn a relevant position into a confirmed fact or skeptical performance cue", () => {
    const plan = basePlan();
    plan.chapters.push({
      chapterId: "position",
      role: "relevant_positions",
      headline: "Welche Position widerspricht?",
      narration: "Die Position wird als Position attribuiert und nicht als Fakt behauptet.",
      claimBindings: [
        { claimId: "claim-position", presentation: "attributed_position" },
      ],
      sourceIds: ["source-position"],
      findingIds: [],
      openQuestionIds: [],
      evidenceWindow: {
        kind: "source",
        sourceIds: ["source-position"],
        findingIds: [],
      },
      consequences: [],
      motion: "questioning",
    });
    const result = validateVoxyEditorialStoryPlan(plan, evidenceContext());
    expect(result.errors).toContain(
      "position_chapter_must_not_use_questioning_motion:position",
    );
    expect(result.renderEligible).toBe(false);
  });

  it("requires uncertainty to be visible when unresolved claims or questions exist", () => {
    const context = evidenceContext();
    context.claims.push({
      claimId: "claim-unclear",
      dossierId: "dossier-1",
      text: "Dieser Punkt ist noch offen.",
      kind: "fact",
      status: "unclear",
      createdByRole: "editor",
    });
    const result = validateVoxyEditorialStoryPlan(basePlan(), context);
    expect(result.approvalBlockers).toContain("uncertainty_chapter_required");
    expect(result.renderEligible).toBe(false);
  });

  it("supports an eight-minute explainer without changing the legacy eight-second fixture", () => {
    const timeline = buildVoxyEditorialTimeline({
      plan: basePlan(),
      chapterDurationsMs: {
        "what-happened": 180_000,
        evidence: 300_000,
      },
    });
    expect(timeline.durationMs).toBe(480_000);
    expect(timeline.chapters).toEqual([
      expect.objectContaining({ chapterId: "what-happened", startMs: 0, endMs: 180_000 }),
      expect.objectContaining({ chapterId: "evidence", startMs: 180_000, endMs: 480_000 }),
    ]);
  });

  it("keeps evidence layout readable across formats", () => {
    const comparison = {
      kind: "comparison" as const,
      sourceIds: ["source-primary", "source-position"],
      findingIds: [],
    };
    expect(
      resolveVoxyEvidenceWindowPresentation({ format: "16:9", window: comparison }),
    ).toBe("side_by_side");
    expect(
      resolveVoxyEvidenceWindowPresentation({ format: "9:16", window: comparison }),
    ).toBe("sequence");
    expect(
      resolveVoxyEvidenceWindowPresentation({ format: "1:1", window: comparison }),
    ).toBe("sequence");
  });

  it("allows shortform only as a subset of the approved longform truth", () => {
    const longform = basePlan();
    const shortform: VoxyEditorialStoryPlan = {
      ...basePlan(),
      storyPlanId: "story-plan-1-preview",
      revision: 1,
      durationClass: "preview",
      derivedFromStoryPlanId: longform.storyPlanId,
      derivedFromRevision: longform.revision,
      chapters: [basePlan().chapters[0]],
    };
    expect(validateVoxyShortformDerivation({ longform, shortform })).toEqual([]);

    shortform.chapters[0] = {
      ...shortform.chapters[0],
      claimBindings: [
        ...shortform.chapters[0].claimBindings,
        { claimId: "new-shortform-claim", presentation: "confirmed_fact" },
      ],
    };
    expect(validateVoxyShortformDerivation({ longform, shortform })).toContain(
      "shortform_introduces_new_claim:new-shortform-claim",
    );
  });
});
