import mongoose from "mongoose";

let cached = (global as any)._mongoose as Promise<typeof mongoose> | undefined;

function resolveMongoConfig() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");

  return {
    uri,
    dbName: process.env.MONGODB_DB || "vog",
  };
}

export async function mongo() {
  if (!cached) {
    const { uri, dbName } = resolveMongoConfig();
    cached = mongoose.connect(uri, { dbName });
    (global as any)._mongoose = cached;
  }
  return cached;
}
