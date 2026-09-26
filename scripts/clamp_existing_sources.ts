#!/usr/bin/env tsx
import { coreCol } from "@core/db/triMongo";
import { mutateDossierWithRevision } from "@features/dossier/revisions";
import {
  clampNote,
  clampPublisher,
  clampSnippet,
  clampTitle,
} from "@features/dossier/limits";

type SourceDoc = {
  _id?: unknown;
  sourceId: string;
  dossierId: string;
  title?: string;
  publisher?: string;
  snippet?: string;
  licenseNote?: string;
  conflictOfInterest?: { hasConflict: boolean; note?: string };
};

function parseLimit(args: string[]) {
  const arg = args.find((a) => a.startsWith("--limit="));
  if (!arg) return 0;
  const v = Number(arg.split("=")[1] ?? "0");
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function parseDossierId(args: string[]) {
  const arg = args.find((a) => a.startsWith("--dossierId="));
  return arg ? String(arg.split("=")[1] ?? "").trim() : "";
}

async function run() {
  const args = process.argv.slice(2);
  const limit = parseLimit(args);
  const dossierIdFilter = parseDossierId(args);
  const dryRun = args.includes("--dry-run");

  const col = await coreCol<SourceDoc>("dossier_sources");
  const filter = dossierIdFilter ? { dossierId: dossierIdFilter } : {};
  const cursor = col.find(filter);
  if (limit) cursor.limit(limit);

  let processed = 0;
  let updated = 0;

  for await (const source of cursor) {
    processed += 1;

    const nextTitle = clampTitle(source.title) ?? source.title;
    const nextPublisher = clampPublisher(source.publisher) ?? source.publisher;
    const nextSnippet = clampSnippet(source.snippet) ?? source.snippet;
    const nextLicense = clampNote(source.licenseNote) ?? source.licenseNote;
    const nextConflictNote = source.conflictOfInterest
      ? clampNote(source.conflictOfInterest.note) ?? source.conflictOfInterest.note
      : undefined;

    const changes: Record<string, any> = {};
    if (nextTitle !== source.title) changes.title = nextTitle;
    if (nextPublisher !== source.publisher) changes.publisher = nextPublisher;
    if (nextSnippet !== source.snippet) changes.snippet = nextSnippet;
    if (nextLicense !== source.licenseNote) changes.licenseNote = nextLicense;
    if (source.conflictOfInterest && nextConflictNote !== source.conflictOfInterest.note) {
      changes.conflictOfInterest = {
        ...source.conflictOfInterest,
        note: nextConflictNote,
      };
    }

    if (Object.keys(changes).length === 0) continue;
    updated += 1;

    if (!dryRun) {
      await mutateDossierWithRevision({
        dossierId: source.dossierId,
        mutate: async (session) => {
          const res = await col.updateOne(
            { _id: source._id },
            { $set: { ...changes, updatedAt: new Date() } },
            { session },
          );
          return {
            result: null,
            revision:
              res.modifiedCount > 0
                ? {
                    entityType: "source",
                    entityId: source.sourceId,
                    action: "update",
                    diffSummary: "Quelle gekuerzt (Quote-Safe Clamp).",
                    byRole: "system",
                  }
                : null,
          };
        },
      });
    }
  }

  console.log(`[sources-clamp] processed=${processed} updated=${updated} dryRun=${dryRun}`);
}

run().catch((err) => {
  console.error("[sources-clamp] fatal", err);
  process.exit(1);
});
