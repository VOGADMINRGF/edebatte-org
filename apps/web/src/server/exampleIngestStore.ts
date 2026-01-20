import { MongoClient, Collection } from "mongodb";

export type ExampleIngest = {
  id: string;
  exampleId: string;
  lang: string;
  title: string;
  kind: string;
  scope: string;
  topics: string[];
  country?: string;
  region?: string;
  createdAt: string;
  ua?: string | null;
  _id?: any;
};

type Store = {
  create(payload: Omit<ExampleIngest, "id" | "createdAt">): Promise<ExampleIngest>;
};

function isoNow() {
  return new Date().toISOString();
}

function rid() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function mongoCol(): Promise<Collection<ExampleIngest>> {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName).collection<ExampleIngest>("example_ingests");
}

const mongoStore: Store = {
  async create(payload) {
    const col = await mongoCol();
    const doc: ExampleIngest = { id: rid(), createdAt: isoNow(), ...payload };
    await col.insertOne(doc);
    return doc;
  },
};

const g = globalThis as any;
g.__VOG_EXAMPLE_INGESTS__ ||= new Map<string, ExampleIngest>();
const mem: Map<string, ExampleIngest> = g.__VOG_EXAMPLE_INGESTS__;

const memoryStore: Store = {
  async create(payload) {
    const doc: ExampleIngest = { id: rid(), createdAt: isoNow(), ...payload };
    mem.set(doc.id, doc);
    return doc;
  },
};

function pickStore(): Store {
  const hasMongo = !!process.env.MONGODB_URI && !!process.env.MONGODB_DB;
  return hasMongo ? mongoStore : memoryStore;
}

export async function createExampleIngest(payload: Omit<ExampleIngest, "id" | "createdAt">) {
  return pickStore().create(payload);
}
