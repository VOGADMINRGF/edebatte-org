import { env } from "@/utils/env";
// apps/web/src/lib/db.ts
import { prisma } from "@db/web/client";
import mongoose from "mongoose";

let cached = (global as any).mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) cached = (global as any).mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        retryWrites: true,
        tls: true,
        // tlsCAFile: process.env.MONGODB_CA_CERT, // falls nötig
        autoIndex: false, // Produktionsbest practice
      })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export { prisma };
export default prisma;
