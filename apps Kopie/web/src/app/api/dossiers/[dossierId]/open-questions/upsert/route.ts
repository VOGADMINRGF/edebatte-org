import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { openQuestionsCol, updateDossierCounts } from "@features/dossier/db";
import { OpenQuestionStatusSchema, ResponsibilityTypeSchema } from "@features/dossier/schemas";
import { makeDossierEntityId } from "@features/dossier/ids";
import { logDossierRevision } from "@features/dossier/revisions";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const QuestionInputSchema = z.object({
  questionId: z.string().min(1).optional(),
  text: z.string().min(1).max(400),
  status: OpenQuestionStatusSchema.optional(),
  responsibility: z
    .object({
      type: ResponsibilityTypeSchema,
      label: z.string().min(1).max(120),
      ref: z.string().max(120).optional(),
    })
    .strict()
    .optional(),
  links: z
    .object({
      sourceIds: z.array(z.string().min(1)).optional(),
      claimIds: z.array(z.string().min(1)).optional(),
      findingIds: z.array(z.string().min(1)).optional(),
    })
    .strict()
    .optional(),
});

const BodySchema = z.object({
  items: z.array(QuestionInputSchema).min(1),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const body = BodySchema.parse(await req.json());
  const col = await openQuestionsCol();
  const now = new Date();
  const results = [];

  for (const item of body.items) {
    const questionId = item.questionId ?? makeDossierEntityId("question");
    const res = await col.findOneAndUpdate(
      { dossierId, questionId },
      {
        $set: {
          text: item.text,
          status: item.status ?? "open",
          responsibility: item.responsibility,
          links: item.links,
          updatedAt: now,
        },
        $setOnInsert: {
          dossierId,
          questionId,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "before", includeResultMetadata: true },
    );

    const created = !res.value;
    await logDossierRevision({
      dossierId,
      entityType: "open_question",
      entityId: questionId,
      action: created ? "create" : "update",
      diffSummary: created ? "Offene Frage erstellt." : "Offene Frage aktualisiert.",
      byRole: auth.actorRole,
      byUserId: auth.userId,
    });

    results.push({ questionId, created });
  }

  const counts = await updateDossierCounts(dossierId, "Offene Frage Update");
  return NextResponse.json({ ok: true, items: results, counts });
}
