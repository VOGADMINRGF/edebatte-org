// @repository-integrity-classification: runtime-bridge

import {
  evaluatePublicQuestionGeneralization,
  type PublicQuestionActorContext,
  type PublicQuestionActorExtraction,
  type PublicQuestionGeneralizationResult,
  type PublicQuestionProcedureContext,
} from "@/features/create/safety/publicQuestionGeneralization";
import {
  bindQuestionGuardToCurrentContract,
  isQuestionGuardBoundToCurrentContract,
} from "@/features/create/safety/questionGuardReviewPersistence";

export const QR_QUESTION_GUARD_AUDIT_TRAIL_LIMIT = 50 as const;

export type QrQuestionGuardAuditEntry = {
  id: string;
  action: "question_guard_reviewed" | "qr_question_set_activation_approved";
  actorUserId: string;
  at: Date;
  fromVersion: number;
  toVersion: number;
  questionResults: Array<{
    questionId: string;
    releaseState: PublicQuestionGeneralizationResult["releaseState"];
    outcome: PublicQuestionGeneralizationResult["outcome"];
    evidenceRefs: string[];
  }>;
  evidenceRefs: string[];
  reviewAuditId?: string | null;
  explicitHumanAction: true;
  noAutoApproval: true;
  noAutoPublish: true;
};

type StoredQrQuestion = {
  id?: unknown;
  questionGuard?: PublicQuestionGeneralizationResult | null;
};

type StoredQrQuestionSet = {
  status?: unknown;
  activationState?: unknown;
  questionGuardReviewState?: unknown;
  version?: unknown;
  questions?: unknown;
  lastQuestionGuardReviewAudit?: unknown;
  lastActivationAudit?: unknown;
};

function storedQrQuestionSetOf(value: unknown): StoredQrQuestionSet | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as StoredQrQuestionSet;
}

function versionOf(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function questionIdOf(value: StoredQrQuestion): string {
  return String(value.id ?? "").trim();
}

function guardedQuestions(value: unknown): StoredQrQuestion[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const questions = value as StoredQrQuestion[];
  return questions.every(
    (question) =>
      questionIdOf(question).length > 0 &&
      question.questionGuard?.releaseState === "draft_allowed" &&
      isQuestionGuardBoundToCurrentContract(question.questionGuard),
  )
    ? questions
    : null;
}

function auditOf(value: unknown): QrQuestionGuardAuditEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const audit = value as Partial<QrQuestionGuardAuditEntry>;
  if (
    typeof audit.id !== "string" ||
    !audit.id.trim() ||
    typeof audit.actorUserId !== "string" ||
    !audit.actorUserId.trim() ||
    !(audit.at instanceof Date) ||
    !Number.isSafeInteger(audit.fromVersion) ||
    !Number.isSafeInteger(audit.toVersion) ||
    audit.explicitHumanAction !== true ||
    audit.noAutoApproval !== true ||
    audit.noAutoPublish !== true ||
    !Array.isArray(audit.questionResults)
  ) {
    return null;
  }
  return audit as QrQuestionGuardAuditEntry;
}

function auditCoversQuestions(
  audit: QrQuestionGuardAuditEntry,
  questions: StoredQrQuestion[],
): boolean {
  const byId = new Map(audit.questionResults.map((entry) => [entry.questionId, entry]));
  return questions.every((question) => {
    const id = questionIdOf(question);
    const result = byId.get(id);
    return (
      result?.releaseState === "draft_allowed" &&
      Array.isArray(result.evidenceRefs) &&
      result.evidenceRefs.some((ref) => ref.startsWith("question-guard-contract:"))
    );
  });
}

export function buildQrQuestionGuardAuditEntry(input: {
  id: string;
  action: QrQuestionGuardAuditEntry["action"];
  actorUserId: string;
  at: Date;
  fromVersion: number;
  toVersion: number;
  questions: Array<{ id: string; questionGuard: PublicQuestionGeneralizationResult }>;
  evidenceRefs?: string[];
  reviewAuditId?: string | null;
}): QrQuestionGuardAuditEntry {
  return {
    id: input.id,
    action: input.action,
    actorUserId: input.actorUserId,
    at: input.at,
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    questionResults: input.questions.map((question) => ({
      questionId: question.id,
      releaseState: question.questionGuard.releaseState,
      outcome: question.questionGuard.outcome,
      evidenceRefs: [...question.questionGuard.evidenceRefs],
    })),
    evidenceRefs: Array.from(new Set((input.evidenceRefs ?? []).filter(Boolean))),
    reviewAuditId: input.reviewAuditId ?? null,
    explicitHumanAction: true,
    noAutoApproval: true,
    noAutoPublish: true,
  };
}

