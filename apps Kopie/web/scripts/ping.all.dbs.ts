// apps/web/scripts/ping.all.dbs.ts
import { config } from "dotenv";
config({ path: ".env.local" }); // .env.local laden
config();                       // optional .env fallback

import mongoose from "mongoose";
import { ENV } from "../src/utils/env.server";

async function pingOne(uri: string, dbName: string, label: string) {
  const conn = await mongoose.createConnection(uri, {
    dbName,
    serverSelectionTimeoutMS: 8000,
  }).asPromise();

  const res = await conn.db.admin().ping();
  console.log(`✅ ${label} ping ->`, res?.ok === 1 ? "ok:1" : res);
  await conn.close();
}

(async () => {
  try {
    console.log("🔄 Ping CORE...");
    await pingOne(ENV.CORE_MONGODB_URI,  ENV.CORE_DB_NAME,  "CORE");

    console.log("🔄 Ping PII...");
    await pingOne(ENV.PII_MONGODB_URI,   ENV.PII_DB_NAME,   "PII");

    console.log("🔄 Ping VOTES...");
    await pingOne(ENV.VOTES_MONGODB_URI, ENV.VOTES_DB_NAME, "VOTES");

    console.log("🎉 All DBs reachable.");
    process.exit(0);
  } catch (e: any) {
    console.error("❌ DB Ping failed:", e?.message || e);
    process.exit(1);
  }
})();
