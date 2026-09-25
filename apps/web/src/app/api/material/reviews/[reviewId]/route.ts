import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getMaterialDocumentReviewSession,
  updateMaterialDocumentReviewSelections,
} from "@/features/material/materialDocumentReviewStore";
import { requireGovernanceActorOrResponse } from "@/lib/server/auth/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SelectionSchema = z
  .object({
    questionId: z.string().trim().min(1).max(80),
    selected: z.boolean(),
    action: z.enum(["reuse", "continue", "enrich", "create_new"]).nullable(),
    theme: z.string().trim().min(1).max(160),
    text: z.string().trim().min(1).max(500),
    rationale: z.string().trim().min(1).max(800),
    options: z.array(z.string().trim().min(1).max(300)).max(12),
  })
  .strict();

const UpdateSchema = z.object({ selections: z.array(SelectionSchema).max(20) }).strict();

function canAccess(
  session: Awaited<ReturnType<typeof getMaterialDocumentReviewSession>>,
  gate: Exclude<Awaited<ReturnType<typeof requireGovernanceActorOrResponse>>, Response>,
) {
  if (!session) return false;
  return (
    gate.actor.isAdmin ||
    session.actorId === gate.actor.userId ||
    Boolean(session.organizationId && gate.actor.scopedOwnerIds.includes(session.organizationId))
  );
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ reviewId: string }> },
) {
  const gate = await requireGovernanceActorOrResponse(req);
  if (gate instanceof Response) return gate;
  const { reviewId } = await context.params;
  const session = await getMaterialDocumentReviewSession(reviewId);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!canAccess(session, gate)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, session });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ reviewId: string }> },
) {
  const gate = await requireGovernanceActorOrResponse(req);
  if (gate instanceof Response) return gate;
  const { reviewId } = await context.params;
  const session = await getMaterialDocumentReviewSession(reviewId);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!canAccess(session, gate)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  try {
    const body = UpdateSchema.parse(await req.json());
    const existingById = new Map(session.selections.map((selection) => [selection.questionId, selection]));
    const updated = await updateMaterialDocumentReviewSelections({
      reviewId,
      selections: body.selections.map((selection) => {
        const existing = existingById.get(selection.questionId);
        if (!existing) throw new Error("material_review_question_unknown");
        return {
          ...selection,
          action: selection.action ?? null,
          sourceAnchors: existing.sourceAnchors,
          options: selection.options.map((text, index) => {
            const previous = existing.options[index];
            return {
              text,
              source: previous?.text === text ? previous.source : "human_edit" as const,
            };
          }),
        };
      }),
    });
    return NextResponse.json({ ok: true, session: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "material_review_update_failed" },
      { status: 400 },
    );
  }
}
