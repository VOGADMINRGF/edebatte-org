import { describe, expect, it, vi } from "vitest";

import {
  ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS,
  executeAlpha2OrchestratorCycle,
  planAlpha2OrchestratorCycle,
  type Alpha2OrchestratorTaskPolicy,
} from "@/features/agenticRuntime/alpha2OrchestratorLoop";

function openTasks(rows: string[]) {
  return [
    "# OpenTasks",
    "",
    "## Kanonischer Operativteil",
    "",
    "| ID | Status | Priority | Dependencies | Scope | Acceptance |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Historischer Katalog und Evidenz",
    "",
    "| ID | Status | Priority | Dependencies | Scope | Acceptance |",
    "| --- | --- | --- | --- | --- | --- |",
    "| OLD-HISTORICAL | codex_ready | P0 | - | history | never dispatch |",
  ].join("\n");
}

function row(
  id: string,
  status: "blocked" | "codex_ready" | "in_progress" | "review" | "manual_gate" | "done",
  priority = "P1",
) {
  return `| ${id} | ${status} | ${priority} | dep | scope | acceptance |`;
}

function automaticPolicy(overrides: Partial<Alpha2OrchestratorTaskPolicy> = {}) {
  return {
    capabilityRef: "engineering.repo_change",
    roleId: "engineering",
    actionKind: "read_only" as const,
    riskClass: "green" as const,
    confidence: "high" as const,
    reversible: true,
    evidenceRefs: ["evidence:task"],
    ...overrides,
  };
}

