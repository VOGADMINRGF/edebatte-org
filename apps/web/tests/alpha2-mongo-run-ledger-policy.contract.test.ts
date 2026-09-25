import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Alpha2RunRecordSchema,
  alpha2ReviewCompletionGateRef,
  appendAlpha2Checkpoint,
  consumeAlpha2HumanResumeApproval,
  createAlpha2RunRecord,
  transitionAlpha2Run,
  type Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

const mongoHarness = vi.hoisted(() => {
  let found: unknown = null;
  let updated: unknown = null;
  const Model = {
    findOne: vi.fn(async () => found),
    findOneAndUpdate: vi.fn(async () => updated),
    create: vi.fn(async (input: unknown) => input),
  };
  return {
    Model,
    setFound(value: unknown) {
      found = value;
    },
    setUpdated(value: unknown) {
      updated = value;
    },
  };
});

vi.mock("@core/db/mongoose", () => {
  class FakeSchema {
    static Types = { Mixed: class Mixed {} };
    index() {}
  }
  return {
    mongo: vi.fn(async () => undefined),
    mongoose: {
      Schema: FakeSchema,
      models: { Alpha2RunLedger: mongoHarness.Model },
      model: vi.fn(),
    },
  };
});

import { Alpha2MongoRunLedger } from "@/features/agenticRuntime/alpha2MongoRunLedger";

function mongoDocument(run: Alpha2RunRecord, version: number) {
  return {
    toObject() {
      return {
        payload: run,
        version,
        leaseOwner: null,
        leaseExpiresAt: null,
      };
    },
  };
}

function policyRun() {
  return createAlpha2RunRecord({
    runId: "run-mongo-policy",
    idempotencyKey: "idem-run-mongo-policy",
    taskId: "ALPHA2-TEST-01",
    kind: "engineering_slice",
    primaryRole: "governance_compliance",
    riskClass: "red",
    route: { mode: "automatic", capabilityClass: "test" },
    budget: { maxAttempts: 1, maxWallClockMs: 60_000 },
    now: "2026-08-23T20:00:00.000Z",
  });
}

