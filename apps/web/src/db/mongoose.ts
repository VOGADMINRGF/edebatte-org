import mongoose from "mongoose";

let cached = (global as any)._mongoose as Promise<typeof mongoose> | undefined;

function resolveMongoConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const uri =
    process.env.CORE_MONGODB_URI ||
    (!isProd ? process.env.MONGODB_URI : undefined);
  const dbName =
    process.env.CORE_DB_NAME ||
    (!isProd ? process.env.MONGODB_DB : undefined) ||
    (!isProd ? "vog" : undefined);

  if (!uri || !dbName) {
    throw new Error(
      isProd
        ? "CORE_MONGODB_URI and CORE_DB_NAME are required in production; legacy MONGODB_URI/MONGODB_DB fallback is disabled"
        : "CORE_MONGODB_URI|MONGODB_URI and CORE_DB_NAME|MONGODB_DB missing",
    );
  }

  return { uri, dbName };
}

export async function mongo() {
  if (!cached) {
    const { uri, dbName } = resolveMongoConfig();
    cached = mongoose.connect(uri, { dbName });
    (global as any)._mongoose = cached;
  }
  return cached;
}
