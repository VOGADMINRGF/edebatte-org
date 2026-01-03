import { coreCol, type ObjectId } from "@core/db/triMongo";
import type { StatementRecord } from "@features/analyze/schemas";
import type { FactVerdict } from "./types";
import type { SerpResultLite } from "@features/ai/providers/ari_search";

export type FactcheckJobStatus = "queued" | "processing" | "completed" | "failed" | "error";

export type FactcheckJobDoc = {
  _id?: ObjectId;
  jobId: string;

  // Kontext (optional)
  draftId?: string | null;
  contributionId?: string | null;

  language: string;
  inputText: string;

  status: FactcheckJobStatus;
  verdict: FactVerdict;
  confidence: number; // 0..1

  claims: StatementRecord[];
  serpResults?: SerpResultLite[];

  error?: string | null;

  createdAt: Date;
  updatedAt?: Date;
  finishedAt?: Date;
};

const JOBS_COLLECTION = "factcheck_jobs";

let ensured = false;

async function ensureIndexes() {
  if (ensured) return;
  const col = await coreCol<FactcheckJobDoc>(JOBS_COLLECTION);
  await col.createIndex({ jobId: 1 }, { unique: true });
  await col.createIndex({ createdAt: -1 });
  ensured = true;
}

export async function factcheckJobsCol() {
  await ensureIndexes();
  return coreCol<FactcheckJobDoc>(JOBS_COLLECTION);
}
