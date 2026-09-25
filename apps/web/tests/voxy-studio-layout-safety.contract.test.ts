import { describe, expect, it } from "vitest";

import {
  VOXY_EDITORIAL_STORY_PLAN_VERSION,
  type VoxyEditorialStoryPlanValidation,
} from "@/features/voxyVideo/editorialStoryPlan";
import {
  evaluateVoxyStudioAllFormatLayoutSafety,
  evaluateVoxyStudioCaptionLayoutSafety,
  evaluateVoxyStudioLayoutSafety,
  mergeVoxyStudioAllFormatLayoutSafetyIntoValidation,
} from "@/features/voxyVideo/studioLayoutSafety";
import type { VoxyStudioDraft } from "@/features/voxyVideo/studioDraft";

function draft(overrides?: {
  headline?: string;
  narration?: string;
  title?: string;
}): Pick<VoxyStudioDraft, "storyPlan" | "safeZoneProfile" | "selectedFormat"> {
  return {
    safeZoneProfile: "video",
    selectedFormat: "9:16",
    storyPlan: {
      version: VOXY_EDITORIAL_STORY_PLAN_VERSION,
      storyPlanId: "layout-story",
      revision: 1,
      briefingId: "layout-briefing",
      dossierId: "layout-dossier",
      title: overrides?.title ?? "Wie Voxy Evidenz erklärt",
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
          headline: overrides?.headline ?? "Was ist passiert?",
          narration:
            overrides?.narration ??
            "Voxy trennt den belegten Ausgangspunkt sichtbar von offenen Fragen.",
          claimBindings: [],
          sourceIds: [],
          findingIds: [],
          openQuestionIds: [],
          evidenceWindow: { kind: "none", sourceIds: [], findingIds: [] },
          consequences: [],
          motion: "explaining",
        },
      ],
    },
  };
}

function editorialValidation(): VoxyEditorialStoryPlanValidation {
  return {
    errors: [],
    approvalBlockers: [],
    warnings: [],
    renderEligible: true,
  };
}

describe("Voxy Studio canonical layout safety", () => {
  it("keeps semantic regions inside the canonical safe area in all three target formats", () => {
    const matrix = evaluateVoxyStudioAllFormatLayoutSafety(draft());
    for (const result of Object.values(matrix)) {
      expect(result.semanticRegionsInsideSafeArea).toBe(true);
      expect(result.blockers.filter((item) => item.code.startsWith("semantic_region_outside_safe_area"))).toEqual([]);
    }
  });

  it("keeps ordinary editorial copy render-approval eligible", () => {
    const result = evaluateVoxyStudioLayoutSafety({ draft: draft(), format: "9:16" });
    expect(result.approvalEligible).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it("blocks an oversized headline without mutating the underlying copy", () => {
    const headline = "Sehr lange Headline ".repeat(12).trim();
    const result = evaluateVoxyStudioLayoutSafety({
      draft: draft({ headline }),
      format: "9:16",
    });
    expect(result.approvalEligible).toBe(false);
    expect(result.blockers.some((item) => item.code === "chapter_headline_overflow_risk")).toBe(true);
    expect(draft({ headline }).storyPlan.chapters[0]?.headline).toBe(headline);
  });

  it("merges any target-format overflow into the shared render-approval blockers", () => {
    const headline = "Sehr lange Headline ".repeat(12).trim();
    const validation = mergeVoxyStudioAllFormatLayoutSafetyIntoValidation({
      draft: draft({ headline }),
      validation: editorialValidation(),
    });

    expect(validation.renderEligible).toBe(false);
    expect(validation.approvalBlockers).toEqual(
      expect.arrayContaining([
        "layout:16:9:chapter_headline_overflow_risk",
        "layout:9:16:chapter_headline_overflow_risk",
        "layout:1:1:chapter_headline_overflow_risk",
      ]),
    );
    expect(draft({ headline }).storyPlan.chapters[0]?.headline).toBe(headline);
  });

  it("warns on long narration instead of treating a whole chapter as one caption cue", () => {
    const narration = "Lange Narration mit mehreren späteren Caption-Cues. ".repeat(18).trim();
    const result = evaluateVoxyStudioLayoutSafety({
      draft: draft({ narration }),
      format: "9:16",
    });
    expect(result.approvalEligible).toBe(true);
    expect(result.warnings.some((item) => item.code === "chapter_narration_dense")).toBe(true);
  });

  it("blocks the actual render handoff when one concrete caption cue exceeds the format budget", () => {
    const safe = evaluateVoxyStudioCaptionLayoutSafety({
      format: "9:16",
      captionCues: [
        { id: "cue-1", startMs: 0, endMs: 4_000, text: "Kurzer, lesbarer Untertitel." },
      ],
    });
    expect(safe.renderEligible).toBe(true);

    const unsafe = evaluateVoxyStudioCaptionLayoutSafety({
      format: "9:16",
      captionCues: [
        {
          id: "cue-long",
          startMs: 0,
          endMs: 4_000,
          text: "Zu langer Caption-Cue ".repeat(20).trim(),
        },
      ],
    });
    expect(unsafe.renderEligible).toBe(false);
    expect(unsafe.blockers.some((item) => item.code === "caption_cue:cue-long_overflow_risk")).toBe(true);
  });
});
