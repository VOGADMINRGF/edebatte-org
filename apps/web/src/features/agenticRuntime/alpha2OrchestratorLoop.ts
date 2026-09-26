import {
  evaluateAlpha2TaskEligibility,
  parseAlpha2CanonicalOpenTasks,
  type Alpha2OpenTaskRecord,
  type Alpha2TaskOwnershipEvidence,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";
import {
  resolveAlpha2ActionGate,
  type Alpha2ActionGateInput,
} from "@/features/agenticRuntime/alpha2RiskGateContract";

export const ALPHA2_ORCHESTRATOR_LOOP_SCHEMA_VERSION = 1 as const;
export const ALPHA2_ORCHESTRATOR_MAX_TASKS_PER_CYCLE = 3 as const;

export const ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS = {
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
  workerTaskLimit: ALPHA2_ORCHESTRATOR_MAX_TASKS_PER_CYCLE,
} as const;

export type Alpha2OrchestratorTaskPolicy = Alpha2ActionGateInput & {
  capabilityRef: string;
  roleId: string;
};

export type Alpha2OrchestratorCycleInput = {
  openTasksText: string;
  ownershipByTaskId?: Record<string, Alpha2TaskOwnershipEvidence | undefined>;
  taskPolicyByTaskId?: Record<string, Alpha2OrchestratorTaskPolicy | undefined>;
  dependenciesSatisfiedByTaskId?: Record<string, boolean | undefined>;
  activeWorkerCount: number;
  maxParallelWorkers: number;
  maxTasksPerCycle?: number;
};

export type Alpha2OrchestratorCandidate = {
  task: Alpha2OpenTaskRecord;
  ownership: Alpha2TaskOwnershipEvidence;
  policy: Alpha2OrchestratorTaskPolicy;
  mode: "new_slice" | "continue_owner";
  requiresOwnerProvisioning: boolean;
  requiresAtomicClaim: boolean;
  actionGateDecision: "automatic";
  reasonCodes: string[];
};

export type Alpha2OrchestratorCyclePlan = {
  schemaVersion: typeof ALPHA2_ORCHESTRATOR_LOOP_SCHEMA_VERSION;
  decision: "dispatch_candidates" | "idle" | "capacity_blocked";
  availableSlots: number;
  maxTasksPerCycle: number;
  candidates: Alpha2OrchestratorCandidate[];
  blocked: Array<{ taskId: string; reasonCodes: string[] }>;
  reasonCodes: string[];
  guardrails: typeof ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS;
};

export type Alpha2OrchestratorOwner = {
  branch: string;
  prNumber?: number | null;
  exactHead: true;
};

export type Alpha2OrchestratorClaimReceipt = {
  applied: boolean;
  status: "in_progress" | "review" | "manual_gate" | "blocked";
  evidenceRef: string;
};

export type Alpha2OrchestratorRunDraft = {
  taskId: string;
  capabilityRef: string;
  roleId: string;
  owner: Alpha2OrchestratorOwner;
  evidenceRefs: string[];
};

export type Alpha2OrchestratorPersistedRun = {
  runId: string;
  taskId: string;
  persisted: true;
};

export type Alpha2OrchestratorRuntimeAdapters = {
  /** Existing GitHub owner/bootstrap boundary. No direct GitHub mutation lives in this module. */
  ensureOwner(candidate: Alpha2OrchestratorCandidate): Promise<Alpha2OrchestratorOwner | null>;
  /** Existing OpenTasks single-writer/CAS boundary. */
  claimTask(input: {
    candidate: Alpha2OrchestratorCandidate;
    owner: Alpha2OrchestratorOwner;
  }): Promise<Alpha2OrchestratorClaimReceipt>;
  /** Existing durable run ledger. Must succeed before dispatch. */
  persistRun(draft: Alpha2OrchestratorRunDraft): Promise<Alpha2OrchestratorPersistedRun | null>;
  /** Existing Alpha2/BullMQ dispatch boundary. */
  dispatchRun(run: Alpha2OrchestratorPersistedRun): Promise<boolean>;
};

export type Alpha2OrchestratorExecutionReceipt = {
  taskId: string;
  decision:
    | "dispatched"
    | "owner_unavailable"
    | "claim_blocked"
    | "persistence_failed"
    | "dispatch_failed";
  runId?: string;
  evidenceRefs: string[];
};

function normalizePriority(priority: string) {
  const match = priority.trim().toUpperCase().match(/^P([0-9]+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function boundedTaskLimit(requested: number | undefined) {
  if (!Number.isFinite(requested)) return ALPHA2_ORCHESTRATOR_MAX_TASKS_PER_CYCLE;
  return Math.max(
    1,
    Math.min(ALPHA2_ORCHESTRATOR_MAX_TASKS_PER_CYCLE, Math.floor(requested as number)),
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}

/**
 * Pure selection step for the organization loop.
 * OpenTasks remains the only task truth; GitHub ownership is evidence, not a second queue.
 */
export function planAlpha2OrchestratorCycle(
  input: Alpha2OrchestratorCycleInput,
): Alpha2OrchestratorCyclePlan {
  const maxTasksPerCycle = boundedTaskLimit(input.maxTasksPerCycle);
  const maxParallelWorkers = Math.max(0, Math.floor(input.maxParallelWorkers));
  const activeWorkerCount = Math.max(0, Math.floor(input.activeWorkerCount));
  const availableSlots = Math.max(
    0,
    Math.min(maxTasksPerCycle, maxParallelWorkers - activeWorkerCount),
  );
  const blocked: Alpha2OrchestratorCyclePlan["blocked"] = [];

  if (availableSlots === 0) {
    return {
      schemaVersion: ALPHA2_ORCHESTRATOR_LOOP_SCHEMA_VERSION,
      decision: "capacity_blocked",
      availableSlots,
      maxTasksPerCycle,
      candidates: [],
      blocked,
      reasonCodes: ["worker_capacity_exhausted"],
      guardrails: ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS,
    };
  }

  const candidates: Alpha2OrchestratorCandidate[] = [];
  for (const task of parseAlpha2CanonicalOpenTasks(input.openTasksText)) {
    const ownership = input.ownershipByTaskId?.[task.id] ?? {};
    const eligibility = evaluateAlpha2TaskEligibility({ task, ownership });
    if (!eligibility.newSliceEligible && !eligibility.continuationEligible) {
      if (eligibility.requiresHumanDecision) {
        blocked.push({ taskId: task.id, reasonCodes: eligibility.reasonCodes });
      }
      continue;
    }

    const reasons: string[] = [];
    if (input.dependenciesSatisfiedByTaskId?.[task.id] !== true) {
      reasons.push("dependencies_not_satisfied");
    }

    const policy = input.taskPolicyByTaskId?.[task.id];
    if (!policy) {
      reasons.push("task_policy_missing");
    }

    let actionGateDecision: "automatic" | null = null;
    if (policy) {
      const gate = resolveAlpha2ActionGate(policy);
      if (gate.decision !== "automatic" || !gate.autoExecutionAllowed) {
        reasons.push(...gate.reasonCodes, `action_gate:${gate.decision}`);
      } else {
        actionGateDecision = "automatic";
      }
    }

    if (reasons.length > 0 || !policy || !actionGateDecision) {
      blocked.push({ taskId: task.id, reasonCodes: unique(reasons) });
      continue;
    }

    candidates.push({
      task,
      ownership,
      policy,
      mode: eligibility.continuationEligible ? "continue_owner" : "new_slice",
      requiresOwnerProvisioning: !Boolean(ownership.branch),
      requiresAtomicClaim: task.status === "codex_ready",
      actionGateDecision,
      reasonCodes: eligibility.reasonCodes,
    });
  }

  candidates.sort((a, b) => {
    const priorityDelta = normalizePriority(a.task.priority) - normalizePriority(b.task.priority);
    if (priorityDelta !== 0) return priorityDelta;
    // Finish an already owned bounded slice before opening another owner at the same priority.
    if (a.mode !== b.mode) return a.mode === "continue_owner" ? -1 : 1;
    return a.task.id.localeCompare(b.task.id);
  });

  const selected = candidates.slice(0, availableSlots);
  return {
    schemaVersion: ALPHA2_ORCHESTRATOR_LOOP_SCHEMA_VERSION,
    decision: selected.length > 0 ? "dispatch_candidates" : "idle",
    availableSlots,
    maxTasksPerCycle,
    candidates: selected,
    blocked,
    reasonCodes: selected.length > 0 ? ["bounded_candidates_selected"] : ["no_automatic_candidate"],
    guardrails: ALPHA2_ORCHESTRATOR_LOOP_GUARDRAILS,
  };
}

/**
 * Thin execution bridge. It deliberately owns no GitHub client, queue or ledger.
 * Every mutation/dispatch crosses an injected existing authority.
 */
export async function executeAlpha2OrchestratorCycle(input: {
  plan: Alpha2OrchestratorCyclePlan;
  adapters: Alpha2OrchestratorRuntimeAdapters;
}): Promise<Alpha2OrchestratorExecutionReceipt[]> {
  const receipts: Alpha2OrchestratorExecutionReceipt[] = [];

  for (const candidate of input.plan.candidates) {
    const owner = await input.adapters.ensureOwner(candidate);
    if (!owner?.branch || owner.exactHead !== true) {
      receipts.push({
        taskId: candidate.task.id,
        decision: "owner_unavailable",
        evidenceRefs: candidate.policy.evidenceRefs,
      });
      continue;
    }

    const claim = candidate.requiresAtomicClaim
      ? await input.adapters.claimTask({ candidate, owner })
      : ({
          applied: true,
          status: "in_progress",
          evidenceRef: "existing_in_progress_claim",
        } satisfies Alpha2OrchestratorClaimReceipt);

    if (!claim.applied || claim.status !== "in_progress") {
      receipts.push({
        taskId: candidate.task.id,
        decision: "claim_blocked",
        evidenceRefs: unique([...candidate.policy.evidenceRefs, claim.evidenceRef]),
      });
      continue;
    }

    const draft: Alpha2OrchestratorRunDraft = {
      taskId: candidate.task.id,
      capabilityRef: candidate.policy.capabilityRef,
      roleId: candidate.policy.roleId,
      owner,
      evidenceRefs: unique([...candidate.policy.evidenceRefs, claim.evidenceRef]),
    };
    const persisted = await input.adapters.persistRun(draft);
    if (!persisted?.persisted) {
      receipts.push({
        taskId: candidate.task.id,
        decision: "persistence_failed",
        evidenceRefs: draft.evidenceRefs,
      });
      continue;
    }

    const dispatched = await input.adapters.dispatchRun(persisted);
    receipts.push({
      taskId: candidate.task.id,
      decision: dispatched ? "dispatched" : "dispatch_failed",
      runId: persisted.runId,
      evidenceRefs: draft.evidenceRefs,
    });
  }

  return receipts;
}
