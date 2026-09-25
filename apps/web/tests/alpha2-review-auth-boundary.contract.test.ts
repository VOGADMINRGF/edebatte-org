import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Alpha2RunRecordSchema,
  alpha2ReviewCompletionGateRef,
  alpha2ReviewResumeGateRef,
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

function engineeringReviewRun() {
  const primaryActor = {
    actorId: "worker-review-boundary",
    roleId: "engineering_agent" as const,
  };
  const assignedReviewActor = {
    actorId: "reviewer-review-boundary",
    roleId: "review_agent" as const,
  };
  const queued = createAlpha2RunRecord({
    runId: "run-review-boundary",
    idempotencyKey: "idem-run-review-boundary",
    taskId: "ALPHA2-DIRECT-ENGINEERING-WORKER-01",
    kind: "engineering_slice",
    primaryRole: "engineering_agent",
    supportingRoles: ["review_agent"],
    primaryActor,
    assignedReviewActor,
    riskClass: "yellow",
    route: { mode: "automatic", capabilityClass: "engineering" },
    now: "2026-09-02T20:00:00.000Z",
  });
  const running = transitionAlpha2Run(queued, "running", {
    now: "2026-09-02T20:01:00.000Z",
  });
  const reviewed = transitionAlpha2Run(running, "review", {
    now: "2026-09-02T20:02:00.000Z",
  });
  return { primaryActor, assignedReviewActor, queued, running, reviewed };
}

