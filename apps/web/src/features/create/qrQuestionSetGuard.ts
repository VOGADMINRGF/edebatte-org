import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionActorExtraction,
  type PublicQuestionGeneralizationResult,
} from "@/features/create/safety/publicQuestionGeneralization";

export function isQrQuestionSetPubliclyReleased(
  value: unknown,
): boolean {
  if (!value || typeof value !== "object") return false;
  const set = value as { status?: unknown; questions?: unknown };
  if (set.status !== "active" || !Array.isArray(set.questions)) {
    return false;
  }
  const guardedQuestions = set.questions.filter(
    (question): question is { questionGuard: PublicQuestionGeneralizationResult } =>
      Boolean(
        question &&
          typeof question === "object" &&
          "questionGuard" in question &&
          question.questionGuard,
      ),
  );

  return (
    set.questions.length > 0 &&
    guardedQuestions.length === set.questions.length &&
    guardedQuestions.every(
      (question) => question.questionGuard.releaseState === "draft_allowed",
    )
  );
}

export function isQrQuestionSetReadyForActivation(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const set = value as {
    status?: unknown;
    questionGuardReviewState?: unknown;
    activationState?: unknown;
    questions?: unknown;
  };
  if (
    set.status !== "ready_for_activation" ||
    set.questionGuardReviewState !== "reviewed" ||
    set.activationState !== "ready_for_activation" ||
    !Array.isArray(set.questions) ||
    set.questions.length === 0
  ) {
    return false;
  }

  return set.questions.every((question) => {
    if (!question || typeof question !== "object") return false;
    const questionGuard = (question as { questionGuard?: unknown }).questionGuard;
    return Boolean(
      questionGuard &&
        typeof questionGuard === "object" &&
        (questionGuard as { releaseState?: unknown }).releaseState === "draft_allowed",
    );
  });
}

export function evaluateQrQuestionSetQuestion(input: {
  question: string;
  staffReviewerId?: string | null;
  actorContexts?: PublicQuestionActorContext[];
  actorExtraction?: PublicQuestionActorExtraction | null;
}): PublicQuestionGeneralizationResult {
  // Authentication identifies the requester, but is not evidence that actor
  // extraction or a separate content review actually happened.
  return evaluatePublicQuestionGeneralization({
    originalInput: input.question,
    candidatePublicQuestion: input.question,
    actorContexts: input.actorContexts ?? [],
    actorExtraction: input.actorExtraction ?? {
      status: "unverified",
      source: "not_available",
      independentFromCandidateProvider: false,
      evidenceRefs: [],
    },
  });
}

export function reviewQrQuestionSetQuestion(input: {
  question: string;
  previousGuard: PublicQuestionGeneralizationResult;
  actorContexts: PublicQuestionActorContext[];
  evidenceRefs: string[];
  noNamedActorsConfirmed?: boolean;
  procedure?: PublicQuestionGeneralizationResult["procedure"];
}): PublicQuestionGeneralizationResult {
  if (input.evidenceRefs.map((ref) => ref.trim()).filter(Boolean).length === 0) {
    throw new Error("public_question_guard_review_evidence_required");
  }
  if (input.actorContexts.length === 0 && input.noNamedActorsConfirmed !== true) {
    throw new Error("public_question_guard_actor_finding_required");
  }

  const procedure = input.procedure ?? input.previousGuard.procedure;
  return evaluatePublicQuestionGeneralization({
    originalInput: input.previousGuard.originalInput,
    candidatePublicQuestion: input.question,
    actorContexts: input.actorContexts,
    actorExtraction: {
      status: "complete",
      source: "human_review",
      independentFromCandidateProvider: true,
      evidenceRefs: input.evidenceRefs,
      humanReviewFinding:
        input.actorContexts.length > 0
          ? "actor_contexts_supplied"
          : "no_named_actors",
    },
    procedure,
    procedureReviewResolution:
      procedure &&
      input.actorContexts.some((actor) => actor.role === "procedure_subject")
        ? {
            previousOutcome: "entity_specific_procedure_review_required",
            decision: "approved_after_human_review",
          }
        : null,
  });
}
