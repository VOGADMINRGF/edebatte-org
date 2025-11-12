// core/queue/factcheckQueue.ts
import { ObjectId } from "@core/triMongo";
import { Queue, QueueEvents, Worker as BullmqWorker, Job } from "bullmq";
import type { JobsOptions } from "bullmq";           // <= type-only (fix für ts1484)
import IORedis, { Redis } from "ioredis";

import { coreCol } from "@core/db/triMongo";

export const FACTCHECK_QUEUE = "factcheck";
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let _conn: any = null;
export function getRedis(): any {
  if (!_conn) _conn = new IORedis(REDIS_URL);
  return _conn;
}

let _queue: Queue<any> | null = null;
export function getFactcheckQueue(): Queue<any> {
  if (!_queue) {
    _queue = new Queue(FACTCHECK_QUEUE, {
      connection: getRedis(),
      defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 500 } as JobsOptions
    });
  }
  return _queue;
}

let _events: QueueEvents | null = null;
export function getFactcheckQueueEvents(): QueueEvents {
  if (!_events) _events = new QueueEvents(FACTCHECK_QUEUE, { connection: getRedis() });
  return _events;
}

export type FactcheckJob = {
  contributionId: string;
  text: string;
  language?: string;
  topic?: string;
  scope?: string;
  timeframe?: string;
};

export function startFactcheckWorker(
  handler?: (job: Job<FactcheckJob>) => Promise<void | any>
) {
  const h = handler ?? defaultHandler;
  // eslint-disable-next-line no-new
  new BullmqWorker<FactcheckJob>(FACTCHECK_QUEUE, h, { connection: getRedis() });
}

async function defaultHandler(job: Job<FactcheckJob>) {
  const { contributionId, text } = job.data;
  const stmts = await coreCol("statements");

  await stmts.updateOne(
    { _id: new ObjectId(contributionId) },
    {
      $set: {
        factcheckStatus: "running",
        "factcheck.jobId": String(job.id),
        "factcheck.startedAt": new Date(),
        "factcheck.progress": 10
      }
    }
  );

  const result = {
    verdict: "uncertain",
    confidence: 0.4,
    claims: [{ text, verdict: "uncertain", evidence: [] }],
    summary: "Automatischer Erst-Check; redaktionelle Prüfung empfohlen."
  };

  await stmts.updateOne(
    { _id: new ObjectId(contributionId) },
    {
      $set: {
        factcheckStatus: "done",
        "factcheck.finishedAt": new Date(),
        "factcheck.progress": 100,
        "factcheck.result": result,
        "factcheck.error": null
      }
    }
  );
}
