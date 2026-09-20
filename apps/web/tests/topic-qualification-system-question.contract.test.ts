import { describe, expect, it } from "vitest";
import {
  evaluateTopicQualificationSystemQuestion,
  type TopicQualificationSystemQuestionInput,
} from "@features/topic/topicQualificationSystemQuestionContract";
import type { JurisdictionContext } from "@features/topic/canonicalTopicResolutionContract";

const sachsenAnhalt: JurisdictionContext = {
  level: "state",
  id: "de-st",
  label: "Sachsen-Anhalt",
};

const germany: JurisdictionContext = {
  level: "federal",
  id: "de",
  label: "Deutschland",
};

function baseInput(
  overrides: Partial<TopicQualificationSystemQuestionInput> = {},
): TopicQualificationSystemQuestionInput {
  return {
    qualificationId: "t1-fixture-1",
    canonicalTopic: { id: "topic-example" },
    canonicalDecisionQuestion: null,
    jurisdiction: sachsenAnhalt,
    classification: "policy_question",
    rationale: "Die Frage wird als begrenzte politische Gestaltungsfrage untersucht.",
    neutralSystemQuestion: "Welche Rahmenbedingungen beeinflussen die Zielerreichung im abgegrenzten Untersuchungsraum?",
    primaryGoal: "Das benannte öffentliche Ziel nachvollziehbar untersuchen.",
    goalIsMeasure: false,
    scope: {
      currentProblem: "Ein abgegrenzter Handlungsbedarf ist beschrieben.",
      jurisdictionState: "resolved",
      symptomCauseState: "resolved",
      expansionState: "bounded",
      statusQuoResearchNeed: "recorded",
    },
    horizon: "bis 2035",
    controllableLevers: ["rechtlicher Rahmen", "Umsetzungsorganisation"],
    explicitExclusions: ["keine Vorfestlegung einer konkreten Maßnahme"],
    affectedGroups: ["betroffene Einwohnerinnen und Einwohner", "zuständige öffentliche Stellen"],
    signalRefs: ["signal-1"],
    evidenceRefs: ["evidence-1"],
    signalEvidenceBoundary: "separated",
    missingQuestionScopeReview: {
      scopeComplete: true,
      falseBinaryState: "none",
      missingMaterialQuestions: [],
    },
    publicQuestionGuardState: "draft_allowed",
    duplicateTopicRisk: false,
    crossLanguageUncertainty: false,
    factualPreferenceCategoryError: false,
    normativeChoiceFramedAsFactSettled: false,
    factValueSeparation: "separated",
    revision: 3,
    reviewedRevision: 3,
    ...overrides,
  };
}

