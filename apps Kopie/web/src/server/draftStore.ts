import { MongoClient, Collection } from "mongodb";

export type Draft = {
  id: string;
  kind: "contribution" | string;
  text: string;
  analysis?: any;
  createdAt: string;
  updatedAt: string;
  _id?: any;
};

type Store = {
  create(d: Omit<Draft, "id"|"createdAt"|"updatedAt">): Promise<Draft>;
  patch(id: string, patch: Partial<Draft>): Promise<{ ok: boolean; id: string; draft: Draft|null }>;
  get(id: string): Promise<Draft | null>;
};

function isoNow(){ return new Date().toISOString(); }
function rid(){ return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }

/** --- Mongo-Implementierung --- */
async function mongoCol(): Promise<Collection<Draft>> {
  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.MONGODB_DB!;
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName).collection<Draft>("drafts");
}
const mongoStore: Store = {
  async create(d) {
    const col = await mongoCol();
    const draft: Draft = { id: rid(), createdAt: isoNow(), updatedAt: isoNow(), ...d };
    await col.insertOne(draft);
    return draft;
  },
  async patch(id, patch) {
    const col = await mongoCol();
    const upd = { ...patch, updatedAt: isoNow() };
    await col.updateOne({ id }, { $set: upd });
    const draft = await col.findOne({ id });
    return { ok: !!draft, id, draft: draft ?? null };
    },
  async get(id) {
    const col = await mongoCol();
    return await col.findOne({ id });
  }
};

/** --- In-Memory-Implementierung (Dev-Fallback) --- */
const g = globalThis as any;
g.__VOG_DRAFTS__ ||= new Map<string, Draft>();
const mem: Map<string, Draft> = g.__VOG_DRAFTS__;

const memoryStore: Store = {
  async create(d) {
    const draft: Draft = { id: rid(), createdAt: isoNow(), updatedAt: isoNow(), ...d };
    mem.set(draft.id, draft);
    return draft;
  },
  async patch(id, patch) {
    const cur = mem.get(id) || null;
    if (!cur) return { ok: false, id, draft: null };
    const next = { ...cur, ...patch, updatedAt: isoNow() };
    mem.set(id, next);
    return { ok: true, id, draft: next };
  },
  async get(id) { return mem.get(id) || null; }
};

/** --- Factory: Prod (Mongo) wenn ENV da, sonst Dev (Memory) --- */
function pickStore(): Store {
  const hasMongo = !!process.env.MONGODB_URI && !!process.env.MONGODB_DB;
  return hasMongo ? mongoStore : memoryStore;
}

export async function createDraft(d: Omit<Draft, "id"|"createdAt"|"updatedAt">) {
  return pickStore().create(d);
}
export async function patchDraft(id: string, patch: Partial<Draft>) {
  return pickStore().patch(id, patch);
}
export async function getDraft(id: string) {
  return pickStore().get(id);
}
