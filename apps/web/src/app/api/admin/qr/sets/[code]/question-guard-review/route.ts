export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { reviewQrQuestionSetQuestion } from "@/features/create/qrQuestionSetGuard";
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
    const reviewsByQuestionId = new Map(
      body.questions.map((review) => [review.questionId, review]),
    );
    const pendingQuestionIds = questions
      .filter((question) => question.questionGuard.releaseState === "review_required")
      .map((question) => question.id);
    if (
      pendingQuestionIds.length === 0 ||
      pendingQuestionIds.some((questionId) => !reviewsByQuestionId.has(questionId))
    ) {
      return NextResponse.json(
        { ok: false, error: "question_guard_review_incomplete" },
        { status: 400 },
      );
    }

    const reviewedQuestions = questions.map((question) => {
      const review = reviewsByQuestionId.get(question.id);
      if (!review || question.questionGuard.releaseState !== "review_required") {
        return question;
      }
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
      (question) => question.questionGuard.releaseState === "draft_allowed",
    );
    const currentVersion = Number.isSafeInteger(set.version) ? Number(set.version) : 0;
    const reservedAt = new Date();
    const reservation = await sets.updateOne(
      { _id: set._id, status: "review_required", version: currentVersion },
      {
        $set: {
          questionGuardReviewState: "review_in_progress",
          updatedAt: reservedAt,
        },
        $inc: { version: 1 },
      },
    );
    if (reservation.matchedCount !== 1) {
      return NextResponse.json(
        { ok: false, error: "question_guard_review_state_conflict" },
        { status: 409 },
      );
    }

    const auditId = `qr-question-guard-review:${crypto.randomUUID()}`;
    const actorUserId = gate?._id?.toHexString?.() ?? "";
    await (await coreCol("qr_question_set_guard_audits")).insertOne({
      id: auditId,
      code,
      setId: String(set._id),
      actorUserId,
      action: "question_guard_reviewed",
      questionResults: reviewedQuestions.map((question) => ({
        questionId: question.id,
        releaseState: question.questionGuard.releaseState,
        outcome: question.questionGuard.outcome,
        actorContexts: question.questionGuard.actorContexts,
        actorExtraction: question.questionGuard.actorExtraction,
      })),
      readyForActivation,
      noAutoApproval: true,
      noAutoPublish: true,
      createdAt: reservedAt,
    });

    const nextStatus = readyForActivation
      ? "ready_for_activation"
      : "review_required";
    const releasedAt = new Date();
    const release = await sets.updateOne(
      {
        _id: set._id,
        status: "review_required",
        questionGuardReviewState: "review_in_progress",
        version: currentVersion + 1,
      },
      {
        $set: {
          questions: reviewedQuestions,
          status: nextStatus,
          questionGuardReviewState: readyForActivation
            ? "reviewed"
            : "review_required",
          activationState: readyForActivation
            ? "ready_for_activation"
            : "review_required",
          lastQuestionGuardReviewAuditId: auditId,
          updatedAt: releasedAt,
          noAutoApproval: true,
          noAutoPublish: true,
        },
        $inc: { version: 1 },
      },
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
      questionGuardReviewState: readyForActivation
        ? "reviewed"
        : "review_required",
      activationState: readyForActivation
        ? "ready_for_activation"
        : "review_required",
      questions: reviewedQuestions.map((question) => ({
        id: question.id,
        questionGuard: question.questionGuard,
      })),
      noAutoApproval: true,
      noAutoPublish: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "question_guard_review_failed";
    const status = message === "public_question_guard_actor_finding_required" ? 400 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
