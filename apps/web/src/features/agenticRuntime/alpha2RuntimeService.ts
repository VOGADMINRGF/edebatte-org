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

export type Alpha2RuntimeOrchestratorTrigger =
  | "startup"
  | "idle"
  | "run_completed"
  | "recovery";

/**
 * Runtime hook into the canonical orchestrator loop. The runtime does not own task selection or
 * OpenTasks/GitHub mutation; it only tells the existing orchestrator when canonical state must be
 * re-observed after startup, idle time, a completed durable run or an explicit recovery pass.
 */
export interface Alpha2RuntimeOrchestratorLoop {
  run(input: {
    trigger: Alpha2RuntimeOrchestratorTrigger;
    run?: Alpha2RunRecord;
  }): Promise<void> | void;
}

async function signalAlpha2Orchestrator(input: {
  loop?: Alpha2RuntimeOrchestratorLoop;
  trigger: Alpha2RuntimeOrchestratorTrigger;
  run?: Alpha2RunRecord;
  onError?: (error: unknown) => void;
}) {
  if (!input.loop) return;
  try {
    await input.loop.run({ trigger: input.trigger, run: input.run });
  } catch (error) {
    input.onError?.(error);
  }
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
  orchestratorLoop?: Alpha2RuntimeOrchestratorLoop;
  onOrchestratorError?: (error: unknown) => void;
}) {
  const ledger = getAlpha2MongoRunLedger();
  const dispatcher = getAlpha2ExecutionDispatcher();
  const executor = createAlpha2ResolvingExecutor({
    resolver: input.executorResolver,
    resolutionTimeoutMs: input.executorResolutionTimeoutMs,
  });

  const result = await runAlpha2DurableStep({
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

  if (result.state === "executed" && result.run.status === "completed") {
    await signalAlpha2Orchestrator({
      loop: input.orchestratorLoop,
      trigger: "run_completed",
      run: result.run,
      onError: input.onOrchestratorError,
    });
  }

  return result;
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
  orchestratorLoop?: Alpha2RuntimeOrchestratorLoop;
  orchestratorObservationIntervalMs?: number;
  onOrchestratorError?: (error: unknown) => void;
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
        orchestratorLoop: input.orchestratorLoop,
        onOrchestratorError: input.onOrchestratorError,
      }),
  });

  const recovery = startAlpha2RecoveryScheduler({
    ledger,
    dispatcher,
    intervalMs: input.recoveryIntervalMs,
    batchSize: input.recoveryBatchSize,
    onError: input.onRecoveryError,
  });

  void signalAlpha2Orchestrator({
    loop: input.orchestratorLoop,
    trigger: "startup",
    onError: input.onOrchestratorError,
  });

  const observationIntervalMs = Math.max(1_000, input.orchestratorObservationIntervalMs ?? 30_000);
  const observationTimer = input.orchestratorLoop
    ? setInterval(() => {
        void signalAlpha2Orchestrator({
          loop: input.orchestratorLoop,
          trigger: "idle",
          onError: input.onOrchestratorError,
        });
      }, observationIntervalMs)
    : null;
  observationTimer?.unref?.();

  return {
    worker,
    recovery,
    async observeNow() {
      await signalAlpha2Orchestrator({
        loop: input.orchestratorLoop,
        trigger: "idle",
        onError: input.onOrchestratorError,
      });
    },
    async recoverNow() {
      const result = await recovery.recoverNow();
      await signalAlpha2Orchestrator({
        loop: input.orchestratorLoop,
        trigger: "recovery",
        onError: input.onOrchestratorError,
      });
      return result;
    },
    async close() {
      if (observationTimer) clearInterval(observationTimer);
      await recovery.stop();
      await worker.close();
      await closeAlpha2ExecutionRuntime();
    },
  };
}
