import { describe, expect, it, vi } from "vitest";

import type {
  Alpha2ExecutionDispatch,
  Alpha2ExecutionDispatcher,
} from "@/features/agenticRuntime/alpha2BullmqExecutionQueue";
import {
  ALPHA2_CONTINUOUS_DISPATCH_GUARDRAILS,
  type Alpha2ContinuationPlan,
  type Alpha2ContinuationTaskClaimer,
} from "@/features/agenticRuntime/alpha2ContinuousDispatchContract";
import {
  continueAlpha2AfterCompletedRun,
  shouldSignalGlobalAlpha2RunCompleted,
} from "@/features/agenticRuntime/alpha2ContinuousDispatcher";
import type {
  Alpha2RunLedger,
  Alpha2VersionedRun,
} from "@/features/agenticRuntime/alpha2RunLedgerContract";
import {
  Alpha2RunRecordSchema,
  assertAlpha2RunEvolution,
  createAlpha2RunRecord,
  transitionAlpha2Run,
  type Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";
import type {
  Alpha2OpenTaskRecord,
  Alpha2TaskOwnershipEvidence,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";

const T0 = "2026-09-26T19:00:00.000Z";
const T1 = "2026-09-26T19:01:00.000Z";
const OWNER: Alpha2TaskOwnershipEvidence = {
  branch: "feat/alpha2-continuous-dispatch-01",
  exactHead: true,
  ciState: "success",
  unresolvedReviewThreads: 0,
};

function queuedRun(input: { runId: string; taskId: string; parent?: Alpha2RunRecord }) {
  return createAlpha2RunRecord({
    runId: input.runId,
    parentRunId: input.parent?.runId,
    rootRunId: input.parent?.rootRunId,
    idempotencyKey: `idem-${input.runId}`,
    taskId: input.taskId,
    kind: "engineering_slice",
    primaryRole: "governance_compliance",
    riskClass: "green",
    route: { mode: "automatic", capabilityClass: "test" },
    budget: { maxAttempts: 3 },
    now: T0,
  });
}

function completedParent() {
  const queued = queuedRun({ runId: "parent-run", taskId: "PARENT" });
  const running = transitionAlpha2Run(queued, "running", { now: T0 });
  return transitionAlpha2Run(running, "completed", { now: T1 });
}

function task(status: Alpha2OpenTaskRecord["status"]): Alpha2OpenTaskRecord {
  return {
    id: "NEXT",
    status,
    priority: "P0",
    dependencies: "PARENT",
    scope: "bounded continuation",
    acceptance: "fail closed",
  };
}

function plan(parent: Alpha2RunRecord, status: Alpha2OpenTaskRecord["status"] = "in_progress", actionKind = "read_only"): Alpha2ContinuationPlan {
  return {
    state: "continue",
    nextRun: queuedRun({ runId: "child-run", taskId: "NEXT", parent }),
    task: task(status),
    ownership: OWNER,
    action: {
      actionKind: actionKind as "read_only",
      riskClass: "green",
      confidence: "high",
      reversible: true,
      evidenceRefs: ["evidence:continuous-dispatch"],
    },
  };
}

class FakeLedger implements Alpha2RunLedger {
  records = new Map<string, Alpha2VersionedRun>();
  events: string[] = [];
  failNextCas = false;
  failChildCreate = false;
  injectUnrelatedChildOnCasFailure = false;

  seed(run: Alpha2RunRecord) {
    this.records.set(run.runId, { run, version: 0, lease: null });
  }

  async createOrGet(run: Alpha2RunRecord) {
    this.events.push(`create:${run.runId}`);
    if (run.parentRunId && this.failChildCreate) {
      this.failChildCreate = false;
      throw new Error("simulated_child_persistence_failure");
    }
    const existing = this.records.get(run.runId);
    if (existing) return { record: existing, created: false };
    const record = { run: Alpha2RunRecordSchema.parse(run), version: 0, lease: null };
    this.records.set(run.runId, record);
    return { record, created: true };
  }

  async getByRunId(runId: string) {
    return this.records.get(runId) ?? null;
  }

  async getByIdempotencyKey(idempotencyKey: string) {
    return [...this.records.values()].find((entry) => entry.run.idempotencyKey === idempotencyKey) ?? null;
  }

  async compareAndSwap(input: { run: Alpha2RunRecord; expectedVersion: number }) {
    this.events.push(`cas:${input.run.runId}`);
    const current = this.records.get(input.run.runId);
    if (!current || current.version !== input.expectedVersion) throw new Error("alpha2_ledger_version_conflict");
    if (this.failNextCas) {
      this.failNextCas = false;
      if (this.injectUnrelatedChildOnCasFailure) {
        this.records.set(input.run.runId, {
          ...current,
          run: Alpha2RunRecordSchema.parse({
            ...current.run,
            childRunIds: [...current.run.childRunIds, "other-child"],
          }),
          version: current.version + 1,
        });
      }
      throw new Error("simulated_parent_cas_conflict");
    }
    assertAlpha2RunEvolution(current.run, input.run);
    const next = { run: Alpha2RunRecordSchema.parse(input.run), version: current.version + 1, lease: current.lease };
    this.records.set(input.run.runId, next);
    return next;
  }

  async tryAcquireLease() { return null; }
  async renewLease() { return null; }
  async isRunDue() { return false; }
  async releaseLease() {}
  async listRecoverable() { return []; }
}

class FakeDispatcher implements Alpha2ExecutionDispatcher {
  jobs: Alpha2ExecutionDispatch[] = [];
  fail = false;

  async dispatch(input: Alpha2ExecutionDispatch) {
    if (this.fail) throw new Error("redis_unavailable");
    this.jobs.push(input);
    return { jobId: `job-${this.jobs.length}` };
  }
}

function claimer(result = { applied: true, status: "in_progress" as const, evidenceRef: "claim:NEXT" }) {
  return {
    claim: vi.fn(async () => result),
  } satisfies Alpha2ContinuationTaskClaimer;
}

describe("ALPHA2-CONTINUOUS-DISPATCH-01 current-main convergence", () => {
  it("requires the canonical task claim before a codex_ready child becomes durable or dispatchable", async () => {
    const parent = completedParent();
    const ledger = new FakeLedger();
    ledger.seed(parent);
    const dispatcher = new FakeDispatcher();
    const taskClaimer = claimer({ applied: false, status: "review", evidenceRef: "claim:lost" });

    const result = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer,
      planner: { async plan() { return plan(parent, "codex_ready"); } },
      now: T1,
    });

    expect(result.state).toBe("claim_blocked");
    expect(taskClaimer.claim).toHaveBeenCalledTimes(1);
    expect(ledger.records.has("child-run")).toBe(false);
    expect(dispatcher.jobs).toEqual([]);
    expect(ledger.records.get(parent.runId)?.run.childRunIds).toEqual([]);
  });

  it("reserves deterministic parent lineage before child persistence and dispatch", async () => {
    const parent = completedParent();
    const ledger = new FakeLedger();
    ledger.seed(parent);
    const dispatcher = new FakeDispatcher();

    const result = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner: { async plan() { return plan(parent, "in_progress"); } },
      now: T1,
    });

    expect(result.state).toBe("dispatched");
    expect(ledger.events.indexOf("cas:parent-run")).toBeLessThan(ledger.events.indexOf("create:child-run"));
    expect(ledger.records.get("parent-run")?.run.childRunIds).toEqual(["child-run"]);
    expect(dispatcher.jobs[0]).toMatchObject({
      runId: "child-run",
      reason: "continue",
      dispatchKey: "continue:parent-run:child-run",
    });
  });

  it("does not create an orphan child when parent reservation loses to unrelated lineage", async () => {
    const parent = completedParent();
    const ledger = new FakeLedger();
    ledger.seed(parent);
    ledger.failNextCas = true;
    ledger.injectUnrelatedChildOnCasFailure = true;
    const dispatcher = new FakeDispatcher();

    const result = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner: { async plan() { return plan(parent, "in_progress"); } },
      now: T1,
    });

    expect(result.state).toBe("reservation_pending");
    expect(ledger.records.has("child-run")).toBe(false);
    expect(dispatcher.jobs).toEqual([]);
  });

  it("reuses the same reserved child after persistence or Redis failure", async () => {
    const parent = completedParent();
    const ledger = new FakeLedger();
    ledger.seed(parent);
    ledger.failChildCreate = true;
    const dispatcher = new FakeDispatcher();
    const planner = { async plan() { return plan(parent, "in_progress"); } };

    const first = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner,
      now: T1,
    });
    expect(first.state).toBe("reservation_pending");
    expect(ledger.records.get("parent-run")?.run.childRunIds).toEqual(["child-run"]);

    dispatcher.fail = true;
    const second = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner,
      now: T1,
    });
    expect(second.state).toBe("dispatch_pending");
    expect([...ledger.records.keys()].filter((id) => id === "child-run")).toHaveLength(1);

    dispatcher.fail = false;
    const third = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner,
      now: T1,
    });
    expect(third.state).toBe("dispatched");
    expect(dispatcher.jobs).toHaveLength(1);
    expect([...ledger.records.keys()].filter((id) => id === "child-run")).toHaveLength(1);
  });

  it("persists human-only actions as a human_gate child and never dispatches them", async () => {
    const parent = completedParent();
    const ledger = new FakeLedger();
    ledger.seed(parent);
    const dispatcher = new FakeDispatcher();

    const result = await continueAlpha2AfterCompletedRun({
      completedRun: parent,
      ledger,
      dispatcher,
      taskClaimer: claimer(),
      planner: { async plan() { return plan(parent, "in_progress", "merge_code"); } },
      now: T1,
    });

    expect(result.state).toBe("human_gate");
    if (result.state === "human_gate") {
      expect(result.gateRun.status).toBe("human_gate");
      expect(result.gateRun.humanGate.state).toBe("pending");
    }
    expect(dispatcher.jobs).toEqual([]);
  });

  it("suppresses the competing run_completed producer only when direct continuation owns the next step", () => {
    expect(shouldSignalGlobalAlpha2RunCompleted(null)).toBe(true);
    expect(shouldSignalGlobalAlpha2RunCompleted({ state: "idle", run: completedParent(), reason: "none" })).toBe(true);
    expect(
      shouldSignalGlobalAlpha2RunCompleted({
        state: "dispatch_pending",
        run: completedParent(),
        nextRun: queuedRun({ runId: "child-run", taskId: "NEXT", parent: completedParent() }),
        reason: "redis",
      }),
    ).toBe(false);
    expect(ALPHA2_CONTINUOUS_DISPATCH_GUARDRAILS.autoMergeAllowed).toBe(false);
    expect(ALPHA2_CONTINUOUS_DISPATCH_GUARDRAILS.autoDeployAllowed).toBe(false);
    expect(ALPHA2_CONTINUOUS_DISPATCH_GUARDRAILS.secretMutationAllowed).toBe(false);
  });
});
