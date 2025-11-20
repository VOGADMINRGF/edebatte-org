// core/db/triMongo.ts
import { MongoClient, type Db, type Collection, type Document as MongoDoc } from "mongodb";

export type TriStore = "core" | "votes" | "pii" | "ai_core_reader";

type Conn = { uri?: string; db?: string };
const CFG: Record<TriStore, Conn> = {
  core:           { uri: process.env.CORE_MONGODB_URI,           db: process.env.CORE_DB_NAME },
  votes:          { uri: process.env.VOTES_MONGODB_URI,          db: process.env.VOTES_DB_NAME },
  pii:            { uri: process.env.PII_MONGODB_URI,            db: process.env.PII_DB_NAME },
  ai_core_reader: { uri: process.env.AI_CORE_READER_MONGODB_URI, db: process.env.AI_CORE_READER_DB_NAME },
};

declare global {
  // eslint-disable-next-line no-var
  var __TRIMONGO__: {
    clients: Partial<Record<TriStore, MongoClient>>;
    dbs: Partial<Record<TriStore, Db>>;
  } | undefined;
}
const G = (globalThis as any).__TRIMONGO__ ??= { clients: {}, dbs: {} };

/** Liefert (und cached) den MongoClient für einen Store. */
async function getClient(store: TriStore): Promise<MongoClient> {
  if (!G.clients[store]) {
    const { uri } = CFG[store];
    if (!uri) throw new Error(`[triMongo] Missing URI for store "${store}"`);
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
  if (!G.dbs[store]) {
    const { db } = CFG[store];
    if (!db) throw new Error(`[triMongo] Missing DB name for store "${store}"`);
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
};
export default triMongo;
