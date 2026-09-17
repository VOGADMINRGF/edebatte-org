/**
 * T1 Topic Qualification / System Question contract.
 *
 * This contract does not create CanonicalTopic, DecisionQuestion, JurisdictionContext,
 * Dossier, Evidence or Poll truth. It only carries references to their canonical owners
 * and validates whether a reviewed topic candidate may enter the Decision-Dossier
 * research lane.
 */

export const TOPIC_QUALIFICATION_KINDS = [
  "transient_event",
  "factual_clarification",
  "policy_question",
  "structural_system_question",
  "long_term_societal_choice",
] as const;
export type TopicQualificationKind = (typeof TOPIC_QUALIFICATION_KINDS)[number];

export const TOPIC_QUALIFICATION_DISPOSITIONS = [
  "signal_only",
  "clarification_only",
  "research_candidate",
  "review_required",
] as const;
export type TopicQualificationDisposition = (typeof TOPIC_QUALIFICATION_DISPOSITIONS)[number];

export const TOPIC_TIME_HORIZONS = [
  "immediate",
  "short_term",
  "medium_term",
  "long_term",
  "multi_generational",
] as const;
export type TopicTimeHorizon = (typeof TOPIC_TIME_HORIZONS)[number];

export type TopicQualificationReview = Readonly<{
  status: "reviewed" | "pending" | "rejected";
  reviewerRef: string | null;
  revision: string | null;
  reviewedAt: string | null;
}>;

export type TopicQualificationScope = Readonly<{
  included: readonly string[];
  excluded: readonly string[];
  affectedGroups: readonly string[];
  controllableLevers: readonly string[];
  horizon: TopicTimeHorizon;
}>;

export type TopicQualificationRecord = Readonly<{
  /** Reference only. Canonical owner remains CanonicalTopic. */
  canonicalTopicId: string;
  /** Optional reference only. Canonical owner remains DecisionQuestion. */
  decisionQuestionId: string | null;
  /** Reference only. Canonical owner remains JurisdictionContext. */
  jurisdictionContextId: string;
  kind: TopicQualificationKind;
  rationale: string;
  /** Goal is mandatory before any candidate measure can advance. */
  goal: string;
  scope: TopicQualificationScope;
  /** Signals are relevance/provenance references, never evidence by themselves. */
  signalIds: readonly string[];
  /** Optional labels are carried for context only and cannot satisfy goal/scope gates. */
  candidateMeasureLabels?: readonly string[];
  review: TopicQualificationReview;
}>;

export type TopicQualificationResult = Readonly<{
  disposition: TopicQualificationDisposition;
  systemQuestionEligible: boolean;
  reasons: readonly string[];
  canonicalTopicId: string | null;
  decisionQuestionId: string | null;
  jurisdictionContextId: string | null;
  signalIds: readonly string[];
  signalsAreEvidence: false;
}>;

const present = (value: string | null | undefined): value is string => Boolean(value?.trim());

const hasOnlyMeaningfulStrings = (values: readonly string[]) =>
  values.length > 0 && values.every((value) => present(value));

const hasNoBlankStrings = (values: readonly string[]) => values.every((value) => present(value));

const reviewComplete = (review: TopicQualificationReview) =>
  review.status === "reviewed" &&
  present(review.reviewerRef) &&
  present(review.revision) &&
  present(review.reviewedAt);

export function validateTopicQualificationRecord(record: TopicQualificationRecord): readonly string[] {
  const reasons: string[] = [];

  if (!present(record.canonicalTopicId)) reasons.push("canonical_topic_missing");
  if (!present(record.jurisdictionContextId)) reasons.push("jurisdiction_missing");
  if (!present(record.rationale)) reasons.push("rationale_missing");
  if (!present(record.goal)) reasons.push("goal_missing");
  if (!hasOnlyMeaningfulStrings(record.scope.included)) reasons.push("scope_included_missing");
  if (!hasNoBlankStrings(record.scope.excluded)) reasons.push("scope_excluded_invalid");
  if (!hasOnlyMeaningfulStrings(record.scope.affectedGroups)) reasons.push("affected_groups_missing");
  if (!hasOnlyMeaningfulStrings(record.scope.controllableLevers)) reasons.push("controllable_levers_missing");
  if (!hasNoBlankStrings(record.signalIds)) reasons.push("signal_id_invalid");
  if (record.candidateMeasureLabels && !hasNoBlankStrings(record.candidateMeasureLabels)) {
    reasons.push("candidate_measure_invalid");
  }

  if (record.review.status === "rejected") reasons.push("review_rejected");
  else if (!reviewComplete(record.review)) reasons.push("review_incomplete");

  if (
    record.decisionQuestionId !== null &&
    !present(record.decisionQuestionId)
  ) {
    reasons.push("decision_question_invalid");
  }

  return Object.freeze(reasons);
}

export function resolveTopicQualification(
  record: TopicQualificationRecord,
): TopicQualificationResult {
  const validationReasons = validateTopicQualificationRecord(record);
  const base = {
    canonicalTopicId: present(record.canonicalTopicId) ? record.canonicalTopicId : null,
    decisionQuestionId: present(record.decisionQuestionId) ? record.decisionQuestionId : null,
    jurisdictionContextId: present(record.jurisdictionContextId)
      ? record.jurisdictionContextId
      : null,
    signalIds: Object.freeze([...record.signalIds]),
    signalsAreEvidence: false as const,
  };

  if (validationReasons.length > 0) {
    return {
      ...base,
      disposition: "review_required",
      systemQuestionEligible: false,
      reasons: validationReasons,
    };
  }

  switch (record.kind) {
    case "transient_event":
      return {
        ...base,
        disposition: "signal_only",
        systemQuestionEligible: false,
        reasons: ["transient_event_not_promoted_without_requalification"],
      };
    case "factual_clarification":
      return {
        ...base,
        disposition: "clarification_only",
        systemQuestionEligible: false,
        reasons: ["factual_clarification_not_a_decision_dossier_by_itself"],
      };
    case "policy_question":
    case "structural_system_question":
    case "long_term_societal_choice":
      return {
        ...base,
        disposition: "research_candidate",
        systemQuestionEligible: true,
        reasons: ["reviewed_system_question_candidate"],
      };
  }
}

export function t1CanCreateCanonicalTopic(): false {
  return false;
}

export function t1CanTreatSignalsAsEvidence(): false {
  return false;
}

export function t1CanPublishOrActivate(): false {
  return false;
}
