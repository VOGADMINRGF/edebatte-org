import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  let workerHandler: ((job: any) => Promise<any>) | null = null;
  const worker = { close: vi.fn(async () => undefined) };
  const recovery = {
    recoverNow: vi.fn(async () => [{ state: "recovered" }]),
    stop: vi.fn(async () => undefined),
  };
  const runAlpha2DurableStep = vi.fn();
  return {
    worker,
    recovery,
    runAlpha2DurableStep,
    setWorkerHandler(handler: (job: any) => Promise<any>) {
      workerHandler = handler;
    },
    getWorkerHandler() {
      if (!workerHandler) throw new Error("worker_handler_not_registered");
      return workerHandler;
    },
    reset() {
      workerHandler = null;
      worker.close.mockClear();
      recovery.recoverNow.mockClear();
      recovery.stop.mockClear();
      runAlpha2DurableStep.mockReset();
    },
  };
});

vi.mock("@/features/agenticRuntime/alpha2BullmqExecutionQueue", () => ({
  getAlpha2ExecutionDispatcher: vi.fn(() => ({ dispatch: vi.fn() })),
  closeAlpha2ExecutionRuntime: vi.fn(async () => undefined),
  startAlpha2ExecutionWorker: vi.fn((input: { handler: (job: any) => Promise<any> }) => {
    harness.setWorkerHandler(input.handler);
    return harness.worker;
  }),
}));

vi.mock("@/features/agenticRuntime/alpha2DurableOrchestrator", () => ({
  runAlpha2DurableStep: harness.runAlpha2DurableStep,
  startAlpha2RecoveryScheduler: vi.fn(() => harness.recovery),
  createAlpha2ResolvingExecutor: vi.fn(() => ({ execute: vi.fn() })),
}));

vi.mock("@/features/agenticRuntime/alpha2MongoRunLedger", () => ({
  getAlpha2MongoRunLedger: vi.fn(() => ({ createOrGet: vi.fn() })),
}));

import {
  handleAlpha2ExecutionJob,
  startAlpha2ControlPlaneRuntime,
} from "@/features/agenticRuntime/alpha2RuntimeService";

describe("Alpha2 runtime orchestrator re-observation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    harness.reset();
  });

  it("signals startup, idle and explicit recovery without creating another scheduler truth", async () => {
    const triggers: string[] = [];
    const runtime = startAlpha2ControlPlaneRuntime({
      executorResolver: { resolve: vi.fn() } as any,
      authorizationResolver: { resolve: vi.fn() } as any,
      currentHeadSha: "a".repeat(40),
      orchestratorObservationIntervalMs: 1_000,
      orchestratorLoop: {
        async run(input) {
          triggers.push(input.trigger);
        },
      },
    });

    await vi.runAllTicks();
    await Promise.resolve();
    expect(triggers).toContain("startup");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(triggers).toContain("idle");

    await runtime.recoverNow();
    expect(triggers).toContain("recovery");
    expect(harness.recovery.recoverNow).toHaveBeenCalledTimes(1);

    await runtime.close();
    expect(harness.recovery.stop).toHaveBeenCalledTimes(1);
    expect(harness.worker.close).toHaveBeenCalledTimes(1);
  });

  it("re-observes after a completed durable worker run", async () => {
    const completedRun = { runId: "run-completed", status: "completed" } as any;
    harness.runAlpha2DurableStep.mockResolvedValue({
      state: "executed",
      run: completedRun,
      nextJobId: undefined,
    });
    const signals: Array<{ trigger: string; runId?: string }> = [];

    await handleAlpha2ExecutionJob({
      job: {
        id: "job-1",
        attemptsMade: 0,
        processedOn: 1,
        data: { runId: "run-completed", taskId: "TASK", dispatchKey: "d", reason: "initial" },
      } as any,
      executorResolver: { resolve: vi.fn() } as any,
      authorizationResolver: { resolve: vi.fn() } as any,
      workerId: "worker-1",
      currentHeadSha: "b".repeat(40),
      orchestratorLoop: {
        async run(input) {
          signals.push({ trigger: input.trigger, runId: input.run?.runId });
        },
      },
    });

    expect(signals).toEqual([{ trigger: "run_completed", runId: "run-completed" }]);
  });

  it("does not turn a completed worker result into a retry when re-observation fails", async () => {
    harness.runAlpha2DurableStep.mockResolvedValue({
      state: "executed",
      run: { runId: "run-safe", status: "completed" },
    });
    const errors: unknown[] = [];

    const result = await handleAlpha2ExecutionJob({
      job: {
        id: "job-safe",
        attemptsMade: 0,
        processedOn: 1,
        data: { runId: "run-safe", taskId: "TASK", dispatchKey: "d", reason: "initial" },
      } as any,
      executorResolver: { resolve: vi.fn() } as any,
      authorizationResolver: { resolve: vi.fn() } as any,
      workerId: "worker-1",
      currentHeadSha: "c".repeat(40),
      orchestratorLoop: {
        async run() {
          throw new Error("observation_temporarily_unavailable");
        },
      },
      onOrchestratorError(error) {
        errors.push(error);
      },
    });

    expect(result.state).toBe("executed");
    expect((result as any).run.status).toBe("completed");
    expect(errors).toHaveLength(1);
  });
});
