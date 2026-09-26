import type { Alpha2ExecutionDispatcher } from "@/features/agenticRuntime/alpha2BullmqExecutionQueue";
import {
  alpha2ContinuationOwnsNextStep,
  assessAlpha2Continuation,
  encodeAlpha2ContinuationCursor,
  type Alpha2ContinuationPlanner,
  type Alpha2ContinuationTaskClaimer,
} from "@/features/agenticRuntime/alpha2ContinuousDispatchContract";
import type {
  Alpha2RunLedger,
  Alpha2VersionedRun,
} from "@/features/agenticRuntime/alpha2RunLedgerContract";
import {
  appendAlpha2Checkpoint,
  linkAlpha2ChildRun,
  transitionAlpha2Run,
  type Alpha2RunRecord,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export type Alpha2ContinuousDispatchResult =
  | { state: "not_applicable"; run: Alpha2RunRecord }
  | { state: "idle"; run: Alpha2RunRecord; reason: string }
  | { state: "complete"; run: Alpha2RunRecord; reason?: string }
  | { state: "claim_blocked"; run: Alpha2RunRecord; reason: string }
  | {
      state: "reservation_pending";
      run: Alpha2RunRecord;
      nextRun: Alpha2RunRecord;
      reason: string;
    }
  | {
      state: "human_gate";
      run: Alpha2RunRecord;
      gateRun: Alpha2RunRecord;
      reason: string;
    }
  | {
      state: "dispatch_pending";
      run: Alpha2RunRecord;
      nextRun: Alpha2RunRecord;
      reason: string;
    }
  | {
      state: "dispatched";
      run: Alpha2RunRecord;
      nextRun: Alpha2RunRecord;
      jobId: string;
    };

function checkpointId(input: {
  state: "reserved" | "human_gate" | "idle" | "complete";
  current: Alpha2VersionedRun;
  childRunId?: string;
}) {
  return input.childRunId
    ? `continuation_${input.state}_${input.childRunId}`
    : `continuation_${input.state}_v${input.current.version}`;
}

function parentWithContinuation(input: {
  current: Alpha2VersionedRun;
  child?: Alpha2RunRecord;
  state: "reserved" | "human_gate" | "idle" | "complete";
  detail?: string;
  now: string;
}) {
  let parent = input.current.run;
  if (input.child) parent = linkAlpha2ChildRun(parent, input.child);
  return appendAlpha2Checkpoint(parent, {
    checkpointId: checkpointId({
      state: input.state,
      current: input.current,
      childRunId: input.child?.runId,
    }),
    createdAt: input.now,
    status: parent.status,
    cursor: encodeAlpha2ContinuationCursor({ state: input.state, detail: input.detail }),
    evidenceRefs: [],
    artifactRefs: [],
  });
}

async function reserveParent(input: {
  ledger: Alpha2RunLedger;
  current: Alpha2VersionedRun;
  child: Alpha2RunRecord;
  state: "reserved" | "human_gate";
  detail?: string;
  now: string;
}) {
  const candidate = parentWithContinuation(input);
  try {
    return await input.ledger.compareAndSwap({
      run: candidate,
      expectedVersion: input.current.version,
    });
  } catch {
    const latest = await input.ledger.getByRunId(input.current.run.runId);
    if (latest?.run.childRunIds.includes(input.child.runId)) return latest;
    return null;
  }
}

async function saveParentTerminalCursor(input: {
  ledger: Alpha2RunLedger;
  current: Alpha2VersionedRun;
  state: "idle" | "complete";
  detail?: string;
  now: string;
}) {
  const candidate = parentWithContinuation({
    current: input.current,
    state: input.state,
    detail: input.detail,
    now: input.now,
  });
  try {
    return await input.ledger.compareAndSwap({
      run: candidate,
      expectedVersion: input.current.version,
    });
  } catch {
    return (await input.ledger.getByRunId(input.current.run.runId)) ?? input.current;
  }
}

async function claimIfRequired(input: {
  required: boolean;
  claimer: Alpha2ContinuationTaskClaimer;
  task: Parameters<Alpha2ContinuationTaskClaimer["claim"]>[0]["task"];
  ownership: Parameters<Alpha2ContinuationTaskClaimer["claim"]>[0]["ownership"];
  nextRun: Alpha2RunRecord;
}) {
  if (!input.required) {
    return { applied: true, status: "in_progress" as const, evidenceRef: "existing_in_progress_claim" };
  }
  return input.claimer.claim({
    task: input.task,
    ownership: input.ownership,
    nextRun: input.nextRun,
  });
}

/**
 * Executes exactly one continuation decision for a completed run.
 * The parent reserves the deterministic child id before the child is persisted or dispatched.
 */
export async function continueAlpha2AfterCompletedRun(input: {
  completedRun: Alpha2RunRecord;
  ledger: Alpha2RunLedger;
  dispatcher: Alpha2ExecutionDispatcher;
  planner: Alpha2ContinuationPlanner;
  taskClaimer: Alpha2ContinuationTaskClaimer;
  now?: string;
}): Promise<Alpha2ContinuousDispatchResult> {
  if (input.completedRun.status !== "completed") {
    return { state: "not_applicable", run: input.completedRun };
  }

  const now = input.now ?? new Date().toISOString();
  const current = await input.ledger.getByRunId(input.completedRun.runId);
  if (!current || current.run.status !== "completed") {
    return { state: "not_applicable", run: input.completedRun };
  }

  const plan = await input.planner.plan({ completedRun: current.run, now });
  const assessment = assessAlpha2Continuation({ completedRun: current.run, plan });

  if (assessment.state === "idle") {
    const saved = await saveParentTerminalCursor({
      ledger: input.ledger,
      current,
      state: "idle",
      detail: assessment.reason,
      now,
    });
    return { state: "idle", run: saved.run, reason: assessment.reason };
  }

  if (assessment.state === "complete") {
    const saved = await saveParentTerminalCursor({
      ledger: input.ledger,
      current,
      state: "complete",
      detail: assessment.reason,
      now,
    });
    return { state: "complete", run: saved.run, reason: assessment.reason };
  }

  const claim = await claimIfRequired({
    required: assessment.requiresAtomicClaim,
    claimer: input.taskClaimer,
    task: assessment.plan.task,
    ownership: assessment.plan.ownership,
    nextRun: assessment.plan.nextRun,
  });
  if (!claim.applied || claim.status !== "in_progress") {
    return {
      state: "claim_blocked",
      run: current.run,
      reason: `alpha2_continuation_claim_blocked:${claim.status}:${claim.evidenceRef}`,
    };
  }

  if (assessment.state === "human_gate") {
    const gateRun = transitionAlpha2Run(assessment.plan.nextRun, "human_gate", {
      now,
      humanGate: { state: "pending", reason: assessment.reason },
    });
    const reserved = await reserveParent({
      ledger: input.ledger,
      current,
      child: gateRun,
      state: "human_gate",
      detail: gateRun.runId,
      now,
    });
    if (!reserved) {
      return {
        state: "reservation_pending",
        run: current.run,
        nextRun: gateRun,
        reason: "alpha2_continuation_parent_reservation_conflict",
      };
    }
    try {
      const child = await input.ledger.createOrGet(gateRun);
      return {
        state: "human_gate",
        run: reserved.run,
        gateRun: child.record.run,
        reason: assessment.reason,
      };
    } catch {
      return {
        state: "reservation_pending",
        run: reserved.run,
        nextRun: gateRun,
        reason: "alpha2_continuation_child_persistence_pending",
      };
    }
  }

  const nextRun = assessment.plan.nextRun;
  const reserved = await reserveParent({
    ledger: input.ledger,
    current,
    child: nextRun,
    state: "reserved",
    detail: nextRun.runId,
    now,
  });
  if (!reserved) {
    return {
      state: "reservation_pending",
      run: current.run,
      nextRun,
      reason: "alpha2_continuation_parent_reservation_conflict",
    };
  }

  let child;
  try {
    child = await input.ledger.createOrGet(nextRun);
  } catch {
    return {
      state: "reservation_pending",
      run: reserved.run,
      nextRun,
      reason: "alpha2_continuation_child_persistence_pending",
    };
  }

  try {
    const queued = await input.dispatcher.dispatch({
      runId: child.record.run.runId,
      taskId: child.record.run.taskId,
      dispatchKey: `continue:${reserved.run.runId}:${child.record.run.runId}`,
      reason: "continue",
      requestedAt: now,
    });
    return {
      state: "dispatched",
      run: reserved.run,
      nextRun: child.record.run,
      jobId: queued.jobId,
    };
  } catch {
    return {
      state: "dispatch_pending",
      run: reserved.run,
      nextRun: child.record.run,
      reason: "alpha2_continuation_dispatch_pending",
    };
  }
}

export function shouldSignalGlobalAlpha2RunCompleted(result: Alpha2ContinuousDispatchResult | null) {
  if (!result) return true;
  return !alpha2ContinuationOwnsNextStep(result.state);
}
