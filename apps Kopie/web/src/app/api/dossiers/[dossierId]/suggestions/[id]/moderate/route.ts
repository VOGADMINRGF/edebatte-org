import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dossierSuggestionsCol } from "@features/dossier/db";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const BodySchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  moderationNote: z.string().max(400).optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string; id: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId, id } = await context.params;
  const body = BodySchema.parse(await req.json());

  const col = await dossierSuggestionsCol();
  const now = new Date();
  const res = await col.findOneAndUpdate(
    { dossierId, suggestionId: id },
    { $set: { status: body.status, moderationNote: body.moderationNote, updatedAt: now } },
    { returnDocument: "after", includeResultMetadata: true },
  );

  if (!res.value) {
    return NextResponse.json({ ok: false, error: "suggestion_not_found" }, { status: 404 });
  }

  await logDossierRevision({
    dossierId,
    entityType: "suggestion",
    entityId: id,
    action: "status_change",
    diffSummary: `Vorschlag ${body.status === "accepted" ? "akzeptiert" : "abgelehnt"}.`,
    byRole: auth.actorRole,
    byUserId: auth.userId,
  });

  return NextResponse.json({ ok: true, suggestionId: id, status: body.status });
}
