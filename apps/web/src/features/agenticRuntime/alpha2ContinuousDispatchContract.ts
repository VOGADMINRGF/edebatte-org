import type {
  Alpha2ActionGateInput,
  Alpha2ActionGateResult,
} from "@/features/agenticRuntime/alpha2RiskGateContract";
import { resolveAlpha2ActionGate } from "@/features/agenticRuntime/alpha2RiskGateContract";
import type {
  Alpha2OpenTaskRecord,
  Alpha2TaskEligibility,
  Alpha2TaskOwnershipEvidence,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";
import { evaluateAlpha2TaskEligibility } from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";
import type { Alpha2RunRecord } from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export const ALPHA2_CONTINUATION_CURSOR_PREFIX = "alpha2_continuation_v2";

export const ALPHA2_CONTINUOUS_DISPATCH_GUARDRAILS = {
  secondTaskTruthAllowed: false,
  secondQueueAllowed: false,
  secondRunLedgerAllowed: false,
  directOpenTasksMutationAllowed: false,
  dispatchBeforeParentReservationAllowed: false,
  dispatchBeforeChildPersistenceAllowed: false,
  humanGateBypassAllowed: false,
  autoMergeAllowed: false,
  autoDeployAllowed: false,
  autoPublishAllowed: false,
  spendingAllowed: false,
  contractsAllowed: false,
  rightsMutationAllowed: false,
  secretMutationAllowed: false,
} as const;

export type Alpha2ContinuationPlan =
  | {
      state: "continue";
      nextRun: Alpha2RunRecord;
      task: Alpha2OpenTaskRecord;
      ownership?: Alpha2TaskOwnershipEvidence;
      action: Alpha2ActionGateInput;
    }
  | { state: "idle"; reason: string }
  | { state: "complete"; reason?: string };

export interface Alpha2ContinuationPlanner {
  plan(input: {
    completedRun: Alpha2RunRecord;
    now: string;
  }): Promise<Alpha2ContinuationPlan> | Alpha2ContinuationPlan;
}

export type Alpha2ContinuationClaimReceipt = {
  applied: boolean;
  status: "in_progress" | "review" | "manual_gate" | "blocked";
  evidenceRef: string;
};

/**
 * Adapter to the already-canonical OpenTasks single-writer/CAS boundary.
 * This module never edits OpenTasks directly.
 */
export interface Alpha2ContinuationTaskClaimer {
  claim(input: {
    task: Alpha2OpenTaskRecord;
    ownership?: Alpha2TaskOwnershipEvidence;
    nextRun: Alpha2RunRecord;
  }): Promise<Alpha2ContinuationClaimReceipt>;
}

export type Alpha2ContinuationAssessment =
  | {
      state: "automatic";
      plan: Extract<Alpha2ContinuationPlan, { state: "continue" }>;
      eligibility: Alpha2TaskEligibility;
      actionGate: Alpha2ActionGateResult;
      requiresAtomicClaim: boolean;
    }
  | {
      state: "human_gate";
      plan: Extract<Alpha2ContinuationPlan, { state: "continue" }>;
      eligibility: Alpha2TaskEligibility;
      actionGate: Alpha2ActionGateResult;
      reason: string;
      requiresAtomicClaim: boolean;
    }
  | {
      state: "idle";
      reason: string;
      eligibility?: Alpha2TaskEligibility;
      actionGate?: Alpha2ActionGateResult;
    }
  | { state: "complete"; reason?: string };

function joinedReason(parts: readonly string[]) {
  return [...new Set(parts.filter(Boolean))].join(",");
}

export function assessAlpha2Continuation(input: {
  completedRun: Alpha2RunRecord;
  plan: Alpha2ContinuationPlan;
}): Alpha2ContinuationAssessment {
  if (input.plan.state === "idle") return { state: "idle", reason: input.plan.reason };
  if (input.plan.state === "complete") return { state: "complete", reason: input.plan.reason };

  const plan = input.plan;
  if (plan.nextRun.taskId !== plan.task.id) {
    return { state: "idle", reason: "alpha2_continuation_task_identity_mismatch" };
  }
  if (plan.nextRun.parentRunId !== input.completedRun.runId) {
    return { state: "idle", reason: "alpha2_continuation_parent_mismatch" };
  }
  if (plan.nextRun.rootRunId !== input.completedRun.rootRunId) {
    return { state: "idle", reason: "alpha2_continuation_root_mismatch" };
  }
  if (plan.nextRun.status !== "queued" || plan.nextRun.humanGate.state === "pending") {
    return { state: "idle", reason: "alpha2_continuation_next_run_must_be_queued" };
  }
  if (plan.action.riskClass !== plan.nextRun.riskClass) {
    return { state: "idle", reason: "alpha2_continuation_risk_class_mismatch" };
  }

  const eligibility = evaluateAlpha2TaskEligibility({ task: plan.task, ownership: plan.ownership });
  const actionGate = resolveAlpha2ActionGate(plan.action);
  const requiresAtomicClaim = plan.task.status === "codex_ready";

  if (eligibility.requiresHumanDecision || !actionGate.autoExecutionAllowed) {
    return {
      state: "human_gate",
      plan,
      eligibility,
      actionGate,
      reason: joinedReason([...eligibility.reasonCodes, ...actionGate.reasonCodes]),
      requiresAtomicClaim,
    };
  }

  if (!eligibility.newSliceEligible && !eligibility.continuationEligible) {
    return {
      state: "idle",
      reason: joinedReason(eligibility.reasonCodes) || "alpha2_no_eligible_follow_up",
      eligibility,
      actionGate,
    };
  }

  return { state: "automatic", plan, eligibility, actionGate, requiresAtomicClaim };
}

export type Alpha2ContinuationCursor = {
  state: "reserved" | "dispatched" | "human_gate" | "idle" | "complete";
  detail?: string;
};

export function encodeAlpha2ContinuationCursor(cursor: Alpha2ContinuationCursor) {
  return `${ALPHA2_CONTINUATION_CURSOR_PREFIX}:${cursor.state}:${cursor.detail ? encodeURIComponent(cursor.detail) : ""}`;
}

export function parseAlpha2ContinuationCursor(value: string | undefined): Alpha2ContinuationCursor | null {
  if (!value?.startsWith(`${ALPHA2_CONTINUATION_CURSOR_PREFIX}:`)) return null;
  const [, state, rawDetail = ""] = value.split(":", 3);
  if (!( ["reserved", "dispatched", "human_gate", "idle", "complete"] as const).includes(state as any)) {
    return null;
  }
  try {
    return {
      state: state as Alpha2ContinuationCursor["state"],
      detail: rawDetail ? decodeURIComponent(rawDetail) : undefined,
    };
  } catch {
    return null;
  }
}

export function alpha2ContinuationOwnsNextStep(
  state: "dispatched" | "dispatch_pending" | "human_gate" | "reservation_pending" | "claim_blocked" | "idle" | "complete" | "not_applicable",
) {
  return ["dispatched", "dispatch_pending", "human_gate", "reservation_pending"].includes(state);
}
