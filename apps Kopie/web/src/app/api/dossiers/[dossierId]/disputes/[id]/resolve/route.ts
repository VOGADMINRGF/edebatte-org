import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dossierDisputesCol } from "@features/dossier/db";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const BodySchema = z.object({
  status: z.enum(["resolved", "rejected"]),
  resolutionNote: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string; id: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId, id } = await context.params;
  const body = BodySchema.parse(await req.json());
  const now = new Date();

  const col = await dossierDisputesCol();
  const res = await col.findOneAndUpdate(
    { dossierId, disputeId: id },
    {
      $set: {
        status: body.status,
        resolutionNote: body.resolutionNote,
        resolvedBy: auth.userId,
        resolvedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: "after", includeResultMetadata: true },
  );

  if (!res.value) {
    return NextResponse.json({ ok: false, error: "dispute_not_found" }, { status: 404 });
  }

  await logDossierRevision({
    dossierId,
    entityType: "dispute",
    entityId: id,
    action: "status_change",
    diffSummary: `Einspruch ${body.status === "resolved" ? "aufgeloest" : "abgelehnt"}.`,
    byRole: auth.actorRole,
    byUserId: auth.userId,
  });

  return NextResponse.json({ ok: true, disputeId: id, status: body.status });
}
