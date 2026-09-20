export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  buildQrQuestionGuardAuditEntry,
  QR_QUESTION_GUARD_AUDIT_TRAIL_LIMIT,
  reviewQrQuestionSetQuestion,
} from "@/features/create/qrQuestionSetGuard";
import { isQuestionGuardBoundToCurrentContract } from "@/features/create/safety/questionGuardReviewPersistence";
import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";

const ActorContextSchema = z
  .object({
    id: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(240),
    type: z.enum([
      "person",
      "company",
      "party",
      "organization",
      "public_body",
      "media",
      "other",
    ]),
    role: z.enum([
      "source",
      "initiator",
      "affected_party",
      "competent_authority",
      "position_holder",
      "documented_case",
      "procedure_subject",
      "context",
      "target",
    ]),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1),
  })
  .strict();

const ProcedureSchema = z
  .object({
    kind: z.enum([
      "permit",
      "procurement",
      "merger",
      "statute",
      "parliamentary_procedure",
      "administrative_procedure",
      "other",
    ]),
    entityBindingNecessary: z.literal(true),
    evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1),
  })
  .strict();

const BodySchema = z
  .object({
    questions: z
      .array(
        z
          .object({
            questionId: z.string().trim().min(1).max(160),
            actorContexts: z.array(ActorContextSchema).max(50),
            evidenceRefs: z.array(z.string().trim().min(1).max(500)).min(1),
            noNamedActorsConfirmed: z.boolean().optional(),
            procedure: ProcedureSchema.nullable().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();

type StoredQuestion = {
  id: string;
  title: string;
  questionGuard: PublicQuestionGeneralizationResult;
  [key: string]: unknown;
};

function safeVersion(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { code } = await context.params;
    const body = BodySchema.parse(await req.json());
    const sets = await coreCol("qr_question_sets");
    const set = await sets.findOne({ code, status: "review_required" });
    if (!set) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const questions = (Array.isArray(set.questions) ? set.questions : []) as StoredQuestion[];
    if (
      questions.length === 0 ||
      questions.some(
        (question) =>
          !question?.id ||
          !question.questionGuard ||
          !isQuestionGuardBoundToCurrentContract(question.questionGuard),
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "question_guard_binding_stale_or_missing" },
        { status: 409 },
      );
    }

    const reviewsByQuestionId = new Map(
      body.questions.map((review) => [review.questionId, review]),
    );
    if (
      reviewsByQuestionId.size !== questions.length ||
      questions.some((question) => !reviewsByQuestionId.has(question.id)) ||
      body.questions.some((review) => !questions.some((question) => question.id === review.questionId))
    ) {
      return NextResponse.json(
        { ok: false, error: "question_guard_review_incomplete" },
        { status: 400 },
      );
    }

    const reviewedQuestions = questions.map((question) => {
      const review = reviewsByQuestionId.get(question.id)!;
      return {
        ...question,
        questionGuard: reviewQrQuestionSetQuestion({
          question: question.title,
          previousGuard: question.questionGuard,
          actorContexts: review.actorContexts,
          evidenceRefs: review.evidenceRefs,
          noNamedActorsConfirmed: review.noNamedActorsConfirmed,
          procedure: review.procedure,
        }),
      };
    });
    const readyForActivation = reviewedQuestions.every(
      (question) =>
        question.questionGuard.releaseState === "draft_allowed" &&
        isQuestionGuardBoundToCurrentContract(question.questionGuard),
    );
    const currentVersion = safeVersion(set.version);
    const nextVersion = currentVersion + 1;
    const reviewedAt = new Date();
    const actorUserId = gate?._id?.toHexString?.() ?? "";
    const auditId = `qr-question-guard-review:${String(set._id)}:v${nextVersion}`;
    const audit = buildQrQuestionGuardAuditEntry({
      id: auditId,
      action: "question_guard_reviewed",
      actorUserId,
      at: reviewedAt,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      questions: reviewedQuestions,
      evidenceRefs: body.questions.flatMap((review) => review.evidenceRefs),
    });
    const nextStatus = readyForActivation ? "ready_for_activation" : "review_required";
    const nextReviewState = readyForActivation ? "reviewed" : "review_required";
    const nextActivationState = readyForActivation ? "ready_for_activation" : "review_required";

    const release = await sets.updateOne(
      { _id: set._id, status: "review_required", version: currentVersion },
      {
        $set: {
          questions: reviewedQuestions,
          status: nextStatus,
          questionGuardReviewState: nextReviewState,
          activationState: nextActivationState,
          lastQuestionGuardReviewAudit: audit,
          updatedAt: reviewedAt,
          noAutoApproval: true,
          noAutoPublish: true,
        },
        $push: {
          questionGuardAuditTrail: {
            $each: [audit],
            $slice: -QR_QUESTION_GUARD_AUDIT_TRAIL_LIMIT,
          },
        },
        $inc: { version: 1 },
      } as any,
    );
    if (release.matchedCount !== 1) {
      return NextResponse.json(
        { ok: false, error: "question_guard_review_state_conflict" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      code,
      status: nextStatus,
      questionGuardReviewState: nextReviewState,
      activationState: nextActivationState,
      version: nextVersion,
      auditId,
      questions: reviewedQuestions.map((question) => ({
        id: question.id,
        questionGuard: question.questionGuard,
      })),
      noAutoApproval: true,
      noAutoPublish: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "question_guard_review_failed";
    const expected =
      message === "public_question_guard_actor_finding_required" ||
      message === "public_question_guard_review_evidence_required";
    if (!expected) console.error("QR question-guard review failed");
    return NextResponse.json(
      { ok: false, error: expected ? message : "question_guard_review_failed" },
      { status: expected ? 400 : 500 },
    );
  }
}
