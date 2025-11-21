// Legacy shim version of triMongo (kept solely for historical context).
import { ObjectId } from "@core/db/triMongo";
import { MongoClient, Db, Collection } from "mongodb";

export type TriStore = "core" | "votes" | "pii";

const URIS: Record<TriStore, string | undefined> = {
  core: process.env.CORE_MONGODB_URI,
  votes: process.env.VOTES_MONGODB_URI,
  pii: process.env.PII_MONGODB_URI,
};

const NAMES: Record<TriStore, string> = {
  core: process.env.CORE_DB_NAME ?? "vog_core",
  votes: process.env.VOTES_DB_NAME ?? "vog_votes",
  pii: process.env.PII_DB_NAME ?? "vog_pii",
};

const clients: Partial<Record<TriStore, MongoClient>> = {};
const dbs: Partial<Record<TriStore, Db>> = {};

export async function getDb(store: TriStore = "core"): Promise<Db> {
  if (dbs[store]) return dbs[store]!;
  const uri = URIS[store];
  if (!uri) throw new Error(`[triMongo] Missing Mongo URI for store "${store}"`);
  const client = clients[store] ?? new MongoClient(uri, {
    connectTimeoutMS: 15_000,
    serverSelectionTimeoutMS: 15_000,
  });
  clients[store] = client;
  if (!(client as any).topology?.isConnected?.()) await client.connect();
  const db = client.db(NAMES[store]);
  dbs[store] = db;
  return db;
}

export async function getCol<T = any>(
  name: string,
  store: TriStore = "core",
): Promise<Collection<T>> {
  const db = await getDb(store);
  return db.collection<T>(name);
}

export { ObjectId };
