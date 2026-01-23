import { MongoClient } from "mongodb";

const clients: Record<string, MongoClient | null> = {
  core: null,
  votes: null,
  pii: null,
};

function uriFor(kind: "core" | "votes" | "pii") {
  if (kind === "core")
    return process.env.CORE_MONGODB_URI || process.env.MONGODB_URI;
  if (kind === "votes")
    return process.env.VOTES_MONGODB_URI || process.env.MONGODB_URI;
  if (kind === "pii")
    return process.env.PII_MONGODB_URI || process.env.MONGODB_URI;
  return process.env.MONGODB_URI;
}

export async function mongoPing(
  kind: "core" | "votes" | "pii" = "core",
): Promise<boolean> {
  const uri = uriFor(kind);
  if (!uri) throw new Error(`Missing Mongo URI for ${kind}`);
  if (!clients[kind]) clients[kind] = new MongoClient(uri);
  const c = clients[kind]!;
  if (!(c as any).topology?.isConnected?.()) await c.connect();
  await c.db().command({ ping: 1 });
  return true;
}
