import { describe, expect, it } from "vitest";
import { finalizeSwipeQuestionCandidate } from "@/features/swipes/questionFinalizer";

describe("swipe question finalizer", () => {
  it("keeps incomplete agent output review-first", () => {
    const result = finalizeSwipeQuestionCandidate({
      id: "candidate-1",
      title: "Wie ordnest du verbindlichere Weiterbildungsregeln ein?",
      text: "Weiterbildung im Arbeitsalltag",
      category: "Arbeit",
      level: "Bund",
    });

    expect(result.status).toBe("needs_review");
    expect(result.requiresHumanReview).toBe(true);
    expect(result.quality.issues).toContain("missing_human_context");
    expect(result.quality.issues).toContain("missing_tradeoff");
    expect(result.quality.issues).toContain("missing_directional_consequences");
    expect(result.item.questionQualityAssessment?.ready).toBe(false);
  });

  it("normalizes consequence provenance instead of implying evidence", () => {
    const result = finalizeSwipeQuestionCandidate({
      id: "candidate-2",
      title: "Wie ordnest du verbindlichere Weiterbildungsregeln ein?",
      humanContext: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
      tradeoff: "Mehr Verbindlichkeit kann Beschäftigten Planung geben, begrenzt aber betriebliche Spielräume.",
      category: "Arbeit",
      level: "Bund",
      decisionConsequences: {
        agree: [
          { title: "Planbarkeit kann steigen", detail: "Beschäftigte könnten Weiterbildungszeiten verlässlicher einplanen." },
        ],
        disagree: [
          { title: "Betriebliche Flexibilität bleibt größer", detail: "Unternehmen könnten Lösungen stärker selbst gestalten." },
        ],
      },
    });

    expect(result.item.decisionConsequences?.agree[0]?.evidenceStatus).toBe("unverified");
    expect(result.item.decisionConsequences?.disagree[0]?.evidenceStatus).toBe("unverified");
  });

  it("blocks unsupported causal certainty but accepts sourced possible consequences", () => {
    const unsafe = finalizeSwipeQuestionCandidate({
      id: "candidate-3",
      title: "Wie ordnest du verbindlichere Weiterbildungsregeln ein?",
      humanContext: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
      tradeoff: "Mehr Verbindlichkeit kann Beschäftigten Planung geben, begrenzt aber betriebliche Spielräume.",
      category: "Arbeit",
      level: "Bund",
      decisionConsequences: {
        agree: [{ title: "Die Regelung erhöht Weiterbildungsteilnahme" }],
        disagree: [{ title: "Betriebliche Flexibilität bleibt größer" }],
      },
    });
    expect(unsafe.status).toBe("needs_review");
    expect(unsafe.quality.issues.some((issue) => String(issue).startsWith("unsupported_causal_certainty:agree"))).toBe(true);

    const supported = finalizeSwipeQuestionCandidate({
      id: "candidate-4",
      title: "Wie ordnest du verbindlichere Weiterbildungsregeln ein?",
      humanContext: "Weiterbildung scheitert im Arbeitsalltag oft an Zeit, Geld oder fehlenden Angeboten.",
      tradeoff: "Mehr Verbindlichkeit kann Beschäftigten Planung geben, begrenzt aber betriebliche Spielräume.",
      category: "Arbeit",
      level: "Bund",
      decisionConsequences: {
        agree: [
          {
            title: "Planbarkeit kann steigen",
            evidenceStatus: "supported",
            evidenceRefs: [{ id: "source-1", label: "Dossierquelle" }],
          },
        ],
        disagree: [
          {
            title: "Betriebliche Flexibilität kann größer bleiben",
            evidenceStatus: "hypothesis",
          },
        ],
      },
    });

    expect(supported.quality.ready).toBe(true);
    expect(supported.status).toBe("ready_for_review");
  });

  it("caps consequences at five per direction", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      title: `Mögliche Folge ${index + 1}`,
      evidenceStatus: "hypothesis" as const,
    }));
    const result = finalizeSwipeQuestionCandidate({
      id: "candidate-5",
      title: "Wie ordnest du diese Entscheidung ein?",
      humanContext: "Ein konkreter Alltagskontext mit ausreichend verständlicher Beschreibung liegt vor.",
      tradeoff: "Ein nachvollziehbarer Zielkonflikt zwischen Verbindlichkeit und Gestaltungsspielraum liegt vor.",
      decisionConsequences: { agree: many, disagree: many.map((entry) => ({ ...entry, title: `Andere ${entry.title}` })) },
    });

    expect(result.item.decisionConsequences?.agree).toHaveLength(5);
    expect(result.item.decisionConsequences?.disagree).toHaveLength(5);
  });
});
