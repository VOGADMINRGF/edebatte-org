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

export async function findCandidateHashes(hashes: string[]): Promise<Set<string>> {
  if (!hashes.length) return new Set();
  const col = await statementCandidatesCol();
  const docs = await col
    .find({ canonicalHash: { $in: hashes } }, { projection: { canonicalHash: 1 } })
    .toArray();
  return new Set(docs.map((d) => d.canonicalHash));
}

export async function saveFeedItemsRaw(
  items: Array<FeedItemInput & { canonicalHash: string }>,
): Promise<{ inserted: number }> {
  if (!items.length) return { inserted: 0 };
  const col = await coreCol(FEED_COLLECTION);
  const createdAt = new Date();
  const ops = items.map((item) => ({
    updateOne: {
      filter: { canonicalHash: item.canonicalHash },
      update: { $setOnInsert: { ...item, createdAt } },
      upsert: true,
    },
  }));
  const res = await col.bulkWrite(ops, { ordered: false });
  return { inserted: res.upsertedCount ?? 0 };
}

export async function upsertStatementCandidates(
  candidates: StatementCandidate[],
): Promise<{ inserted: number }> {
  if (!candidates.length) return { inserted: 0 };
  const col = await statementCandidatesCol();
  const ops = candidates.map((candidate) => ({
    updateOne: {
      filter: { canonicalHash: candidate.canonicalHash },
      update: { $setOnInsert: candidate },
      upsert: true,
    },
  }));
  const res = await col.bulkWrite(ops, { ordered: false });
  return { inserted: res.upsertedCount ?? 0 };
}
