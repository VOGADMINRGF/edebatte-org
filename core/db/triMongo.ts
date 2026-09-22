// core/db/triMongo.ts
import { MongoClient, type Db, type Collection, type Document as MongoDoc } from "mongodb";

export type TriStore = "core" | "votes" | "pii" | "ai_core_reader";
type EnvSource = Record<string, string | undefined>;

type Conn = { uri?: string; db?: string };
const CFG: Record<TriStore, Conn> = {
  core:           { uri: process.env.CORE_MONGODB_URI,           db: process.env.CORE_DB_NAME },
  votes:          { uri: process.env.VOTES_MONGODB_URI,          db: process.env.VOTES_DB_NAME },
  pii:            { uri: process.env.PII_MONGODB_URI,            db: process.env.PII_DB_NAME },
  ai_core_reader: { uri: process.env.AI_CORE_READER_MONGODB_URI, db: process.env.AI_CORE_READER_DB_NAME },
};

const STORE_ENV_KEYS: Record<TriStore, { uri: string; db: string }> = {
  core: { uri: "CORE_MONGODB_URI", db: "CORE_DB_NAME" },
  votes: { uri: "VOTES_MONGODB_URI", db: "VOTES_DB_NAME" },
  pii: { uri: "PII_MONGODB_URI", db: "PII_DB_NAME" },
  ai_core_reader: { uri: "AI_CORE_READER_MONGODB_URI", db: "AI_CORE_READER_DB_NAME" },
};

const STORE_OWNERSHIP_HINT: Record<TriStore, string> = {
  core: "core = user/social/onboarding/referral/founder flows (users, social_friend_requests, social_messages, user_referrals, onboarding events, preference snapshots).",
  votes: "votes = vote/swipe/abstimmungsdaten only.",
  pii: "pii = credentials + identitaet/adresse/profil-PII only.",
  ai_core_reader: "ai_core_reader = read-only mirror for analysis workloads.",
};

declare global {
  // eslint-disable-next-line no-var
  var __TRIMONGO__: {
    clients: Partial<Record<TriStore, MongoClient>>;
    dbs: Partial<Record<TriStore, Db>>;
  } | undefined;
}
const G = (globalThis as any).__TRIMONGO__ ??= { clients: {}, dbs: {} };

export function isStaticCollectionBuild(source: EnvSource = process.env): boolean {
  return String(source.NEXT_PHASE ?? "").trim() === "phase-production-build";
}

export function shouldUseInMemoryMongoFallback(source: EnvSource = process.env): boolean {
  return Boolean(source.VITEST) || isStaticCollectionBuild(source);
}

function envValue(source: EnvSource, key: string): string | null {
  const value = source[key]?.trim();
  return value ? value : null;
}

