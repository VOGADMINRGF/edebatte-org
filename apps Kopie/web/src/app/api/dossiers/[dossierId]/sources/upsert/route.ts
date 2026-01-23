import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stableHash } from "@core/utils/hash";
import {
  dossierSourcesCol,
  updateDossierCounts,
} from "@features/dossier/db";
import { DossierSourceTypeSchema } from "@features/dossier/schemas";
import { makeDossierEntityId } from "@features/dossier/ids";
import { logDossierRevision } from "@features/dossier/revisions";
import {
  DOSSIER_LIMITS,
  clampNote,
  clampPublisher,
  clampSnippet,
  clampTitle,
} from "@features/dossier/limits";
import { requireDossierEditor } from "@/lib/server/auth/dossier";

export const runtime = "nodejs";

const SourceInputSchema = z.object({
  sourceId: z.string().min(1).optional(),
  url: z.string().url(),
  title: z.string().min(1).max(DOSSIER_LIMITS.title),
  publisher: z.string().min(1).max(DOSSIER_LIMITS.publisher),
  publishedAt: z.union([z.string(), z.date()]).optional(),
  retrievedAt: z.union([z.string(), z.date()]).optional(),
  type: DossierSourceTypeSchema,
  snippet: z.string().max(DOSSIER_LIMITS.snippet).optional(),
  licenseNote: z.string().max(DOSSIER_LIMITS.note).optional(),
  conflictOfInterest: z
    .object({
      hasConflict: z.boolean(),
      note: z.string().max(DOSSIER_LIMITS.note).optional(),
    })
    .strict()
    .optional(),
  tags: z.array(z.string().max(48)).optional(),
  language: z.string().max(12).optional(),
});

const BodySchema = z.object({
  items: z.array(SourceInputSchema).min(1),
});

function normalizeUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname !== "/") {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

function parseDate(value?: string | Date) {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ dossierId: string }> },
) {
  const auth = await requireDossierEditor(req);
  if (auth instanceof Response) return auth;

  const { dossierId } = await context.params;
  const raw = await req.json();
  const body = BodySchema.parse({
    ...raw,
    items: Array.isArray(raw?.items)
      ? raw.items.map((item: any) => ({
          ...item,
          title: clampTitle(item?.title),
          publisher: clampPublisher(item?.publisher),
          snippet: clampSnippet(item?.snippet),
          licenseNote: clampNote(item?.licenseNote),
          conflictOfInterest: item?.conflictOfInterest
            ? {
                ...item.conflictOfInterest,
                note: clampNote(item.conflictOfInterest.note),
              }
            : item?.conflictOfInterest,
        }))
      : raw?.items,
  });
  const col = await dossierSourcesCol();
  const now = new Date();
  const results = [];

  for (const item of body.items) {
    const url = normalizeUrl(item.url);
    const canonicalUrlHash = stableHash(url);
    const sourceId = item.sourceId ?? makeDossierEntityId("source");

    const res = await col.findOneAndUpdate(
      { dossierId, canonicalUrlHash },
      {
        $set: {
          url,
          title: item.title,
          publisher: item.publisher,
          publishedAt: parseDate(item.publishedAt),
          retrievedAt: parseDate(item.retrievedAt),
          type: item.type,
          snippet: item.snippet,
          licenseNote: item.licenseNote,
          conflictOfInterest: item.conflictOfInterest,
          tags: item.tags,
          language: item.language,
          updatedAt: now,
        },
        $setOnInsert: {
          dossierId,
          sourceId,
          canonicalUrlHash,
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "before", includeResultMetadata: true },
    );

    const created = !res.value;
    const effectiveSourceId = res.value?.sourceId ?? sourceId;
    await logDossierRevision({
      dossierId,
      entityType: "source",
      entityId: effectiveSourceId,
      action: created ? "create" : "update",
      diffSummary: created ? "Quelle hinzugefuegt." : "Quelle aktualisiert.",
      byRole: auth.actorRole,
      byUserId: auth.userId,
    });

    results.push({ sourceId: effectiveSourceId, created });
  }

  const counts = await updateDossierCounts(dossierId, "Quelle Update");
  return NextResponse.json({ ok: true, items: results, counts });
}
