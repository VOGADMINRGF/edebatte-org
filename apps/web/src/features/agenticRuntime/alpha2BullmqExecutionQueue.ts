import { createHash } from "node:crypto";
import { Job, Queue, QueueEvents, Worker } from "bullmq";
import IORedis from "ioredis";

export const ALPHA2_EXECUTION_QUEUE = "alpha2-execution";

export type Alpha2ExecutionReason =
  | "initial"
  | "continue"
  | "scheduled_resume"
  | "retry"
  | "recovery";

export type Alpha2ExecutionJob = {
  runId: string;
  taskId: string;
  dispatchKey: string;
  reason: Alpha2ExecutionReason;
  requestedAt: string;
};

export type Alpha2ExecutionDispatch = Alpha2ExecutionJob & {
  delayMs?: number;
};

export interface Alpha2ExecutionDispatcher {
  dispatch(input: Alpha2ExecutionDispatch): Promise<{ jobId: string }>;
}

let redis: any = null;
let queue: Queue<Alpha2ExecutionJob> | null = null;
let queueEvents: QueueEvents | null = null;

function resolveAlpha2RedisUrl() {
  const configured = process.env.ALPHA2_REDIS_URL ?? process.env.REDIS_URL;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "redis://127.0.0.1:6379";
  throw new Error("alpha2_redis_url_missing");
}

export function getAlpha2RedisConnection(): any {
  if (!redis) {
    redis = new IORedis(resolveAlpha2RedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return redis;
}

export function getAlpha2ExecutionQueue() {
  if (!queue) {
    queue = new Queue<Alpha2ExecutionJob>(ALPHA2_EXECUTION_QUEUE, {
      connection: getAlpha2RedisConnection(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: 5_000,
        removeOnFail: 5_000,
      },
    });
  }
  return queue;
}

export function getAlpha2ExecutionQueueEvents() {
  if (!queueEvents) {
    queueEvents = new QueueEvents(ALPHA2_EXECUTION_QUEUE, {
      connection: getAlpha2RedisConnection(),
    });
  }
  return queueEvents;
}

function executionJobId(input: Pick<Alpha2ExecutionDispatch, "runId" | "dispatchKey">) {
  const identity = JSON.stringify([input.runId, input.dispatchKey]);
  return `alpha2_${createHash("sha256").update(identity).digest("hex")}`;
}

type Alpha2DispatchQueue = {
  getJob(jobId: string): Promise<
    | {
        id?: string | number;
        data: Alpha2ExecutionJob;
        getState(): Promise<string>;
        remove(): Promise<void>;
      }
    | undefined
  >;
  add(
    name: string,
    data: Alpha2ExecutionJob,
    options: { jobId: string; delay: number },
  ): Promise<{ id?: string | number }>;
};

export async function dispatchAlpha2Execution(
  executionQueue: Alpha2DispatchQueue,
  input: Alpha2ExecutionDispatch,
) {
  const jobId = executionJobId(input);
  const existing = await executionQueue.getJob(jobId);

  if (existing) {
    if (
      existing.data.runId !== input.runId ||
      existing.data.dispatchKey !== input.dispatchKey ||
      existing.data.taskId !== input.taskId
    ) {
      throw new Error("alpha2_execution_job_identity_collision");
    }
    const state = await existing.getState();
    if (input.reason === "recovery" && (state === "failed" || state === "completed")) {
      await existing.remove();
    } else {
      return { jobId: String(existing.id ?? jobId) };
    }
  }

  const job = await executionQueue.add(
    "execute-run",
    {
      runId: input.runId,
      taskId: input.taskId,
      dispatchKey: input.dispatchKey,
      reason: input.reason,
      requestedAt: input.requestedAt,
    },
    {
      jobId,
      delay: Math.max(0, input.delayMs ?? 0),
    },
  );
  return { jobId: String(job.id ?? jobId) };
}

export class Alpha2BullmqExecutionDispatcher implements Alpha2ExecutionDispatcher {
  async dispatch(input: Alpha2ExecutionDispatch) {
    return dispatchAlpha2Execution(getAlpha2ExecutionQueue(), input);
  }
}

let sharedDispatcher: Alpha2BullmqExecutionDispatcher | null = null;

export function getAlpha2ExecutionDispatcher() {
  return (sharedDispatcher ??= new Alpha2BullmqExecutionDispatcher());
}

export function startAlpha2ExecutionWorker(input: {
  handler: (job: Job<Alpha2ExecutionJob>) => Promise<unknown>;
  concurrency?: number;
}) {
  return new Worker<Alpha2ExecutionJob>(ALPHA2_EXECUTION_QUEUE, input.handler, {
    connection: getAlpha2RedisConnection(),
    concurrency: Math.max(1, Math.min(input.concurrency ?? 2, 32)),
  });
}

export async function closeAlpha2ExecutionRuntime() {
  const closers: Promise<unknown>[] = [];
  if (queueEvents) closers.push(queueEvents.close());
  if (queue) closers.push(queue.close());
  await Promise.allSettled(closers);
  queueEvents = null;
  queue = null;
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
