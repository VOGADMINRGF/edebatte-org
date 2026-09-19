import { coreCol } from "@core/db/triMongo";

import type { DurableSourceSnapshot } from "./sourceSnapshot";

const SOURCE_SNAPSHOT_COLLECTION = "source_intelligence_snapshots";

export type SourceSnapshotAppendResult =
  | { status: "inserted"; snapshot: DurableSourceSnapshot }
  | { status: "duplicate"; snapshot: DurableSourceSnapshot }
  | { status: "version_conflict"; snapshot: DurableSourceSnapshot | null };

export type SourceSnapshotRepository = {
  getById(snapshotId: string): Promise<DurableSourceSnapshot | null>;
  getLatest(sourceId: string): Promise<DurableSourceSnapshot | null>;
  listBySourceId(sourceId: string, limit?: number): Promise<DurableSourceSnapshot[]>;
  append(snapshot: DurableSourceSnapshot): Promise<SourceSnapshotAppendResult>;
};

type SourceSnapshotDoc = {
  _id: string;
  snapshot: DurableSourceSnapshot;
  createdAt: Date;
};

let indexesReady = false;
let repoSingleton: SourceSnapshotRepository | null = null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeLimit(value: unknown, fallback = 25) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(200, Math.floor(numeric)));
}

async function ensureIndexes() {
  if (indexesReady) return;
  const col = await coreCol<SourceSnapshotDoc>(SOURCE_SNAPSHOT_COLLECTION);
  await Promise.all([
    col.createIndex({ "snapshot.sourceId": 1, "snapshot.version": -1 }, { unique: true }),
    col.createIndex({ "snapshot.sourceId": 1, "snapshot.retrievedAt": -1 }),
    col.createIndex({ "snapshot.contentHash": 1 }),
  ]);
  indexesReady = true;
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: unknown }).code) === 11000,
  );
}

export function createMongoSourceSnapshotRepository(): SourceSnapshotRepository {
  return {
    async getById(snapshotId) {
      await ensureIndexes();
      const col = await coreCol<SourceSnapshotDoc>(SOURCE_SNAPSHOT_COLLECTION);
      const doc = await col.findOne({ _id: snapshotId });
      return doc?.snapshot ? clone(doc.snapshot) : null;
    },

    async getLatest(sourceId) {
      await ensureIndexes();
      const col = await coreCol<SourceSnapshotDoc>(SOURCE_SNAPSHOT_COLLECTION);
      const docs = await col
        .find({ "snapshot.sourceId": sourceId })
        .sort({ "snapshot.version": -1 })
        .limit(1)
        .toArray();
      return docs[0]?.snapshot ? clone(docs[0].snapshot) : null;
    },

    async listBySourceId(sourceId, limit) {
      await ensureIndexes();
      const col = await coreCol<SourceSnapshotDoc>(SOURCE_SNAPSHOT_COLLECTION);
      const docs = await col
        .find({ "snapshot.sourceId": sourceId })
        .sort({ "snapshot.version": -1 })
        .limit(normalizeLimit(limit))
        .toArray();
      return docs.map((doc) => clone(doc.snapshot));
    },

    async append(snapshot) {
      await ensureIndexes();
      const col = await coreCol<SourceSnapshotDoc>(SOURCE_SNAPSHOT_COLLECTION);
      try {
        await col.insertOne({
          _id: snapshot.snapshotId,
          snapshot: clone(snapshot),
          createdAt: new Date(snapshot.retrievedAt),
        });
        return { status: "inserted", snapshot: clone(snapshot) };
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
        const existingById = await col.findOne({ _id: snapshot.snapshotId });
        if (existingById?.snapshot) {
          return { status: "duplicate", snapshot: clone(existingById.snapshot) };
        }
        const conflicting = await col.findOne({
          "snapshot.sourceId": snapshot.sourceId,
          "snapshot.version": snapshot.version,
        });
        return {
          status: "version_conflict",
          snapshot: conflicting?.snapshot ? clone(conflicting.snapshot) : null,
        };
      }
    },
  };
}

export function createInMemorySourceSnapshotRepository(seed?: {
  snapshots?: DurableSourceSnapshot[];
}): SourceSnapshotRepository {
  const byId = new Map<string, DurableSourceSnapshot>();
  for (const snapshot of seed?.snapshots ?? []) {
    byId.set(snapshot.snapshotId, clone(snapshot));
  }

  const listForSource = (sourceId: string) =>
    Array.from(byId.values())
      .filter((snapshot) => snapshot.sourceId === sourceId)
      .sort((left, right) => right.version - left.version);

  return {
    async getById(snapshotId) {
      const snapshot = byId.get(snapshotId);
      return snapshot ? clone(snapshot) : null;
    },

    async getLatest(sourceId) {
      const snapshot = listForSource(sourceId)[0];
      return snapshot ? clone(snapshot) : null;
    },

    async listBySourceId(sourceId, limit) {
      return listForSource(sourceId)
        .slice(0, normalizeLimit(limit))
        .map((snapshot) => clone(snapshot));
    },

    async append(snapshot) {
      const existing = byId.get(snapshot.snapshotId);
      if (existing) {
        return { status: "duplicate", snapshot: clone(existing) };
      }
      const versionConflict = listForSource(snapshot.sourceId).find(
        (entry) => entry.version === snapshot.version,
      );
      if (versionConflict) {
        return { status: "version_conflict", snapshot: clone(versionConflict) };
      }
      byId.set(snapshot.snapshotId, clone(snapshot));
      return { status: "inserted", snapshot: clone(snapshot) };
    },
  };
}

export function setSourceSnapshotRepositoryForTests(repo: SourceSnapshotRepository | null) {
  repoSingleton = repo;
}

export function getSourceSnapshotRepository(): SourceSnapshotRepository {
  if (!repoSingleton) {
    repoSingleton = createMongoSourceSnapshotRepository();
  }
  return repoSingleton;
}
