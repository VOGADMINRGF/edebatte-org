import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

// --- ENV robust laden ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const candidates = [
  resolve(__dirname, "..", ".env.local"),
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", ".env.local"),
  resolve(__dirname, "..", "..", ".env"),
];
for (const p of candidates) {
  if (existsSync(p)) { config({ path: p, override: false }); break; }
}

async function run() {
  try {
    const uri = process.env.PII_MONGODB_URI;
    const dbName = process.env.PII_DB_NAME;
    if (!uri || !dbName) throw new Error("Missing PII_MONGODB_URI or PII_DB_NAME");

    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8_000 });

    // RELATIVE Imports (kein "@/")
    const { default: UserProfile }      = await import("../../../features/user/models/UserProfile");
    const { default: UserDemographics } = await import("../src/models/pii/UserDemographics");

    await Promise.all([
      UserProfile.createIndexes(),
      UserDemographics.createIndexes(),
    ]);

    console.log("✔︎ PII indexes ensured.");
  } catch (err) {
    console.error("❌ Failed to ensure PII indexes:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await mongoose.disconnect(); } catch {}
  }
}

run();
