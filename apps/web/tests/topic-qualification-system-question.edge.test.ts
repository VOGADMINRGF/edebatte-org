import { describe, expect, it } from "vitest";
import {
  evaluateTopicQualificationSystemQuestion,
  type TopicQualificationSystemQuestionInput,
} from "@features/topic/topicQualificationSystemQuestionContract";

function baseInput(
  overrides: Partial<TopicQualificationSystemQuestionInput> = {},
): TopicQualificationSystemQuestionInput {
  return {
    qualificationId: "t1-edge",
    canonicalTopic: { id: "topic-edge" },
    canonicalDecisionQuestion: null,
    jurisdiction: { level: "municipality", id: "city-edge", label: "Beispielstadt" },
    classification: "policy_question",
    rationale: "Die strukturierte Eingabe ist vollständig abgegrenzt.",
    neutralSystemQuestion: "Welche Rahmenbedingungen beeinflussen die Zielerreichung im abgegrenzten Untersuchungsraum?",
    primaryGoal: "Ein öffentliches Ziel nachvollziehbar untersuchen.",
    goalIsMeasure: false,
    scope: {
      currentProblem: "Der Untersuchungsbedarf ist abgegrenzt.",
      jurisdictionState: "resolved",
      symptomCauseState: "resolved",
      expansionState: "bounded",
      statusQuoResearchNeed: "recorded",
    },
    horizon: "mittelfristig",
    controllableLevers: ["Rahmenbedingungen"],
    explicitExclusions: ["keine Vorfestlegung einer Option"],
    affectedGroups: ["betroffene Bevölkerung"],
    signalRefs: ["signal-edge"],
    evidenceRefs: ["evidence-edge"],
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
    revision: 7,
    reviewedRevision: 7,
    ...overrides,
  };
}

describe("T1 fail-closed edges", () => {
  it("routes an unresolved false binary to review", () => {
    const input = baseInput();
    const result = evaluateTopicQualificationSystemQuestion({
      ...input,
      missingQuestionScopeReview: {
        ...input.missingQuestionScopeReview,
        falseBinaryState: "unresolved",
      },
    });

    expect(result.reviewState).toBe("review_required");
    expect(result.reasons).toContain("false_binary_unresolved");
  });

  it("blocks signal-to-evidence promotion and keeps signal refs as signals", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        signalEvidenceBoundary: "signal_promoted_to_evidence",
        signalRefs: ["signal-shared"],
        evidenceRefs: ["signal-shared"],
      }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.signalRefs).toEqual(["signal-shared"]);
    expect(result.reasons).toContain("signal_promoted_to_evidence");
    expect(result.reasons).toContain("signal_evidence_reference_overlap");
  });

  it("routes symptom/cause confusion to review without inventing a cause", () => {
    const input = baseInput();
    const result = evaluateTopicQualificationSystemQuestion({
      ...input,
      scope: { ...input.scope, symptomCauseState: "confused" },
    });

    expect(result.reviewState).toBe("review_required");
    expect(result.reasons).toContain("symptom_cause_separation_unresolved");
    expect(result.scope.symptomCauseState).toBe("confused");
  });

  it("produces the same domain decision for multilingual-equivalent structured inputs", () => {
    const german = evaluateTopicQualificationSystemQuestion(
      baseInput({
        rationale: "Die Frage bleibt im definierten Untersuchungsraum.",
        neutralSystemQuestion: "Welche Rahmenbedingungen beeinflussen das definierte Ziel?",
        primaryGoal: "Das definierte Ziel untersuchen.",
      }),
    );
    const english = evaluateTopicQualificationSystemQuestion(
      baseInput({
        rationale: "The question remains inside the defined scope.",
        neutralSystemQuestion: "Which conditions influence the defined goal?",
        primaryGoal: "Examine the defined goal.",
      }),
    );

    expect(english.reviewState).toBe(german.reviewState);
    expect(english.reasons).toEqual(german.reasons);
    expect(english.classification).toBe(german.classification);
  });

  it("cannot override a shared Public Question Guard review with provider confidence", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({ publicQuestionGuardState: "review_required", providerConfidence: 1 }),
    );

    expect(result.reviewState).toBe("review_required");
    expect(result.reasons).toContain("public_question_guard_review_required");
  });

  it("cannot override a shared Public Question Guard block with provider confidence", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({ publicQuestionGuardState: "blocked", providerConfidence: 1 }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.reasons).toContain("public_question_guard_blocked");
  });

  it("keeps duplicate-topic and cross-language uncertainty fail-closed", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        duplicateTopicRisk: true,
        crossLanguageUncertainty: true,
        providerConfidence: 1,
      }),
    );

    expect(result.reviewState).toBe("review_required");
    expect(result.reasons).toContain("duplicate_topic_risk_unresolved");
    expect(result.reasons).toContain("cross_language_uncertainty_unresolved");
  });

  it("blocks measure-as-goal substitution", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        primaryGoal: "Eine bestimmte Maßnahme einführen.",
        goalIsMeasure: true,
      }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.reasons).toContain("measure_substituted_for_goal");
  });

  it("blocks omitted affected groups and a hidden material no-change research need", () => {
    const input = baseInput({ affectedGroups: [] });
    const result = evaluateTopicQualificationSystemQuestion({
      ...input,
      scope: { ...input.scope, statusQuoResearchNeed: "hidden_material" },
    });

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.reasons).toContain("material_affected_groups_missing");
    expect(result.reasons).toContain("material_status_quo_research_need_hidden");
  });

  it("blocks missing revision/review binding", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({ revision: 8, reviewedRevision: 7 }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.reasons).toContain("revision_review_binding_missing");
  });

  it("blocks unknown classifications instead of coercing them", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({ classification: "model_generated_other" }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.classification).toBeNull();
    expect(result.reasons).toContain("classification_unknown");
  });

  it("blocks factual/preference category errors and normative choices framed as fact-settled", () => {
    const result = evaluateTopicQualificationSystemQuestion(
      baseInput({
        factualPreferenceCategoryError: true,
        normativeChoiceFramedAsFactSettled: true,
      }),
    );

    expect(result.reviewState).toBe("blocked_material_scope_error");
    expect(result.reasons).toContain("factual_preference_category_error");
    expect(result.reasons).toContain("normative_choice_framed_as_fact_settled");
  });
});
