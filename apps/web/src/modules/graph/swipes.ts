import type { SwipeVotePayload } from "@/modules/swipes/types";
import { getNeo4jDriver } from "@/utils/neo4jClient";

export async function recordSwipeVoteInGraph(payload: SwipeVotePayload): Promise<void> {
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

  const cypher = `
    MERGE (u:User {id: $userId})
    MERGE (s:${targetLabel} {id: $targetId})
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
