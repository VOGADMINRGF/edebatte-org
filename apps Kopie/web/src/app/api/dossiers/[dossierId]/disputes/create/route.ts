import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dossierDisputesCol } from "@features/dossier/db";
import { makeDossierEntityId } from "@features/dossier/ids";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierMember } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const BodySchema = z.object({
  entityType: z.string().min(1).max(80),
  entityId: z.string().min(1).max(120),
  reason: z.string().min(1).max(500),
  requestedChange: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierMember(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const body = BodySchema.parse(await req.json());

  const col = await dossierDisputesCol();
  const now = new Date();
  const disputeId = makeDossierEntityId("dispute");

  await col.insertOne({
    disputeId,
    dossierId,
    entityType: body.entityType,
    entityId: body.entityId,
    reason: body.reason,
    requestedChange: body.requestedChange,
    status: "open",
    createdAt: now,
    updatedAt: now,
  } as any);

  await logDossierRevision({
    dossierId,
    entityType: "dispute",
    entityId: disputeId,
    action: "create",
    diffSummary: "Einspruch eingereicht.",
    byRole: auth.actorRole,
    byUserId: auth.userId,
  });

  return NextResponse.json({ ok: true, disputeId, status: "open" });
}
