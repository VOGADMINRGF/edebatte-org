import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const candidates = [
  resolve(__dirname, "..", ".env.local"),
  resolve(__dirname, "..", ".env"),
  resolve(__dirname, "..", "..", ".env.local"),
  resolve(__dirname, "..", "..", ".env"),
];
for (const p of candidates) if (existsSync(p)) { config({ path: p, override: false }); break; }

async function run() {
  const { piiCol } = await import("@core/db/triMongo");
  const col = await piiCol<any>("tokens");

  // Einzel-Token-Lookup & Cleanup
  await col.createIndex({ token: 1 }, { unique: true, name: "token_unique" });
  // TTL auf expiresAt (Mongo TTL verlangt Single-Field-Index)
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expires_ttl" });

  // Abfragen nach Typ/Email
  await col.createIndex({ type: 1, email: 1 }, { name: "type_email" });

  console.log("✓ tokens indexes ensured");
}
run().then(()=>process.exit(0)).catch(e=>{ console.error(e); process.exit(1); });
