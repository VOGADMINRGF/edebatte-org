import "server-only";

import crypto from "node:crypto";
import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import {
  CREATE_SAVED_WORKSTATE_SCHEMA_VERSION,
  type CreateSavedWorkstateRecord,
  type PersistCreateSavedWorkstateInput,
} from "@/features/create/createSavedWorkstateContract";

type CreateSavedWorkstateRepository = {
  save(record: CreateSavedWorkstateRecord): Promise<void>;
  list(): Promise<CreateSavedWorkstateRecord[]>;
};

const COLLECTION = "create_saved_workstates";

let repoSingleton: CreateSavedWorkstateRepository | null = null;
let indexesReady = false;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeOptionalString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function createMongoRepo(): CreateSavedWorkstateRepository {
  return {
    async save(record) {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: CreateSavedWorkstateRecord }>(
        COLLECTION,
      );
      await col.updateOne(
        { _id: record.id },
        {
          $set: {
            record: clone(record),
            ownerUserId: record.ownerUserId,
            organizationId: record.organizationId,
            visibility: record.visibility,
            type: record.type,
            status: record.status,
            updatedAt: record.updatedAt,
          } as any,
        },
        { upsert: true },
      );
    },
    async list() {
      await ensureIndexes();
      const col = await coreCol<{ _id: string; record: CreateSavedWorkstateRecord }>(
        COLLECTION,
      );
      const docs = await col.find({}).sort({ updatedAt: -1 }).toArray();
      return docs
        .map((doc) => clone(doc.record))
        .filter((record): record is CreateSavedWorkstateRecord => Boolean(record));
    },
  };
}

export function createInMemoryCreateSavedWorkstateRepo(seed?: {
  records?: CreateSavedWorkstateRecord[];
}): CreateSavedWorkstateRepository {
  const records = new Map<string, CreateSavedWorkstateRecord>();
  for (const record of seed?.records ?? []) {
    records.set(record.id, clone(record));
  }
  return {
    async save(record) {
      records.set(record.id, clone(record));
    },
    async list() {
      return Array.from(records.values())
        .map((record) => clone(record))
        .sort((left, right) =>
          String(right.updatedAt).localeCompare(String(left.updatedAt)),
        );
    },
  };
}

function getRepo() {
  if (shouldUseInMemoryMongoFallback()) {
    if (!repoSingleton) repoSingleton = createInMemoryCreateSavedWorkstateRepo();
    return repoSingleton;
  }
  if (!repoSingleton) repoSingleton = createMongoRepo();
  return repoSingleton;
}

async function ensureIndexes() {
  if (indexesReady) return;
  const col = await coreCol(COLLECTION);
  await Promise.all([
    col.createIndex({ ownerUserId: 1, updatedAt: -1 }),
    col.createIndex({ organizationId: 1, updatedAt: -1 }),
    col.createIndex({ visibility: 1, updatedAt: -1 }),
    col.createIndex({ type: 1, updatedAt: -1 }),
  ]).catch(() => undefined);
  indexesReady = true;
}

export async function persistCreateSavedWorkstate(
  input: PersistCreateSavedWorkstateInput,
): Promise<CreateSavedWorkstateRecord> {
  const timestamp = nowIso();
  const record: CreateSavedWorkstateRecord = {
    schemaVersion: CREATE_SAVED_WORKSTATE_SCHEMA_VERSION,
    id: `create-workstate-${crypto.randomUUID()}`,
    ownerUserId: input.ownerUserId,
    organizationId: normalizeOptionalString(input.organizationId),
    visibility: input.visibility,
    type: input.type,
    status: input.status,
    sourceUrl: normalizeOptionalString(input.sourceUrl),
    sourceAnalysisId: normalizeOptionalString(input.sourceAnalysisId),
    parentTopicId: normalizeOptionalString(input.parentTopicId),
    title: String(input.title).trim().slice(0, 160) || "Arbeitsstand",
    content: String(input.content).trim().slice(0, 4000),
    metadata: clone(input.metadata ?? {}),
    ...(input.privateReviewEvidence
      ? { privateReviewEvidence: clone(input.privateReviewEvidence) }
      : {}),
    resumeHref: String(input.resumeHref).trim() || "/create",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await getRepo().save(record);
  return record;
}

export async function listCreateSavedWorkstates() {
  return getRepo().list();
}

export function setCreateSavedWorkstateRepoForTests(
  repo: CreateSavedWorkstateRepository | null,
) {
  repoSingleton = repo;
  indexesReady = false;
}