describe("T1 topic qualification and system-question contract", () => {
  it("keeps a transient event bounded instead of silently expanding it into a system question", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        classification: "transient_event",
        rationale: "Ein zeitlich begrenztes Ereignis wird als Anlass, nicht als Systemdiagnose, erfasst.",
        neutralSystemQuestion: "Welche unmittelbar überprüfbaren Folgen des Ereignisses sind im benannten Zeitraum relevant?",
        primaryGoal: "Die Folgen des begrenzten Ereignisses strukturiert erfassen.",
        scope: {
          currentProblem: "Die unmittelbaren Folgen eines zeitlich begrenzten Ereignisses sind noch nicht vollständig geordnet.",
          jurisdictionState: "resolved",
          symptomCauseState: "resolved",
          expansionState: "bounded",
          statusQuoResearchNeed: "not_material",
        },
        horizon: "nächste vier Wochen",
        controllableLevers: [],
        explicitExclusions: [],
      }),
    );

    expect(result.reviewState).toBe("clear");
    expect(result.classification).toBe("transient_event");
    expect(result.controllableLevers).toEqual([]);
    expect(result.reasons).not.toContain("silent_system_question_expansion");
  });

  it("keeps factual clarification separate from preference-ballot logic", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        classification: "factual_clarification",
        rationale: "Die Eingabe verlangt die Klärung überprüfbarer Tatsachen.",
        neutralSystemQuestion: "Welche überprüfbaren Tatsachen sind für die benannte Sachfrage belegt oder offen?",
        primaryGoal: "Den überprüfbaren Sachstand abgrenzen.",
        scope: {
          currentProblem: "Der Tatsachenstand ist unvollständig geklärt.",
          jurisdictionState: "resolved",
          symptomCauseState: "resolved",
          expansionState: "bounded",
          statusQuoResearchNeed: "not_material",
        },
        horizon: "aktueller Sachstand",
        controllableLevers: [],
        explicitExclusions: [],
      }),
    );

    expect(result.reviewState).toBe("clear");
    expect(result.classification).toBe("factual_clarification");
    expect(result.noEmpiricalTruthClaim).toBe(true);
    expect(result.noAutoPublish).toBe(true);
  });

  it("accepts a bounded policy question only when the goal is separate from measures", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        classification: "policy_question",
        primaryGoal: "Den Zugang zu einer öffentlichen Leistung verlässlich gestalten.",
        controllableLevers: ["Zugangsregeln", "Verfahrensgestaltung"],
        explicitExclusions: ["keine Festlegung auf eine einzelne Maßnahme"],
      }),
    );

    expect(result.reviewState).toBe("clear");
    expect(result.primaryGoal).toContain("Zugang");
    expect(result.controllableLevers).toEqual(["Zugangsregeln", "Verfahrensgestaltung"]);
  });

  it("accepts the Education / Sachsen-Anhalt fixture as neutral scope architecture", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        qualificationId: "t1-education-st",
        canonicalTopic: { id: "topic-education" },
        jurisdiction: sachsenAnhalt,
        classification: "structural_system_question",
        rationale: "Die Strukturfrage trennt Ziel, Untersuchungsraum und mögliche Stellhebel ohne eine Maßnahme zu empfehlen.",
        neutralSystemQuestion: "Welche Rahmenbedingungen beeinflussen in Sachsen-Anhalt die langfristige Verlässlichkeit schulischer Bildungsangebote?",
        primaryGoal: "Die langfristige Verlässlichkeit schulischer Bildungsangebote als Untersuchungsziel beschreiben.",
        scope: {
          currentProblem: "Langfristige Verlässlichkeit und Kapazität schulischer Bildungsangebote sollen systematisch untersucht werden.",
          jurisdictionState: "resolved",
          symptomCauseState: "resolved",
          expansionState: "bounded",
          statusQuoResearchNeed: "recorded",
        },
        horizon: "kommende zehn Jahre",
        controllableLevers: ["Ressourcenplanung", "Standort- und Angebotsorganisation", "Ausbildungs- und Personalpfade"],
        explicitExclusions: ["keine Bewertung einzelner Parteien oder Personen", "keine Vorfestlegung einer konkreten Reform"],
        affectedGroups: ["Schülerinnen und Schüler", "Eltern", "Beschäftigte im Bildungsbereich", "Schulträger"],
      }),
    );

    expect(result.reviewState).toBe("clear");
    expect(result.jurisdictionId).toBe("de-st");
    expect(result.classification).toBe("structural_system_question");
    expect(result.noDecisionAction).toBe(true);
  });

  it("accepts the Pension fixture as a long-term societal-choice scope without policy ranking", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        qualificationId: "t1-pension-de",
        canonicalTopic: { id: "topic-pension" },
        jurisdiction: germany,
        classification: "long_term_societal_choice",
        rationale: "Die Langfristfrage trennt Ziel, Zielkonflikte und untersuchbare Stellhebel ohne Optionen zu bewerten.",
        neutralSystemQuestion: "Welche langfristigen Rahmenbedingungen sind für die Tragfähigkeit und Verteilungseffekte der Alterssicherung zu untersuchen?",
        primaryGoal: "Langfristige Tragfähigkeit und Verteilungseffekte der Alterssicherung transparent untersuchen.",
        scope: {
          currentProblem: "Langfristige demografische und finanzielle Rahmenbedingungen erzeugen einen fortlaufenden Untersuchungsbedarf.",
          jurisdictionState: "resolved",
          symptomCauseState: "resolved",
          expansionState: "bounded",
          statusQuoResearchNeed: "recorded",
        },
        horizon: "mehrere Jahrzehnte",
        controllableLevers: ["Finanzierungsregeln", "Leistungsregeln", "Übergangs- und Anpassungsmechanismen"],
        explicitExclusions: ["keine Rangfolge politischer Optionen", "keine Empfehlung einer konkreten Reform"],
        affectedGroups: ["Beitragszahlende", "Leistungsempfangende", "künftige Generationen", "Arbeitgebende"],
      }),
    );

    expect(result.reviewState).toBe("clear");
    expect(result.classification).toBe("long_term_societal_choice");
    expect(result.scope.statusQuoResearchNeed).toBe("recorded");
  });

  it("routes ambiguous jurisdiction to review instead of returning clear", () => {
    const input = baseInput();
    const result = evaluateTopicQualificationSystemQuestion({
      ...input,
      scope: { ...input.scope, jurisdictionState: "ambiguous" },
      providerConfidence: 1,
    });

    expect(result.reviewState).toBe("review_required");
    expect(result.reasons).toContain("jurisdiction_unresolved");
  });
});