describe("Alpha2 authenticated review persistence boundary", () => {
  beforeEach(() => {
    mongoHarness.Model.findOne.mockClear();
    mongoHarness.Model.findOneAndUpdate.mockClear();
    mongoHarness.Model.create.mockClear();
    mongoHarness.setFound(null);
    mongoHarness.setUpdated(null);
  });

  it("rejects a fresh queued run carrying a fabricated decided gate", async () => {
    const { queued, assignedReviewActor } = engineeringReviewRun();
    const forged = Alpha2RunRecordSchema.parse({
      ...queued,
      humanGate: {
        state: "approved",
        decisionRef: "forged:initial-approval",
        decidedAt: "2026-09-02T20:00:00.000Z",
        decisionActor: assignedReviewActor,
      },
    });
    const ledger = new Alpha2MongoRunLedger();

    await expect(ledger.createOrGet(forged)).rejects.toThrow(
      "alpha2_invalid_initial_queued_human_gate",
    );
    expect(mongoHarness.Model.create).not.toHaveBeenCalled();
  });

  it("rejects decision metadata on a fresh canonical pending human gate", async () => {
    const primaryActor = {
      actorId: "worker-initial-gate",
      roleId: "engineering_agent" as const,
    };
    const assignedReviewActor = {
      actorId: "reviewer-initial-gate",
      roleId: "review_agent" as const,
    };
    const gated = createAlpha2RunRecord({
      runId: "run-initial-gate",
      idempotencyKey: "idem-run-initial-gate",
      taskId: "ALPHA2-DIRECT-ENGINEERING-WORKER-01",
      kind: "engineering_slice",
      primaryRole: "engineering_agent",
      supportingRoles: ["review_agent"],
      primaryActor,
      assignedReviewActor,
      riskClass: "yellow",
      route: { mode: "automatic", capabilityClass: "engineering" },
      humanGate: {
        state: "pending",
        reason: "initial authorization",
        resumeMode: "start_new_attempt",
      },
      now: "2026-09-02T20:00:00.000Z",
    });
    const forged = Alpha2RunRecordSchema.parse({
      ...gated,
      humanGate: {
        ...gated.humanGate,
        decisionRef: "forged:pending-decision",
        decidedAt: "2026-09-02T20:00:00.000Z",
        decisionActor: assignedReviewActor,
      },
    });
    const ledger = new Alpha2MongoRunLedger();

    await expect(ledger.createOrGet(forged)).rejects.toThrow(
      "alpha2_invalid_initial_pending_human_gate",
    );
    expect(mongoHarness.Model.create).not.toHaveBeenCalled();
  });

  it("requires an authenticated assigned reviewer for review completion CAS", async () => {
    const { primaryActor, assignedReviewActor, reviewed } = engineeringReviewRun();
    const completed = transitionAlpha2Run(reviewed, "completed", {
      now: "2026-09-02T20:03:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewCompletionGateRef(reviewed),
        decisionRef: "review:completion",
        decidedAt: "2026-09-02T20:03:00.000Z",
        decisionActor: assignedReviewActor,
      },
    });
    mongoHarness.setFound(mongoDocument(reviewed, 2));
    mongoHarness.setUpdated(mongoDocument(completed, 3));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: completed, expectedVersion: 2 }),
    ).rejects.toThrow("alpha2_review_cas_requires_authenticated_actor");

    await expect(
      ledger.compareAndSwap({
        run: completed,
        expectedVersion: 2,
        authenticatedActor: {
          actorId: primaryActor.actorId,
          roleId: "review_agent",
        },
      }),
    ).rejects.toThrow("alpha2_review_cas_actor_matches_primary_principal");

    await expect(
      ledger.compareAndSwap({
        run: completed,
        expectedVersion: 2,
        authenticatedActor: {
          actorId: "reviewer-unassigned",
          roleId: "review_agent",
        },
      }),
    ).rejects.toThrow("alpha2_review_cas_actor_not_assigned");

    const persisted = await ledger.compareAndSwap({
      run: completed,
      expectedVersion: 2,
      authenticatedActor: assignedReviewActor,
    });
    expect(persisted.run.status).toBe("completed");
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("requires the same authenticated assigned reviewer for review resume CAS", async () => {
    const { assignedReviewActor, reviewed } = engineeringReviewRun();
    const resumed = transitionAlpha2Run(reviewed, "running", {
      now: "2026-09-02T20:03:00.000Z",
      humanGate: {
        state: "approved",
        gateRef: alpha2ReviewResumeGateRef(reviewed),
        resumeMode: "resume_attempt",
        decisionRef: "review:resume",
        decidedAt: "2026-09-02T20:03:00.000Z",
        decisionActor: assignedReviewActor,
      },
    });
    mongoHarness.setFound(mongoDocument(reviewed, 2));
    mongoHarness.setUpdated(mongoDocument(resumed, 3));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: resumed, expectedVersion: 2 }),
    ).rejects.toThrow("alpha2_review_cas_requires_authenticated_actor");

    const persisted = await ledger.compareAndSwap({
      run: resumed,
      expectedVersion: 2,
      authenticatedActor: assignedReviewActor,
    });
    expect(persisted.run.status).toBe("running");
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it("requires the assigned reviewer to authenticate review escalation into a human gate", async () => {
    const { primaryActor, assignedReviewActor, reviewed } = engineeringReviewRun();
    const escalated = transitionAlpha2Run(reviewed, "human_gate", {
      now: "2026-09-02T20:03:00.000Z",
      humanGate: {
        state: "pending",
        reason: "reviewer requests human decision",
        gateRef: "review:human-escalation",
        resumeMode: "resume_attempt",
      },
    });
    mongoHarness.setFound(mongoDocument(reviewed, 2));
    mongoHarness.setUpdated(mongoDocument(escalated, 3));
    const ledger = new Alpha2MongoRunLedger();

    await expect(
      ledger.compareAndSwap({ run: escalated, expectedVersion: 2 }),
    ).rejects.toThrow("alpha2_review_cas_requires_authenticated_actor");

    await expect(
      ledger.compareAndSwap({
        run: escalated,
        expectedVersion: 2,
        authenticatedActor: {
          actorId: primaryActor.actorId,
          roleId: "review_agent",
        },
      }),
    ).rejects.toThrow("alpha2_review_cas_actor_matches_primary_principal");

    const persisted = await ledger.compareAndSwap({
      run: escalated,
      expectedVersion: 2,
      authenticatedActor: assignedReviewActor,
    });
    expect(persisted.run.status).toBe("human_gate");
    expect(persisted.run.humanGate.state).toBe("pending");
    expect(mongoHarness.Model.findOneAndUpdate).toHaveBeenCalledOnce();
  });
});
