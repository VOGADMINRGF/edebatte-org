export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS,
} from "@/features/create/voxyRenderPreviewReviewFlowContract";
import {
  VOXY_RENDER_PREVIEW_REVIEW_DECISION_CHECKLIST_STATUSES,
  VOXY_RENDER_PREVIEW_REVIEW_DECISION_TYPES,
  type VoxyRenderPreviewReviewDecisionRecord,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceContract";
import {
  getVoxyRenderPreviewReviewDecisionPersistenceState,
  listVoxyRenderPreviewReviewDecisionRecords,
  persistVoxyRenderPreviewReviewDecision,
} from "@/features/create/voxyRenderPreviewReviewDecisionPersistenceStore";
import { getVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import {
  buildVoxyStudioPreviewRenderDecisionId,
  buildVoxyStudioPreviewReviewCommand,
  matchVoxyStudioPreviewReviewRecord,
} from "@/features/voxyVideo/studioPreviewReview";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

const ChecklistSchema = z
  .object({
    checkKey: z.enum(VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS),
    status: z.enum(VOXY_RENDER_PREVIEW_REVIEW_DECISION_CHECKLIST_STATUSES),
    reviewerVisibleReason: z.string().trim().min(1).max(1000),
    userVisibleReason: z.string().trim().min(1).max(1000),
  })
  .strict();

const BodySchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    decisionType: z.enum(VOXY_RENDER_PREVIEW_REVIEW_DECISION_TYPES),
    reviewerComment: z.string().trim().min(1).max(3000),
    checklistResults: z.array(ChecklistSchema).min(1).max(VOXY_RENDER_PREVIEW_REVIEW_CHECK_KEYS.length),
  })
  .strict();

async function loadContext(rawDraftId: string) {
  const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
  const studioRepository = getVoxyStudioDraftRepository();
  const draft = await studioRepository.getDraft(draftId);
  if (!draft) throw new Error("voxy_studio_draft_missing");
  if (draft.status !== "rendered" || !draft.renderBinding) {
    throw new Error(`voxy_studio_preview_review_not_allowed:${draft.status}`);
  }
  const runtimeRepository = getVoxyLocalCompositionRepository();
  const [job, output] = await Promise.all([
    runtimeRepository.getJob(draft.renderBinding.jobId),
    runtimeRepository.getOutput(draft.renderBinding.outputId),
  ]);
  if (!job || !output) throw new Error("voxy_studio_preview_review_output_missing");
  const context = { draft, job, output };
  const renderDecisionId = buildVoxyStudioPreviewRenderDecisionId(context);
  return { context, renderDecisionId };
}

function recordSummary(record: VoxyRenderPreviewReviewDecisionRecord | null) {
  if (!record) return null;
  return {
    decisionRecordId: record.decisionRecordId,
    renderDecisionId: record.renderDecisionId,
    decisionType: record.decisionType,
    decisionStatus: record.decisionStatus,
    persistedAt: record.persistedAt,
    persistedBy: record.persistedBy,
    reviewerComment: record.decisionPayload.reviewerComment,
    checklistResults: record.checklistResults,
    nextStep: record.nextStep,
    userVisibleSummary: record.userVisibleSummary,
    reviewerVisibleSummary: record.reviewerVisibleSummary,
    decisionEffects: record.decisionEffects,
    executionFlags: record.executionFlags,
  };
}

function persistenceReady() {
  const persistence = getVoxyRenderPreviewReviewDecisionPersistenceState();
  return {
    persistence,
    ready:
      persistence.mode === "persistent_primary" &&
      persistence.productionTruth === true &&
      persistence.restartReconstructable === true &&
      persistence.deploymentReconstructable === true,
  };
}

