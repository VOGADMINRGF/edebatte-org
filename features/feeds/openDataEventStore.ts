import { coreCol } from "@core/db/triMongo";

import type { NormalizedOpenDataEvent } from "./openDataConnector";

const COLLECTION = "source_open_data_events";

export type OpenDataEventProjection = {
  projectionId: string;
  event: NormalizedOpenDataEvent;
  createdAt: string;
};

export type OpenDataEventRepository = {
  appendMany(events: NormalizedOpenDataEvent[]): Promise<{ inserted: number; duplicates: number }>;
  listRecent(input?: { limit?: number }): Promise<OpenDataEventProjection[]>;
};

type OpenDataEventDoc = {
  _id: string;
  event: NormalizedOpenDataEvent;
  createdAt: Date;
};

let indexesReady = false;
let repoSingleton: OpenDataEventRepository | null = null;

function projectionId(event: NormalizedOpenDataEvent) {
  return `${event.provenance.snapshotId}:${event.eventId}`;
}

function limitOf(value: unknown, fallback = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(1, Math.min(500, Math.floor(numeric)));
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function ensureIndexes() {
  if (indexesReady) return;
  const col = await coreCol<OpenDataEventDoc>(COLLECTION);
  await Promise.all([
    col.createIndex({ "event.eventId": 1, "event.provenance.retrievedAt": -1 }),
    col.createIndex({ "event.providerId": 1, "event.entityType": 1, "event.provenance.retrievedAt": -1 }),
    col.createIndex({ "event.parentEventId": 1, "event.provenance.retrievedAt": -1 }),
    col.createIndex({ "event.jurisdictionCode": 1, "event.provenance.retrievedAt": -1 }),
  ]);
  indexesReady = true;
}

function isDuplicateKey(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: unknown }).code) === 11000,
  );
}

export function createMongoOpenDataEventRepository(): OpenDataEventRepository {
  return {
    async appendMany(events) {
      if (!events.length) return { inserted: 0, duplicates: 0 };
      await ensureIndexes();
      const col = await coreCol<OpenDataEventDoc>(COLLECTION);
      let inserted = 0;
      let duplicates = 0;
      for (const event of events) {
        try {
          await col.insertOne({
            _id: projectionId(event),
            event: clone(event),
            createdAt: new Date(event.provenance.retrievedAt),
          });
          inserted += 1;
        } catch (error) {
          if (!isDuplicateKey(error)) throw error;
          duplicates += 1;
        }
      }
      return { inserted, duplicates };
    },

    async listRecent(input) {
      await ensureIndexes();
      const col = await coreCol<OpenDataEventDoc>(COLLECTION);
      const docs = await col
        .find({})
        .sort({ "event.provenance.retrievedAt": -1 })
        .limit(limitOf(input?.limit))
        .toArray();
      return docs.map((doc) => ({
        projectionId: doc._id,
        event: clone(doc.event),
        createdAt: doc.createdAt.toISOString(),
      }));
    },
  };
}

export function createInMemoryOpenDataEventRepository(seed?: {
  events?: NormalizedOpenDataEvent[];
}): OpenDataEventRepository {
  const entries = new Map<string, OpenDataEventProjection>();
  for (const event of seed?.events ?? []) {
    entries.set(projectionId(event), {
      projectionId: projectionId(event),
      event: clone(event),
      createdAt: event.provenance.retrievedAt,
    });
  }

  return {
    async appendMany(events) {
      let inserted = 0;
      let duplicates = 0;
      for (const event of events) {
        const id = projectionId(event);
        if (entries.has(id)) {
          duplicates += 1;
          continue;
        }
        entries.set(id, {
          projectionId: id,
          event: clone(event),
          createdAt: event.provenance.retrievedAt,
        });
        inserted += 1;
      }
      return { inserted, duplicates };
    },

    async listRecent(input) {
      return Array.from(entries.values())
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, limitOf(input?.limit))
        .map(clone);
    },
  };
}

export function setOpenDataEventRepositoryForTests(repo: OpenDataEventRepository | null) {
  repoSingleton = repo;
}

export function getOpenDataEventRepository(): OpenDataEventRepository {
  if (!repoSingleton) repoSingleton = createMongoOpenDataEventRepository();
  return repoSingleton;
}
