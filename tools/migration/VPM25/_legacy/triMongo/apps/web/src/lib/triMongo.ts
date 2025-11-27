// Legacy triMongo connector (kept for reference during migration)
type Db = { collection: (name: string) => { insertOne(doc: any): Promise<{ insertedId: string }> } };

let mem: Record<string, any[]> = {};
function genId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function getDb(kind: "core" | "votes" | "pii" = "core"): Promise<Db> {
  const envKey = `MONGODB_${kind.toUpperCase()}_URI`;
  const uri = process.env[envKey as any] as string | undefined;

  if (!uri) {
    // Dev: in-memory sink – kompiliert & läuft ohne DB
    return {
      collection: (n) => ({
        async insertOne(doc: any) {
          (mem[n] ??= []).push({ ...doc, _id: genId() });
          return { insertedId: mem[n][mem[n].length - 1]._id };
        },
      }),
    };
  }

  // Echt: MongoDB (lazy import)
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env[`MONGODB_${kind.toUpperCase()}_DB`] || "vog";
  return client.db(dbName) as unknown as Db;
}

export default { getDb };
