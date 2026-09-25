export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { validateVoxyEditorialStoryPlan } from "@/features/voxyVideo/editorialStoryPlan";
import {
  loadFailClosedDossierStudioEvidenceContext,
  loadVoxyStudioDossierEvidenceReviewState,
} from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import {
  applyReviewQueueOperation,
  getReviewQueueOperationsRepository,
} from "@features/reviewQueueOperations";

const BodySchema = z
  .object({
    action: z.enum(["mark_in_review", "request_changes", "mark_ready"]),
    expectedRevision: z.number().int().positive(),
    expectedFingerprint: z.string().trim().min(8).max(128),
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
      { ok: false, error: "invalid_voxy_studio_evidence_review_command" },
      { status: 400 },
    );
  }

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const draftRepository = getVoxyStudioDraftRepository();
    const draft = await draftRepository.getDraft(draftId);
    if (!draft) {
      return NextResponse.json({ ok: false, error: "voxy_studio_draft_missing" }, { status: 404 });
    }
    if (draft.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }
    if (!draft.dossierId) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_evidence_dossier_missing" },
        { status: 409 },
      );
    }

    const before = await loadVoxyStudioDossierEvidenceReviewState(draft.dossierId);
    if (before.snapshot.fingerprint !== parsed.data.expectedFingerprint) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_evidence_snapshot_stale",
          currentFingerprint: before.snapshot.fingerprint,
          currentReviewItemId: before.snapshot.reviewItemId,
        },
        { status: 409 },
      );
    }
    if (before.snapshot.sources.length === 0) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_evidence_sources_missing" },
        { status: 409 },
      );
    }

    if (parsed.data.action === "request_changes" && !String(parsed.data.note ?? "").trim()) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_evidence_change_request_note_required" },
        { status: 400 },
      );
    }
    const reviewRepository = getReviewQueueOperationsRepository();
    if (
      parsed.data.action === "mark_ready" &&
      reviewRepository.getPersistenceState().mode !== "persistent_primary"
    ) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_evidence_review_not_persistent" },
        { status: 409 },
      );
    }

    const review = await applyReviewQueueOperation({
      itemId: before.snapshot.reviewItemId,
      action: parsed.data.action,
      requestedByUserId: userId,
      note: parsed.data.note ?? null,
    });
    const after = await loadVoxyStudioDossierEvidenceReviewState(draft.dossierId);
    const evidence = await loadFailClosedDossierStudioEvidenceContext(draft.dossierId);
    const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);

    return NextResponse.json({
      ok: true,
      draftId: draft.draftId,
      draftRevision: draft.revision,
      evidenceReview: after,
      review,
      validation,
      sourcePackReviewState: evidence.sourcePack.reviewState,
      renderTriggered: false,
      uploadTriggered: false,
      publishTriggered: false,
      autoRender: false,
      autoPublish: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "voxy_studio_evidence_review_action_failed";
    const status = message.includes("revision_conflict") || message.includes("stale") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
