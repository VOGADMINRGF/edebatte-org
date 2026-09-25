import { describe, expect, it } from "vitest";
import {
  createAlpha2ResolvingExecutor,
  runAlpha2DurableStep,
} from "@/features/agenticRuntime/alpha2DurableOrchestrator";
import type {
  Alpha2ExecutionDispatch,
  Alpha2ExecutionDispatcher,
} from "@/features/agenticRuntime/alpha2BullmqExecutionQueue";
import {
  isAlpha2HumanStoppedRun,
  isAlpha2TerminalRun,
  type Alpha2RunLedger,
  type Alpha2VersionedRun,
} from "@/features/agenticRuntime/alpha2RunLedgerContract";
import {
  Alpha2RunRecordSchema,
  appendAlpha2Checkpoint,
  createAlpha2RunRecord,
  transitionAlpha2Run,
  type Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

const NOW = "2026-08-27T09:00:00.000Z";
const HEAD = "1111111111111111111111111111111111111111";
const AUTHORIZED_OPENTASKS = `
## Kanonischer Operativteil
| ID | Status | Priorität | Abhängigkeiten | Scope / Ziel | Akzeptanzkriterien / Evidence |
| --- | --- | --- | --- | --- | --- |
| ALPHA2-TEST-01 | in_progress | P0 |  | Test | Test |
## Historischer Katalog und Evidenz
`;

class PersistenceLedger implements Alpha2RunLedger {
  private record: Alpha2VersionedRun | null = null;
  transientCompletedWrites = 0;
  completedWriteAttempts = 0;
  conflictWithLaterCompletedWrite = false;
  ambiguousForeignCompletedWrite = false;
  ambiguousFailedWrite = false;
  reconciliationReadFailuresAfterAmbiguousWrite = 0;
  private transientReconciliationReadFailures = 0;

  seed(run: Alpha2RunRecord) {
    this.record = { run, version: 0, lease: null };
  }

  async createOrGet(run: Alpha2RunRecord) {
    if (this.record) return { record: this.record, created: false };
    this.seed(run);
    return { record: this.record!, created: true };
  }

  async getByRunId(runId: string) {
    if (this.transientReconciliationReadFailures > 0) {
      this.transientReconciliationReadFailures -= 1;
      const error = new Error("simulated transient reconciliation read");
      error.name = "MongoNetworkError";
      throw error;
    }
    return this.record?.run.runId === runId ? this.record : null;
  }

  async getByIdempotencyKey(idempotencyKey: string) {
    return this.record?.run.idempotencyKey === idempotencyKey ? this.record : null;
  }

  async compareAndSwap(input: {
    run: Alpha2RunRecord;
    expectedVersion: number;
    lease?: { owner: string; now: string };
    resumeAfterMs?: number;
    initializeWallClock?: { maxWallClockMs?: number };
    stampCheckpointId?: string;
  }) {
    const current = this.record;
    if (!current || current.version !== input.expectedVersion) {
      throw new Error("alpha2_ledger_version_conflict");
    }
    if (input.lease && current.lease?.owner !== input.lease.owner) {
      throw new Error("alpha2_ledger_lease_lost");
    }
    const persistedRun =
      input.resumeAfterMs === undefined
        ? input.run
        : {
            ...input.run,
            resumeAt: new Date(
              Date.parse(input.run.updatedAt) + Math.max(0, Math.floor(input.resumeAfterMs)),
            ).toISOString(),
          };
    if (persistedRun.status === "failed" && this.ambiguousFailedWrite) {
      this.ambiguousFailedWrite = false;
      this.record = {
        run: persistedRun,
        version: current.version + 1,
        lease: current.lease,
      };
      this.transientReconciliationReadFailures =
        this.reconciliationReadFailuresAfterAmbiguousWrite;
      const error = new Error("simulated ambiguous failed mongo write");
      error.name = "MongoNetworkError";
      throw error;
    }
    if (persistedRun.status === "completed") {
      this.completedWriteAttempts += 1;
      if (this.conflictWithLaterCompletedWrite) {
        this.conflictWithLaterCompletedWrite = false;
        this.record = {
          run: persistedRun,
          version: current.version + 2,
          lease: current.lease,
        };
        throw new Error("alpha2_ledger_version_conflict");
      }
      if (this.ambiguousForeignCompletedWrite) {
        this.ambiguousForeignCompletedWrite = false;
        this.record = {
          run: {
            ...persistedRun,
            checkpoints: persistedRun.checkpoints.map((checkpoint) =>
              checkpoint.checkpointId === "completed-once"
                ? { ...checkpoint, cursor: "foreign-delivery-cursor" }
                : checkpoint,
            ),
          },
          version: current.version + 1,
          lease: current.lease,
        };
        const error = new Error("simulated ambiguous mongo write");
        error.name = "MongoNetworkError";
        throw error;
      }
      if (this.transientCompletedWrites > 0) {
        this.transientCompletedWrites -= 1;
        const error = new Error("simulated transient mongo write");
        error.name = "MongoNetworkError";
        throw error;
      }
    }
    const next = {
      run: persistedRun,
      version: current.version + 1,
      lease: current.lease,
    } satisfies Alpha2VersionedRun;
    this.record = next;
    return next;
  }

  async tryAcquireLease(input: {
    runId: string;
    owner: string;
    now: string;
    leaseMs: number;
  }) {
    const current = this.record;
    if (!current || current.run.runId !== input.runId) return null;
    if (isAlpha2TerminalRun(current.run) || isAlpha2HumanStoppedRun(current.run)) return null;
    const next = {
      ...current,
      lease: {
        owner: input.owner,
        expiresAt: new Date(Date.parse(NOW) + input.leaseMs).toISOString(),
      },
    } satisfies Alpha2VersionedRun;
    this.record = next;
    return next;
  }

  async renewLease(input: {
    runId: string;
    owner: string;
    now: string;
    leaseMs: number;
  }) {
    const current = this.record;
    if (!current || current.run.runId !== input.runId || current.lease?.owner !== input.owner) {
      return null;
    }
    const next = {
      ...current,
      lease: {
        owner: input.owner,
        expiresAt: new Date(Date.parse(NOW) + input.leaseMs).toISOString(),
      },
    } satisfies Alpha2VersionedRun;
    this.record = next;
    return next;
  }

  async isRunDue(input: { runId: string; now: string }) {
    const current = this.record;
    return Boolean(
      current &&
        current.run.runId === input.runId &&
        !isAlpha2TerminalRun(current.run) &&
        !isAlpha2HumanStoppedRun(current.run),
    );
  }

  async releaseLease(input: { runId: string; owner: string }) {
    const current = this.record;
    if (!current || current.run.runId !== input.runId || current.lease?.owner !== input.owner) {
      return;
    }
    this.record = { ...current, lease: null };
  }

  async listRecoverable(_input: { now: string; limit?: number }) {
    return [];
  }
}

class NoopDispatcher implements Alpha2ExecutionDispatcher {
  jobs: Alpha2ExecutionDispatch[] = [];

  async dispatch(input: Alpha2ExecutionDispatch) {
    this.jobs.push(input);
    return { jobId: `job-${this.jobs.length}` };
  }
}

function testRun(id: string, maxAttempts = 1) {
  return createAlpha2RunRecord({
    runId: id,
    idempotencyKey: `idem-${id}`,
    taskId: "ALPHA2-TEST-01",
    kind: "engineering_slice",
    primaryRole: "governance_compliance",
    riskClass: "green",
    route: { mode: "automatic", capabilityClass: "test" },
    budget: { maxAttempts },
    now: NOW,
  });
}

function authorization() {
  return {
    observedHeadSha: HEAD,
    observedAt: NOW,
    openTasksText: AUTHORIZED_OPENTASKS,
    ownership: {
      branch: "feat/alpha2-test",
      prNumber: 637,
      exactHead: true,
      ciState: "success" as const,
      unresolvedReviewThreads: 0,
    },
    action: {
      actionKind: "read_only" as const,
      riskClass: "green" as const,
      confidence: "high" as const,
      reversible: true,
      evidenceRefs: ["test:alpha2-outcome-persistence"],
    },
  };
}

describe("Alpha2 outcome persistence hardening", () => {
  it("canonicalizes initial pending gates to a new attempt and rejects spoofed resume modes", () => {
    const initial = createAlpha2RunRecord({
      runId: "run-initial-gate",
      idempotencyKey: "idem-run-initial-gate",
      taskId: "ALPHA2-TEST-01",
      kind: "engineering_slice",
      primaryRole: "governance_compliance",
      riskClass: "green",
      route: { mode: "automatic", capabilityClass: "test" },
      humanGate: { state: "pending", reason: "initial approval required" },
      now: NOW,
    });
    expect(initial.humanGate.resumeMode).toBe("start_new_attempt");

    expect(() =>
      createAlpha2RunRecord({
        runId: "run-initial-gate-spoof",
        idempotencyKey: "idem-run-initial-gate-spoof",
        taskId: "ALPHA2-TEST-01",
        kind: "engineering_slice",
        primaryRole: "governance_compliance",
        riskClass: "green",
        route: { mode: "automatic", capabilityClass: "test" },
        humanGate: {
          state: "pending",
          reason: "initial approval required",
          resumeMode: "resume_attempt",
        },
        now: NOW,
      }),
    ).toThrow("alpha2_human_gate_resume_mode_mismatch");

    expect(() =>
      transitionAlpha2Run(testRun("run-queued-gate-spoof"), "human_gate", {
        now: NOW,
        humanGate: {
          state: "pending",
          reason: "queued approval required",
          resumeMode: "resume_attempt",
        },
      }),
    ).toThrow("alpha2_human_gate_resume_mode_mismatch");
  });

  it("retries a transient completed-outcome CAS while retaining the active lease", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-transient-outcome"));
    ledger.transientCompletedWrites = 1;
    let executions = 0;

    const result = await runAlpha2DurableStep({
      runId: "run-transient-outcome",
      workerId: "worker-transient-outcome",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          executions += 1;
          return { type: "completed", checkpointId: "completed-once" };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(result.state).toBe("executed");
    if (result.state !== "executed") throw new Error("unexpected state");
    expect(result.run.status).toBe("completed");
    expect(result.run.attempt).toBe(1);
    expect(executions).toBe(1);
    expect(ledger.completedWriteAttempts).toBe(2);
  });

  it("never reconciles a lease or version conflict against a later matching checkpoint", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-conflicting-outcome"));
    ledger.conflictWithLaterCompletedWrite = true;

    await expect(
      runAlpha2DurableStep({
        runId: "run-conflicting-outcome",
        workerId: "worker-conflicting-outcome",
        ledger,
        dispatcher,
        executor: {
          async execute() {
            return { type: "completed", checkpointId: "completed-once" };
          },
        },
        currentHeadSha: HEAD,
        authorization: authorization(),
        now: NOW,
      }),
    ).rejects.toThrow("alpha2_ledger_version_conflict");
    expect(ledger.completedWriteAttempts).toBe(1);
  });

  it("rejects an ambiguous transport write when the exact successor outcome identity differs", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-foreign-ambiguous-outcome"));
    ledger.ambiguousForeignCompletedWrite = true;

    await expect(
      runAlpha2DurableStep({
        runId: "run-foreign-ambiguous-outcome",
        workerId: "worker-foreign-ambiguous-outcome",
        ledger,
        dispatcher,
        executor: {
          async execute() {
            return { type: "completed", checkpointId: "completed-once" };
          },
        },
        currentHeadSha: HEAD,
        authorization: authorization(),
        now: NOW,
      }),
    ).rejects.toThrow("alpha2_ledger_version_conflict");
  });

  it("persists the structured resolver timeout code instead of the generic Error name", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-resolver-timeout-code"));

    const executor = createAlpha2ResolvingExecutor({
      resolver: {
        resolve: () => new Promise<never>(() => undefined),
      },
      resolutionTimeoutMs: 1,
    });

    const result = await runAlpha2DurableStep({
      runId: "run-resolver-timeout-code",
      workerId: "worker-resolver-timeout-code",
      ledger,
      dispatcher,
      executor,
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(result.state).toBe("executed");
    if (result.state !== "executed") throw new Error("unexpected state");
    expect(result.run.status).toBe("failed");
    expect(result.run.lastErrorCode).toBe("alpha2_executor_resolution_timeout");
    expect(result.run.checkpoints.at(-1)?.errorCode).toBe("alpha2_executor_resolution_timeout");
  });

  it("rejects secret-shaped executor failure codes before durable persistence", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-unsafe-returned-code"));
    const unsafeCode = "sk-proj-AbCdEf0123456789";

    const result = await runAlpha2DurableStep({
      runId: "run-unsafe-returned-code",
      workerId: "worker-unsafe-returned-code",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          return {
            type: "failed",
            checkpointId: "unsafe-returned-code",
            errorCode: unsafeCode,
            retryable: false,
          };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(result.state).toBe("executed");
    if (result.state !== "executed") throw new Error("unexpected state");
    expect(result.run.status).toBe("failed");
    expect(result.run.lastErrorCode).toBe("alpha2_run_failed");
    expect(result.run.checkpoints.at(-1)?.errorCode).toBe("alpha2_run_failed");
    expect(JSON.stringify(result.run)).not.toContain(unsafeCode);
  });

  it("rejects unsafe error codes at checkpoint and durable record schema boundaries", () => {
    const run = testRun("run-unsafe-schema-code");
    const unsafeCode = "sk-proj-AbCdEf0123456789";

    expect(() =>
      appendAlpha2Checkpoint(run, {
        checkpointId: "unsafe-schema-code",
        createdAt: NOW,
        status: "failed",
        errorCode: unsafeCode,
        evidenceRefs: [],
        safeTraceStepRefs: [],
        artifactRefs: [],
      }),
    ).toThrow();
    expect(() =>
      Alpha2RunRecordSchema.parse({
        ...run,
        lastErrorCode: unsafeCode,
      }),
    ).toThrow();
    expect(() =>
      Alpha2RunRecordSchema.parse({
        ...run,
        checkpoints: [
          {
            checkpointId: "unsafe-direct-record-code",
            createdAt: NOW,
            status: "failed",
            errorCode: unsafeCode,
            evidenceRefs: [],
            safeTraceStepRefs: [],
            artifactRefs: [],
          },
        ],
      }),
    ).toThrow();

    expect(
      Alpha2RunRecordSchema.parse({ ...run, lastErrorCode: "alpha2_provider_timeout" })
        .lastErrorCode,
    ).toBe("alpha2_provider_timeout");
  });

  it("reconciles an ambiguous failed write against the normalized durable error code", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-ambiguous-failed-code", 2));
    ledger.ambiguousFailedWrite = true;
    const unsafeCode = "sk-proj-AmbiguousSecret012345";

    const result = await runAlpha2DurableStep({
      runId: "run-ambiguous-failed-code",
      workerId: "worker-ambiguous-failed-code",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          return {
            type: "failed",
            checkpointId: "ambiguous-failed-code",
            errorCode: unsafeCode,
            retryable: true,
            retryAfterMs: 0,
          };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(result.state).toBe("executed");
    if (result.state !== "executed") throw new Error("unexpected state");
    expect(result.run.status).toBe("failed");
    expect(result.run.lastErrorCode).toBe("alpha2_run_failed");
    expect(result.run.checkpoints.at(-1)?.errorCode).toBe("alpha2_run_failed");
    expect(JSON.stringify(result.run)).not.toContain(unsafeCode);
    expect(dispatcher.jobs).toHaveLength(1);
    expect(dispatcher.jobs[0]?.reason).toBe("retry");
  });

  it("retries a transient reconciliation read after an ambiguous committed write", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-ambiguous-read-retry", 2));
    ledger.ambiguousFailedWrite = true;
    ledger.reconciliationReadFailuresAfterAmbiguousWrite = 1;

    const result = await runAlpha2DurableStep({
      runId: "run-ambiguous-read-retry",
      workerId: "worker-ambiguous-read-retry",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          return {
            type: "failed",
            checkpointId: "ambiguous-read-retry",
            errorCode: "alpha2_provider_timeout",
            retryable: true,
            retryAfterMs: 0,
          };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(result.state).toBe("executed");
    if (result.state !== "executed") throw new Error("unexpected state");
    expect(result.run.lastErrorCode).toBe("alpha2_provider_timeout");
    expect(dispatcher.jobs).toHaveLength(1);
    expect(dispatcher.jobs[0]?.reason).toBe("retry");
  });

  it("retains a structured failure code in checkpoint history after a successful retry", async () => {
    const ledger = new PersistenceLedger();
    const dispatcher = new NoopDispatcher();
    ledger.seed(testRun("run-retry-history", 2));

    const first = await runAlpha2DurableStep({
      runId: "run-retry-history",
      workerId: "worker-retry-history-1",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          return {
            type: "failed",
            checkpointId: "provider-timeout",
            errorCode: "alpha2_provider_timeout",
            retryable: true,
            retryAfterMs: 0,
          };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(first.state).toBe("executed");
    if (first.state !== "executed") throw new Error("unexpected state");
    expect(first.run.lastErrorCode).toBe("alpha2_provider_timeout");
    expect(first.run.checkpoints.at(-1)?.errorCode).toBe("alpha2_provider_timeout");

    const second = await runAlpha2DurableStep({
      runId: "run-retry-history",
      workerId: "worker-retry-history-2",
      ledger,
      dispatcher,
      executor: {
        async execute() {
          return { type: "completed", checkpointId: "retry-completed" };
        },
      },
      currentHeadSha: HEAD,
      authorization: authorization(),
      now: NOW,
    });

    expect(second.state).toBe("executed");
    if (second.state !== "executed") throw new Error("unexpected state");
    expect(second.run.status).toBe("completed");
    expect(second.run.lastErrorCode).toBeUndefined();
    expect(
      second.run.checkpoints.find((checkpoint) => checkpoint.checkpointId === "provider-timeout")
        ?.errorCode,
    ).toBe("alpha2_provider_timeout");
  });
});
