export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  VOXY_EDITORIAL_ALLOWED_MOTIONS,
  validateVoxyEditorialStoryPlan,
} from "@/features/voxyVideo/editorialStoryPlan";
import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";
import { createFailClosedDossierStudioEvidenceAuthority } from "@/features/voxyVideo/studioDossierEvidenceAuthority";
import {
  VOXY_STUDIO_SAFE_ZONE_PROFILES,
  buildVoxyStudioRenderReviewGateId,
} from "@/features/voxyVideo/studioDraft";
import {
  buildVoxyStudioEditorialReviewItemId,
  createDefaultVoxyStudioServiceDependencies,
  editVoxyStudioDraft,
} from "@/features/voxyVideo/studioDraftService";
import { buildVoxyStudioOperatorEditablePatch } from "@/features/voxyVideo/studioOperatorEdit";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";

const CaptionAdjustmentSchema = z
  .object({
    cueId: z.string().trim().min(1).max(160),
    startDeltaMs: z.number().int().min(-1_500).max(1_500),
    endDeltaMs: z.number().int().min(-1_500).max(1_500),
    textOverride: z.string().trim().min(1).max(240).nullable(),
  })
  .strict();

const ChapterUpdateSchema = z
  .object({
    chapterId: z.string().trim().min(1).max(160),
    headline: z.string().trim().min(1).max(180).optional(),
    narration: z.string().trim().min(1).max(2_400).optional(),
    motion: z.enum(VOXY_EDITORIAL_ALLOWED_MOTIONS).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.headline !== undefined ||
      value.narration !== undefined ||
      value.motion !== undefined,
    {
      message: "chapter_update_empty",
    },
  );

const BodySchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    title: z.string().trim().min(1).max(240).optional(),
    selectedFormat: z.enum(VOXY_VIDEO_FORMATS).optional(),
    safeZoneProfile: z.enum(VOXY_STUDIO_SAFE_ZONE_PROFILES).optional(),
    chapterOrder: z.array(z.string().trim().min(1).max(160)).min(1).max(30).optional(),
    chapterUpdates: z.array(ChapterUpdateSchema).max(30).optional(),
    captionAdjustments: z.array(CaptionAdjustmentSchema).max(200).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.title !== undefined ||
      value.selectedFormat !== undefined ||
      value.safeZoneProfile !== undefined ||
      value.chapterOrder !== undefined ||
      value.chapterUpdates !== undefined ||
      value.captionAdjustments !== undefined,
    { message: "studio_edit_command_empty" },
  );

export async function PATCH(
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
      { ok: false, error: "invalid_voxy_studio_edit_command" },
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
    const patch = buildVoxyStudioOperatorEditablePatch({
      draft: current,
      command: {
        title: parsed.data.title,
        selectedFormat: parsed.data.selectedFormat,
        safeZoneProfile: parsed.data.safeZoneProfile,
        chapterOrder: parsed.data.chapterOrder,
        chapterUpdates: parsed.data.chapterUpdates,
        captionAdjustments: parsed.data.captionAdjustments?.map((item) => ({
          cueId: item.cueId,
          startDeltaMs: item.startDeltaMs,
          endDeltaMs: item.endDeltaMs,
          textOverride: item.textOverride ?? null,
        })),
      },
    });
    const draft = await editVoxyStudioDraft(
      {
        draftId,
        expectedRevision: current.revision,
        patch,
        updatedByUserId: userId,
      },
      deps,
    );
    const evidence = await evidenceAuthority.resolveEvidenceContext(draft);
    const validation = validateVoxyEditorialStoryPlan(draft.storyPlan, evidence);

    return NextResponse.json({
      ok: true,
      draft,
      validation,
      reviewItemId: buildVoxyStudioEditorialReviewItemId(draft),
      decisionGateId: buildVoxyStudioRenderReviewGateId(draft),
      approvalsInvalidated: true,
      renderBindingInvalidated: true,
      uploadTriggered: false,
      publishTriggered: false,
      autoRender: false,
      autoPublish: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_edit_failed";
    const status = message.includes("revision_conflict") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
