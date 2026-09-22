export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  approveVoxyStudioDraftForRender,
  buildVoxyStudioEditorialReviewItemId,
  buildVoxyStudioEvidenceBoundRenderReviewGateId,
  createDefaultVoxyStudioServiceDependencies,
  requestVoxyStudioDraftChanges,
  submitVoxyStudioDraftForReview,
} from "@/features/voxyVideo/studioDraftService";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { evaluateVoxyStudioLayoutSafety } from "@/features/voxyVideo/studioLayoutSafety";
import {
  applyReviewQueueOperation,
  getReviewQueueOperationsRepository,
} from "@features/reviewQueueOperations";

const BodySchema = z
  .object({
    action: z.enum([
      "submit_for_review",
      "mark_in_review",
      "request_changes",
      "mark_ready",
    ]),
    expectedRevision: z.number().int().positive(),
    note: z.string().trim().min(1).max(3000).nullable().optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const userId = gate?._id?.toHexString?.() ?? "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "admin_user_id_missing" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_voxy_studio_review_command" },
      { status: 400 },
    );
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const repository = getVoxyStudioDraftRepository();
    const current = await repository.getDraft(draftId);
    if (!current) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }
    if (current.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }

    const evidenceAuthority = createFailClosedDossierStudioEvidenceAuthority();
    const deps = createDefaultVoxyStudioServiceDependencies({ evidenceAuthority });
    const reviewRepository = getReviewQueueOperationsRepository();

    if (parsed.data.action === "submit_for_review") {
      const submitted = await submitVoxyStudioDraftForReview(
        {
          draftId,
          expectedRevision: current.revision,
          submittedByUserId: userId,
        },
        deps,
      );
      const review = await applyReviewQueueOperation({
        itemId: submitted.reviewItemId,
        action: "mark_in_review",
        requestedByUserId: userId,
        note: parsed.data.note ?? null,
      });
      return NextResponse.json({
        ok: true,
        draft: submitted.draft,
        validation: submitted.validation,
        reviewItemId: submitted.reviewItemId,
        decisionGateId: submitted.decisionGateId,
        review,
        persistence: reviewRepository.getPersistenceState(),
      });
    }

    if (current.status !== "needs_review") {
      return NextResponse.json(
        { ok: false, error: `voxy_studio_review_action_not_allowed:${current.status}` },
        { status: 409 },
      );
    }

    const evidence = await evidenceAuthority.resolveEvidenceContext(current);
    const reviewItemId = buildVoxyStudioEditorialReviewItemId(
      current,
      evidence.sourcePack.sourcePackId,
    );
    const decisionGateId = buildVoxyStudioEvidenceBoundRenderReviewGateId(
      current,
      evidence.sourcePack.sourcePackId,
    );

    if (parsed.data.action === "mark_in_review") {
      const review = await applyReviewQueueOperation({
        itemId: reviewItemId,
        action: "mark_in_review",
        requestedByUserId: userId,
        note: parsed.data.note ?? null,
      });
      return NextResponse.json({
        ok: true,
        draft: current,
        reviewItemId,
        decisionGateId,
        review,
        persistence: reviewRepository.getPersistenceState(),
      });
    }

    if (parsed.data.action === "request_changes") {
      const note = String(parsed.data.note ?? "").trim();
      if (!note) {
        return NextResponse.json(
          { ok: false, error: "voxy_studio_change_request_note_required" },
          { status: 400 },
        );
      }
      const review = await applyReviewQueueOperation({
        itemId: reviewItemId,
        action: "request_changes",
        requestedByUserId: userId,
        note,
      });
      const draft = await requestVoxyStudioDraftChanges(
        {
          draftId,
          expectedRevision: current.revision,
          requestedByUserId: userId,
          note,
        },
        deps,
      );
      return NextResponse.json({
        ok: true,
        draft,
        reviewItemId,
        decisionGateId,
        review,
        persistence: reviewRepository.getPersistenceState(),
      });
    }

    const validation = validateVoxyEditorialStoryPlan(current.storyPlan, evidence);
    if (!validation.renderEligible) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_editorial_approval_blocked",
          validation,
          reviewItemId,
          decisionGateId,
          sourcePackReviewState: evidence.sourcePack.reviewState,
        },
        { status: 409 },
      );
    }

    const layoutSafety = evaluateVoxyStudioLayoutSafety({
      draft: current,
      format: current.selectedFormat,
    });
    if (!layoutSafety.approvalEligible) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_layout_approval_blocked",
          validation,
          layoutSafety,
          reviewItemId,
          decisionGateId,
        },
        { status: 409 },
      );
    }

    if (reviewRepository.getPersistenceState().mode !== "persistent_primary") {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_editorial_review_not_persistent" },
        { status: 409 },
      );
    }

    const review = await applyReviewQueueOperation({
      itemId: reviewItemId,
      action: "mark_ready",
      requestedByUserId: userId,
      note: parsed.data.note ?? null,
    });
    const draft = await approveVoxyStudioDraftForRender(
      {
        draftId,
        expectedRevision: current.revision,
        approvedByUserId: userId,
      },
      deps,
    );
    return NextResponse.json({
      ok: true,
      draft,
      validation,
      layoutSafety,
      reviewItemId,
      decisionGateId,
      review,
      persistence: reviewRepository.getPersistenceState(),
      renderTriggered: false,
      uploadTriggered: false,
      publishTriggered: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_review_action_failed";
    const status = message.includes("revision_conflict") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
