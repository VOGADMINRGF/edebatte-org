import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readSession } from "@/utils/session";
import {
  persistCreateSavedWorkstate,
} from "@/features/create/createSavedWorkstateRepo";
import {
  CREATE_SAVED_WORKSTATE_STATUSES,
  CREATE_SAVED_WORKSTATE_TYPES,
  CREATE_SAVED_WORKSTATE_VISIBILITIES,
  type CreateSavedWorkstateMetadata,
} from "@/features/create/createSavedWorkstateContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    visibility: z.enum(CREATE_SAVED_WORKSTATE_VISIBILITIES),
    type: z.enum(CREATE_SAVED_WORKSTATE_TYPES),
    status: z.enum(CREATE_SAVED_WORKSTATE_STATUSES),
    sourceUrl: z.string().trim().nullable().optional(),
    sourceAnalysisId: z.string().trim().nullable().optional(),
    parentTopicId: z.string().trim().nullable().optional(),
    title: z.string().trim().min(1).max(160),
    content: z.string().trim().min(1).max(4000),
    metadata: z
      .object({
        topicId: z.string().trim().optional().nullable(),
        topicTitle: z.string().trim().optional().nullable(),
        summary: z.string().trim().optional().nullable(),
        evidenceSnippets: z.array(z.string().trim().min(1)).max(6).optional(),
        subtopics: z.array(z.string().trim().min(1)).max(12).optional(),
        suggestedQuestions: z.array(z.string().trim().min(1)).max(8).optional(),
        sourceSection: z.string().trim().optional().nullable(),
        sourceLabel: z.string().trim().optional().nullable(),
        linkLoaded: z.boolean().optional(),
        materialReviewId: z.string().trim().optional().nullable(),
        materialId: z.string().trim().optional().nullable(),
        materialReviewAction: z.enum(["reuse", "continue", "enrich", "create_new"]).optional().nullable(),
        suggestedOptions: z.array(z.string().trim().min(1)).max(12).optional(),
      })
      .optional(),
    resumeHref: z.string().trim().min(1),
  })
  .strict();

export async function POST(req: NextRequest) {
  const session = await readSession();
  const userId = session?.uid ?? null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = BodySchema.parse(await req.json());
    const record = await persistCreateSavedWorkstate({
      ownerUserId: userId,
      visibility: body.visibility,
      type: body.type,
      status: body.status,
      sourceUrl: body.sourceUrl,
      sourceAnalysisId: body.sourceAnalysisId,
      parentTopicId: body.parentTopicId,
      title: body.title,
      content: body.content,
      metadata: (body.metadata ?? {}) as CreateSavedWorkstateMetadata,
      resumeHref: body.resumeHref,
    });
    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        visibility: record.visibility,
        type: record.type,
        status: record.status,
        title: record.title,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "create_saved_workstate_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
