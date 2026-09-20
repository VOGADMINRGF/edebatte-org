import {
  assessSwipeQuestionDeckQuality,
  type SwipeQuestionDeckQualityAssessment,
} from "./questionQualityContract";
import {
  finalizeSwipeQuestionCandidate,
  type SwipeQuestionFinalizerInput,
  type SwipeQuestionFinalizerQuality,
  type SwipeQuestionFinalizerStatus,
} from "./questionFinalizer";
import type { SwipeItem } from "./types";

export type ParticipationOptionCandidate = {
  id: string;
  item: SwipeItem;
  status: SwipeQuestionFinalizerStatus;
  quality: SwipeQuestionFinalizerQuality;
  requiresHumanReview: boolean;
};

export type ParticipationDedupeGroup = {
  normalizedQuestion: string;
  candidateIds: string[];
  requiresHumanReview: true;
};

/**
 * Review-priority metadata only. It MUST NOT be used to rank political choices
 * by desirability, ideology, persuasion value or predicted voter preference.
 */
export type ParticipationRankingHint = {
  candidateId: string;
  kind: "review_priority";
  reason: "question_quality_failed" | "provenance_or_evidence_open";
};

export type ParticipationExclusionSuggestion = {
  candidateId: string;
  reason: "question_quality_failed" | "exact_duplicate_question";
  automatic: false;
};

export type ParticipationFinalizationNeed = {
  candidateId: string | null;
  kind:
    | "question_quality_review"
    | "provenance_review"
    | "dedupe_review"
    | "deck_repetition_review";
  issues: string[];
};

export type ParticipationQuestionQualityAssessment = {
  readyForHumanReview: boolean;
  candidates: Array<{
    candidateId: string;
    ready: boolean;
    issues: string[];
  }>;
  deck: SwipeQuestionDeckQualityAssessment;
};

export type ParticipationOptionFinalizerOutput = {
  optionCandidates: ParticipationOptionCandidate[];
  dedupeGroups: ParticipationDedupeGroup[];
  rankingHints: ParticipationRankingHint[];
  exclusions: ParticipationExclusionSuggestion[];
  questionQualityAssessment: ParticipationQuestionQualityAssessment;
  finalizationNeeds: ParticipationFinalizationNeed[];
  noAutoPublish: true;
  noAutoExclude: true;
  humanReviewRequiredBeforePublicFinalization: true;
};

function normalizeQuestion(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9äöüß\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExactDedupeGroups(
  candidates: ParticipationOptionCandidate[],
): ParticipationDedupeGroup[] {
  const groups = new Map<string, string[]>();
  for (const candidate of candidates) {
    const normalizedQuestion = normalizeQuestion(candidate.item.title);
    if (!normalizedQuestion) continue;
    const ids = groups.get(normalizedQuestion) ?? [];
    ids.push(candidate.id);
    groups.set(normalizedQuestion, ids);
  }

  return Array.from(groups.entries())
    .filter(([, candidateIds]) => candidateIds.length > 1)
    .map(([normalizedQuestion, candidateIds]) => ({
      normalizedQuestion,
      candidateIds,
      requiresHumanReview: true as const,
    }));
}

function hasProvenanceIssue(issues: string[]): boolean {
  return issues.some((issue) =>
    issue.startsWith("unsupported_causal_certainty:") ||
    issue.includes("evidence") ||
    issue.includes("provenance"),
  );
}

/**
 * Canonical deterministic finalizer for Part16's participation/voting lane.
 * It prepares review metadata only: no publish, no political desirability
 * ranking and no automatic exclusion is authorized here.
 */
export function finalizeParticipationOptionSet(
  inputs: SwipeQuestionFinalizerInput[],
): ParticipationOptionFinalizerOutput {
  const optionCandidates = inputs.map((input): ParticipationOptionCandidate => {
    const finalized = finalizeSwipeQuestionCandidate(input);
    return {
      id: input.id,
      item: finalized.item,
      status: finalized.status,
      quality: finalized.quality,
      requiresHumanReview: finalized.requiresHumanReview,
    };
  });

  const deck = assessSwipeQuestionDeckQuality(
    optionCandidates.map((candidate) => candidate.item),
  );
  const dedupeGroups = buildExactDedupeGroups(optionCandidates);
  const duplicateIds = new Set(dedupeGroups.flatMap((group) => group.candidateIds));

  const rankingHints: ParticipationRankingHint[] = [];
  const exclusions: ParticipationExclusionSuggestion[] = [];
  const finalizationNeeds: ParticipationFinalizationNeed[] = [];

  for (const candidate of optionCandidates) {
    if (!candidate.quality.ready) {
      rankingHints.push({
        candidateId: candidate.id,
        kind: "review_priority",
        reason: hasProvenanceIssue(candidate.quality.issues)
          ? "provenance_or_evidence_open"
          : "question_quality_failed",
      });
      exclusions.push({
        candidateId: candidate.id,
        reason: "question_quality_failed",
        automatic: false,
      });
      finalizationNeeds.push({
        candidateId: candidate.id,
        kind: hasProvenanceIssue(candidate.quality.issues)
          ? "provenance_review"
          : "question_quality_review",
        issues: candidate.quality.issues,
      });
    }

    if (duplicateIds.has(candidate.id)) {
      exclusions.push({
        candidateId: candidate.id,
        reason: "exact_duplicate_question",
        automatic: false,
      });
    }
  }

  for (const group of dedupeGroups) {
    finalizationNeeds.push({
      candidateId: null,
      kind: "dedupe_review",
      issues: [`exact_duplicate_question:${group.candidateIds.join(",")}`],
    });
  }

  if (!deck.ready) {
    finalizationNeeds.push({
      candidateId: null,
      kind: "deck_repetition_review",
      issues: deck.issues.map(
        (issue) => `${issue.issue}:${issue.signature}:${issue.count}`,
      ),
    });
  }

  const candidateAssessments = optionCandidates.map((candidate) => ({
    candidateId: candidate.id,
    ready: candidate.quality.ready,
    issues: candidate.quality.issues,
  }));
  const readyForHumanReview =
    optionCandidates.length > 0 &&
    candidateAssessments.every((assessment) => assessment.ready) &&
    deck.ready &&
    dedupeGroups.length === 0;

  return {
    optionCandidates,
    dedupeGroups,
    rankingHints,
    exclusions,
    questionQualityAssessment: {
      readyForHumanReview,
      candidates: candidateAssessments,
      deck,
    },
    finalizationNeeds,
    noAutoPublish: true,
    noAutoExclude: true,
    humanReviewRequiredBeforePublicFinalization: true,
  };
}
