import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// --- ENV robust laden (relativ zu diesem Script) ---
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
  // triMongo NACH dem env-load importieren (RELATIVER Pfad, kein "@/")
  const { votesCol } = await import("@core/db/triMongo");
  const col = await votesCol("votes");

  // --- UNIQUE ---
  await col.createIndex(
    { statementId: 1, userId: 1 },
    { name: "votes_stmt_user_unique", unique: true,
      partialFilterExpression: { userId: { $type: "string" } } }
  );

  await col.createIndex(
    { statementId: 1, fp: 1, ipSubnet: 1 },
    { name: "votes_stmt_fp_subnet_unique", unique: true,
      partialFilterExpression: { userId: null, ipSubnet: { $exists: true } } }
  );

  await col.createIndex(
    { statementId: 1, fp: 1 },
    { name: "votes_stmt_fp_legacy_unique", unique: true,
      partialFilterExpression: { userId: null, ipSubnet: null } }
  );

  // --- SUPPORT / READ ---
  await col.createIndex({ statementId: 1 }, { name: "by_stmt" });
  await col.createIndex({ statementId: 1, createdAt: -1, _id: -1 }, { name: "by_stmt_createdAt_desc" });
  await col.createIndex({ statementId: 1, ts: -1, _id: -1 },           { name: "by_stmt_ts_desc" });
  await col.createIndex({ day: 1, statementId: 1 },                    { name: "by_day_stmt" });
  await col.createIndex({ value: 1, statementId: 1 },                  { name: "by_value_stmt" });
  await col.createIndex(
    { regionCode: 1, ts: -1 },
    { name: "by_region_ts_desc",
      partialFilterExpression: { regionCode: { $exists: true }, ts: { $exists: true } } }
  );
  await col.createIndex(
    { statementId: 1, role: 1 },
    { name: "by_stmt_role",
      partialFilterExpression: { role: { $exists: true } } }
  );
  await col.createIndex({ updatedAt: -1 }, { name: "by_updatedAt_desc" });

  console.log("✓ votes indexes ensured");
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
