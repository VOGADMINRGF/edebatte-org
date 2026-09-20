import type {
  CanonicalTopic,
  DecisionQuestion,
  JurisdictionContext,
} from "@features/topic/canonicalTopicResolutionContract";

export const TOPIC_QUALIFICATION_CLASSIFICATIONS = [
  "transient_event",
  "factual_clarification",
  "policy_question",
  "structural_system_question",
  "long_term_societal_choice",
] as const;

export type TopicQualificationClassification =
  (typeof TOPIC_QUALIFICATION_CLASSIFICATIONS)[number];

export const TOPIC_QUALIFICATION_REVIEW_STATES = [
  "clear",
  "review_required",
  "blocked_material_scope_error",
] as const;

export type TopicQualificationReviewState =
  (typeof TOPIC_QUALIFICATION_REVIEW_STATES)[number];

export type PublicQuestionGuardReleaseState =
  | "draft_allowed"
  | "review_required"
  | "blocked";

export type TopicQualificationScope = {
  currentProblem: string;
  jurisdictionState: "resolved" | "ambiguous" | "contradictory";
  symptomCauseState: "resolved" | "uncertain" | "confused";
  expansionState: "bounded" | "silent_system_expansion";
  statusQuoResearchNeed: "not_material" | "recorded" | "hidden_material";
};

export type MissingQuestionScopeReview = {
  scopeComplete: boolean;
  falseBinaryState: "none" | "resolved" | "unresolved";
  missingMaterialQuestions: string[];
};

export type TopicQualificationSystemQuestionInput = {
  qualificationId: string;
  canonicalTopic: Pick<CanonicalTopic, "id"> | null;
  canonicalDecisionQuestion?:
    | Pick<DecisionQuestion, "id" | "topicId" | "jurisdiction">
    | null;
  jurisdiction: JurisdictionContext | null;
  classification: string;
  rationale: string;
  neutralSystemQuestion: string;
  primaryGoal: string;
  goalIsMeasure: boolean;
  scope: TopicQualificationScope;
  horizon: string;
  controllableLevers: string[];
  explicitExclusions: string[];
  affectedGroups: string[];
  signalRefs: string[];
  evidenceRefs: string[];
  signalEvidenceBoundary: "separated" | "signal_promoted_to_evidence";
  missingQuestionScopeReview: MissingQuestionScopeReview;
  publicQuestionGuardState: PublicQuestionGuardReleaseState;
  duplicateTopicRisk: boolean;
  crossLanguageUncertainty: boolean;
  factualPreferenceCategoryError: boolean;
  normativeChoiceFramedAsFactSettled: boolean;
  factValueSeparation: "separated" | "unresolved";
  revision: number;
  reviewedRevision: number | null;
  providerConfidence?: number | null;
};

export type TopicQualificationSystemQuestionResult = {
  qualificationId: string;
  canonicalTopicId: string;
  canonicalDecisionQuestionId?: string;
  jurisdictionId: string;
  classification: TopicQualificationClassification | null;
  rationale: string;
  neutralSystemQuestion: string;
  primaryGoal: string;
  scope: TopicQualificationScope;
  horizon: string;
  controllableLevers: string[];
  explicitExclusions: string[];
  affectedGroups: string[];
  signalRefs: string[];
  missingQuestionScopeReview: MissingQuestionScopeReview;
  reviewState: TopicQualificationReviewState;
  revision: number;
  reasons: string[];
  requiresHumanReview: boolean;
  noAutoPublish: true;
  noDecisionAction: true;
  noEmpiricalTruthClaim: true;
};

const SYSTEM_SCOPE_CLASSIFICATIONS = new Set<TopicQualificationClassification>([
  "policy_question",
  "structural_system_question",
  "long_term_societal_choice",
]);

function clean(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function cleanList(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    const cleaned = clean(value);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }
  return result;
}

