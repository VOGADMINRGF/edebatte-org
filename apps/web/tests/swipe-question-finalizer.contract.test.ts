import { describe, expect, it } from "vitest";
import {
  assessSwipeQuestionEvidence,
  buildSwipeQuestionFinalizerAgentPrompt,
  finalizeSwipeQuestionCandidate,
} from "@/features/swipes/swipeQuestionFinalizer";
import type { SwipeItem } from "@/features/swipes/types";

function item(overrides: Partial<SwipeItem> = {}): SwipeItem {
  return {
    id: "question-1",
    title: "Wie stehst du dazu, dass Weiterbildung verlässlicher ermöglicht wird?",
    text: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
    humanContext: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
    tradeoff: "Verlässlichere Freiräume können Zugänge verbessern, begrenzen aber betriebliche Flexibilität.",
    decisionConsequences: {
      agree: [
        {
          title: "Planbarere Freiräume",
          detail: "Beschäftigte könnten Weiterbildung leichter in ihren Arbeitsalltag integrieren.",
          evidenceStatus: "supported",
          sourceRefs: ["evidence:study-1"],
        },
      ],
      disagree: [
        {
          title: "Mehr betrieblicher Spielraum",
          detail: "Betriebe könnten ihre bisherigen Lösungen flexibler beibehalten.",
          evidenceStatus: "mixed",
          sourceRefs: ["evidence:study-2"],
        },
      ],
    },
    category: "Arbeit",
    level: "Bund",
    topicTags: ["Arbeit", "Weiterbildung"],
    evidenceCount: 2,
    responsibilityLabel: "Zuständigkeit: Bund",
    domainLabel: "Arbeit",
    hasEventualities: false,
    eventualitiesCount: 0,
    ...overrides,
  };
}

describe("swipe question finalizer", () => {
  it("returns a review candidate and never authorizes automatic publication", () => {
    const result = finalizeSwipeQuestionCandidate(item());

    expect(result.status).toBe("ready_for_review");
    expect(result.questionQualityAssessment).toEqual({ ready: true, issues: [] });
    expect(result.evidenceAssessment.issues).toEqual([]);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.canAutoPublish).toBe(false);
  });

  it("fails review readiness when consequence evidence status is missing", () => {
    const candidate = item();
    candidate.decisionConsequences = {
      agree: [{ title: "Mögliche Folge", detail: "Eine Veränderung könnte eintreten." }],
      disagree: [{ title: "Andere Folge", detail: "Die bisherige Lage könnte eher bestehen bleiben." }],
    };

    const result = finalizeSwipeQuestionCandidate(candidate);
    expect(result.status).toBe("needs_review");
    expect(result.evidenceAssessment.issues).toContain("missing_consequence_evidence_status");
    expect(result.finalizationNeeds).toContain("evidence:missing_consequence_evidence_status");
  });

  it("requires provenance for consequences labelled supported or mixed", () => {
    const assessment = assessSwipeQuestionEvidence({
      agree: [{ title: "Folge A", evidenceStatus: "supported" }],
      disagree: [{ title: "Folge B", evidenceStatus: "mixed", sourceRefs: ["  "] }],
    });

    expect(assessment.issues).toContain("supported_consequence_missing_source");
    expect(assessment.issues).toContain("mixed_consequence_missing_source");
  });

  it("rejects unverified or hypothetical consequences phrased as certain causality", () => {
    const assessment = assessSwipeQuestionEvidence({
      agree: [
        {
          title: "Wartezeiten sinken",
          detail: "Die Maßnahme reduziert Wartezeiten.",
          evidenceStatus: "unverified",
        },
      ],
      disagree: [
        {
          title: "Kosten steigen",
          detail: "Das führt zu höheren Kosten.",
          evidenceStatus: "hypothesis",
        },
      ],
    });

    expect(assessment.issues).toContain("unverified_consequence_uses_certain_language");
    expect(assessment.issues).toContain("hypothesis_consequence_uses_certain_language");
  });

  it("allows explicitly uncertain hypotheses to proceed to human review", () => {
    const candidate = item({
      decisionConsequences: {
        agree: [
          {
            title: "Mehr Nutzung möglich",
            detail: "Je nach Umsetzung könnte das Angebot häufiger genutzt werden.",
            evidenceStatus: "hypothesis",
          },
        ],
        disagree: [
          {
            title: "Bestehende Nutzungsmuster können bleiben",
            detail: "Ohne die Änderung kann sich die Nutzung ähnlich entwickeln wie bisher.",
            evidenceStatus: "unverified",
          },
        ],
      },
    });

    const result = finalizeSwipeQuestionCandidate(candidate);
    expect(result.status).toBe("ready_for_review");
    expect(result.evidenceAssessment.hypothesisCount).toBe(1);
    expect(result.evidenceAssessment.unverifiedCount).toBe(1);
    expect(result.humanReviewRequired).toBe(true);
  });

  it("combines neutral question guidance with evidence rules for producer agents", () => {
    const prompt = buildSwipeQuestionFinalizerAgentPrompt();
    expect(prompt).toContain("SWIPE-QUESTION-QUALITY");
    expect(prompt).toContain("SWIPE-CONSEQUENCE-EVIDENCE");
    expect(prompt).toContain("supported, mixed, unverified oder hypothesis");
    expect(prompt).toContain("Erfinde niemals sourceRefs");
    expect(prompt).toContain("Review-Kandidat");
    expect(prompt).toContain("nicht selbst veröffentlichen");
  });
});