describe("Alpha2 orchestrator loop", () => {
  it("selects only canonical automatic work, prioritizes P0 and reuses an existing owner", () => {
    const text = openTasks([
      row("P1-NEW", "codex_ready", "P1"),
      row("P0-NEW", "codex_ready", "P0"),
      row("P0-OWNED", "in_progress", "P0"),
      row("REVIEW", "review", "P0"),
      row("MANUAL", "manual_gate", "P0"),
    ]);

    const ids = ["P1-NEW", "P0-NEW", "P0-OWNED", "REVIEW", "MANUAL"];
    const taskPolicyByTaskId = Object.fromEntries(ids.map((id) => [id, automaticPolicy()]));
    const dependenciesSatisfiedByTaskId = Object.fromEntries(ids.map((id) => [id, true]));

    const plan = planAlpha2OrchestratorCycle({
      openTasksText: text,
      ownershipByTaskId: {
        "P0-OWNED": {
          branch: "feat/p0-owned",
          exactHead: true,
          ciState: "success",
          unresolvedReviewThreads: 0,
        },
      },
      taskPolicyByTaskId,
      dependenciesSatisfiedByTaskId,
      activeWorkerCount: 0,
      maxParallelWorkers: 2,
    });

    expect(plan.decision).toBe("dispatch_candidates");
    expect(plan.candidates.map((candidate) => candidate.task.id)).toEqual([
      "P0-OWNED",
      "P0-NEW",
    ]);
    expect(plan.candidates[0]).toMatchObject({
      mode: "continue_owner",
      requiresOwnerProvisioning: false,
      requiresAtomicClaim: false,
    });
    expect(plan.candidates[1]).toMatchObject({
      mode: "new_slice",
      requiresOwnerProvisioning: true,
      requiresAtomicClaim: true,
    });
    expect(plan.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskId: "REVIEW" }),
        expect.objectContaining({ taskId: "MANUAL" }),
      ]),
    );
    expect(plan.candidates.map((candidate) => candidate.task.id)).not.toContain("OLD-HISTORICAL");
  });

  it("never exceeds three tasks or remaining worker capacity", () => {
    const ids = ["A", "B", "C", "D", "E"];
    const plan = planAlpha2OrchestratorCycle({
      openTasksText: openTasks(ids.map((id) => row(id, "codex_ready", "P0"))),
      taskPolicyByTaskId: Object.fromEntries(ids.map((id) => [id, automaticPolicy()])),
      dependenciesSatisfiedByTaskId: Object.fromEntries(ids.map((id) => [id, true])),
      activeWorkerCount: 1,
      maxParallelWorkers: 4,
      maxTasksPerCycle: 99,
    });

    expect(plan.maxTasksPerCycle).toBe(3);
    expect(plan.availableSlots).toBe(3);
    expect(plan.candidates).toHaveLength(3);
    expect(ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS.workerTaskLimit).toBe(3);
  });

  it("fails closed when dependencies, task policy or action gate do not permit automation", () => {
    const text = openTasks([
      row("NO-DEPS", "codex_ready", "P0"),
      row("NO-POLICY", "codex_ready", "P0"),
      row("MERGE", "codex_ready", "P0"),
    ]);

    const plan = planAlpha2OrchestratorCycle({
      openTasksText: text,
      taskPolicyByTaskId: {
        "NO-DEPS": automaticPolicy(),
        MERGE: automaticPolicy({ actionKind: "merge_code" }),
      },
      dependenciesSatisfiedByTaskId: {
        "NO-DEPS": false,
        "NO-POLICY": true,
        MERGE: true,
      },
      activeWorkerCount: 0,
      maxParallelWorkers: 3,
    });

    expect(plan.decision).toBe("idle");
    expect(plan.candidates).toEqual([]);
    expect(plan.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ taskId: "NO-DEPS", reasonCodes: ["dependencies_not_satisfied"] }),
        expect.objectContaining({ taskId: "NO-POLICY", reasonCodes: ["task_policy_missing"] }),
        expect.objectContaining({
          taskId: "MERGE",
          reasonCodes: expect.arrayContaining(["human_sovereignty:merge_code", "action_gate:human_only"]),
        }),
      ]),
    );
  });

  it("does not select work when worker capacity is exhausted", () => {
    const plan = planAlpha2OrchestratorCycle({
      openTasksText: openTasks([row("READY", "codex_ready", "P0")]),
      taskPolicyByTaskId: { READY: automaticPolicy() },
      dependenciesSatisfiedByTaskId: { READY: true },
      activeWorkerCount: 2,
      maxParallelWorkers: 2,
    });

    expect(plan).toMatchObject({
      decision: "capacity_blocked",
      availableSlots: 0,
      candidates: [],
      reasonCodes: ["worker_capacity_exhausted"],
    });
  });

  it("requires exact-head owner and atomic claim before persisting or dispatching a new slice", async () => {
    const plan = planAlpha2OrchestratorCycle({
      openTasksText: openTasks([row("READY", "codex_ready", "P0")]),
      taskPolicyByTaskId: { READY: automaticPolicy() },
      dependenciesSatisfiedByTaskId: { READY: true },
      activeWorkerCount: 0,
      maxParallelWorkers: 1,
    });
    const persistRun = vi.fn();
    const dispatchRun = vi.fn();

    const noOwner = await executeAlpha2OrchestratorCycle({
      plan,
      adapters: {
        ensureOwner: vi.fn(async () => null),
        claimTask: vi.fn(),
        persistRun,
        dispatchRun,
      },
    });
    expect(noOwner[0]?.decision).toBe("owner_unavailable");
    expect(persistRun).not.toHaveBeenCalled();
    expect(dispatchRun).not.toHaveBeenCalled();

    const claimBlocked = await executeAlpha2OrchestratorCycle({
      plan,
      adapters: {
        ensureOwner: vi.fn(async () => ({ branch: "feat/ready", exactHead: true as const })),
        claimTask: vi.fn(async () => ({
          applied: false,
          status: "review" as const,
          evidenceRef: "claim:review",
        })),
        persistRun,
        dispatchRun,
      },
    });
    expect(claimBlocked[0]?.decision).toBe("claim_blocked");
    expect(persistRun).not.toHaveBeenCalled();
    expect(dispatchRun).not.toHaveBeenCalled();
  });

  it("persists the durable run before dispatch and stops if persistence fails", async () => {
    const plan = planAlpha2OrchestratorCycle({
      openTasksText: openTasks([row("READY", "codex_ready", "P0")]),
      taskPolicyByTaskId: { READY: automaticPolicy() },
      dependenciesSatisfiedByTaskId: { READY: true },
      activeWorkerCount: 0,
      maxParallelWorkers: 1,
    });
    const order: string[] = [];

    const failed = await executeAlpha2OrchestratorCycle({
      plan,
      adapters: {
        ensureOwner: vi.fn(async () => ({ branch: "feat/ready", exactHead: true as const })),
        claimTask: vi.fn(async () => ({
          applied: true,
          status: "in_progress" as const,
          evidenceRef: "claim:ready",
        })),
        persistRun: vi.fn(async () => {
          order.push("persist");
          return null;
        }),
        dispatchRun: vi.fn(async () => {
          order.push("dispatch");
          return true;
        }),
      },
    });
    expect(failed[0]?.decision).toBe("persistence_failed");
    expect(order).toEqual(["persist"]);

    order.length = 0;
    const success = await executeAlpha2OrchestratorCycle({
      plan,
      adapters: {
        ensureOwner: vi.fn(async () => ({ branch: "feat/ready", exactHead: true as const })),
        claimTask: vi.fn(async () => ({
          applied: true,
          status: "in_progress" as const,
          evidenceRef: "claim:ready",
        })),
        persistRun: vi.fn(async (draft) => {
          order.push("persist");
          return { runId: "run:ready:1", taskId: draft.taskId, persisted: true as const };
        }),
        dispatchRun: vi.fn(async () => {
          order.push("dispatch");
          return true;
        }),
      },
    });
    expect(success[0]).toMatchObject({ decision: "dispatched", runId: "run:ready:1" });
    expect(order).toEqual(["persist", "dispatch"]);
  });

  it("keeps human sovereignty and existing authority boundaries explicit", () => {
    expect(ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS).toEqual({
      secondTaskTruthAllowed: false,
      secondQueueAllowed: false,
      secondRunLedgerAllowed: false,
      directOpenTasksMutationAllowed: false,
      directGitHubMutationAllowed: false,
      dispatchBeforePersistenceAllowed: false,
      reviewBypassAllowed: false,
      humanGateDowngradeAllowed: false,
      autoMergeAllowed: false,
      autoDeployAllowed: false,
      autoPublishAllowed: false,
      workerTaskLimit: 3,
    });
  });
});
