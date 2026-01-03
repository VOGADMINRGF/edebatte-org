import { coreCol, ObjectId } from "@core/db/triMongo";

export type EditorialFeedbackDoc = {
  _id: ObjectId;
  ts: string;
  context?: {
    contributionId?: string;
    statementId?: string;
    url?: string;
  };
  action: any;
  createdAtDate: Date;
};

const COLLECTION = "editorial_feedback";
let ensureIndexesOnce: Promise<void> | null = null;

async function ensureIndexes() {
  if (!ensureIndexesOnce) {
    ensureIndexesOnce = (async () => {
      const col = await coreCol<EditorialFeedbackDoc>(COLLECTION);
      await col
        .createIndex({ "context.contributionId": 1, createdAtDate: -1 }, { name: "idx_contribution_created_desc" })
        .catch(() => {});
      await col
        .createIndex({ "context.statementId": 1, createdAtDate: -1 }, { name: "idx_statement_created_desc" })
        .catch(() => {});
      await col.createIndex({ createdAtDate: -1 }, { name: "idx_created_desc" }).catch(() => {});
    })();
  }
  await ensureIndexesOnce;
}

async function feedbackCol() {
  await ensureIndexes();
  return coreCol<EditorialFeedbackDoc>(COLLECTION);
}

export async function insertEditorialFeedback(payload: {
  ts: string;
  context?: any;
  action: any;
}): Promise<{ id: string }> {
  const col = await feedbackCol();
  const doc: EditorialFeedbackDoc = {
    _id: new ObjectId(),
    ts: payload.ts,
    context: payload.context,
    action: payload.action,
    createdAtDate: new Date(),
  };
  await col.insertOne(doc);
  return { id: doc._id.toHexString() };
}

export async function listEditorialFeedback(args: {
  contributionId?: string;
  statementId?: string;
  limit?: number;
}): Promise<Array<Omit<EditorialFeedbackDoc, "_id"> & { id: string }>> {
  const col = await feedbackCol();
  const q: any = {};
  if (args.contributionId) q["context.contributionId"] = args.contributionId;
  if (args.statementId) q["context.statementId"] = args.statementId;

  const docs = await col
    .find(q)
    .sort({ createdAtDate: -1 })
    .limit(Math.max(1, Math.min(200, args.limit ?? 25)))
    .toArray();

  return docs.map((d) => ({
    id: d._id.toHexString(),
    ts: d.ts,
    context: d.context,
    action: d.action,
    createdAtDate: d.createdAtDate,
  }));
}