export async function GET(
  req: NextRequest,
  routeContext: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { draftId } = await routeContext.params;
    const { context, renderDecisionId } = await loadContext(draftId);
    const { persistence, ready } = persistenceReady();
    const records = await listVoxyRenderPreviewReviewDecisionRecords({
      previewReviewFlowId: context.job.previewReviewFlowId,
      decisionGateId: context.job.decisionGateId,
      limit: 50,
    });
    const exactRecord =
      records.find((record) =>
        matchVoxyStudioPreviewReviewRecord({ ...context, record }).exact,
      ) ?? null;
    const latestRecord = records[0] ?? null;
    const latestRecordMatch = matchVoxyStudioPreviewReviewRecord({
      ...context,
      record: latestRecord,
    });

    return NextResponse.json({
      ok: true,
      draftId: context.draft.draftId,
      revision: context.draft.revision,
      storyPlanRevision: context.draft.storyPlan.revision,
      previewReviewFlowId: context.job.previewReviewFlowId,
      decisionGateId: context.job.decisionGateId,
      renderDecisionId,
      output: {
        outputId: context.output.outputId,
        masterSha256: context.output.masterMp4.sha256,
        previewSha256: context.output.previewWebm.sha256,
        durationMs: context.output.previewWebm.durationMs,
        width: context.output.previewWebm.width,
        height: context.output.previewWebm.height,
        renderProfile: context.output.renderProfile,
        locale: context.output.locale,
        publicAsset: context.output.publicAsset,
        uploaded: context.output.uploaded,
        published: context.output.published,
      },
      previewUrl: `/api/admin/voxy-studio/${encodeURIComponent(context.draft.draftId)}/preview`,
      decision: recordSummary(exactRecord),
      latestRecordMatch,
      exactDecisionFound: Boolean(exactRecord),
      persistence,
      reviewWriteAllowed: ready,
      marksPublishApproved: false,
      uploadAllowed: false,
      publishAllowed: false,
      rerenderTriggered: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_preview_review_failed";
    const status = message.includes("missing") ? 404 : message.includes("not_allowed") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  routeContext: { params: Promise<{ draftId: string }> },
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
      { ok: false, error: "invalid_voxy_studio_preview_review_command" },
      { status: 400 },
    );
  }

  try {
    const { draftId } = await routeContext.params;
    const { context, renderDecisionId } = await loadContext(draftId);
    if (context.draft.revision !== parsed.data.expectedRevision) {
      return NextResponse.json({ ok: false, error: "voxy_studio_revision_conflict" }, { status: 409 });
    }
    const { persistence, ready } = persistenceReady();
    if (!ready) {
      return NextResponse.json(
        { ok: false, error: "voxy_studio_preview_review_persistent_primary_required", persistence },
        { status: 503 },
      );
    }

    const command = buildVoxyStudioPreviewReviewCommand({
      ...context,
      reviewerUserId: userId,
      decisionType: parsed.data.decisionType,
      reviewerComment: parsed.data.reviewerComment,
      checklistResults: parsed.data.checklistResults,
    });
    if (command.renderDecisionId !== renderDecisionId) {
      throw new Error("voxy_studio_preview_review_render_decision_binding_mismatch");
    }
    const saved = await persistVoxyRenderPreviewReviewDecision({ command });
    if (!saved.result.ok || !saved.result.record) {
      return NextResponse.json(
        {
          ok: false,
          error: "voxy_studio_preview_review_not_persisted",
          errors: saved.result.errors,
          warnings: saved.result.warnings,
        },
        { status: 409 },
      );
    }
    const match = matchVoxyStudioPreviewReviewRecord({
      ...context,
      record: saved.result.record,
    });
    if (!match.exact) {
      throw new Error(`voxy_studio_preview_review_persisted_binding_invalid:${match.reason}`);
    }

    return NextResponse.json({
      ok: true,
      decision: recordSummary(saved.result.record),
      auditEvent: saved.auditEvent,
      renderDecisionId,
      match,
      persistence: saved.persistence,
      marksPublishApproved: false,
      renderTriggered: false,
      rerenderTriggered: false,
      uploadTriggered: false,
      publishTriggered: false,
      schedulingTriggered: false,
      socialPostTriggered: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_preview_review_failed";
    const status = message.includes("revision_conflict") || message.includes("binding") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
