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
  reviewStatus?: "pending" | "approved" | "rejected";
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
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
  reviewStatus?: "pending" | "approved" | "rejected";
}): Promise<{ id: string }> {
  const col = await feedbackCol();
  const doc: EditorialFeedbackDoc = {
    _id: new ObjectId(),
    ts: payload.ts,
    context: payload.context,
    action: payload.action,
    reviewStatus: payload.reviewStatus,
    reviewedAt: null,
    reviewedBy: null,
    reviewNote: null,
    createdAtDate: new Date(),
  };
  await col.insertOne(doc);
  return { id: doc._id.toHexString() };
}

export async function listEditorialFeedback(args: {
  contributionId?: string;
  statementId?: string;
  actionTypes?: string[];
  reviewStatus?: Array<"pending" | "approved" | "rejected">;
  limit?: number;
}): Promise<Array<Omit<EditorialFeedbackDoc, "_id"> & { id: string }>> {
  const col = await feedbackCol();
  const q: any = {};
  if (args.contributionId) q["context.contributionId"] = args.contributionId;
  if (args.statementId) q["context.statementId"] = args.statementId;
  if (Array.isArray(args.actionTypes) && args.actionTypes.length) {
    q["action.type"] = { $in: args.actionTypes };
  }
  if (Array.isArray(args.reviewStatus) && args.reviewStatus.length) {
    q.reviewStatus = { $in: args.reviewStatus };
  }

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
    reviewStatus: d.reviewStatus,
    reviewedAt: d.reviewedAt,
    reviewedBy: d.reviewedBy,
    reviewNote: d.reviewNote,
    createdAtDate: d.createdAtDate,
  }));
}

export async function updateEditorialFeedbackReview(args: {
  id: string;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedBy?: string | null;
  reviewNote?: string | null;
}): Promise<boolean> {
  const col = await feedbackCol();
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(args.id);
  } catch {
    return false;
  }
  const now = new Date();
  const res = await col.updateOne(
    { _id: objectId },
    {
      $set: {
        reviewStatus: args.reviewStatus,
        reviewedAt: now,
        reviewedBy: args.reviewedBy ?? null,
        reviewNote: args.reviewNote ?? null,
      },
    },
  );
  return res.matchedCount > 0;
}
