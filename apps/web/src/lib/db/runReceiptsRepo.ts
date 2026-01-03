import { coreCol } from "@core/db/triMongo";
import type { RunReceipt } from "@features/analyze/schemas";

type RunReceiptDoc = RunReceipt & {
  _id: string;
  createdAtDate?: Date;
  updatedAtDate?: Date;
};

const COLLECTION = "run_receipts";
let ensureIndexesOnce: Promise<void> | null = null;

async function ensureIndexes() {
  if (!ensureIndexesOnce) {
    ensureIndexesOnce = (async () => {
      const col = await coreCol<RunReceiptDoc>(COLLECTION);
      await col.createIndex({ receiptHash: 1 }, { unique: true, name: "uniq_receiptHash" }).catch(() => {});
      await col.createIndex({ snapshotId: 1 }, { name: "idx_snapshotId" }).catch(() => {});
      await col.createIndex({ createdAtDate: -1 }, { name: "idx_createdAtDate_desc" }).catch(() => {});
    })();
  }
  await ensureIndexesOnce;
}

async function runReceiptsCol() {
  await ensureIndexes();
  return coreCol<RunReceiptDoc>(COLLECTION);
}

function toDate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function upsertRunReceipt(receipt: RunReceipt): Promise<{ id: string }> {
  const col = await runReceiptsCol();
  const now = new Date();
  const createdAtDate = toDate(receipt.createdAt);
  await col.updateOne(
    { _id: receipt.id },
    {
      $set: { ...receipt, _id: receipt.id, createdAtDate, updatedAtDate: now },
      $setOnInsert: { createdAtDate },
    },
    { upsert: true },
  );
  return { id: receipt.id };
}

function stripDoc(doc: RunReceiptDoc): RunReceipt {
  const { _id, createdAtDate, updatedAtDate, ...rest } = doc;
  return rest as RunReceipt;
}

export async function getRunReceiptById(id: string): Promise<RunReceipt | null> {
  const col = await runReceiptsCol();
  const doc = await col.findOne({ _id: id });
  return doc ? stripDoc(doc) : null;
}

export async function getRunReceiptByHash(receiptHash: string): Promise<RunReceipt | null> {
  const col = await runReceiptsCol();
  const doc = await col.findOne({ receiptHash });
  return doc ? stripDoc(doc) : null;
}

export async function listRunReceipts(limit = 25): Promise<RunReceipt[]> {
  const col = await runReceiptsCol();
  const docs = await col
    .find({})
    .sort({ createdAtDate: -1 })
    .limit(Math.max(1, Math.min(200, limit)))
    .toArray();
  return docs.map(stripDoc);
}
