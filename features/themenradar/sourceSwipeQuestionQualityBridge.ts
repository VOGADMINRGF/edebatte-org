import {
  evaluateSourceVoteReadiness,
  type SourceVoteCandidatePackage,
  type SourceVoteReadinessResult,
  type SourceVoteReadinessStage,
} from "./sourceVoteReadinessContract";
import {
  finalizeParticipationOptionSet,
  type ParticipationOptionFinalizerOutput,
} from "@/features/swipes/participationOptionFinalizer";
import type { SwipeDecisionConsequences } from "@/features/swipes/types";
import type { SwipeQuestionFinalizerInput } from "@/features/swipes/questionFinalizer";

export type SourceSwipeQuestionDraft = {
  candidateId: string;
  humanContext: string;
  tradeoff: string;
  decisionConsequences: SwipeDecisionConsequences;
};

export type SourceSwipeQualityBlockReason =
  | "swipe_question_output_missing"
  | "swipe_question_quality_failed"
  | "swipe_question_evidence_outside_source_candidate"
  | "swipe_question_deck_quality_failed"
  | "canonical_release_without_swipe_quality";

export type SourceVoteReadinessWithSwipeQuality = {
  candidateId: string;
  sourceReadiness: SourceVoteReadinessResult;
  effectiveStage: SourceVoteReadinessStage;
  qualityBlockingReasons: SourceSwipeQualityBlockReason[];
  questionQualityReady: boolean;
  requiresHumanReview: boolean;
  noAutoPublish: true;
  sourcePipelineMayRelease: false;
};

export type SourceSwipeQualitySetResult = {
  results: SourceVoteReadinessWithSwipeQuality[];
  participationFinalization: ParticipationOptionFinalizerOutput;
  noAutoPublish: true;
  sourcePipelineMayRelease: false;
  humanReviewRequiredBeforePublicFinalization: true;
};

