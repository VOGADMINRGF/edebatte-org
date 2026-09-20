import type { TopicQualificationSystemQuestionResult } from "@features/topic/topicQualificationSystemQuestionContract";

export const SOURCE_VOTE_READINESS_STAGES = [
  "detected",
  "evidence_ready",
  "vote_candidate",
  "review_ready",
  "voting_live",
] as const;

export type SourceVoteReadinessStage =
  (typeof SOURCE_VOTE_READINESS_STAGES)[number];

export type SourceTopicDisposition = "existing_topic" | "new_topic_candidate";

export type SourceEvidenceReadiness = {
  provenanceState: "complete" | "incomplete";
  evidenceState: "sufficient" | "insufficient";
  evidenceGapState: "none" | "open";
  conflictState: "none" | "resolved" | "unresolved";
  jurisdictionState: "resolved" | "uncertain" | "contradictory";
  sourceTruthSeparation: "separated" | "unresolved";
};

export type DecisionFrame = {
  authorityId: string;
  action: string;
  object: string;
  scope: string[];
  conditions: string[];
  timeframe: string | null;
  optionKeys: string[];
};

export type SourceVoteQuestionVariant = {
  language: "standard_de" | "leichte_sprache_de";
  text: string;
  decisionFrameSignature: string;
};

export type SourceVoteQuestionPackage = {
  standard: SourceVoteQuestionVariant;
  plain: SourceVoteQuestionVariant;
};

export const SOURCE_NEUTRALITY_ISSUES = [
  "loaded_wording",
  "presupposition",
  "unsupported_certainty",
  "attribution_confusion",
  "one_sided_options",
  "material_omission",
] as const;

export type SourceNeutralityIssue =
  (typeof SOURCE_NEUTRALITY_ISSUES)[number];

export type SourceNeutralityGuard = {
  status: "pass" | "review_required" | "blocked";
  issues: SourceNeutralityIssue[];
};

export type SourceSwipeCandidate = {
  id: string;
  kind: "summary" | "quote" | "statistic" | "chronology" | "pro_con_claim";
  evidenceRefs: string[];
};

export type CanonicalVoteReleaseState = {
  authority: "canonical_vote_release";
  status: "not_released" | "scheduled" | "live" | "closed";
  releaseId: string | null;
};

export type SourceVoteCandidatePackage = {
  candidateId: string;
  canonicalTopicId: string | null;
  topicDisposition: SourceTopicDisposition;
  eventClusterIds: string[];
  signalRefs: string[];
  evidenceRefs: string[];
  provenanceRefs: string[];
  evidence: SourceEvidenceReadiness;
  qualification: TopicQualificationSystemQuestionResult | null;
  decisionFrame: DecisionFrame | null;
  questions: SourceVoteQuestionPackage | null;
  neutrality: SourceNeutralityGuard;
  swipeCandidates: SourceSwipeCandidate[];
  reviewState: "not_queued" | "pending" | "approved" | "rejected";
  release: CanonicalVoteReleaseState;
};

export const SOURCE_VOTE_BLOCK_REASONS = [
  "provenance_incomplete",
  "evidence_insufficient",
  "evidence_gap_open",
  "evidence_conflict_unresolved",
  "jurisdiction_contradictory",
  "source_truth_separation_unresolved",
  "signal_evidence_reference_overlap",
  "canonical_topic_missing",
  "qualification_blocked",
  "qualification_safety_contract_invalid",
  "decision_frame_missing",
  "decision_frame_incomplete",
  "decision_frame_jurisdiction_mismatch",
  "question_variants_missing",
  "standard_question_not_canonical_t1_question",
  "question_frame_signature_mismatch",
  "plain_language_semantic_drift",
  "neutrality_blocked",
  "neutrality_pass_with_open_issues",
  "swipe_candidate_evidence_missing",
  "review_rejected",
  "canonical_release_authority_invalid",
  "canonical_release_without_approval",
  "canonical_release_without_ready_package",
] as const;

export type SourceVoteBlockReason =
  (typeof SOURCE_VOTE_BLOCK_REASONS)[number];

export const SOURCE_VOTE_REVIEW_REASONS = [
  "jurisdiction_uncertain",
  "qualification_missing",
  "qualification_review_required",
  "neutrality_review_required",
  "swipe_candidates_missing",
  "review_not_queued",
] as const;

