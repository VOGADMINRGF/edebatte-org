import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  dossierClaimsCol,
  updateDossierCounts,
} from "@features/dossier/db";
import {
  DossierClaimKindSchema,
  DossierClaimStatusSchema,
  EvidenceIndicatorSchema,
} from "@features/dossier/schemas";
import { makeDossierEntityId } from "@features/dossier/ids";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const ClaimInputSchema = z.object({
  claimId: z.string().min(1).optional(),
  text: z.string().min(1).max(600),
  kind: DossierClaimKindSchema.optional(),
  status: DossierClaimStatusSchema.optional(),
  uncertaintyNotes: z.array(z.string().max(360)).optional(),
  evidenceIndicator: EvidenceIndicatorSchema.optional(),
  authorRef: z
    .object({
      userId: z.string().min(1).optional(),
      handle: z.string().min(1).optional(),
    })
    .strict()
    .optional(),
});

const BodySchema = z.object({
  items: z.array(ClaimInputSchema).min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const body = BodySchema.parse(await req.json());

  const col = await dossierClaimsCol();
  const now = new Date();
  const results = [];

  for (const item of body.items) {
    const claimId = item.claimId ?? makeDossierEntityId("claim");
    const insertAuthorRef = item.authorRef ?? { userId: auth.userId };

    const res = await col.findOneAndUpdate(
      { dossierId, claimId },
      {
        $set: {
          text: item.text,
          kind: item.kind ?? "fact",
          status: item.status ?? "open",
          uncertaintyNotes: item.uncertaintyNotes ?? [],
          evidenceIndicator: item.evidenceIndicator ?? undefined,
          updatedAt: now,
        },
        $setOnInsert: {
          dossierId,
          claimId,
          createdByRole: auth.actorRole,
          authorRef: insertAuthorRef,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "before", includeResultMetadata: true },
    );

    const created = !res.value;
    await logDossierRevision({
      dossierId,
      entityType: "claim",
      entityId: claimId,
      action: created ? "create" : "update",
      diffSummary: created ? "Claim erstellt." : "Claim aktualisiert.",
      byRole: auth.actorRole,
      byUserId: auth.userId,
    });

    results.push({ claimId, created });
  }

  const counts = await updateDossierCounts(dossierId, "Claim-Update");
  return NextResponse.json({ ok: true, items: results, counts });
}