type SourceSwipeQualityEntry = {
  candidatePackage: SourceVoteCandidatePackage;
  swipeQuestion?: SourceSwipeQuestionDraft | null;
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function addUnique<T extends string>(target: T[], value: T): void {
  if (!target.includes(value)) target.push(value);
}

function canonicalQuestionText(input: SourceVoteCandidatePackage): string {
  return clean(
    input.questions?.standard.text ??
      input.qualification?.neutralSystemQuestion ??
      "",
  );
}

function allowedSwipeEvidenceRefs(input: SourceVoteCandidatePackage): Set<string> {
  return new Set(
    input.swipeCandidates.flatMap((candidate) =>
      candidate.evidenceRefs.map(clean).filter(Boolean),
    ),
  );
}

function usedConsequenceEvidenceRefs(
  draft: SourceSwipeQuestionDraft | null | undefined,
): string[] {
  if (!draft) return [];
  const refs = [
    ...draft.decisionConsequences.agree,
    ...draft.decisionConsequences.disagree,
  ].flatMap((consequence) =>
    (consequence.evidenceRefs ?? [])
      .map((ref) => clean(ref.id))
      .filter(Boolean),
  );
  return Array.from(new Set(refs));
}

function evidenceGroundedInSourceSwipeCandidates(
  input: SourceVoteCandidatePackage,
  draft: SourceSwipeQuestionDraft | null | undefined,
): boolean {
  if (!draft) return false;
  const allowed = allowedSwipeEvidenceRefs(input);
  return usedConsequenceEvidenceRefs(draft).every((ref) => allowed.has(ref));
}

function toFinalizerInput(entry: SourceSwipeQualityEntry): SwipeQuestionFinalizerInput {
  const draft = entry.swipeQuestion ?? null;
  return {
    id: entry.candidatePackage.candidateId,
    title: canonicalQuestionText(entry.candidatePackage),
    text: canonicalQuestionText(entry.candidatePackage),
    humanContext: draft?.humanContext,
    tradeoff: draft?.tradeoff,
    decisionConsequences: draft?.decisionConsequences,
    category: entry.candidatePackage.canonicalTopicId ?? "Source candidate",
    topicTags: entry.candidatePackage.canonicalTopicId
      ? [entry.candidatePackage.canonicalTopicId]
      : [],
    responsibilityLabel:
      entry.candidatePackage.qualification?.jurisdictionId ??
      "Zuständigkeit vor Veröffentlichung prüfen",
    domainLabel: entry.candidatePackage.canonicalTopicId ?? "Source candidate",
    evidenceCount: allowedSwipeEvidenceRefs(entry.candidatePackage).size,
  };
}

function downgradeForQuestionQuality(
  sourceStage: SourceVoteReadinessStage,
  questionQualityReady: boolean,
): SourceVoteReadinessStage {
  if (questionQualityReady) return sourceStage;
  if (sourceStage === "review_ready" || sourceStage === "voting_live") {
    return "vote_candidate";
  }
  return sourceStage;
}

/**
 * Convergence layer between the canonical Source vote-readiness contract and
 * the canonical Swipe participation/question finalizer.
 *
 * Source remains the authority for source/evidence/T1 readiness; this bridge
 * only adds the missing question-quality boundary. It never publishes, releases
 * or politically ranks a candidate.
 */
export function evaluateSourceVoteCandidateSetWithSwipeQuality(
  entries: SourceSwipeQualityEntry[],
): SourceSwipeQualitySetResult {
  const participationFinalization = finalizeParticipationOptionSet(
    entries.map(toFinalizerInput),
  );
  const participationById = new Map(
    participationFinalization.optionCandidates.map((candidate) => [
      candidate.id,
      candidate,
    ]),
  );
  const deckQualityReady =
    participationFinalization.questionQualityAssessment.deck.ready &&
    participationFinalization.dedupeGroups.length === 0;

  const results = entries.map((entry): SourceVoteReadinessWithSwipeQuality => {
    const sourceReadiness = evaluateSourceVoteReadiness(entry.candidatePackage);
    const candidateQuality = participationById.get(entry.candidatePackage.candidateId);
    const qualityBlockingReasons: SourceSwipeQualityBlockReason[] = [];

    if (!entry.swipeQuestion) {
      addUnique(qualityBlockingReasons, "swipe_question_output_missing");
    }
    if (!candidateQuality?.quality.ready) {
      addUnique(qualityBlockingReasons, "swipe_question_quality_failed");
    }
    if (
      entry.swipeQuestion &&
      !evidenceGroundedInSourceSwipeCandidates(
        entry.candidatePackage,
        entry.swipeQuestion,
      )
    ) {
      addUnique(
        qualityBlockingReasons,
        "swipe_question_evidence_outside_source_candidate",
      );
    }
    if (!deckQualityReady) {
      addUnique(qualityBlockingReasons, "swipe_question_deck_quality_failed");
    }

    const questionQualityReady = qualityBlockingReasons.length === 0;
    if (
      entry.candidatePackage.release.status === "live" &&
      !questionQualityReady
    ) {
      addUnique(
        qualityBlockingReasons,
        "canonical_release_without_swipe_quality",
      );
    }

    return {
      candidateId: entry.candidatePackage.candidateId,
      sourceReadiness,
      effectiveStage: downgradeForQuestionQuality(
        sourceReadiness.stage,
        questionQualityReady,
      ),
      qualityBlockingReasons,
      questionQualityReady,
      requiresHumanReview:
        sourceReadiness.requiresHumanReview ||
        !questionQualityReady ||
        sourceReadiness.stage !== "voting_live",
      noAutoPublish: true,
      sourcePipelineMayRelease: false,
    };
  });

  return {
    results,
    participationFinalization,
    noAutoPublish: true,
    sourcePipelineMayRelease: false,
    humanReviewRequiredBeforePublicFinalization: true,
  };
}

export function evaluateSourceVoteReadinessWithSwipeQuality(
  candidatePackage: SourceVoteCandidatePackage,
  swipeQuestion?: SourceSwipeQuestionDraft | null,
): SourceVoteReadinessWithSwipeQuality {
  return evaluateSourceVoteCandidateSetWithSwipeQuality([
    { candidatePackage, swipeQuestion },
  ]).results[0];
}
