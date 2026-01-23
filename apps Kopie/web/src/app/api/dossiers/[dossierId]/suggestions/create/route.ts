import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dossierSuggestionsCol } from "@features/dossier/db";
import { SuggestionTypeSchema } from "@features/dossier/schemas";
import { makeDossierEntityId } from "@features/dossier/ids";
import { logDossierRevision } from "@features/dossier/revisions";
import { DOSSIER_LIMITS } from "@features/dossier/limits";
import { requireDossierMember } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const SourceSuggestionPayload = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(DOSSIER_LIMITS.title),
  publisher: z.string().min(1).max(DOSSIER_LIMITS.publisher),
  type: z.string().optional(),
  snippet: z.string().max(DOSSIER_LIMITS.snippet).optional(),
});

const ClaimSuggestionPayload = z.object({
  text: z.string().min(1).max(600),
  kind: z.string().optional(),
});

const QuestionSuggestionPayload = z.object({
  text: z.string().min(1).max(400),
});

const FlagSuggestionPayload = z.object({
  entityType: z.string().min(1).max(80),
  entityId: z.string().min(1).max(120),
  reason: z.string().min(1).max(400),
});

const SuggestionPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("source"), payload: SourceSuggestionPayload }),
  z.object({ type: z.literal("claim"), payload: ClaimSuggestionPayload }),
  z.object({ type: z.literal("counter"), payload: ClaimSuggestionPayload }),
  z.object({ type: z.literal("question"), payload: QuestionSuggestionPayload }),
  z.object({ type: z.literal("flag"), payload: FlagSuggestionPayload }),
]);

const BodySchema = z.object({
  type: SuggestionTypeSchema,
  payload: z.record(z.string(), z.any()),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierMember(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const body = BodySchema.parse(await req.json());
  const payloadParsed = SuggestionPayloadSchema.parse({ type: body.type, payload: body.payload });

  const col = await dossierSuggestionsCol();
  const now = new Date();
  const suggestionId = makeDossierEntityId("suggestion");

  await col.insertOne({
    suggestionId,
    dossierId,
    type: payloadParsed.type,
    payload: payloadParsed.payload,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  } as any);

  await logDossierRevision({
    dossierId,
    entityType: "suggestion",
    entityId: suggestionId,
    action: "create",
    diffSummary: "Vorschlag eingereicht.",
    byRole: auth.actorRole,
    byUserId: auth.userId,
  });

  return NextResponse.json({ ok: true, suggestionId, status: "pending" });
}