describe("Alpha2 Mongo run-ledger execution policy boundary", () => {
  beforeEach(() => {
    mongoHarness.Model.findOne.mockClear();
    mongoHarness.Model.findOneAndUpdate.mockClear();
    mongoHarness.Model.create.mockClear();
    mongoHarness.setFound(null);
    mongoHarness.setUpdated(null);
  });

  it("rejects a fresh pre-completed review-gated run at initial insertion", async () => {
    const queued = createAlpha2RunRecord({
      runId: "run-mongo-pre-completed",
      idempotencyKey: "idem-run-mongo-pre-completed",
      taskId: "ALPHA2-DIRECT-ENGINEERING-WORKER-01",
      kind: "engineering_slice",
      primaryRole: "engineering_agent",
      supportingRoles: ["review_agent"],
      primaryActor: { actorId: "worker-pre-completed", roleId: "engineering_agent" },
      assignedReviewActor: { actorId: "reviewer-pre-completed", roleId: "review_agent" },
      riskClass: "yellow",
      route: { mode: "automatic", capabilityClass: "engineering" },
      now: "2026-09-02T08:00:00.000Z",
    });
    const preCompleted = Alpha2RunRecordSchema.parse({
      ...queued,
      status: "completed",
      updatedAt: "2026-09-02T08:01:00.000Z",
      finishedAt: "2026-09-02T08:01:00.000Z",
    });
    const ledger = new Alpha2MongoRunLedger();

    await expect(ledger.createOrGet(preCompleted)).rejects.toThrow(
      "alpha2_invalid_initial_run_status:completed",
    );
    expect(mongoHarness.Model.create).not.toHaveBeenCalled();
  });

  it("persists canonical initial runs and preserves existing recovery records", async () => {
    const queued = createAlpha2RunRecord({
      runId: "run-mongo-valid-initial",
      idempotencyKey: "idem-run-mongo-valid-initial",
      taskId: "ALPHA2-DIRECT-ENGINEERING-WORKER-01",
      kind: "engineering_slice",
      primaryRole: "engineering_agent",
      supportingRoles: ["review_agent"],
      primaryActor: { actorId: "worker-valid-initial", roleId: "engineering_agent" },
      assignedReviewActor: { actorId: "reviewer-valid-initial", roleId: "review_agent" },
      riskClass: "yellow",
      route: { mode: "automatic", capabilityClass: "engineering" },
      now: "2026-09-02T08:00:00.000Z",
    });
    const ledger = new Alpha2MongoRunLedger();

    const created = await ledger.createOrGet(queued);
    expect(created).toMatchObject({ created: true, record: { run: queued, version: 0 } });
    expect(created.record.run.primaryActor).toEqual(queued.primaryActor);
    expect(created.record.run.assignedReviewActor).toEqual(queued.assignedReviewActor);
    expect(mongoHarness.Model.create).toHaveBeenCalledOnce();

    const completed = Alpha2RunRecordSchema.parse({
      ...queued,
      status: "completed",
      updatedAt: "2026-09-02T08:05:00.000Z",
      finishedAt: "2026-09-02T08:05:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(completed, 4));

    const recovered = await ledger.createOrGet(completed);
    expect(recovered).toMatchObject({
      created: false,
      record: { run: completed, version: 4 },
    });
    expect(mongoHarness.Model.create).toHaveBeenCalledOnce();
  });

  it("rejects direct compareAndSwap changes to execution policy", async () => {
    const existing = policyRun();
    mongoHarness.setFound(mongoDocument(existing, 0));
    const ledger = new Alpha2MongoRunLedger();
    const mutations: Array<{
      expectedError: string;
      run: Alpha2RunRecord;
    }> = [
      {
        expectedError: "alpha2_risk_class_is_immutable",
        run: Alpha2RunRecordSchema.parse({ ...existing, riskClass: "green" }),
      },
      {
        expectedError: "alpha2_budget_is_immutable",
        run: Alpha2RunRecordSchema.parse({
          ...existing,
          budget: { ...existing.budget, maxAttempts: 2 },
        }),
      },
      {
        expectedError: "alpha2_route_is_immutable",
        run: Alpha2RunRecordSchema.parse({
          ...existing,
          route: { ...existing.route, capabilityClass: "changed" },
        }),
      },
      {
        expectedError: "alpha2_run_kind_is_immutable",
        run: Alpha2RunRecordSchema.parse({ ...existing, kind: "diagnostic" }),
      },
      {
        expectedError: "alpha2_role_assignments_are_immutable",
        run: Alpha2RunRecordSchema.parse({
          ...existing,
          supportingRoles: ["research_source"],
        }),
      },
      {
        expectedError: "alpha2_principal_assignments_are_immutable",
        run: Alpha2RunRecordSchema.parse({
          ...existing,
          primaryActor: {
            actorId: "worker-mutated",
            roleId: existing.primaryRole,
          },
        }),
      },
    ];

    for (const mutation of mutations) {
      await expect(
        ledger.compareAndSwap({ run: mutation.run, expectedVersion: 0 }),
      ).rejects.toThrow(mutation.expectedError);
    }
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects direct compareAndSwap rewrites of creation audit and child lineage", async () => {
    const existing = Alpha2RunRecordSchema.parse({
      ...policyRun(),
      childRunIds: ["run-mongo-policy-child"],
    });
    mongoHarness.setFound(mongoDocument(existing, 0));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({
        run: Alpha2RunRecordSchema.parse({ ...existing, childRunIds: [] }),
        expectedVersion: 0,
      }),
    ).rejects.toThrow("alpha2_child_run_history_conflict");

    await expect(
      ledger.compareAndSwap({
        run: Alpha2RunRecordSchema.parse({
          ...existing,
          createdAt: "2026-08-23T19:00:00.000Z",
        }),
        expectedVersion: 0,
      }),
    ).rejects.toThrow("alpha2_run_created_at_is_immutable");

    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows a normal outcome CAS when execution policy is unchanged", async () => {
    const queued = policyRun();
    const running = transitionAlpha2Run(queued, "running", {
      now: "2026-08-23T20:01:00.000Z",
    });
    const checkpointed = appendAlpha2Checkpoint(running, {
      checkpointId: "cp-mongo-policy-complete",
      createdAt: "2026-08-23T20:02:00.000Z",
      status: "completed",
      evidenceRefs: [],
      safeTraceStepRefs: [],
      artifactRefs: [],
    });
    const completed = transitionAlpha2Run(checkpointed, "completed", {
      now: "2026-08-23T20:02:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(running, 0));
    mongoHarness.setUpdated(mongoDocument(completed, 1));
    const ledger = new Alpha2MongoRunLedger();

    const persisted = await ledger.compareAndSwap({
      run: completed,
      expectedVersion: 0,
      stampCheckpointId: "cp-mongo-policy-complete",
    });

    expect(persisted.version).toBe(1);
    expect(persisted.run.status).toBe("completed");
    expect(persisted.run.riskClass).toBe("red");
    expect(persisted.run.budget).toEqual(running.budget);
    expect(persisted.run.route).toEqual(running.route);
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("rejects direct CAS reuse of an older gate approval for review completion", async () => {
    const queued = policyRun();
    const gated = transitionAlpha2Run(queued, "human_gate", {
      now: "2026-08-23T20:00:30.000Z",
      humanGate: {
        state: "pending",
        reason: "approve entering review",
        gateRef: "gate:enter-review",
      },
    });
    const reviewed = transitionAlpha2Run(gated, "review", {
      now: "2026-08-23T20:01:00.000Z",
      humanGate: {
        state: "approved",
        reason: "approve entering review",
        gateRef: "gate:enter-review",
        resumeMode: "start_new_attempt",
        decisionRef: "decision:enter-review",
        decidedAt: "2026-08-23T20:00:45.000Z",
      },
    });
    const directCompletion = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "completed",
      updatedAt: "2026-08-23T20:02:00.000Z",
      finishedAt: "2026-08-23T20:02:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(reviewed, 1));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: directCompletion, expectedVersion: 1 }),
    ).rejects.toThrow("alpha2_review_completion_requires_bound_approval");
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects direct CAS review approval by the implementation principal", async () => {
    const primaryActor = {
      actorId: "worker-direct-cas",
      roleId: "engineering_agent" as const,
    };
    const queued = createAlpha2RunRecord({
      runId: "run-mongo-principal-cas",
      idempotencyKey: "idem-run-mongo-principal-cas",
      taskId: "ALPHA2-DIRECT-ENGINEERING-WORKER-01",
      kind: "engineering_slice",
      primaryRole: "engineering_agent",
      supportingRoles: ["review_agent"],
      primaryActor,
      assignedReviewActor: {
        actorId: "reviewer-direct-cas",
        roleId: "review_agent",
      },
      riskClass: "yellow",
      route: { mode: "automatic", capabilityClass: "engineering" },
      now: "2026-09-02T08:00:00.000Z",
    });
    const running = transitionAlpha2Run(queued, "running", {
      now: "2026-09-02T08:01:00.000Z",
    });
    const reviewed = transitionAlpha2Run(running, "review", {
      now: "2026-09-02T08:02:00.000Z",
    });
    const directCompletion = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "completed",
      updatedAt: "2026-09-02T08:03:00.000Z",
      finishedAt: "2026-09-02T08:03:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewCompletionGateRef(reviewed),
        decisionRef: "review:direct-cas-self-approval",
        decidedAt: "2026-09-02T08:03:00.000Z",
        decisionActor: {
          actorId: primaryActor.actorId,
          roleId: "review_agent",
        },
      },
    });
    mongoHarness.setFound(mongoDocument(reviewed, 2));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: directCompletion, expectedVersion: 2 }),
    ).rejects.toThrow("alpha2_review_approval_actor_matches_primary_principal");
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects direct CAS use of a completion approval to resume review", async () => {
    const reviewed = transitionAlpha2Run(policyRun(), "review", {
      now: "2026-08-23T20:01:00.000Z",
    });
    const directResume = Alpha2RunRecordSchema.parse({
      ...reviewed,
      status: "running",
      startedAt: "2026-08-23T20:02:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewCompletionGateRef(reviewed),
        resumeMode: "start_new_attempt",
        decisionRef: "decision:completion-only",
        decidedAt: "2026-08-23T20:02:00.000Z",
      },
    });
    mongoHarness.setFound(mongoDocument(reviewed, 1));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: directResume, expectedVersion: 1 }),
    ).rejects.toThrow("alpha2_review_exit_requires_audited_approval");
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("derives a strictly monotonic server timestamp for every CAS generation", async () => {
    const queued = policyRun();
    const running = transitionAlpha2Run(queued, "running", {
      now: "2026-08-23T20:01:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(queued, 0));
    mongoHarness.setUpdated(mongoDocument(running, 1));
    const ledger = new Alpha2MongoRunLedger();

    await ledger.compareAndSwap({
      run: running,
      expectedVersion: 0,
      initializeWallClock: { maxWallClockMs: 60_000 },
    });

    const update = mongoHarness.Model.findOneAndUpdate.mock.calls[0]?.[1] as Array<{
      $set: Record<string, any>;
    }>;
    const mutationDate = update[0]?.$set.updatedAt;
    expect(mutationDate).toEqual({
      $cond: [
        { $gt: ["$$NOW", "$updatedAt"] },
        "$$NOW",
        {
          $dateAdd: {
            startDate: "$updatedAt",
            unit: "millisecond",
            amount: 1,
          },
        },
      ],
    });
    expect(update[0]?.$set.payload.$mergeObjects[1].updatedAt.$dateToString.date).toEqual(
      mutationDate,
    );
  });

  it("rejects direct CAS changes to startedAt and wallClockDeadlineAt", async () => {
    const queued = policyRun();
    const running = Alpha2RunRecordSchema.parse({
      ...transitionAlpha2Run(queued, "running", {
        now: "2026-08-23T20:01:00.000Z",
      }),
      wallClockDeadlineAt: "2026-08-23T20:02:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(running, 1));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({
        run: Alpha2RunRecordSchema.parse({
          ...running,
          startedAt: "2026-08-23T20:01:30.000Z",
        }),
        expectedVersion: 1,
      }),
    ).rejects.toThrow("alpha2_started_at_is_immutable");

    await expect(
      ledger.compareAndSwap({
        run: Alpha2RunRecordSchema.parse({
          ...running,
          wallClockDeadlineAt: "2026-08-23T20:03:00.000Z",
        }),
        expectedVersion: 1,
      }),
    ).rejects.toThrow("alpha2_wall_clock_deadline_is_immutable");

    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows unchanged wall-clock values through a normal lifecycle CAS", async () => {
    const queued = policyRun();
    const running = Alpha2RunRecordSchema.parse({
      ...transitionAlpha2Run(queued, "running", {
        now: "2026-08-23T20:01:00.000Z",
      }),
      wallClockDeadlineAt: "2026-08-23T20:02:00.000Z",
    });
    const checkpointed = appendAlpha2Checkpoint(running, {
      checkpointId: "cp-wall-clock-values-unchanged",
      createdAt: "2026-08-23T20:01:30.000Z",
      status: "completed",
      evidenceRefs: [],
      safeTraceStepRefs: [],
      artifactRefs: [],
    });
    const completed = transitionAlpha2Run(checkpointed, "completed", {
      now: "2026-08-23T20:01:30.000Z",
    });
    mongoHarness.setFound(mongoDocument(running, 1));
    mongoHarness.setUpdated(mongoDocument(completed, 2));
    const ledger = new Alpha2MongoRunLedger();

    const persisted = await ledger.compareAndSwap({
      run: completed,
      expectedVersion: 1,
      stampCheckpointId: "cp-wall-clock-values-unchanged",
    });

    expect(persisted.run.startedAt).toBe(running.startedAt);
    expect(persisted.run.wallClockDeadlineAt).toBe(running.wallClockDeadlineAt);
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("initializes wall-clock timestamps only through the server-owned transition", async () => {
    const queued = policyRun();
    const running = transitionAlpha2Run(queued, "running", {
      now: "2026-08-23T20:01:00.000Z",
    });
    const serverOwned = Alpha2RunRecordSchema.parse({
      ...running,
      startedAt: "2026-08-23T20:01:05.000Z",
      wallClockDeadlineAt: "2026-08-23T20:02:05.000Z",
    });
    mongoHarness.setFound(mongoDocument(queued, 0));
    mongoHarness.setUpdated(mongoDocument(serverOwned, 1));
    const ledger = new Alpha2MongoRunLedger();

    const persisted = await ledger.compareAndSwap({
      run: running,
      expectedVersion: 0,
      initializeWallClock: { maxWallClockMs: 60_000 },
    });

    expect(persisted.run.startedAt).toBe("2026-08-23T20:01:05.000Z");
    expect(persisted.run.wallClockDeadlineAt).toBe("2026-08-23T20:02:05.000Z");
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("rejects wall-clock initialization that exceeds the immutable run budget", async () => {
    const queued = policyRun();
    const running = transitionAlpha2Run(queued, "running", {
      now: "2026-08-23T20:01:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(queued, 0));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({
        run: running,
        expectedVersion: 0,
        initializeWallClock: { maxWallClockMs: 120_000 },
      }),
    ).rejects.toThrow("alpha2_wall_clock_budget_mismatch");
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("preserves the approved first-attempt lifecycle while deriving its budget server-side", async () => {
    const queued = policyRun();
    const gated = transitionAlpha2Run(queued, "human_gate", {
      now: "2026-08-23T20:00:30.000Z",
      humanGate: {
        state: "pending",
        reason: "initial_approval_required",
        resumeMode: "start_new_attempt",
      },
    });
    const approved = transitionAlpha2Run(gated, "running", {
      now: "2026-08-23T20:01:00.000Z",
      humanGate: {
        state: "approved",
        reason: gated.humanGate.reason,
        resumeMode: "start_new_attempt",
        decisionRef: "human:approved-first-attempt",
        decidedAt: "2026-08-23T20:01:00.000Z",
      },
    });
    const consumed = consumeAlpha2HumanResumeApproval(approved, {
      now: "2026-08-23T20:01:05.000Z",
    });
    const serverOwned = Alpha2RunRecordSchema.parse({
      ...consumed,
      startedAt: "2026-08-23T20:01:10.000Z",
      wallClockDeadlineAt: "2026-08-23T20:02:10.000Z",
    });
    mongoHarness.setFound(mongoDocument(approved, 1));
    mongoHarness.setUpdated(mongoDocument(serverOwned, 2));
    const ledger = new Alpha2MongoRunLedger();

    const persisted = await ledger.compareAndSwap({
      run: consumed,
      expectedVersion: 1,
      initializeWallClock: { maxWallClockMs: 60_000 },
    });

    expect(persisted.run.attempt).toBe(1);
    expect(persisted.run.humanGate.state).toBe("not_required");
    expect(persisted.run.startedAt).toBe("2026-08-23T20:01:10.000Z");
    expect(persisted.run.wallClockDeadlineAt).toBe("2026-08-23T20:02:10.000Z");
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("does not allow a started run to rebase or extend its wall-clock budget", async () => {
    const queued = policyRun();
    const running = Alpha2RunRecordSchema.parse({
      ...transitionAlpha2Run(queued, "running", {
        now: "2026-08-23T20:01:00.000Z",
      }),
      wallClockDeadlineAt: "2026-08-23T20:02:00.000Z",
    });
    mongoHarness.setFound(mongoDocument(running, 1));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({
        run: running,
        expectedVersion: 1,
        initializeWallClock: { maxWallClockMs: 60_000 },
      }),
    ).rejects.toThrow("alpha2_started_at_is_immutable");
    expect(mongoHarness.Model.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
