import neo4j, { Driver } from "neo4j-driver";

declare global {
  var __neo4jDriver: Driver | undefined;
}

const uri = process.env.NEO4J_URI || process.env.NEO4J_URL || "";
const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || "";
const pass = process.env.NEO4J_PASSWORD || process.env.NEO4J_PASS || "";

export const neo4jDriver: Driver | null = (() => {
  if (!uri || !user || !pass) return null;
  if (!global.__neo4jDriver) {
    global.__neo4jDriver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
  }
  return global.__neo4jDriver;
})();

export async function neo4jVerify() {
  if (!neo4jDriver) throw new Error("neo4j_driver_missing");
  // Leichtgewicht: Session open/close
  const s = neo4jDriver.session();
  try {
    return true;
  } finally {
    await s.close();
  }
}
