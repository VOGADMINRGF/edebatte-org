import { getDb } from "@core/db/triMongo";
import { dossierRevisionsCol, dossiersCol } from "./db";
import { makeDossierEntityId } from "./ids";
import type { DossierActorRole, RevisionAction } from "./schemas";
import { computeRevisionHash, REVISION_HASH_ALGO } from "./revisionHash";

const DISABLE_HASH_CHAIN = process.env.VOG_DISABLE_REVISION_HASH_CHAIN === "1";
const MAX_CAS_ATTEMPTS = 5;

export type RevisionInput = {
  dossierId: string;
  entityType: string;
  entityId: string;
  action: RevisionAction;
  diffSummary: string;
  byRole: DossierActorRole;
  byUserId?: string;
};

class DossierRevisionCasConflictError extends Error {
  constructor(dossierId: string) {
    super(`[dossier] revision head changed concurrently for ${dossierId}`);
    this.name = "DossierRevisionCasConflictError";
  }
}

function isDossierRevisionCasConflict(error: unknown): error is DossierRevisionCasConflictError {
  return error instanceof DossierRevisionCasConflictError;
}

export async function logDossierRevision(input: RevisionInput) {
  const col = await dossierRevisionsCol();
  const dossierCol = await dossiersCol();
  const timestamp = new Date();
  const revId = makeDossierEntityId("rev");

  if (DISABLE_HASH_CHAIN) {
    const doc = {
      revId,
      dossierId: input.dossierId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      diffSummary: input.diffSummary,
      byRole: input.byRole,
      byUserId: input.byUserId,
      timestamp,
    };
    await col.insertOne(doc as any);
    return doc;
  }

  const db = await getDb("core");
  const client = (db as any)?.client;
  if (!client?.startSession) {
    throw new Error("[dossier] Mongo transaction session unavailable for revision write");
  }

  let lastConflict: DossierRevisionCasConflictError | null = null;

  for (let attempt = 1; attempt <= MAX_CAS_ATTEMPTS; attempt += 1) {
    const session = client.startSession();
    let committedDoc: Record<string, unknown> | null = null;

    try {
      await session.withTransaction(async () => {
        const dossier = await dossierCol.findOne(
          { dossierId: input.dossierId },
          { projection: { lastRevisionHash: 1 }, session },
        );
        if (!dossier) {
          throw new Error(`[dossier] cannot append revision for missing dossier ${input.dossierId}`);
        }

        const headHash = dossier.lastRevisionHash ?? undefined;
        let prevHash = headHash;
        if (!prevHash) {
          const last = await col
            .find({ dossierId: input.dossierId }, { session })
            .sort({ timestamp: -1, _id: -1 })
            .limit(1)
            .next();
          prevHash = last?.hash ?? undefined;
        }

        const hash = computeRevisionHash({
          prevHash,
          dossierId: input.dossierId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          diffSummary: input.diffSummary,
          byRole: input.byRole,
          byUserId: input.byUserId,
          timestamp,
        });

        const headFilter = headHash
          ? { dossierId: input.dossierId, lastRevisionHash: headHash }
          : { dossierId: input.dossierId, lastRevisionHash: { $exists: false } };
        const res = await dossierCol.updateOne(
          headFilter,
          { $set: { lastRevisionHash: hash, lastRevisionAt: timestamp }, $inc: { revisionSeq: 1 } },
          { session },
        );
        if (res.modifiedCount !== 1) {
          throw new DossierRevisionCasConflictError(input.dossierId);
        }

        const doc = {
          revId,
          dossierId: input.dossierId,
          entityType: input.entityType,
          entityId: input.entityId,
          action: input.action,
          diffSummary: input.diffSummary,
          byRole: input.byRole,
          byUserId: input.byUserId,
          timestamp,
          ...(prevHash ? { prevHash } : {}),
          hash,
          hashAlgo: REVISION_HASH_ALGO,
        };

        await col.insertOne(doc as any, { session });
        committedDoc = doc;
      });

      if (!committedDoc) {
        throw new Error("[dossier] revision transaction completed without durable revision entry");
      }
      return committedDoc;
    } catch (error) {
      if (!isDossierRevisionCasConflict(error)) throw error;
      lastConflict = error;
      if (attempt === MAX_CAS_ATTEMPTS) break;
    } finally {
      await session.endSession();
    }
  }

  throw lastConflict ?? new Error(`[dossier] revision head CAS exhausted for ${input.dossierId}`);
}
