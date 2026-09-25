import type { Job, Worker } from "bullmq";
import {
  getAlpha2ExecutionDispatcher,
  closeAlpha2ExecutionRuntime,
  startAlpha2ExecutionWorker,
  type Alpha2ExecutionJob,
} from "@/features/agenticRuntime/alpha2BullmqExecutionQueue";
import {
  runAlpha2DurableStep,
  startAlpha2RecoveryScheduler,
  createAlpha2ResolvingExecutor,
  type Alpha2ExecutionAuthorization,
  type Alpha2ExecutorResolver,
} from "@/features/agenticRuntime/alpha2DurableOrchestrator";
import { getAlpha2MongoRunLedger } from "@/features/agenticRuntime/alpha2MongoRunLedger";
import {
  isAlpha2HumanStoppedRun,
  isAlpha2TerminalRun,
} from "@/features/agenticRuntime/alpha2RunLedgerContract";
import {
  Alpha2RunRecordSchema,
  type Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export interface Alpha2ExecutionAuthorizationResolver {
  resolve(
    run: Alpha2RunRecord,
    input: { currentHeadSha: string; observedAt: string },
  ): Alpha2ExecutionAuthorization;
}

export async function persistAndDispatchAlpha2Run(input: {
  run: Alpha2RunRecord;
  dispatch?: boolean;
}) {
  const ledger = getAlpha2MongoRunLedger();
  const dispatcher = getAlpha2ExecutionDispatcher();
  const run = Alpha2RunRecordSchema.parse(input.run);
  const stored = await ledger.createOrGet(run);

  if (input.dispatch === false) return { ...stored, jobId: undefined as string | undefined };
  if (isAlpha2TerminalRun(stored.record.run) || isAlpha2HumanStoppedRun(stored.record.run)) {
    return { ...stored, jobId: undefined as string | undefined };
  }

  const queued = await dispatcher.dispatch({
    runId: stored.record.run.runId,
    taskId: stored.record.run.taskId,
    dispatchKey: `initial_v${stored.record.version}`,
    reason: "initial",
    requestedAt: new Date().toISOString(),
  });

  return { ...stored, jobId: queued.jobId };
}

export async function handleAlpha2ExecutionJob(input: {
  job: Job<Alpha2ExecutionJob>;
  executorResolver: Alpha2ExecutorResolver;
  authorizationResolver: Alpha2ExecutionAuthorizationResolver;
  workerId: string;
  currentHeadSha: string;
  executorResolutionTimeoutMs?: number;
}) {
  const ledger = getAlpha2MongoRunLedger();
  const dispatcher = getAlpha2ExecutionDispatcher();
  const executor = createAlpha2ResolvingExecutor({
    resolver: input.executorResolver,
    resolutionTimeoutMs: input.executorResolutionTimeoutMs,
  });

  return runAlpha2DurableStep({
    runId: input.job.data.runId,
    workerId: input.workerId,
    ledger,
    dispatcher,
    executor,
    currentHeadSha: input.currentHeadSha,
    authorizationResolver: (run, context) =>
      input.authorizationResolver.resolve(run, context),
    executionId: `${String(input.job.id ?? "job")}:${input.job.attemptsMade}:${String(input.job.processedOn ?? "pending")}`,
  });
}

export function startAlpha2ControlPlaneRuntime(input: {
  executorResolver: Alpha2ExecutorResolver;
  authorizationResolver: Alpha2ExecutionAuthorizationResolver;
  workerId?: string;
  concurrency?: number;
  recoveryIntervalMs?: number;
  recoveryBatchSize?: number;
  onRecoveryError?: (error: unknown) => void;
  executorResolutionTimeoutMs?: number;
  currentHeadSha: string;
}) {
  const ledger = getAlpha2MongoRunLedger();
  const dispatcher = getAlpha2ExecutionDispatcher();
  const workerId = input.workerId ?? `alpha2-worker-${process.pid}`;

  const worker: Worker<Alpha2ExecutionJob> = startAlpha2ExecutionWorker({
    concurrency: input.concurrency,
    handler: (job) =>
      handleAlpha2ExecutionJob({
        job,
        executorResolver: input.executorResolver,
        authorizationResolver: input.authorizationResolver,
        workerId,
        currentHeadSha: input.currentHeadSha,
        executorResolutionTimeoutMs: input.executorResolutionTimeoutMs,
      }),
  });

  const recovery = startAlpha2RecoveryScheduler({
    ledger,
    dispatcher,
    intervalMs: input.recoveryIntervalMs,
    batchSize: input.recoveryBatchSize,
    onError: input.onRecoveryError,
  });

  return {
    worker,
    recovery,
    async recoverNow() {
      return recovery.recoverNow();
    },
    async close() {
      await recovery.stop();
      await worker.close();
      await closeAlpha2ExecutionRuntime();
    },
  };
}
