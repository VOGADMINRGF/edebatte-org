import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

// --- ENV robust laden ---
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const envCandidates = [
  resolve(__dirname, "..", ".env.local"),
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", ".env.local"),
  resolve(__dirname, "..", "..", ".env"),
];
for (const p of envCandidates) {
  if (existsSync(p)) { config({ path: p, override: false }); break; }
}

function maskUri(uri?: string) {
  if (!uri) return "(unset)";
  try {
    const u = new URL(uri);
    const hasCreds = Boolean(u.username || u.password);
    return `${u.protocol}//${hasCreds ? "***@" : ""}${u.host}${u.pathname || "/"}`;
  } catch { return "(invalid URI)"; }
}

async function main() {
  const uri = process.env.CORE_MONGODB_URI;
  const dbName = process.env.CORE_DB_NAME;
  if (!uri || !dbName) throw new Error("Missing CORE_MONGODB_URI or CORE_DB_NAME");

  console.log("CORE_MONGODB_URI:", maskUri(uri));
  console.log("CORE_DB_NAME:", dbName);

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8_000 });

  const results: Record<string, unknown> = {};

  // RELATIVE Imports (kein "@/")
  console.log("→ indexing Source …");
  const Source = (await import("../src/models/core/Source")).default;
  await Source.createIndexes();
  results["sources.indexes"] = await Source.collection.indexes();

  console.log("→ indexing Stream …");
  const Stream = (await import("../src/models/core/Stream")).default;
  await Stream.createIndexes();
  results["streams.indexes"] = await Stream.collection.indexes();

  console.log("→ indexing StreamEvent …");
  const StreamEvent = (await import("../src/models/core/StreamEvent")).default;
  await StreamEvent.createIndexes();
  results["stream_events.indexes"] = await StreamEvent.collection.indexes();

  // Optional: Legacy-Collections via triMongo (nur wenn vorhanden)
  try {
    const tri = await import("../../core/db/triMongo");
    const statements = await tri.coreCol("statements").catch(() => null);
    if (statements?.createIndexes) {
      console.log("→ indexing legacy 'statements' …");
      await statements.createIndexes([
        { key: { createdAt: -1, _id: -1 }, name: "stmts_createdAt_desc_id_desc" },
        { key: { category: 1, createdAt: -1 }, name: "stmts_category_asc_createdAt_desc" },
        { key: { userId: 1, createdAt: -1 }, name: "stmts_userId_asc_createdAt_desc" },
        { key: { language: 1, createdAt: -1 }, name: "stmts_language_asc_createdAt_desc" },
        { key: { "stats.votesTotal": -1 }, name: "stmts_stats_votesTotal_desc" },
        { key: { location: "2dsphere" as any }, name: "stmts_geo_2dsphere" },
      ]);
    }
    const votes = await tri.coreCol("votes").catch(() => null);
    if (votes?.createIndexes) {
      console.log("→ indexing legacy 'votes' …");
      await votes.createIndexes([
        { key: { statementId: 1, value: 1 }, name: "votes_statementId_value" },
        { key: { statementId: 1, role: 1 }, name: "votes_statementId_role" },
        { key: { createdAt: -1 }, name: "votes_createdAt_desc" },
      ]);
    }
  } catch (e) {
    console.log("ℹ legacy (triMongo) skipped:", String(e));
  }

  console.log("✔ core indexes result:", JSON.stringify(results, null, 2));
}

main()
  .then(async () => { try { await mongoose.disconnect(); } catch {} process.exit(0); })
  .catch(async (e) => { console.error("index creation failed:", e); try { await mongoose.disconnect(); } catch {} process.exit(1); });