function parseClassification(value: string): TopicQualificationClassification | null {
  return TOPIC_QUALIFICATION_CLASSIFICATIONS.includes(
    value as TopicQualificationClassification,
  )
    ? (value as TopicQualificationClassification)
    : null;
}

function pushUnique(target: string[], reason: string): void {
  if (!target.includes(reason)) target.push(reason);
}

function jurisdictionId(question: TopicQualificationSystemQuestionInput["canonicalDecisionQuestion"]): string {
  return clean(question?.jurisdiction?.id);
}

/**
 * T1 is a pure fail-closed qualification boundary. It consumes already
 * structured domain state and never infers policy positions, empirical truth,
 * identities, or political preferences from free text.
 */
export function evaluateTopicQualificationSystemQuestion(
  input: TopicQualificationSystemQuestionInput,
): TopicQualificationSystemQuestionResult {
  const qualificationId = clean(input.qualificationId);
  const canonicalTopicId = clean(input.canonicalTopic?.id);
  const canonicalDecisionQuestionId = clean(input.canonicalDecisionQuestion?.id);
  const currentJurisdictionId = clean(input.jurisdiction?.id);
  const classification = parseClassification(clean(input.classification));
  const rationale = clean(input.rationale);
  const neutralSystemQuestion = clean(input.neutralSystemQuestion);
  const primaryGoal = clean(input.primaryGoal);
  const horizon = clean(input.horizon);
  const controllableLevers = cleanList(input.controllableLevers);
  const explicitExclusions = cleanList(input.explicitExclusions);
  const affectedGroups = cleanList(input.affectedGroups);
  const signalRefs = cleanList(input.signalRefs);
  const evidenceRefs = cleanList(input.evidenceRefs);
  const missingMaterialQuestions = cleanList(
    input.missingQuestionScopeReview?.missingMaterialQuestions,
  );
  const scope: TopicQualificationScope = {
    currentProblem: clean(input.scope?.currentProblem),
    jurisdictionState: input.scope?.jurisdictionState,
    symptomCauseState: input.scope?.symptomCauseState,
    expansionState: input.scope?.expansionState,
    statusQuoResearchNeed: input.scope?.statusQuoResearchNeed,
  };
  const missingQuestionScopeReview: MissingQuestionScopeReview = {
    scopeComplete: input.missingQuestionScopeReview?.scopeComplete === true,
    falseBinaryState: input.missingQuestionScopeReview?.falseBinaryState,
    missingMaterialQuestions,
  };

  const blockingReasons: string[] = [];
  const reviewReasons: string[] = [];

  if (!qualificationId) pushUnique(blockingReasons, "qualification_id_missing");
  if (!canonicalTopicId) pushUnique(blockingReasons, "canonical_topic_missing");
  if (!currentJurisdictionId) pushUnique(blockingReasons, "jurisdiction_missing");
  if (!classification) pushUnique(blockingReasons, "classification_unknown");
  if (!rationale) pushUnique(reviewReasons, "rationale_missing");
  if (!neutralSystemQuestion) {
    pushUnique(blockingReasons, "neutral_system_question_missing");
  }
  if (!primaryGoal) pushUnique(blockingReasons, "primary_goal_missing");
  if (input.goalIsMeasure) pushUnique(blockingReasons, "measure_substituted_for_goal");
  if (!scope.currentProblem) pushUnique(blockingReasons, "current_problem_scope_missing");
  if (!horizon) pushUnique(blockingReasons, "horizon_missing");
  if (affectedGroups.length === 0) {
    pushUnique(blockingReasons, "material_affected_groups_missing");
  }

  if (scope.jurisdictionState === "contradictory") {
    pushUnique(blockingReasons, "jurisdiction_contradictory");
  } else if (scope.jurisdictionState !== "resolved") {
    pushUnique(reviewReasons, "jurisdiction_unresolved");
  }

  if (input.canonicalDecisionQuestion) {
    if (clean(input.canonicalDecisionQuestion.topicId) !== canonicalTopicId) {
      pushUnique(blockingReasons, "decision_question_topic_mismatch");
    }
    const decisionJurisdictionId = jurisdictionId(input.canonicalDecisionQuestion);
    if (decisionJurisdictionId && decisionJurisdictionId !== currentJurisdictionId) {
      pushUnique(blockingReasons, "decision_question_jurisdiction_mismatch");
    }
  }

  if (scope.symptomCauseState !== "resolved") {
    pushUnique(reviewReasons, "symptom_cause_separation_unresolved");
  }
  if (scope.expansionState !== "bounded") {
    pushUnique(reviewReasons, "silent_system_question_expansion");
  }
  if (scope.statusQuoResearchNeed === "hidden_material") {
    pushUnique(blockingReasons, "material_status_quo_research_need_hidden");
  }

  if (classification && SYSTEM_SCOPE_CLASSIFICATIONS.has(classification)) {
    if (controllableLevers.length === 0) {
      pushUnique(reviewReasons, "controllable_levers_missing");
    }
    if (explicitExclusions.length === 0) {
      pushUnique(reviewReasons, "explicit_exclusions_missing");
    }
  }

  if (input.duplicateTopicRisk) pushUnique(reviewReasons, "duplicate_topic_risk_unresolved");
  if (input.crossLanguageUncertainty) {
    pushUnique(reviewReasons, "cross_language_uncertainty_unresolved");
  }
  if (input.factualPreferenceCategoryError) {
    pushUnique(blockingReasons, "factual_preference_category_error");
  }
  if (input.normativeChoiceFramedAsFactSettled) {
    pushUnique(blockingReasons, "normative_choice_framed_as_fact_settled");
  }
  if (input.factValueSeparation !== "separated") {
    pushUnique(reviewReasons, "fact_value_separation_unresolved");
  }

  if (input.signalEvidenceBoundary !== "separated") {
    pushUnique(blockingReasons, "signal_promoted_to_evidence");
  }
  if (signalRefs.some((signalRef) => evidenceRefs.includes(signalRef))) {
    pushUnique(blockingReasons, "signal_evidence_reference_overlap");
  }

  if (input.publicQuestionGuardState === "blocked") {
    pushUnique(blockingReasons, "public_question_guard_blocked");
  } else if (input.publicQuestionGuardState !== "draft_allowed") {
    pushUnique(reviewReasons, "public_question_guard_review_required");
  }

  if (!missingQuestionScopeReview.scopeComplete) {
    pushUnique(reviewReasons, "question_scope_review_incomplete");
  }
  if (missingQuestionScopeReview.falseBinaryState === "unresolved") {
    pushUnique(reviewReasons, "false_binary_unresolved");
  }
  if (missingMaterialQuestions.length > 0) {
    pushUnique(reviewReasons, "material_questions_missing");
  }

  if (
    !Number.isInteger(input.revision) ||
    input.revision <= 0 ||
    !Number.isInteger(input.reviewedRevision) ||
    input.reviewedRevision !== input.revision
  ) {
    pushUnique(blockingReasons, "revision_review_binding_missing");
  }

  const reviewState: TopicQualificationReviewState =
    blockingReasons.length > 0
      ? "blocked_material_scope_error"
      : reviewReasons.length > 0
        ? "review_required"
        : "clear";

  return {
    qualificationId,
    canonicalTopicId,
    ...(canonicalDecisionQuestionId ? { canonicalDecisionQuestionId } : {}),
    jurisdictionId: currentJurisdictionId,
    classification,
    rationale,
    neutralSystemQuestion,
    primaryGoal,
    scope,
    horizon,
    controllableLevers,
    explicitExclusions,
    affectedGroups,
    signalRefs,
    missingQuestionScopeReview,
    reviewState,
    revision: Number.isInteger(input.revision) ? input.revision : 0,
    reasons: [...blockingReasons, ...reviewReasons],
    requiresHumanReview: reviewState !== "clear",
    noAutoPublish: true,
    noDecisionAction: true,
    noEmpiricalTruthClaim: true,
  };
}
