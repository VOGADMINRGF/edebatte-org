import type { ClientSession } from "mongodb";

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

export type DossierRevisionMutationInput = Omit<RevisionInput, "dossierId">;

export type DossierRevisionMutationResult<T> = {
  result: T;
  revision: DossierRevisionMutationInput | null;
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

async function getTransactionClient() {
  const db = await getDb("core");
  const client = (db as any)?.client;
  if (!client?.startSession) {
    throw new Error("[dossier] Mongo transaction session unavailable for revision write");
  }
  return client;
}

function buildRevisionDoc(input: {
  dossierId: string;
  revision: DossierRevisionMutationInput;
  revId: string;
  timestamp: Date;
  prevHash?: string;
  hash?: string;
}) {
  return {
    revId: input.revId,
    dossierId: input.dossierId,
    entityType: input.revision.entityType,
    entityId: input.revision.entityId,
    action: input.revision.action,
    diffSummary: input.revision.diffSummary,
    byRole: input.revision.byRole,
    byUserId: input.revision.byUserId,
    timestamp: input.timestamp,
    ...(input.prevHash ? { prevHash: input.prevHash } : {}),
    ...(input.hash ? { hash: input.hash, hashAlgo: REVISION_HASH_ALGO } : {}),
  };
}

/**
 * Canonical atomic dossier mutation boundary.
 *
 * The caller's domain mutation, dossier revision-head CAS and revision insert all
 * execute in the same Mongo transaction. A CAS conflict retries the complete
 * mutation from a clean transaction; any other failure aborts without leaving an
 * unrevised domain change behind.
 */
export async function mutateDossierWithRevision<T>(input: {
  dossierId: string;
  mutate: (session: ClientSession) => Promise<DossierRevisionMutationResult<T>>;
}) {
  const revisionCol = await dossierRevisionsCol();
  const dossierCol = await dossiersCol();
  const client = await getTransactionClient();
  const timestamp = new Date();
  const revId = makeDossierEntityId("rev");
  let lastConflict: DossierRevisionCasConflictError | null = null;

  for (let attempt = 1; attempt <= MAX_CAS_ATTEMPTS; attempt += 1) {
    const session: ClientSession = client.startSession();
    let committed:
      | {
          result: T;
          revision: Record<string, unknown> | null;
        }
      | null = null;

    try {
      await session.withTransaction(async () => {
        const mutation = await input.mutate(session);
        if (!mutation.revision) {
          committed = { result: mutation.result, revision: null };
          return;
        }

        if (DISABLE_HASH_CHAIN) {
          const doc = buildRevisionDoc({
            dossierId: input.dossierId,
            revision: mutation.revision,
            revId,
            timestamp,
          });
          await revisionCol.insertOne(doc as any, { session });
          committed = { result: mutation.result, revision: doc };
          return;
        }

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
          const last = await revisionCol
            .find({ dossierId: input.dossierId }, { session })
            .sort({ timestamp: -1, _id: -1 })
            .limit(1)
            .next();
          prevHash = last?.hash ?? undefined;
        }

        const hash = computeRevisionHash({
          prevHash,
          dossierId: input.dossierId,
          entityType: mutation.revision.entityType,
          entityId: mutation.revision.entityId,
          action: mutation.revision.action,
          diffSummary: mutation.revision.diffSummary,
          byRole: mutation.revision.byRole,
          byUserId: mutation.revision.byUserId,
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

        const doc = buildRevisionDoc({
          dossierId: input.dossierId,
          revision: mutation.revision,
          revId,
          timestamp,
          prevHash,
          hash,
        });
        await revisionCol.insertOne(doc as any, { session });
        committed = { result: mutation.result, revision: doc };
      });

      if (!committed) {
        throw new Error("[dossier] revision transaction completed without durable mutation result");
      }
      return committed;
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

export async function logDossierRevision(input: RevisionInput) {
  const { revision } = await mutateDossierWithRevision({
    dossierId: input.dossierId,
    mutate: async () => ({
      result: null,
      revision: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        diffSummary: input.diffSummary,
        byRole: input.byRole,
        byUserId: input.byUserId,
      },
    }),
  });

  if (!revision) {
    throw new Error("[dossier] revision write completed without revision entry");
  }
  return revision;
}