function mongoHost(uri: string | null): string | null {
  if (!uri) return null;
  try {
    return new URL(uri).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function validateProductionMongoTopology(source: EnvSource = process.env): {
  ok: boolean;
  errors: string[];
} {
  const zones = [
    {
      label: "core",
      uriKey: "CORE_MONGODB_URI",
      dbKey: "CORE_DB_NAME",
      uri: envValue(source, "CORE_MONGODB_URI"),
      db: envValue(source, "CORE_DB_NAME"),
    },
    {
      label: "votes",
      uriKey: "VOTES_MONGODB_URI",
      dbKey: "VOTES_DB_NAME",
      uri: envValue(source, "VOTES_MONGODB_URI"),
      db: envValue(source, "VOTES_DB_NAME"),
    },
    {
      label: "pii",
      uriKey: "PII_MONGODB_URI",
      dbKey: "PII_DB_NAME",
      uri: envValue(source, "PII_MONGODB_URI"),
      db: envValue(source, "PII_DB_NAME"),
    },
  ] as const;

  const errors: string[] = [];
  const hosts = new Map<string, string>();
  const dbNames = new Map<string, string>();

  for (const zone of zones) {
    if (!zone.uri || !zone.db) continue;
    const host = mongoHost(zone.uri);
    if (!host) {
      errors.push(`${zone.uriKey} must be a valid MongoDB URI with a hostname`);
      continue;
    }

    const priorHostZone = hosts.get(host);
    if (priorHostZone) {
      errors.push(
        `${zone.label} and ${priorHostZone} must use different production MongoDB cluster hosts`,
      );
    } else {
      hosts.set(host, zone.label);
    }

    const normalizedDb = zone.db.toLowerCase();
    const priorDbZone = dbNames.get(normalizedDb);
    if (priorDbZone) {
      errors.push(
        `${zone.dbKey} must be distinct from the ${priorDbZone} database name in production`,
      );
    } else {
      dbNames.set(normalizedDb, zone.label);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function assertProductionMongoTopology(source: EnvSource = process.env): void {
  if (source.NODE_ENV !== "production" || isStaticCollectionBuild(source)) return;
  const result = validateProductionMongoTopology(source);
  if (!result.ok) {
    throw new Error(`[triMongo] Unsafe production Mongo topology: ${result.errors.join("; ")}`);
  }
}

function buildStaticCollectionCursor<T extends MongoDoc = MongoDoc>() {
  const cursor: Record<string, unknown> = {
    sort: () => cursor,
    limit: () => cursor,
    skip: () => cursor,
    project: () => cursor,
    next: async () => null,
    toArray: async () => [] as T[],
  };
  return cursor;
}

function buildStaticCollectionWriteBlock(method: string, store: TriStore, name: string) {
  return async () => {
    throw new Error(
      `[triMongo] Write blocked during static collection (${store}.${name}.${method}).`,
    );
  };
}

function buildStaticCollectionCollection<T extends MongoDoc = MongoDoc>(
  store: TriStore,
  name: string,
): Collection<T> {
  const cursorFactory = () => buildStaticCollectionCursor<T>();
  return {
    find: () => cursorFactory() as any,
    aggregate: () => cursorFactory() as any,
    listIndexes: () => cursorFactory() as any,
    findOne: async () => null,
    countDocuments: async () => 0,
    estimatedDocumentCount: async () => 0,
    createIndex: async () => "static_collection_skip",
    createIndexes: async () => [],
    updateOne: buildStaticCollectionWriteBlock("updateOne", store, name),
    updateMany: buildStaticCollectionWriteBlock("updateMany", store, name),
    replaceOne: buildStaticCollectionWriteBlock("replaceOne", store, name),
    insertOne: buildStaticCollectionWriteBlock("insertOne", store, name),
    insertMany: buildStaticCollectionWriteBlock("insertMany", store, name),
    deleteOne: buildStaticCollectionWriteBlock("deleteOne", store, name),
    deleteMany: buildStaticCollectionWriteBlock("deleteMany", store, name),
    findOneAndUpdate: buildStaticCollectionWriteBlock("findOneAndUpdate", store, name),
    findOneAndReplace: buildStaticCollectionWriteBlock("findOneAndReplace", store, name),
    findOneAndDelete: buildStaticCollectionWriteBlock("findOneAndDelete", store, name),
    bulkWrite: buildStaticCollectionWriteBlock("bulkWrite", store, name),
  } as unknown as Collection<T>;
}

function buildStaticCollectionDb(store: TriStore): Db {
  return {
    collection: <T extends MongoDoc = MongoDoc>(name: string) =>
      buildStaticCollectionCollection<T>(store, name),
  } as unknown as Db;
}

function configError(
  store: TriStore,
  missing: "uri" | "db",
  context?: string,
) {
  const envKey = missing === "uri" ? STORE_ENV_KEYS[store].uri : STORE_ENV_KEYS[store].db;
  const base = `[triMongo] Missing ${missing.toUpperCase()} for store "${store}" (expected env ${envKey})`;
  const where = context ? ` in ${context}` : "";
  return new Error(`${base}${where}. ${STORE_OWNERSHIP_HINT[store]}`);
}

export function assertStoreConfigured(store: TriStore, context?: string) {
  assertProductionMongoTopology();
  const cfg = CFG[store];
  if (!cfg?.uri) throw configError(store, "uri", context);
  if (!cfg?.db) throw configError(store, "db", context);
}

/** Liefert (und cached) den MongoClient für einen Store. */
async function getClient(store: TriStore): Promise<MongoClient> {
  if (!G.clients[store]) {
    assertStoreConfigured(store, "triMongo.getClient");
    const { uri } = CFG[store];
    G.clients[store] = new MongoClient(uri, {
      connectTimeoutMS: 15_000,
      serverSelectionTimeoutMS: 15_000,
    });
  }
  const client = G.clients[store]!;
  // kompatibel zu mongo 4/5/6 – ist verbunden?
  const anyClient = client as any;
  const connected =
    anyClient?.topology?.isConnected?.() ??
    anyClient?.mongoClient?.isConnected?.() ??
    false;
  if (!connected) await client.connect();
  return client;
}

/** Liefert (und cached) die Db-Instanz für einen Store. */
export async function getDb(store: TriStore = "core"): Promise<Db> {
  if (isStaticCollectionBuild()) {
    return buildStaticCollectionDb(store);
  }
  if (!G.dbs[store]) {
    assertStoreConfigured(store, "triMongo.getDb");
    const { db } = CFG[store];
    const client = await getClient(store);
    G.dbs[store] = client.db(db);
  }
  return G.dbs[store]!;
}

/** Overloads für sauberes TS: */
export async function getCol<T extends MongoDoc = MongoDoc>(name: string): Promise<Collection<T>>;
export async function getCol<T extends MongoDoc = MongoDoc>(name: string, store: TriStore): Promise<Collection<T>>;
export async function getCol<T extends MongoDoc = MongoDoc>(store: TriStore, name: string): Promise<Collection<T>>;

/**
 * Implementation – unterstützt beide Aufrufarten:
 *   getCol("users")                       -> default store "core"
 *   getCol("users", "votes")              -> (name, store)
 *   getCol("votes", "ballots")            -> (store, name)
 */
export async function getCol<T extends MongoDoc = MongoDoc>(
  a: string,
  b?: string
): Promise<Collection<T>> {
  let store: TriStore = "core";
  let name: string;
  if (!b) {
    name = a;
  } else if (a === "core" || a === "votes" || a === "pii" || a === "ai_core_reader") {
    store = a;
    name = b;
  } else {
    name = a;
    store = b as TriStore;
  }
  if (isStaticCollectionBuild()) {
    return buildStaticCollectionCollection<T>(store, name);
  }
  const db = await getDb(store);
  return db.collection<T>(name);
}

/** Shortcuts */
export const coreCol      = <T extends MongoDoc = MongoDoc>(name: string) => getCol<T>("core", name);
export const votesCol     = <T extends MongoDoc = MongoDoc>(name: string) => getCol<T>("votes", name);
export const piiCol       = <T extends MongoDoc = MongoDoc>(name: string) => getCol<T>("pii", name);
export const aiReaderCol  = <T extends MongoDoc = MongoDoc>(name: string) => getCol<T>("ai_core_reader", name);

/** „Connections“ (eigentlich: Db-Handles) */
export const coreConn     = () => getDb("core");
export const votesConn    = () => getDb("votes");
export const piiConn      = () => getDb("pii");
export const aiReaderConn = () => getDb("ai_core_reader");

/** Tests/CLI: alle Clients schließen. In Next-APIs NICHT benutzen. */
export async function closeAll(): Promise<void> {
  const clients = Object.values(G.clients).filter(Boolean) as MongoClient[];
  await Promise.allSettled(clients.map(c => c.close()));
  G.clients = {};
  G.dbs = {};
}

export { ObjectId } from "mongodb";

const triMongo = {
  getDb, getCol,
  coreCol, votesCol, piiCol, aiReaderCol,
  coreConn, votesConn, piiConn, aiReaderConn,
  closeAll,
  validateProductionMongoTopology, assertProductionMongoTopology,
};
export default triMongo;