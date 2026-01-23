import { env } from "@/utils/env";
import neo4j, { Driver } from "neo4j-driver";

const uri = env.MEMGRAPH_URI;                    // z. B. bolt://localhost:7688
const user = env.MEMGRAPH_USER || undefined;     // optional
const pass = env.MEMGRAPH_PASSWORD || "";        // optional

let driver: Driver | null = null;

export function getMemgraphDriver() {
  if (!uri) throw new Error("MEMGRAPH_URI missing");

  if (!driver) {
    driver = user
      ? neo4j.driver(uri, neo4j.auth.basic(user, pass))
      : neo4j.driver(uri);
  }
  return driver;
}

export async function memgraphPing() {
  const d = getMemgraphDriver();
  const session = d.session();
  try {
    await session.run("RETURN 1 AS ok");
    return true;
  } finally {
    await session.close();
  }
}
