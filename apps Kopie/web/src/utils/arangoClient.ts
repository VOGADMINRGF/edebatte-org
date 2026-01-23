import { env } from "@/utils/env";
import { Database } from "arangojs";

let db: any = null;

export function getArango() {
  const url = env.ARANGO_URL;
  const user = env.ARANGO_USER;
  const password = env.ARANGO_ROOT_PASSWORD;
  const dbName = env.ARANGO_DB;

  if (!url || !user || !password || !dbName) {
    throw new Error("ARANGO env missing (ARANGO_URL/ARANGO_USER/ARANGO_ROOT_PASSWORD/ARANGO_DB)");
  }

  if (!db) {
    db = new Database({ url });
    db.useBasicAuth(user, password);
    db.useDatabase(dbName);
  }
  return db;
}

export async function arangoPing() {
  const d = getArango();
  const version = await d.version();
  return Boolean(version);
}
