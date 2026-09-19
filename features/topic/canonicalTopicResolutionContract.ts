export type CanonicalTopicStatus = "active" | "review" | "archived";
export type CanonicalTopicReviewState = "verified" | "review_required";

export type CanonicalTopic = {
  id: string;
  key: string;
  canonicalTitle: string;
  status: CanonicalTopicStatus;
  reviewState: CanonicalTopicReviewState;
  dossierRefs: string[];
  anlassraumRefs: string[];
  decisionQuestionRefs: string[];
};

export type JurisdictionLevel =
  | "neighborhood"
  | "municipality"
  | "district"
  | "county"
  | "state"
  | "federal"
  | "eu"
  | "international";

export type JurisdictionContext = {
  level: JurisdictionLevel;
  id: string;
  label: string;
};

export type DecisionQuestion = {
  id: string;
  topicId: string;
  jurisdiction?: JurisdictionContext | null;
  question: string;
  kind: "decision" | "consultation" | "participation";
};

export type ExternalParticipationSignalType =
  | "petition"
  | "survey"
  | "citizen_initiative"
  | "association"
  | "public_session"
  | "proposal"
  | "administrative_procedure"
  | "event"
  | "round_table"
  | "local_action";

export type ExternalParticipationSignal = {
  id: string;
  sourceUrl: string;
  signalType: ExternalParticipationSignalType;
  initiator: string;
  jurisdiction?: JurisdictionContext | null;
  publishedOrPlannedAt?: string | null;
  freshness: "current" | "stale" | "unknown";
  sourceTrust: "verified" | "review_required" | "degraded";
  topicRelation: "candidate" | "supported" | "unknown";
  decisionQuestionRelation?: "candidate" | "supported" | "unknown";
  reviewState: "verified" | "review_required";
};

export type CanonicalTopicCandidate = {
  topic: CanonicalTopic;
  score: number;
  legacyMatchType?:
    | "exact_claim"
    | "related_claim"
    | "same_anlassraum"
    | "related_dossier"
    | "duplicate_risk"
    | "no_match";
};

export type CanonicalTopicResolutionResult =
  | {
      outcome: "existing_topic";
      topic: CanonicalTopic;
      jurisdiction: JurisdictionContext;
      decisionQuestion?: DecisionQuestion | null;
      externalSignals: ExternalParticipationSignal[];
      reasons: string[];
      requiresHumanReview: false;
    }
  | {
      outcome: "existing_decision_question";
      topic: CanonicalTopic;
      jurisdiction: JurisdictionContext;
      decisionQuestion: DecisionQuestion;
      externalSignals: ExternalParticipationSignal[];
      reasons: string[];
      requiresHumanReview: false;
    }
  | {
      outcome: "ambiguous_candidates";
      candidates: CanonicalTopicCandidate[];
      reasons: string[];
      requiresHumanReview: true;
    }
  | {
      outcome: "create_extension_required";
      candidateTopic?: CanonicalTopic | null;
      jurisdiction: JurisdictionContext;
      decisionQuestionCandidate?: Omit<DecisionQuestion, "id"> | null;
      externalSignals: ExternalParticipationSignal[];
      reasons: string[];
      requiresHumanReview: false;
    }
  | {
      outcome: "review_required";
      candidates: CanonicalTopicCandidate[];
      reasons: string[];
      requiresHumanReview: true;
    };

export type ResolveCanonicalTopicInput = {
  candidates: CanonicalTopicCandidate[];
  jurisdiction?: JurisdictionContext | null;
  decisionQuestions?: DecisionQuestion[];
  requestedDecisionQuestion?: string | null;
  externalSignals?: ExternalParticipationSignal[];
  sourceState: "ok" | "degraded";
  languageUncertain?: boolean;
  duplicateRisk?: boolean;
  fundingPreference?: unknown;
};

const MATCH_THRESHOLD = 0.62;
const AMBIGUITY_DELTA = 0.08;

function rankedCandidates(candidates: CanonicalTopicCandidate[]) {
  return [...candidates]
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || left.topic.id.localeCompare(right.topic.id));
}

function normalizeQuestion(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("de");
}

export function resolveCanonicalTopic(
  input: ResolveCanonicalTopicInput,
): CanonicalTopicResolutionResult {
  const candidates = rankedCandidates(input.candidates);

  if (input.sourceState === "degraded") {
    return {
      outcome: "review_required",
      candidates,
      reasons: ["match_source_degraded"],
      requiresHumanReview: true,
    };
  }

  if (!input.jurisdiction) {
    return {
      outcome: "review_required",
      candidates,
      reasons: ["jurisdiction_missing"],
      requiresHumanReview: true,
    };
  }

  if (input.languageUncertain) {
    return {
      outcome: "review_required",
      candidates,
      reasons: ["cross_language_uncertain"],
      requiresHumanReview: true,
    };
  }

  if (input.duplicateRisk || candidates[0]?.legacyMatchType === "duplicate_risk") {
    return {
      outcome: "review_required",
      candidates,
      reasons: ["duplicate_risk_requires_review"],
      requiresHumanReview: true,
    };
  }

  const plausible = candidates.filter((candidate) => candidate.score >= MATCH_THRESHOLD);
  if (
    plausible.length >= 2 &&
    Math.abs(plausible[0].score - plausible[1].score) <= AMBIGUITY_DELTA
  ) {
    return {
      outcome: "ambiguous_candidates",
      candidates: plausible,
      reasons: ["multiple_plausible_topics"],
      requiresHumanReview: true,
    };
  }

  const selected = plausible[0] ?? null;
  const externalSignals = input.externalSignals ?? [];

  if (!selected) {
    return {
      outcome: "create_extension_required",
      candidateTopic: null,
      jurisdiction: input.jurisdiction,
      decisionQuestionCandidate: input.requestedDecisionQuestion
        ? {
            topicId: "pending-topic",
            jurisdiction: input.jurisdiction,
            question: input.requestedDecisionQuestion.trim(),
            kind: "decision",
          }
        : null,
      externalSignals,
      reasons: ["no_reliable_existing_topic"],
      requiresHumanReview: false,
    };
  }

  if (input.requestedDecisionQuestion) {
    const requested = normalizeQuestion(input.requestedDecisionQuestion);
    const existing = (input.decisionQuestions ?? []).find(
      (question) =>
        question.topicId === selected.topic.id && normalizeQuestion(question.question) === requested,
    );

    if (existing) {
      return {
        outcome: "existing_decision_question",
        topic: selected.topic,
        jurisdiction: input.jurisdiction,
        decisionQuestion: existing,
        externalSignals,
        reasons: ["existing_topic_preferred", "existing_decision_question_preferred"],
        requiresHumanReview: false,
      };
    }

    return {
      outcome: "create_extension_required",
      candidateTopic: selected.topic,
      jurisdiction: input.jurisdiction,
      decisionQuestionCandidate: {
        topicId: selected.topic.id,
        jurisdiction: input.jurisdiction,
        question: input.requestedDecisionQuestion.trim(),
        kind: "decision",
      },
      externalSignals,
      reasons: ["existing_topic_preferred", "new_decision_question_candidate"],
      requiresHumanReview: false,
    };
  }

  return {
    outcome: "existing_topic",
    topic: selected.topic,
    jurisdiction: input.jurisdiction,
    decisionQuestion: null,
    externalSignals,
    reasons: ["existing_topic_preferred"],
    requiresHumanReview: false,
  };
}