export type SourceVoteReviewReason =
  (typeof SOURCE_VOTE_REVIEW_REASONS)[number];

export type SourceVoteReadinessResult = {
  candidateId: string;
  canonicalTopicId: string | null;
  topicDisposition: SourceTopicDisposition;
  stage: SourceVoteReadinessStage;
  blockingReasons: SourceVoteBlockReason[];
  reviewReasons: SourceVoteReviewReason[];
  requiresHumanReview: boolean;
  reviewState: SourceVoteCandidatePackage["reviewState"];
  releaseStatus: CanonicalVoteReleaseState["status"];
  noAutoPublish: true;
  releaseAuthority: "canonical_vote_release";
  sourcePipelineMayRelease: false;
};

export type SourceVoteReadinessSummary = {
  detectedTopics: number;
  matchedExistingTopics: number;
  newTopicCandidates: number;
  evidenceReady: number;
  voteCandidates: number;
  reviewReady: number;
  reviewPending: number;
  blocked: number;
  votingLive: number;
};

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanList(values: string[] | null | undefined): string[] {
  const unique = new Set<string>();
  for (const value of values ?? []) {
    const normalized = clean(value);
    if (normalized) unique.add(normalized);
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function addUnique<T extends string>(target: T[], reason: T): void {
  if (!target.includes(reason)) target.push(reason);
}

function normalizedQuestion(value: string): string {
  return clean(value).toLocaleLowerCase("de");
}

function normalizedDecisionFrame(frame: DecisionFrame) {
  return {
    authorityId: clean(frame.authorityId),
    action: clean(frame.action),
    object: clean(frame.object),
    scope: cleanList(frame.scope),
    conditions: cleanList(frame.conditions),
    timeframe: clean(frame.timeframe) || null,
    optionKeys: cleanList(frame.optionKeys),
  };
}

export function decisionFrameSignature(frame: DecisionFrame): string {
  return JSON.stringify(normalizedDecisionFrame(frame));
}

function decisionFrameComplete(frame: DecisionFrame): boolean {
  const normalized = normalizedDecisionFrame(frame);
  return Boolean(
    normalized.authorityId &&
      normalized.action &&
      normalized.object &&
      normalized.scope.length > 0 &&
      normalized.optionKeys.length >= 2,
  );
}

function hasSignalEvidenceOverlap(input: SourceVoteCandidatePackage): boolean {
  const evidence = new Set(cleanList(input.evidenceRefs));
  return cleanList(input.signalRefs).some((signalRef) => evidence.has(signalRef));
}

function swipesGrounded(
  candidates: SourceSwipeCandidate[],
  evidenceRefs: string[],
): boolean {
  const evidence = new Set(cleanList(evidenceRefs));
  return candidates.every((candidate) => {
    const id = clean(candidate.id);
    const refs = cleanList(candidate.evidenceRefs);
    return Boolean(id && refs.length > 0 && refs.every((ref) => evidence.has(ref)));
  });
}

function semanticsMatch(input: SourceVoteCandidatePackage): boolean {
  if (!input.decisionFrame || !input.questions) return false;
  const signature = decisionFrameSignature(input.decisionFrame);
  return (
    clean(input.questions.standard.decisionFrameSignature) === signature &&
    clean(input.questions.plain.decisionFrameSignature) === signature
  );
}

function qualificationSafetyContractValid(
  qualification: TopicQualificationSystemQuestionResult,
): boolean {
  return (
    qualification.noAutoPublish === true &&
    qualification.noDecisionAction === true &&
    qualification.noEmpiricalTruthClaim === true
  );
}

const STAGE_RANK: Record<SourceVoteReadinessStage, number> = {
  detected: 0,
  evidence_ready: 1,
  vote_candidate: 2,
  review_ready: 3,
  voting_live: 4,
};

export function evaluateSourceVoteReadiness(
  input: SourceVoteCandidatePackage,
): SourceVoteReadinessResult {
  const blockingReasons: SourceVoteBlockReason[] = [];
  const reviewReasons: SourceVoteReviewReason[] = [];
  let stage: SourceVoteReadinessStage = "detected";

  const evidenceRefs = cleanList(input.evidenceRefs);
  const provenanceRefs = cleanList(input.provenanceRefs);
  const canonicalTopicId = clean(input.canonicalTopicId) || null;

  if (input.evidence.provenanceState !== "complete" || provenanceRefs.length === 0) {
    addUnique(blockingReasons, "provenance_incomplete");
  }
  if (input.evidence.evidenceState !== "sufficient" || evidenceRefs.length === 0) {
    addUnique(blockingReasons, "evidence_insufficient");
  }
  if (input.evidence.evidenceGapState !== "none") {
    addUnique(blockingReasons, "evidence_gap_open");
  }
  if (input.evidence.conflictState === "unresolved") {
    addUnique(blockingReasons, "evidence_conflict_unresolved");
  }
  if (input.evidence.jurisdictionState === "contradictory") {
    addUnique(blockingReasons, "jurisdiction_contradictory");
  } else if (input.evidence.jurisdictionState !== "resolved") {
    addUnique(reviewReasons, "jurisdiction_uncertain");
  }
  if (input.evidence.sourceTruthSeparation !== "separated") {
    addUnique(blockingReasons, "source_truth_separation_unresolved");
  }
  if (hasSignalEvidenceOverlap(input)) {
    addUnique(blockingReasons, "signal_evidence_reference_overlap");
  }

  const evidenceBlockers = new Set<SourceVoteBlockReason>([
    "provenance_incomplete",
    "evidence_insufficient",
    "evidence_gap_open",
    "evidence_conflict_unresolved",
    "jurisdiction_contradictory",
    "source_truth_separation_unresolved",
    "signal_evidence_reference_overlap",
  ]);
  const evidenceReady =
    !blockingReasons.some((reason) => evidenceBlockers.has(reason)) &&
    input.evidence.jurisdictionState === "resolved";

  if (evidenceReady) stage = "evidence_ready";

  if (!canonicalTopicId) {
    addUnique(blockingReasons, "canonical_topic_missing");
  }

  const qualification = input.qualification;
  if (!qualification) {
    addUnique(reviewReasons, "qualification_missing");
  } else {
    if (!qualificationSafetyContractValid(qualification)) {
      addUnique(blockingReasons, "qualification_safety_contract_invalid");
    }
    if (qualification.reviewState === "blocked_material_scope_error") {
      addUnique(blockingReasons, "qualification_blocked");
    } else if (qualification.reviewState === "review_required") {
      addUnique(reviewReasons, "qualification_review_required");
    }
    if (canonicalTopicId && qualification.canonicalTopicId !== canonicalTopicId) {
      addUnique(blockingReasons, "canonical_topic_missing");
    }
  }

  if (!input.decisionFrame) {
    addUnique(blockingReasons, "decision_frame_missing");
  } else {
    if (!decisionFrameComplete(input.decisionFrame)) {
      addUnique(blockingReasons, "decision_frame_incomplete");
    }
    if (
      qualification &&
      clean(input.decisionFrame.authorityId) !== clean(qualification.jurisdictionId)
    ) {
      addUnique(blockingReasons, "decision_frame_jurisdiction_mismatch");
    }
  }

  if (!input.questions) {
    addUnique(blockingReasons, "question_variants_missing");
  } else {
    if (
      input.questions.standard.language !== "standard_de" ||
      input.questions.plain.language !== "leichte_sprache_de"
    ) {
      addUnique(blockingReasons, "question_variants_missing");
    }
    if (
      qualification &&
      normalizedQuestion(input.questions.standard.text) !==
        normalizedQuestion(qualification.neutralSystemQuestion)
    ) {
      addUnique(blockingReasons, "standard_question_not_canonical_t1_question");
    }
    if (input.decisionFrame && !semanticsMatch(input)) {
      addUnique(blockingReasons, "question_frame_signature_mismatch");
      addUnique(blockingReasons, "plain_language_semantic_drift");
    }
  }

  if (input.neutrality.status === "blocked") {
    addUnique(blockingReasons, "neutrality_blocked");
  } else if (input.neutrality.status === "review_required") {
    addUnique(reviewReasons, "neutrality_review_required");
  } else if (input.neutrality.issues.length > 0) {
    addUnique(blockingReasons, "neutrality_pass_with_open_issues");
  }

  const voteCandidateBlockers = new Set<SourceVoteBlockReason>([
    "canonical_topic_missing",
    "qualification_blocked",
    "qualification_safety_contract_invalid",
    "decision_frame_missing",
    "decision_frame_incomplete",
    "decision_frame_jurisdiction_mismatch",
    "question_variants_missing",
    "standard_question_not_canonical_t1_question",
  ]);
  const voteCandidateReady =
    evidenceReady &&
    Boolean(qualification) &&
    !blockingReasons.some((reason) => voteCandidateBlockers.has(reason));

  if (voteCandidateReady) stage = "vote_candidate";

  if (input.swipeCandidates.length === 0) {
    addUnique(reviewReasons, "swipe_candidates_missing");
  } else if (!swipesGrounded(input.swipeCandidates, evidenceRefs)) {
    addUnique(blockingReasons, "swipe_candidate_evidence_missing");
  }

  if (input.reviewState === "rejected") {
    addUnique(blockingReasons, "review_rejected");
  } else if (input.reviewState === "not_queued") {
    addUnique(reviewReasons, "review_not_queued");
  }

  const reviewReady =
    voteCandidateReady &&
    qualification?.reviewState === "clear" &&
    input.neutrality.status === "pass" &&
    input.neutrality.issues.length === 0 &&
    Boolean(input.decisionFrame && input.questions && semanticsMatch(input)) &&
    input.swipeCandidates.length > 0 &&
    swipesGrounded(input.swipeCandidates, evidenceRefs) &&
    (input.reviewState === "pending" || input.reviewState === "approved") &&
    !blockingReasons.some((reason) =>
      [
        "question_frame_signature_mismatch",
        "plain_language_semantic_drift",
        "neutrality_blocked",
        "neutrality_pass_with_open_issues",
        "swipe_candidate_evidence_missing",
        "review_rejected",
      ].includes(reason),
    );

  if (reviewReady) stage = "review_ready";

  if (input.release.authority !== "canonical_vote_release") {
    addUnique(blockingReasons, "canonical_release_authority_invalid");
  }

  if (input.release.status === "live") {
    if (input.reviewState !== "approved") {
      addUnique(blockingReasons, "canonical_release_without_approval");
    }
    if (!reviewReady) {
      addUnique(blockingReasons, "canonical_release_without_ready_package");
    }
    if (
      reviewReady &&
      input.reviewState === "approved" &&
      input.release.authority === "canonical_vote_release"
    ) {
      stage = "voting_live";
    }
  }

  return {
    candidateId: clean(input.candidateId),
    canonicalTopicId,
    topicDisposition: input.topicDisposition,
    stage,
    blockingReasons,
    reviewReasons,
    requiresHumanReview:
      stage !== "voting_live" ||
      blockingReasons.length > 0 ||
      reviewReasons.length > 0,
    reviewState: input.reviewState,
    releaseStatus: input.release.status,
    noAutoPublish: true,
    releaseAuthority: "canonical_vote_release",
    sourcePipelineMayRelease: false,
  };
}

export function summarizeSourceVoteReadiness(
  results: SourceVoteReadinessResult[],
): SourceVoteReadinessSummary {
  const atLeast = (result: SourceVoteReadinessResult, stage: SourceVoteReadinessStage) =>
    STAGE_RANK[result.stage] >= STAGE_RANK[stage];

  return {
    detectedTopics: results.length,
    matchedExistingTopics: results.filter(
      (result) => result.topicDisposition === "existing_topic",
    ).length,
    newTopicCandidates: results.filter(
      (result) => result.topicDisposition === "new_topic_candidate",
    ).length,
    evidenceReady: results.filter((result) => atLeast(result, "evidence_ready")).length,
    voteCandidates: results.filter((result) => atLeast(result, "vote_candidate")).length,
    reviewReady: results.filter((result) => atLeast(result, "review_ready")).length,
    reviewPending: results.filter((result) => result.reviewState === "pending").length,
    blocked: results.filter((result) => result.blockingReasons.length > 0).length,
    votingLive: results.filter((result) => result.stage === "voting_live").length,
  };
}

export function sourceVoteReadinessHeadline(summary: SourceVoteReadinessSummary): string {
  return [
    `${summary.detectedTopics} Themen erkannt`,
    `${summary.matchedExistingTopics} bestehenden Themen zugeordnet`,
    `${summary.newTopicCandidates} neue Themenkandidaten`,
    `${summary.voteCandidates} Abstimmungskandidaten`,
    `${summary.reviewPending} in Prüfung`,
    `${summary.blocked} blockiert`,
    `${summary.votingLive} aktuell zur Abstimmung freigeschaltet`,
  ].join(" · ");
}
