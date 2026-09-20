import type { SwipeVotePayload } from "@/features/swipes/types";

type SwipeGraphProjectionDecision =
  | { enabled: true; reason: "neo4j_remote_configured" }
  | {
      enabled: false;
      reason:
        | "graph_primary_not_neo4j"
        | "neo4j_config_missing"
        | "neo4j_uri_invalid"
        | "vercel_loopback_blocked";
    };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export function getSwipeGraphProjectionDecision(
  runtimeEnv: Record<string, string | undefined> = process.env,
): SwipeGraphProjectionDecision {
  const graphPrimary = (runtimeEnv.GRAPH_PRIMARY || "neo4j").trim().toLowerCase();
  if (graphPrimary !== "neo4j") {
    return { enabled: false, reason: "graph_primary_not_neo4j" };
  }

  const uri = runtimeEnv.NEO4J_URI?.trim();
  const user = runtimeEnv.NEO4J_USER?.trim();
  const password = runtimeEnv.NEO4J_PASSWORD?.trim();
  if (!uri || !user || !password) {
    return { enabled: false, reason: "neo4j_config_missing" };
  }

  let hostname = "";
  try {
    hostname = new URL(uri).hostname.toLowerCase();
  } catch {
    return { enabled: false, reason: "neo4j_uri_invalid" };
  }

  const isVercelRuntime = Boolean(runtimeEnv.VERCEL || runtimeEnv.VERCEL_ENV);
  if (isVercelRuntime && LOOPBACK_HOSTS.has(hostname)) {
    return { enabled: false, reason: "vercel_loopback_blocked" };
  }

  return { enabled: true, reason: "neo4j_remote_configured" };
}

export async function recordSwipeVoteInGraph(payload: SwipeVotePayload): Promise<void> {
  const projection = getSwipeGraphProjectionDecision();
  if (!projection.enabled) return;

  // Load the strict Neo4j env/client only after the projection gate. This keeps
  // a disabled or invalid optional graph projection from breaking the durable
  // swipe vote path before any graph connection is attempted.
  const { getNeo4jDriver } = await import("@/utils/neo4jClient");
  const driver = getNeo4jDriver();
  const session = driver.session();

  const relLabel =
    payload.decision === "agree"
      ? "AGREES_WITH"
      : payload.decision === "disagree"
        ? "DISAGREES_WITH"
        : "NEUTRAL_TOWARDS";

  const targetLabel = payload.eventualityId ? "Eventuality" : "Statement";
  const targetId = payload.eventualityId ?? payload.statementId;

  const otherRelLabels = ["AGREES_WITH", "DISAGREES_WITH", "NEUTRAL_TOWARDS"].filter(
    (label) => label !== relLabel,
  );

  const cypher = `
    MERGE (u:User {id: $userId})
    MERGE (s:${targetLabel} {id: $targetId})
    OPTIONAL MATCH (u)-[old:${otherRelLabels.join("|")}]->(s)
    DELETE old
    MERGE (u)-[r:${relLabel}]->(s)
    SET r.source = $source,
        r.updatedAt = datetime(),
        r.firstSeen = coalesce(r.firstSeen, datetime())
  `;

  try {
    await session.run(cypher, {
      userId: payload.userId,
      targetId,
      source: payload.source,
    });
  } finally {
    await session.close();
  }
}
