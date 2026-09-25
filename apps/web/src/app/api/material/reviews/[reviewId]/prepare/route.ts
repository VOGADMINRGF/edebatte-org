import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getMaterialDocumentReviewSession,
  prepareSelectedMaterialQuestions,
} from "@/features/material/materialDocumentReviewStore";
import { requireGovernanceActorOrResponse } from "@/lib/server/auth/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ confirmed: z.literal(true) }).strict();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ reviewId: string }> },
) {
  const gate = await requireGovernanceActorOrResponse(req);
  if (gate instanceof Response) return gate;
  const { reviewId } = await context.params;
  const session = await getMaterialDocumentReviewSession(reviewId);
  if (!session) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const allowed =
    gate.actor.isAdmin ||
    session.actorId === gate.actor.userId ||
    Boolean(session.organizationId && gate.actor.scopedOwnerIds.includes(session.organizationId));
  if (!allowed) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  try {
    BodySchema.parse(await req.json());
    const prepared = await prepareSelectedMaterialQuestions({
      reviewId,
      actorId: gate.actor.userId,
      confirmed: true,
    });
    return NextResponse.json({
      ok: true,
      session: prepared,
      preparedWorkstateIds: prepared.preparedWorkstateIds,
      message: "Ausgewählte Fragen wurden als private, reviewpflichtige Create-Arbeitsstände vorbereitet. Es wurde keine Runde erstellt oder veröffentlicht und nichts in den Graph geschrieben.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "material_review_prepare_failed" },
      { status: 400 },
    );
  }
}
