import { coreCol } from "@core/db/triMongo";
import type { FeedItemInput, StatementCandidate } from "./types";
import { statementCandidatesCol } from "./db";

const FEED_COLLECTION = "feed_items";

export async function saveFeedItemRaw(item: FeedItemInput & { canonicalHash: string }) {
  const col = await coreCol(FEED_COLLECTION);
  await col.insertOne({
    ...item,
    createdAt: new Date(),
  });
}

export async function insertStatementCandidate(candidate: StatementCandidate) {
  const col = await statementCandidatesCol();
  await col.insertOne(candidate);
}

export async function findCandidateByHash(
  canonicalHash: string,
): Promise<StatementCandidate | null> {
  const col = await statementCandidatesCol();
  return col.findOne({ canonicalHash });
}
