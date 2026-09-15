export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { isQrQuestionSetReadyForActivation } from "@/features/create/qrQuestionSetGuard";

const BodySchema = z
  .object({
    confirmActivation: z.literal(true),
  })
  .strict();

type ActivationAuditDocument = Record<string, unknown> & { _id: string };

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const body = BodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json(
        { ok: false, error: "qr_question_set_activation_confirmation_required" },
        { status: 400 },
      );
    }
    const { code } = await context.params;
    const sets = await coreCol("qr_question_sets");
    let set = await sets.findOne({ code });
    if (!set) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Reviewed sets created before activationState was introduced are safe to
    // normalize only when the complete current activation guard also passes.
    if (
      typeof set.activationState === "undefined" &&
      isQrQuestionSetReadyForActivation({
        ...set,
        activationState: "ready_for_activation",
      })
    ) {
      const legacyVersion = Number.isSafeInteger(set.version) ? Number(set.version) : 0;
      const normalizedAt = new Date();
      const normalization = await sets.updateOne(
        {
          _id: set._id,
          status: "ready_for_activation",
          questionGuardReviewState: "reviewed",
          activationState: { $exists: false },
          version: legacyVersion,
        },
        {
          $set: {
            activationState: "ready_for_activation",
            updatedAt: normalizedAt,
          },
          $inc: { version: 1 },
        },
      );
      set =
        normalization.matchedCount === 1
          ? {
              ...set,
              activationState: "ready_for_activation",
              updatedAt: normalizedAt,
              version: legacyVersion + 1,
            }
          : await sets.findOne({ code });
    }

    const guardAllowsActivation = isQrQuestionSetReadyForActivation({
      ...set,
      activationState: "ready_for_activation",
    });
    const isFreshActivation = set?.activationState === "ready_for_activation";
    const currentVersion = Number.isSafeInteger(set?.version) ? Number(set?.version) : 0;
    const isRecoverableActivation = Boolean(
      set?.activationState === "activation_in_progress" &&
        typeof set.pendingActivationAuditId === "string" &&
        set.pendingActivationAuditId.length > 0 &&
        set.activationReservationVersion === currentVersion,
    );
    if (!set || !guardAllowsActivation || (!isFreshActivation && !isRecoverableActivation)) {
      return NextResponse.json(
        { ok: false, error: "qr_question_set_not_ready_for_activation" },
        { status: 409 },
      );
    }

    let reservationVersion = currentVersion;
    let auditId = isRecoverableActivation
      ? String(set.pendingActivationAuditId)
      : "";
    let actorUserId = isRecoverableActivation
      ? String(set.activationRequestedBy ?? "")
      : gate?._id?.toHexString?.() ?? "";
    let reservedAt =
      isRecoverableActivation && set.activationRequestedAt instanceof Date
        ? set.activationRequestedAt
        : new Date();

    if (isFreshActivation) {
      reservationVersion = currentVersion + 1;
      auditId = `qr-question-set-activation:${String(set._id)}:v${reservationVersion}`;
      actorUserId = gate?._id?.toHexString?.() ?? "";
      reservedAt = new Date();
      const reservation = await sets.updateOne(
        {
          _id: set._id,
          status: "ready_for_activation",
          questionGuardReviewState: "reviewed",
          activationState: "ready_for_activation",
          version: currentVersion,
        },
        {
          $set: {
            activationState: "activation_in_progress",
            activationRequestedAt: reservedAt,
            activationRequestedBy: actorUserId,
            activationReservationVersion: reservationVersion,
            pendingActivationAuditId: auditId,
            updatedAt: reservedAt,
          },
          $inc: { version: 1 },
        },
      );
      if (reservation.matchedCount !== 1) {
        return NextResponse.json(
          { ok: false, error: "qr_question_set_activation_state_conflict" },
          { status: 409 },
        );
      }
    }

    await (
      await coreCol<ActivationAuditDocument>("qr_question_set_guard_audits")
    ).updateOne(
      { _id: auditId },
      {
        $setOnInsert: {
          _id: auditId,
          id: auditId,
          code,
          setId: String(set._id),
          actorUserId,
          action: "qr_question_set_activation_approved",
          previousStatus: "ready_for_activation",
          requestedStatus: "active",
          activationReservationVersion: reservationVersion,
          questionGuardReviewAuditId:
            typeof set.lastQuestionGuardReviewAuditId === "string"
              ? set.lastQuestionGuardReviewAuditId
              : null,
          questionResults: (Array.isArray(set.questions) ? set.questions : []).map(
            (question: Record<string, any>) => ({
              questionId: question.id,
              releaseState: question.questionGuard?.releaseState,
              outcome: question.questionGuard?.outcome,
              actorExtraction: question.questionGuard?.actorExtraction,
            }),
          ),
          explicitAdminAction: true,
          noAutoApproval: true,
          noAutoPublish: true,
          createdAt: reservedAt,
        },
      },
      { upsert: true },
    );

    const activatedAt = new Date();
    const activation = await sets.updateOne(
      {
        _id: set._id,
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        activationState: "activation_in_progress",
        activationReservationVersion: reservationVersion,
        pendingActivationAuditId: auditId,
        version: reservationVersion,
      },
      {
        $set: {
          status: "active",
          activationState: "active",
          activatedAt,
          activatedBy: actorUserId,
          lastActivationAuditId: auditId,
          updatedAt: activatedAt,
          noAutoApproval: true,
          noAutoPublish: true,
        },
        $unset: {
          pendingActivationAuditId: "",
          activationReservationVersion: "",
        },
        $inc: { version: 1 },
      },
    );
    if (activation.matchedCount !== 1) {
      return NextResponse.json(
        { ok: false, error: "qr_question_set_activation_state_conflict" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      code,
      status: "active",
      activationState: "active",
      activationAuditId: auditId,
      noAutoApproval: true,
      noAutoPublish: true,
    });
  } catch {
    console.error("QR question-set activation failed");
    return NextResponse.json(
      { ok: false, error: "qr_question_set_activation_failed" },
      { status: 500 },
    );
  }
}
