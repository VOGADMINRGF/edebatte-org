export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  buildQrQuestionGuardAuditEntry,
  isQrQuestionSetReadyForActivation,
  QR_QUESTION_GUARD_AUDIT_TRAIL_LIMIT,
  type QrQuestionGuardAuditEntry,
} from "@/features/create/qrQuestionSetGuard";
import type { PublicQuestionGeneralizationResult } from "@/features/create/safety/publicQuestionGeneralization";

const BodySchema = z
  .object({
    confirmActivation: z.literal(true),
  })
  .strict();

type StoredQuestion = {
  id: string;
  questionGuard: PublicQuestionGeneralizationResult;
};

type StoredReviewAudit = QrQuestionGuardAuditEntry;

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

  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "qr_question_set_activation_confirmation_required" },
      { status: 400 },
    );
  }

  try {
    const { code } = await context.params;
    const sets = await coreCol("qr_question_sets");
    const set = await sets.findOne({ code });
    if (!set) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    if (!isQrQuestionSetReadyForActivation(set)) {
      return NextResponse.json(
        { ok: false, error: "qr_question_set_not_ready_for_activation" },
        { status: 409 },
      );
    }

    const questions = (Array.isArray(set.questions) ? set.questions : []) as StoredQuestion[];
    const reviewAudit = set.lastQuestionGuardReviewAudit as StoredReviewAudit;
    const currentVersion = safeVersion(set.version);
    const nextVersion = currentVersion + 1;
    const activatedAt = new Date();
    const actorUserId = gate?._id?.toHexString?.() ?? "";
    const auditId = `qr-question-set-activation:${String(set._id)}:v${nextVersion}`;
    const audit = buildQrQuestionGuardAuditEntry({
      id: auditId,
      action: "qr_question_set_activation_approved",
      actorUserId,
      at: activatedAt,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      questions,
      reviewAuditId: reviewAudit.id,
      evidenceRefs: [reviewAudit.id],
    });

    const activation = await sets.updateOne(
      {
        _id: set._id,
        status: "ready_for_activation",
        questionGuardReviewState: "reviewed",
        activationState: "ready_for_activation",
        version: currentVersion,
      },
      {
        $set: {
          status: "active",
          activationState: "active",
          activatedAt,
          activatedBy: actorUserId,
          lastActivationAudit: audit,
          updatedAt: activatedAt,
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
      version: nextVersion,
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