export function isQrQuestionSetReadyForActivation(value: unknown): boolean {
  const set = storedQrQuestionSetOf(value);
  if (
    set?.status !== "ready_for_activation" ||
    set.activationState !== "ready_for_activation" ||
    set.questionGuardReviewState !== "reviewed"
  ) {
    return false;
  }
  const version = versionOf(set.version);
  const questions = guardedQuestions(set.questions);
  const reviewAudit = auditOf(set.lastQuestionGuardReviewAudit);
  return Boolean(
    version !== null &&
      questions &&
      reviewAudit?.action === "question_guard_reviewed" &&
      reviewAudit.toVersion === version &&
      reviewAudit.fromVersion === version - 1 &&
      auditCoversQuestions(reviewAudit, questions),
  );
}

export function isQrQuestionSetPubliclyReleased(value: unknown): boolean {
  const set = storedQrQuestionSetOf(value);
  if (set?.status !== "active" || set.activationState !== "active") return false;
  const version = versionOf(set.version);
  const questions = guardedQuestions(set.questions);
  const reviewAudit = auditOf(set.lastQuestionGuardReviewAudit);
  const activationAudit = auditOf(set.lastActivationAudit);
  return Boolean(
    version !== null &&
      questions &&
      reviewAudit?.action === "question_guard_reviewed" &&
      reviewAudit.toVersion === version - 1 &&
      auditCoversQuestions(reviewAudit, questions) &&
      activationAudit?.action === "qr_question_set_activation_approved" &&
      activationAudit.fromVersion === version - 1 &&
      activationAudit.toVersion === version &&
      activationAudit.reviewAuditId === reviewAudit.id &&
      auditCoversQuestions(activationAudit, questions),
  );
}

export function evaluateQrQuestionSetQuestion(input: {
  question: string;
  actorContexts?: PublicQuestionActorContext[];
  actorExtraction?: PublicQuestionActorExtraction | null;
  procedure?: PublicQuestionProcedureContext | null;
  staffReviewerId?: string | null;
}): PublicQuestionGeneralizationResult {
  void input.staffReviewerId;
  return bindQuestionGuardToCurrentContract(
    evaluatePublicQuestionGeneralization({
      originalInput: input.question,
      candidatePublicQuestion: input.question,
      actorContexts: input.actorContexts ?? [],
      actorExtraction:
        input.actorExtraction ?? {
          status: "unverified",
          source: "create_analysis",
          independentFromCandidateProvider: false,
          evidenceRefs: [],
        },
      procedure: input.procedure ?? null,
    }),
  );
}

export function reviewQrQuestionSetQuestion(input: {
  question: string;
  previousGuard: PublicQuestionGeneralizationResult;
  actorContexts: PublicQuestionActorContext[];
  evidenceRefs: string[];
  noNamedActorsConfirmed?: boolean;
  procedure?: PublicQuestionProcedureContext | null;
}): PublicQuestionGeneralizationResult {
  const evidenceRefs = Array.from(
    new Set(input.evidenceRefs.map((ref) => ref.trim()).filter(Boolean)),
  );
  if (evidenceRefs.length === 0) {
    throw new Error("public_question_guard_review_evidence_required");
  }
  if (input.actorContexts.length === 0 && input.noNamedActorsConfirmed !== true) {
    throw new Error("public_question_guard_actor_finding_required");
  }

  const actorExtraction: PublicQuestionActorExtraction = {
    status: "complete",
    source: "human_review",
    independentFromCandidateProvider: true,
    evidenceRefs,
    humanReviewFinding:
      input.actorContexts.length > 0 ? "actor_contexts_supplied" : "no_named_actors",
  };
  const procedureReviewResolution =
    input.previousGuard.outcome === "entity_specific_procedure_review_required"
      ? {
          previousOutcome: "entity_specific_procedure_review_required" as const,
          decision: "approved_after_human_review" as const,
        }
      : null;

  return bindQuestionGuardToCurrentContract(
    evaluatePublicQuestionGeneralization({
      originalInput: input.previousGuard.originalInput || input.question,
      candidatePublicQuestion: input.question,
      actorContexts: input.actorContexts,
      actorExtraction,
      procedure: input.procedure ?? input.previousGuard.procedure ?? null,
      procedureReviewResolution,
    }),
  );
}
