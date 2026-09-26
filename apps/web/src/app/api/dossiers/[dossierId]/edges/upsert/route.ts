import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dossierEdgesCol, updateDossierCounts } from "@features/dossier/db";
import { DossierEdgeRelSchema, DossierNodeTypeSchema } from "@features/dossier/schemas";
import { makeDossierEntityId } from "@features/dossier/ids";
import { mutateDossierWithRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const EdgeInputSchema = z.object({
  edgeId: z.string().min(1).optional(),
  fromType: DossierNodeTypeSchema,
  fromId: z.string().min(1),
  toType: DossierNodeTypeSchema,
  toId: z.string().min(1),
  rel: DossierEdgeRelSchema,
  weight: z.number().min(0).max(1).optional(),
  justification: z.string().max(360).optional(),
});

const BodySchema = z.object({
  items: z.array(EdgeInputSchema).min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const body = BodySchema.parse(await req.json());
  const col = await dossierEdgesCol();
  const now = new Date();
  const results = [];

  for (const item of body.items) {
    const edgeId = item.edgeId ?? makeDossierEntityId("edge");
    const filter = item.edgeId
      ? { dossierId, edgeId }
      : { dossierId, fromId: item.fromId, toId: item.toId, rel: item.rel };

    const transaction = await mutateDossierWithRevision({
      dossierId,
      mutate: async (session) => {
        const res = await col.findOneAndUpdate(
          filter,
          {
            $set: {
              fromType: item.fromType,
              fromId: item.fromId,
              toType: item.toType,
              toId: item.toId,
              rel: item.rel,
              weight: item.weight,
              justification: item.justification,
              active: true,
            },
            $unset: { archivedAt: "", archivedReason: "" },
            $setOnInsert: {
              dossierId,
              edgeId,
              createdBy: "editor",
              createdAt: now,
            },
          },
          { upsert: true, returnDocument: "before", includeResultMetadata: true, session },
        );

        const created = !res.value;
        const effectiveEdgeId = res.value?.edgeId ?? edgeId;
        return {
          result: { edgeId: effectiveEdgeId, created },
          revision: {
            entityType: "edge",
            entityId: effectiveEdgeId,
            action: created ? "create" : "update",
            diffSummary: created ? "Graph-Edge erstellt." : "Graph-Edge aktualisiert.",
            byRole: auth.actorRole,
            byUserId: auth.userId,
          },
        };
      },
    });

    results.push(transaction.result);
  }

  const counts = await updateDossierCounts(dossierId, "Graph-Edge Update");
  return NextResponse.json({ ok: true, items: results, counts });
}
