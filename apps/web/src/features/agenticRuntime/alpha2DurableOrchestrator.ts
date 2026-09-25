import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  Alpha2RunRecordSchema,
  Alpha2SafeTraceArtifactRefSchema,
  Alpha2SafeTraceStepRefSchema,
  appendAlpha2Checkpoint,
  consumeAlpha2HumanGateApproval,
  consumeAlpha2HumanResumeApproval,
  markAlpha2ExecutorEntered,
  normalizeAlpha2ErrorCode,
  transitionAlpha2Run,
  transitionAlpha2RunToNewHumanGate,
  type Alpha2RunRecord,
  type Alpha2RunStatus,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";
import {
  isAlpha2HumanStoppedRun,
  isAlpha2TerminalRun,
  type Alpha2RunLedger,
  type Alpha2VersionedRun,
} from "@/features/agenticRuntime/alpha2RunLedgerContract";
import type {
  Alpha2ExecutionDispatcher,
  Alpha2ExecutionReason,
} from "@/features/agenticRuntime/alpha2BullmqExecutionQueue";
import {
  evaluateAlpha2TaskEligibility,
  findAlpha2OpenTask,
  type Alpha2TaskOwnershipEvidence,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";
import {
  Alpha2ActionGateInputSchema,
  resolveAlpha2ActionGate,
  type Alpha2ActionGateInput,
} from "@/features/agenticRuntime/alpha2RiskGateContract";

const ALPHA2_MAX_WORKER_DELAY_MS = 2_147_483_647;
const Alpha2WorkerDelaySchema = z
  .number()
  .finite()
  .int()
  .min(0)
  .max(ALPHA2_MAX_WORKER_DELAY_MS);
const Alpha2WorkerOutcomeBaseSchema = z
  .object({
    checkpointId: z.string().min(1),
    cursor: z.string().min(1).optional(),
    evidenceRefs: z.array(z.string().min(1)).optional(),
    safeTraceStepRefs: z.array(Alpha2SafeTraceStepRefSchema).optional(),
    artifactRefs: z.array(Alpha2SafeTraceArtifactRefSchema).optional(),
  })
  .strict();

export const Alpha2WorkerOutcomeSchema = z.discriminatedUnion("type", [
  Alpha2WorkerOutcomeBaseSchema.extend({ type: z.literal("completed") }),
  Alpha2WorkerOutcomeBaseSchema.extend({
    type: z.literal("waiting"),
    resumeAfterMs: Alpha2WorkerDelaySchema,
  }),
  Alpha2WorkerOutcomeBaseSchema.extend({ type: z.literal("review") }),
  Alpha2WorkerOutcomeBaseSchema.extend({
    type: z.literal("human_gate"),
    reason: z.string().min(1),
  }),
  Alpha2WorkerOutcomeBaseSchema.extend({
    type: z.literal("failed"),
    errorCode: z.string().min(1),
    retryable: z.boolean(),
    retryAfterMs: Alpha2WorkerDelaySchema.optional(),
  }),
]);

export type Alpha2WorkerOutcomeBase = z.infer<typeof Alpha2WorkerOutcomeBaseSchema>;
export type Alpha2WorkerOutcome = z.infer<typeof Alpha2WorkerOutcomeSchema>;

export type Alpha2ExecutionFence = {
  /** Attempt-specific ownership token; never reuse it across deliveries. */
  token: string;
  generation: number;
  assertActive(): Promise<string>;
  /**
   * Every external or mutating effect must cross this boundary. The sink must
   * atomically deduplicate by idempotencyKey and reject a generation older than
   * the latest committed generation before applying the mutation.
   */
  runSideEffect<T>(input: {
    effectId: string;
    sink: (fence: {
      idempotencyKey: string;
      generation: number;
      attemptToken: string;
      assertActive: () => Promise<string>;
    }) => Promise<T> | T;
  }): Promise<T>;
};

export interface Alpha2WorkerExecutor {
  execute(input: {
    run: Alpha2RunRecord;
    workerId: string;
    signal: AbortSignal;
    fence: Alpha2ExecutionFence;
  }): Promise<Alpha2WorkerOutcome>;
}

export interface Alpha2ExecutorResolver {
  resolve(
    run: Alpha2RunRecord,
    input: { signal: AbortSignal },
  ): Promise<Alpha2WorkerExecutor> | Alpha2WorkerExecutor;
}

export function createAlpha2ResolvingExecutor(input: {
  resolver: Alpha2ExecutorResolver;
  resolutionTimeoutMs?: number;
}): Alpha2WorkerExecutor {
  const resolutionTimeoutMs = Math.max(1, input.resolutionTimeoutMs ?? 30_000);
  return {
    async execute(context) {
      const resolutionController = new AbortController();
      const abortResolution = () => resolutionController.abort(context.signal.reason);
      context.signal.addEventListener("abort", abortResolution, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      let executor: Alpha2WorkerExecutor;
      try {
        executor = await Promise.race([
          Promise.resolve().then(() =>
            input.resolver.resolve(context.run, { signal: resolutionController.signal }),
          ),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => {
              resolutionController.abort("alpha2_executor_resolution_timeout");
              reject(new Error("alpha2_executor_resolution_timeout"));
            }, resolutionTimeoutMs);
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
        context.signal.removeEventListener("abort", abortResolution);
      }
      if (context.signal.aborted) throw new Error("alpha2_executor_resolution_aborted");
      return executor.execute(context);
    },
  };
}

export type Alpha2ExecutionAuthorization = {
  observedHeadSha: string;
  observedAt: string;
  openTasksText: string;
  ownership: Alpha2TaskOwnershipEvidence;
  action: Alpha2ActionGateInput;
};

export type Alpha2DurableStepResult =
  | { state: "missing"; runId: string }
  | { state: "not_due"; run: Alpha2RunRecord }
  | { state: "human_stopped"; run: Alpha2RunRecord }
  | { state: "terminal"; run: Alpha2RunRecord }
  | { state: "lease_not_acquired"; runId: string }
  | { state: "attempts_exhausted"; run: Alpha2RunRecord }
  | { state: "execution_blocked"; run: Alpha2RunRecord; reasonCodes: string[] }
  | {
      state: "executed";
      run: Alpha2RunRecord;
      dispatchedJobId?: string;
    };

function unique(values: readonly string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueArtifacts(values: Alpha2RunRecord["artifactRefs"] = []) {
  return Array.from(new Map(values.map((artifact) => [artifact.id, artifact])).values());
}

function uniqueSafeTraceSteps(values: Alpha2RunRecord["safeTraceStepRefs"] = []) {
  return Array.from(new Map(values.map((step) => [step.stepId, step])).values());
}

function withOutcomeRefs(run: Alpha2RunRecord, outcome: Alpha2WorkerOutcome) {
  return Alpha2RunRecordSchema.parse({
    ...run,
    evidenceRefs: unique([...run.evidenceRefs, ...(outcome.evidenceRefs ?? [])]),
    safeTraceStepRefs: uniqueSafeTraceSteps([
      ...run.safeTraceStepRefs,
      ...(outcome.safeTraceStepRefs ?? []),
    ]),
    artifactRefs: uniqueArtifacts([...run.artifactRefs, ...(outcome.artifactRefs ?? [])]),
  });
}

function checkpointStatus(outcome: Alpha2WorkerOutcome): Alpha2RunStatus {
  switch (outcome.type) {
    case "completed":
      return "completed";
    case "waiting":
      return "waiting";
    case "review":
      return "review";
    case "human_gate":
      return "human_gate";
    case "failed":
      return "failed";
  }
}

function canonicalOutcomeRefs(outcome: Alpha2WorkerOutcome) {
  return {
    safeTraceStepRefs: (outcome.safeTraceStepRefs ?? []).map((reference) =>
      Alpha2SafeTraceStepRefSchema.parse(reference),
    ),
    artifactRefs: (outcome.artifactRefs ?? []).map((reference) =>
      Alpha2SafeTraceArtifactRefSchema.parse(reference),
    ),
  };
}

function alpha2OutcomeIdentity(outcome: Alpha2WorkerOutcome) {
  const references = canonicalOutcomeRefs(outcome);
  const base = {
    type: outcome.type,
    checkpointId: outcome.checkpointId,
    cursor: outcome.cursor ?? null,
    evidenceRefs: outcome.evidenceRefs ?? [],
    safeTraceStepRefs: references.safeTraceStepRefs,
    artifactRefs: references.artifactRefs,
  };
  const identity =
    outcome.type === "waiting"
      ? { ...base, resumeAfterMs: Math.max(0, Math.floor(outcome.resumeAfterMs)) }
      : outcome.type === "human_gate"
        ? { ...base, reason: outcome.reason }
        : outcome.type === "failed"
          ? {
              ...base,
              errorCode: normalizeAlpha2ErrorCode(outcome.errorCode, "alpha2_run_failed"),
              retryable: outcome.retryable,
              retryAfterMs: outcome.retryable
                ? Math.max(0, Math.floor(outcome.retryAfterMs ?? 30_000))
                : null,
            }
          : base;
  return `alpha2_outcome_${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}

async function save(
  ledger: Alpha2RunLedger,
  current: Alpha2VersionedRun,
  run: Alpha2RunRecord,
  lease: { owner: string; now: string },
  resumeAfterMs?: number,
  initializeWallClock?: { maxWallClockMs?: number },
  stampCheckpointId?: string,
) {
  return ledger.compareAndSwap({
    run,
    expectedVersion: current.version,
    lease,
    resumeAfterMs,
    initializeWallClock,
    stampCheckpointId,
  });
}

const RETRYABLE_MONGO_ERROR_NAMES = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoServerSelectionError",
  "MongoPoolClearedError",
  "MongoTopologyClosedError",
]);

function structuredErrorCode(error: unknown, fallback: string) {
  const candidate = error as
    | { code?: unknown; name?: unknown; message?: unknown }
    | null;
  const code = normalizeAlpha2ErrorCode(candidate?.code, "");
  if (code) return code;
  const message = normalizeAlpha2ErrorCode(candidate?.message, "");
  if (message) return message;
  const name = normalizeAlpha2ErrorCode(candidate?.name, "");
  if (name) return name;
  return fallback;
}

function isRetryableOutcomePersistenceError(error: unknown) {
  const code = structuredErrorCode(error, "");
  if (code === "alpha2_ledger_lease_lost" || code === "alpha2_ledger_version_conflict") {
    return false;
  }
  const candidate = error as
    | { name?: unknown; hasErrorLabel?: (label: string) => boolean }
    | null;
  if (
    typeof candidate?.name === "string" &&
    RETRYABLE_MONGO_ERROR_NAMES.has(candidate.name)
  ) {
    return true;
  }
  if (typeof candidate?.hasErrorLabel === "function") {
    try {
      return (
        candidate.hasErrorLabel("RetryableWriteError") ||
        candidate.hasErrorLabel("TransientTransactionError")
      );
    } catch {
      return false;
    }
  }
  return false;
}

function runtimeGateRef(input: {
  run: Alpha2RunRecord;
  authorization?: Alpha2ExecutionAuthorization;
  currentHeadSha: string;
  reasonCodes: string[];
}) {
  const parsedAction = input.authorization
    ? Alpha2ActionGateInputSchema.safeParse(input.authorization.action)
    : undefined;
  const canonicalAction = parsedAction?.success
    ? {
        ...parsedAction.data,
        evidenceRefs: unique(parsedAction.data.evidenceRefs).sort(),
      }
    : null;
  const identity = JSON.stringify({
    taskId: input.run.taskId,
    headSha: input.currentHeadSha,
    action: canonicalAction,
    reasonCodes: unique(input.reasonCodes).sort(),
  });
  return `alpha2_gate_${createHash("sha256").update(identity).digest("hex")}`;
}

function executionGateDecision(
  run: Alpha2RunRecord,
  authorization: Alpha2ExecutionAuthorization | undefined,
  input: {
    currentHeadSha: string;
    authoritativeNow: string;
    maxAgeMs: number;
    approvedGateRef?: string;
  },
) {
  const hardReasonCodes: string[] = [];
  const actionReasonCodes: string[] = [];

  if (!authorization) {
    const reasonCodes = ["missing_runtime_execution_authorization"];
    return {
      reasonCodes,
      gateRef: runtimeGateRef({
        run,
        currentHeadSha: input.currentHeadSha,
        reasonCodes,
      }),
    };
  }

  if (!/^[0-9a-f]{40}$/i.test(input.currentHeadSha)) {
    hardReasonCodes.push("runtime_head_sha_missing");
  }
  if (
    !/^[0-9a-f]{40}$/i.test(authorization.observedHeadSha) ||
    authorization.observedHeadSha !== input.currentHeadSha
  ) {
    hardReasonCodes.push("authorization_head_sha_mismatch");
  }
  const observedAtMs = Date.parse(authorization.observedAt);
  const authoritativeNowMs = Date.parse(input.authoritativeNow);
  if (
    !Number.isFinite(observedAtMs) ||
    !Number.isFinite(authoritativeNowMs) ||
    authoritativeNowMs - observedAtMs > input.maxAgeMs ||
    observedAtMs - authoritativeNowMs > input.maxAgeMs
  ) {
    hardReasonCodes.push("authorization_evidence_stale");
  }

  try {
    const task = findAlpha2OpenTask(authorization.openTasksText, run.taskId);
    if (!task) {
      hardReasonCodes.push("task_missing_from_canonical_opentasks");
    } else {
      const eligibility = evaluateAlpha2TaskEligibility({
        task,
        ownership: authorization.ownership,
      });
      if (!eligibility.continuationEligible) {
        hardReasonCodes.push(...eligibility.reasonCodes);
      }
    }
  } catch {
    hardReasonCodes.push("canonical_opentasks_unreadable");
  }

  if (authorization.ownership.exactHead !== true) {
    hardReasonCodes.push("owner_not_on_exact_head");
  }
  if (authorization.ownership.ciState !== "success") {
    hardReasonCodes.push("exact_head_ci_not_successful");
  }
  if ((authorization.ownership.unresolvedReviewThreads ?? 1) > 0) {
    hardReasonCodes.push("unresolved_review_threads");
  }

  try {
    if (authorization.action.riskClass !== run.riskClass) {
      hardReasonCodes.push("action_risk_class_mismatch");
    }
    const actionGate = resolveAlpha2ActionGate(authorization.action);
    if (!actionGate.autoExecutionAllowed) actionReasonCodes.push(...actionGate.reasonCodes);
  } catch {
    hardReasonCodes.push("action_gate_evidence_invalid");
  }

  if (run.budget.maxModelCalls !== undefined) {
    hardReasonCodes.push("durable_model_call_metering_not_available");
  }
  if (run.budget.maxEstimatedCostEur !== undefined) {
    hardReasonCodes.push("durable_cost_metering_not_available");
  }

  const hardReasons = unique(hardReasonCodes);
  const actionReasons = unique(actionReasonCodes);
  const allReasons = unique([...hardReasons, ...actionReasons]);
  const gateRef = runtimeGateRef({
    run,
    authorization,
    currentHeadSha: input.currentHeadSha,
    reasonCodes: allReasons,
  });
  const approvedActionGate =
    hardReasons.length === 0 &&
    actionReasons.length > 0 &&
    ((run.humanGate.state === "approved" && run.humanGate.gateRef === gateRef) ||
      input.approvedGateRef === gateRef);

  return {
    reasonCodes: approvedActionGate ? [] : allReasons,
    gateRef,
    approvedGateRef: approvedActionGate ? gateRef : undefined,
  };
}

async function persistExecutionBlock(input: {
  ledger: Alpha2RunLedger;
  leased: Alpha2VersionedRun;
  now: string;
  leaseOwner: string;
  reasonCodes: string[];
  gateRef: string;
  resumeMode?: NonNullable<Alpha2RunRecord["humanGate"]["resumeMode"]>;
}) {
  let current = input.leased;
  const resumeMode =
    input.resumeMode ??
    (current.run.status === "waiting"
      ? ("resume_attempt" as const)
      : current.run.status === "running"
        ? ("recover_abandoned_attempt" as const)
        : ("start_new_attempt" as const));
  if (current.run.status === "failed") {
    const queued = transitionAlpha2Run(current.run, "queued", { now: input.now });
    current = await save(input.ledger, current, queued, {
      owner: input.leaseOwner,
      now: input.now,
    });
  }

  const checkpointId = `runtime_block_v${current.version}`;
  const checkpointAlreadyExists = current.run.checkpoints.some(
    (checkpoint) => checkpoint.checkpointId === checkpointId,
  );
  const checkpointed = appendAlpha2Checkpoint(current.run, {
    checkpointId,
    createdAt: input.now,
    status: "human_gate",
    evidenceRefs: input.reasonCodes,
    safeTraceStepRefs: [],
    artifactRefs: [],
  });
  const stopped = transitionAlpha2RunToNewHumanGate(checkpointed, {
    now: input.now,
    reason: input.reasonCodes.join(","),
    gateRef: input.gateRef,
    resumeMode,
  });
  return save(
    input.ledger,
    current,
    stopped,
    { owner: input.leaseOwner, now: input.now },
    undefined,
    undefined,
    checkpointAlreadyExists ? undefined : checkpointId,
  );
}

async function moveToRunning(input: {
  ledger: Alpha2RunLedger;
  leased: Alpha2VersionedRun;
  now: string;
  leaseOwner: string;
  approvedResume?: boolean;
}) {
  let current = input.leased;
  let run = current.run;

  if (run.status === "failed") {
    if (run.attempt >= run.budget.maxAttempts) return { exhausted: true as const, current };
    run = transitionAlpha2Run(run, "queued", { now: input.now });
    current = await save(input.ledger, current, run, {
      owner: input.leaseOwner,
      now: input.now,
    });
  }

  if (
    run.status === "running" &&
    !input.approvedResume &&
    !run.preExecutorResumeMode
  ) {
    const terminalErrorCode =
      run.attempt >= run.budget.maxAttempts
        ? "alpha2_attempt_budget_exhausted"
        : "alpha2_abandoned_running_step";
    const checkpointId = `abandoned_attempt_v${current.version}`;
    run = appendAlpha2Checkpoint(run, {
      checkpointId,
      createdAt: input.now,
      status: "failed",
      errorCode: "alpha2_abandoned_running_step",
      evidenceRefs: [],
      safeTraceStepRefs: [],
      artifactRefs: [],
    });
    run = transitionAlpha2Run(run, "failed", {
      now: input.now,
      errorCode: terminalErrorCode,
      resumeAt: run.attempt < run.budget.maxAttempts ? input.now : undefined,
    });
    current = await save(
      input.ledger,
      current,
      run,
      { owner: input.leaseOwner, now: input.now },
      undefined,
      undefined,
      checkpointId,
    );
    if (run.attempt >= run.budget.maxAttempts) {
      return { exhausted: true as const, current };
    }
    run = transitionAlpha2Run(run, "queued", { now: input.now });
    current = await save(input.ledger, current, run, {
      owner: input.leaseOwner,
      now: input.now,
    });
  }

  if (run.status === "queued" || run.status === "waiting") {
    const preExecutorResumeMode =
      run.status === "queued" ? ("start_new_attempt" as const) : ("resume_attempt" as const);
    const initializeWallClock =
      run.status === "queued" && !run.startedAt
        ? { maxWallClockMs: run.budget.maxWallClockMs }
        : undefined;
    run = Alpha2RunRecordSchema.parse({
      ...transitionAlpha2Run(current.run, "running", { now: input.now }),
      preExecutorResumeMode,
    });
    current = await save(input.ledger, current, run, {
      owner: input.leaseOwner,
      now: input.now,
    }, undefined, initializeWallClock);
  }

  if (current.run.status !== "running") {
    throw new Error(`alpha2_orchestrator_unexpected_start_status:${current.run.status}`);
  }

  return { exhausted: false as const, current };
}

async function persistOutcome(input: {
  ledger: Alpha2RunLedger;
  current: Alpha2VersionedRun;
  outcome: Alpha2WorkerOutcome;
  now: string;
  leaseOwner: string;
}) {
  const checkpointAlreadyExists = input.current.run.checkpoints.some(
    (checkpoint) => checkpoint.checkpointId === input.outcome.checkpointId,
  );
  let run = withOutcomeRefs(input.current.run, input.outcome);
  run = appendAlpha2Checkpoint(run, {
    checkpointId: input.outcome.checkpointId,
    createdAt: input.now,
    status: checkpointStatus(input.outcome),
    cursor: input.outcome.cursor,
    errorCode:
      input.outcome.type === "failed"
        ? normalizeAlpha2ErrorCode(input.outcome.errorCode, "alpha2_run_failed")
        : undefined,
    outcomeIdentity: alpha2OutcomeIdentity(input.outcome),
    evidenceRefs: input.outcome.evidenceRefs ?? [],
    safeTraceStepRefs: input.outcome.safeTraceStepRefs ?? [],
    artifactRefs: input.outcome.artifactRefs ?? [],
  });

  switch (input.outcome.type) {
    case "completed":
      run = transitionAlpha2Run(run, "completed", { now: input.now });
      break;
    case "waiting":
      run = transitionAlpha2Run(run, "waiting", {
        now: input.now,
      });
      break;
    case "review":
      run = transitionAlpha2Run(run, "review", { now: input.now });
      break;
    case "human_gate":
      run = transitionAlpha2Run(run, "human_gate", {
        now: input.now,
        humanGate: {
          state: "pending",
          reason: input.outcome.reason,
          resumeMode: "resume_attempt",
        },
      });
      break;
    case "failed": {
      run = transitionAlpha2Run(run, "failed", {
        now: input.now,
        errorCode: input.outcome.errorCode,
      });
      break;
    }
  }

  const resumeAfterMs =
    input.outcome.type === "waiting"
      ? input.outcome.resumeAfterMs
      : input.outcome.type === "failed" &&
          input.outcome.retryable &&
          input.current.run.attempt < input.current.run.budget.maxAttempts
        ? (input.outcome.retryAfterMs ?? 30_000)
        : undefined;

  return save(
    input.ledger,
    input.current,
    run,
    { owner: input.leaseOwner, now: input.now },
    resumeAfterMs,
    undefined,
    checkpointAlreadyExists ? undefined : input.outcome.checkpointId,
  );
}

function sameJsonValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function persistedOutcomeMatches(
  persisted: Alpha2VersionedRun,
  current: Alpha2VersionedRun,
  outcome: Alpha2WorkerOutcome,
) {
  const references = canonicalOutcomeRefs(outcome);
  if (persisted.version !== current.version + 1) return false;
  if (persisted.run.status !== checkpointStatus(outcome)) return false;
  const checkpoint = persisted.run.checkpoints.find(
    (entry) => entry.checkpointId === outcome.checkpointId,
  );
  if (!checkpoint || checkpoint.status !== checkpointStatus(outcome)) return false;
  if (checkpoint.outcomeIdentity !== alpha2OutcomeIdentity(outcome)) return false;
  if (checkpoint.cursor !== outcome.cursor) return false;
  if (!sameJsonValue(checkpoint.evidenceRefs, outcome.evidenceRefs ?? [])) return false;
  if (!sameJsonValue(checkpoint.safeTraceStepRefs, references.safeTraceStepRefs)) return false;
  if (!sameJsonValue(checkpoint.artifactRefs, references.artifactRefs)) return false;

  switch (outcome.type) {
    case "completed":
      return Boolean(persisted.run.finishedAt) && !persisted.run.resumeAt;
    case "waiting": {
      if (!persisted.run.resumeAt) return false;
      return (
        Date.parse(persisted.run.resumeAt) - Date.parse(persisted.run.updatedAt) ===
        Math.max(0, Math.floor(outcome.resumeAfterMs))
      );
    }
    case "review":
      return !persisted.run.resumeAt;
    case "human_gate":
      return (
        !persisted.run.resumeAt &&
        persisted.run.humanGate.state === "pending" &&
        persisted.run.humanGate.reason === outcome.reason &&
        persisted.run.humanGate.resumeMode === "resume_attempt"
      );
    case "failed": {
      const normalizedErrorCode = normalizeAlpha2ErrorCode(
        outcome.errorCode,
        "alpha2_run_failed",
      );
      if (persisted.run.lastErrorCode !== normalizedErrorCode) return false;
      if (checkpoint.errorCode !== normalizedErrorCode) return false;
      const retryAfterMs =
        outcome.retryable && current.run.attempt < current.run.budget.maxAttempts
          ? Math.max(0, Math.floor(outcome.retryAfterMs ?? 30_000))
          : undefined;
      if (retryAfterMs === undefined) return !persisted.run.resumeAt;
      if (!persisted.run.resumeAt) return false;
      return (
        Date.parse(persisted.run.resumeAt) - Date.parse(persisted.run.updatedAt) === retryAfterMs
      );
    }
  }
}

async function persistOutcomeWithRetry(input: {
  ledger: Alpha2RunLedger;
  current: Alpha2VersionedRun;
  outcome: Alpha2WorkerOutcome;
  now: string;
  leaseOwner: string;
  maxAttempts?: number;
}) {
  const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 3, 5));
  let lastError: unknown;

  const readForReconciliation = async () => {
    let lastReadError: unknown;
    for (let readAttempt = 1; readAttempt <= maxAttempts; readAttempt += 1) {
      try {
        return await input.ledger.getByRunId(input.current.run.runId);
      } catch (readError: unknown) {
        lastReadError = readError;
        if (!isRetryableOutcomePersistenceError(readError)) throw readError;
      }
    }
    throw lastReadError ?? new Error("alpha2_outcome_reconciliation_read_failed");
  };

  for (let persistenceAttempt = 1; persistenceAttempt <= maxAttempts; persistenceAttempt += 1) {
    try {
      return await persistOutcome(input);
    } catch (error: unknown) {
      lastError = error;
      if (!isRetryableOutcomePersistenceError(error)) throw error;

      const observed = await readForReconciliation();
      if (observed && persistedOutcomeMatches(observed, input.current, input.outcome)) {
        return observed;
      }
      if (persistenceAttempt >= maxAttempts) throw error;
    }
  }

  throw lastError ?? new Error("alpha2_outcome_persistence_failed");
}

function createLeaseOwner(input: {
  workerId: string;
  runId: string;
  observedVersion: number;
  executionAttempt: number;
  executionId?: string;
}) {
  const executionId = input.executionId ?? randomUUID();
  return [
    input.workerId,
    input.runId,
    `attempt-${input.executionAttempt}`,
    `version-${input.observedVersion}`,
    executionId,
  ].join(":");
}

function startLeaseHeartbeat(input: {
  ledger: Alpha2RunLedger;
  runId: string;
  leaseOwner: string;
  leaseMs: number;
  expectedGeneration: () => number;
  expectedHumanGateState: () => Alpha2RunRecord["humanGate"]["state"];
  expectedPendingMutation: () => {
    generation: number;
    humanGateState: Alpha2RunRecord["humanGate"]["state"];
  } | null;
  onLost?: (reason: string) => void;
}) {
  let lost = false;
  let lossReason = "alpha2_ledger_lease_lost";
  let pending: Promise<Alpha2VersionedRun | null> | null = null;
  const markLost = (reason = "alpha2_ledger_lease_lost") => {
    if (lost) return;
    lost = true;
    lossReason = reason;
    input.onLost?.(reason);
  };
  const renew = () => {
    if (pending) return pending;
    pending = input.ledger
      .renewLease({
        runId: input.runId,
        owner: input.leaseOwner,
        now: new Date().toISOString(),
        leaseMs: input.leaseMs,
      })
      .then((renewed) => {
        if (!renewed?.lease) {
          markLost();
          return null;
        }
        const pendingMutation = input.expectedPendingMutation();
        const matchesCommittedGeneration =
          renewed.version === input.expectedGeneration() &&
          renewed.run.humanGate.state === input.expectedHumanGateState();
        const matchesPendingMutation =
          pendingMutation !== null &&
          renewed.version === pendingMutation.generation &&
          renewed.run.humanGate.state === pendingMutation.humanGateState;
        if (
          renewed.run.status !== "running" ||
          (!matchesCommittedGeneration && !matchesPendingMutation)
        ) {
          markLost("alpha2_execution_fence_invalid");
          return null;
        }
        return renewed;
      })
      .catch(() => {
        markLost();
        return null;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };
  const timer = setInterval(() => void renew(), Math.max(1_000, Math.floor(input.leaseMs / 3)));
  timer.unref?.();

  return {
    async assertActive() {
      const renewed = await renew();
      if (lost || !renewed?.lease) throw new Error(lossReason);
      return new Date(Date.parse(renewed.lease.expiresAt) - input.leaseMs).toISOString();
    },
    async stopAndVerify(now: string) {
      clearInterval(timer);
      await pending;
      if (!lost) {
        const renewed = await input.ledger.renewLease({
          runId: input.runId,
          owner: input.leaseOwner,
          now,
          leaseMs: input.leaseMs,
        });
        if (!renewed) markLost();
      }
      if (lost) throw new Error(lossReason);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

function executorFailure(run: Alpha2RunRecord, error: unknown): Alpha2WorkerOutcome {
  return {
    type: "failed",
    checkpointId: `exception_${run.runId}_${run.attempt}`,
    errorCode: structuredErrorCode(error, "alpha2_worker_exception"),
    retryable: true,
    retryAfterMs: 30_000,
  };
}

async function executeWithinWallClockBudget(input: {
  run: Alpha2RunRecord;
  workerId: string;
  executor: Alpha2WorkerExecutor;
  now: string;
  controller: AbortController;
  fence: Alpha2ExecutionFence;
}): Promise<Alpha2WorkerOutcome> {
  const validateOutcome = (outcome: unknown): Alpha2WorkerOutcome => {
    const parsed = Alpha2WorkerOutcomeSchema.safeParse(outcome);
    return parsed.success
      ? parsed.data
      : {
          type: "failed",
          checkpointId: `executor_outcome_invalid_${input.run.runId}_${input.run.attempt}`,
          errorCode: "alpha2_executor_outcome_invalid",
          retryable: false,
        };
  };
  const maxWallClockMs = input.run.budget.maxWallClockMs;
  if (maxWallClockMs !== undefined && !input.run.wallClockDeadlineAt) {
    return {
      type: "failed",
      checkpointId: `wall_clock_${input.run.runId}_${input.run.attempt}`,
      errorCode: "alpha2_wall_clock_deadline_missing",
      retryable: false,
    };
  }
  const remainingMs = input.run.wallClockDeadlineAt
    ? Date.parse(input.run.wallClockDeadlineAt) - Date.parse(input.now)
    : undefined;

  if (remainingMs !== undefined && remainingMs <= 0) {
    return {
      type: "failed",
      checkpointId: `wall_clock_${input.run.runId}_${input.run.attempt}`,
      errorCode: "alpha2_wall_clock_budget_exhausted",
      retryable: false,
    };
  }

  const deadlineMs =
    remainingMs === undefined ? undefined : globalThis.performance.now() + remainingMs;
  let invocation: ReturnType<Alpha2WorkerExecutor["execute"]> | undefined;
  let invocationError: unknown;
  let invocationThrew = false;
  try {
    invocation = input.executor.execute({
      run: input.run,
      workerId: input.workerId,
      signal: input.controller.signal,
      fence: input.fence,
    });
  } catch (error: unknown) {
    invocationThrew = true;
    invocationError = error;
  }
  const execution = invocationThrew
    ? Promise.resolve(executorFailure(input.run, invocationError))
    : Promise.resolve(invocation).catch((error: unknown) => executorFailure(input.run, error));
  if (remainingMs === undefined) return validateOutcome(await execution);

  const timeoutOutcome: Alpha2WorkerOutcome = {
    type: "failed",
    checkpointId: `wall_clock_${input.run.runId}_${input.run.attempt}`,
    errorCode: "alpha2_wall_clock_budget_exhausted",
    retryable: false,
  };
  const maxTimerDelayMs = 2_147_483_647;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Alpha2WorkerOutcome>((resolve) => {
    const schedule = () => {
      const delayMs = Math.min(
        maxTimerDelayMs,
        Math.max(0, deadlineMs - globalThis.performance.now()),
      );
      timer = setTimeout(() => {
        if (globalThis.performance.now() < deadlineMs) {
          schedule();
          return;
        }
        timedOut = true;
        resolve(timeoutOutcome);
        input.controller.abort("alpha2_wall_clock_budget_exhausted");
      }, delayMs);
    };
    schedule();
  });

  try {
    const result = await Promise.race([execution, timeout]);
    if (timedOut || globalThis.performance.now() >= deadlineMs) {
      input.controller.abort("alpha2_wall_clock_budget_exhausted");
      // Ownership must not be released while an abort-ignoring executor can still
      // perform side effects. A non-cooperative executor therefore keeps this
      // delivery (and its heartbeat) fenced until it actually settles.
      await execution;
      return timeoutOutcome;
    }
    return validateOutcome(result);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function nextDispatch(input: {
  run: Alpha2RunRecord;
  outcome: Alpha2WorkerOutcome;
  ledgerVersion: number;
}): { reason: Alpha2ExecutionReason; delayMs: number; dispatchKey: string } | null {
  if (input.outcome.type === "waiting") {
    return {
      reason: "scheduled_resume",
      delayMs: Math.max(0, input.outcome.resumeAfterMs),
      dispatchKey: `resume_v${input.ledgerVersion}_${input.outcome.checkpointId}`,
    };
  }

  if (
    input.outcome.type === "failed" &&
    input.outcome.retryable &&
    Boolean(input.run.resumeAt)
  ) {
    return {
      reason: "retry",
      delayMs: Math.max(0, input.outcome.retryAfterMs ?? 30_000),
      dispatchKey: `retry_v${input.ledgerVersion}_${input.outcome.checkpointId}`,
    };
  }

  return null;
}

export async function runAlpha2DurableStep(input: {
  runId: string;
  workerId: string;
  ledger: Alpha2RunLedger;
  dispatcher: Alpha2ExecutionDispatcher;
  executor: Alpha2WorkerExecutor;
  leaseMs?: number;
  now?: string;
  executionId?: string;
  currentHeadSha: string;
  authorization?: Alpha2ExecutionAuthorization;
  authorizationResolver?: (
    run: Alpha2RunRecord,
    input: { currentHeadSha: string; observedAt: string },
  ) => Alpha2ExecutionAuthorization;
  authorizationMaxAgeMs?: number;
}): Promise<Alpha2DurableStepResult> {
  const startedAt = input.now ?? new Date().toISOString();
  const observed = await input.ledger.getByRunId(input.runId);
  if (!observed) return { state: "missing", runId: input.runId };
  if (isAlpha2TerminalRun(observed.run)) return { state: "terminal", run: observed.run };
  if (isAlpha2HumanStoppedRun(observed.run)) {
    return { state: "human_stopped", run: observed.run };
  }
  const leaseMs = Math.max(10_000, input.leaseMs ?? 120_000);
  const executionAttempt =
    observed.run.status === "waiting" || observed.run.attempt >= observed.run.budget.maxAttempts
      ? observed.run.attempt
      : observed.run.attempt + 1;
  const leaseOwner = createLeaseOwner({
    workerId: input.workerId,
    runId: input.runId,
    observedVersion: observed.version,
    executionAttempt,
    executionId: input.executionId,
  });
  const leased = await input.ledger.tryAcquireLease({
    runId: input.runId,
    owner: leaseOwner,
    now: startedAt,
    leaseMs,
  });
  if (!leased) {
    const isDue = await input.ledger.isRunDue({ runId: input.runId, now: startedAt });
    return isDue
      ? { state: "lease_not_acquired", runId: input.runId }
      : { state: "not_due", run: observed.run };
  }
  const authoritativeLeaseNow = leased.lease
    ? new Date(Date.parse(leased.lease.expiresAt) - leaseMs).toISOString()
    : startedAt;

  try {
    let authorization = input.authorization;
    try {
      authorization = input.authorizationResolver?.(leased.run, {
        currentHeadSha: input.currentHeadSha,
        observedAt: authoritativeLeaseNow,
      }) ?? authorization;
    } catch {
      authorization = undefined;
    }
    const authorizationLease = await input.ledger.renewLease({
      runId: input.runId,
      owner: leaseOwner,
      now: new Date().toISOString(),
      leaseMs,
    });
    if (!authorizationLease?.lease) throw new Error("alpha2_ledger_lease_lost");
    const authorizationNow = new Date(
      Date.parse(authorizationLease.lease.expiresAt) - leaseMs,
    ).toISOString();
    const gateDecision = executionGateDecision(authorizationLease.run, authorization, {
      currentHeadSha: input.currentHeadSha,
      authoritativeNow: authorizationNow,
      maxAgeMs: Math.max(1_000, input.authorizationMaxAgeMs ?? 60_000),
    });
    const approvedHumanResumeMode =
      authorizationLease.run.status === "running" &&
      authorizationLease.run.humanGate.state === "approved"
        ? authorizationLease.run.humanGate.resumeMode
        : undefined;
    if (gateDecision.reasonCodes.length > 0) {
      const stopped = await persistExecutionBlock({
        ledger: input.ledger,
        leased: authorizationLease,
        now: authorizationNow,
        leaseOwner,
        reasonCodes: gateDecision.reasonCodes,
        gateRef: gateDecision.gateRef,
        resumeMode: approvedHumanResumeMode,
      });
      return {
        state: "execution_blocked",
        run: stopped.run,
        reasonCodes: gateDecision.reasonCodes,
      };
    }

    const resolvedHumanGateRef =
      authorizationLease.run.status === "running" &&
      authorizationLease.run.humanGate.state === "approved" &&
      authorizationLease.run.humanGate.gateRef !== undefined &&
      gateDecision.reasonCodes.length === 0
        ? authorizationLease.run.humanGate.gateRef
        : undefined;
    const approvedHumanGateRef = gateDecision.approvedGateRef ?? resolvedHumanGateRef;
    const manualResumeApproval =
      authorizationLease.run.status === "running" &&
      authorizationLease.run.humanGate.state === "approved" &&
      authorizationLease.run.humanGate.gateRef === undefined &&
      ["start_new_attempt", "resume_attempt"].includes(approvedHumanResumeMode ?? "");
    const approvedResumeMode = approvedHumanGateRef
      ? authorizationLease.run.humanGate.resumeMode
      : manualResumeApproval
        ? approvedHumanResumeMode
        : undefined;
    const approvedResume =
      (Boolean(approvedHumanGateRef) || manualResumeApproval) &&
      authorizationLease.run.status === "running" &&
      approvedResumeMode !== "recover_abandoned_attempt";
    const chargeApprovedAttempt = approvedResumeMode === "start_new_attempt";
    const abandonedRecoveryGateRef =
      approvedHumanGateRef &&
      authorizationLease.run.status === "running" &&
      approvedResumeMode === "recover_abandoned_attempt"
        ? approvedHumanGateRef
        : undefined;
    const startLease = abandonedRecoveryGateRef
      ? await save(
          input.ledger,
          authorizationLease,
          consumeAlpha2HumanGateApproval(authorizationLease.run, {
            gateRef: abandonedRecoveryGateRef,
            now: authorizationNow,
          }),
          { owner: leaseOwner, now: authorizationNow },
        )
      : authorizationLease;

    const start = await moveToRunning({
      ledger: input.ledger,
      leased: startLease,
      now: authorizationNow,
      leaseOwner,
      approvedResume,
    });
    if (start.exhausted) return { state: "attempts_exhausted", run: start.current.run };
    const executionController = new AbortController();
    let executionGeneration = start.current.version;
    let executionHumanGateState = start.current.run.humanGate.state;
    let pendingExecutionMutation: {
      generation: number;
      humanGateState: Alpha2RunRecord["humanGate"]["state"];
    } | null = null;
    const heartbeat = startLeaseHeartbeat({
      ledger: input.ledger,
      runId: input.runId,
      leaseOwner,
      leaseMs,
      expectedGeneration: () => executionGeneration,
      expectedHumanGateState: () => executionHumanGateState,
      expectedPendingMutation: () => pendingExecutionMutation,
      onLost: (reason) => executionController.abort(reason),
    });
    const executionFence: Alpha2ExecutionFence = {
      token: leaseOwner,
      generation: start.current.version,
      async assertActive() {
        if (executionController.signal.aborted) {
          throw new Error(String(executionController.signal.reason ?? "alpha2_execution_aborted"));
        }
        const authoritativeNow = await heartbeat.assertActive();
        if (executionController.signal.aborted) {
          throw new Error(String(executionController.signal.reason ?? "alpha2_execution_aborted"));
        }
        return authoritativeNow;
      },
      async runSideEffect(effectInput) {
        if (!effectInput.effectId.trim()) throw new Error("alpha2_effect_id_missing");
        await this.assertActive();
        const idempotencyKey = `alpha2_effect_${createHash("sha256")
          .update(JSON.stringify([input.runId, effectInput.effectId]))
          .digest("hex")}`;
        const result = await effectInput.sink({
          idempotencyKey,
          generation: this.generation,
          attemptToken: leaseOwner,
          assertActive: () => this.assertActive(),
        });
        await this.assertActive();
        return result;
      },
    };
    const persistExecutionMutation = async (
      current: Alpha2VersionedRun,
      next: Alpha2RunRecord,
      now: string,
      initializeWallClock?: { maxWallClockMs?: number },
    ) => {
      const expectedGeneration = current.version + 1;
      pendingExecutionMutation = {
        generation: expectedGeneration,
        humanGateState: next.humanGate.state,
      };
      try {
        const persisted = await save(
          input.ledger,
          current,
          next,
          { owner: leaseOwner, now },
          undefined,
          initializeWallClock,
        );
        if (persisted.version !== expectedGeneration) {
          throw new Error("alpha2_execution_fence_invalid");
        }
        executionGeneration = persisted.version;
        executionHumanGateState = persisted.run.humanGate.state;
        executionFence.generation = persisted.version;
        return persisted;
      } finally {
        pendingExecutionMutation = null;
      }
    };
    try {
      let executionCurrent = start.current;
      let executionNow = await executionFence.assertActive();
      let freshGateDecision = executionGateDecision(executionCurrent.run, authorization, {
        currentHeadSha: input.currentHeadSha,
        authoritativeNow: executionNow,
        maxAgeMs: Math.max(1_000, input.authorizationMaxAgeMs ?? 60_000),
        approvedGateRef: gateDecision.approvedGateRef,
      });
      if (freshGateDecision.reasonCodes.length > 0) {
        const stopped = await persistExecutionBlock({
          ledger: input.ledger,
          leased: executionCurrent,
          now: executionNow,
          leaseOwner,
          reasonCodes: freshGateDecision.reasonCodes,
          gateRef: freshGateDecision.gateRef,
          resumeMode:
            approvedResumeMode === "start_new_attempt"
              ? "start_new_attempt"
              : "resume_attempt",
        });
        return {
          state: "execution_blocked",
          run: stopped.run,
          reasonCodes: freshGateDecision.reasonCodes,
        };
      }

      if ((approvedHumanGateRef || manualResumeApproval) && !abandonedRecoveryGateRef) {
        const consumed = approvedHumanGateRef
          ? consumeAlpha2HumanGateApproval(executionCurrent.run, {
              gateRef: approvedHumanGateRef,
              now: executionNow,
            })
          : consumeAlpha2HumanResumeApproval(executionCurrent.run, { now: executionNow });
        executionCurrent = await persistExecutionMutation(
          executionCurrent,
          consumed,
          executionNow,
          chargeApprovedAttempt && executionCurrent.run.attempt === 0
            ? { maxWallClockMs: consumed.budget.maxWallClockMs }
            : undefined,
        );
        executionNow = await executionFence.assertActive();
        freshGateDecision = executionGateDecision(executionCurrent.run, authorization, {
          currentHeadSha: input.currentHeadSha,
          authoritativeNow: executionNow,
          maxAgeMs: Math.max(1_000, input.authorizationMaxAgeMs ?? 60_000),
          approvedGateRef: gateDecision.approvedGateRef,
        });
        if (freshGateDecision.reasonCodes.length > 0) {
          const stopped = await persistExecutionBlock({
            ledger: input.ledger,
            leased: executionCurrent,
            now: executionNow,
            leaseOwner,
            reasonCodes: freshGateDecision.reasonCodes,
            gateRef: freshGateDecision.gateRef,
            resumeMode: "resume_attempt",
          });
          return {
            state: "execution_blocked",
            run: stopped.run,
            reasonCodes: freshGateDecision.reasonCodes,
          };
        }
      }

      if (!executionCurrent.run.preExecutorResumeMode) {
        throw new Error("alpha2_pre_executor_resume_marker_missing");
      }
      try {
        executionNow = await executionFence.assertActive();
        const entered = markAlpha2ExecutorEntered(executionCurrent.run, {
          now: executionNow,
        });
        executionCurrent = await persistExecutionMutation(
          executionCurrent,
          entered,
          executionNow,
        );
      } catch (error: unknown) {
        executionController.abort("alpha2_executor_entry_persistence_failed");
        throw error;
      }
      executionNow = await executionFence.assertActive();

      const outcome = await executeWithinWallClockBudget({
        run: executionCurrent.run,
        workerId: input.workerId,
        executor: input.executor,
        now: executionNow,
        controller: executionController,
        fence: executionFence,
      });
      const outcomeAt = await heartbeat.assertActive();
      const persisted = await persistOutcomeWithRetry({
        ledger: input.ledger,
        current: executionCurrent,
        outcome,
        now: outcomeAt,
        leaseOwner,
      });

      const dispatch = nextDispatch({
        run: persisted.run,
        outcome,
        ledgerVersion: persisted.version,
      });
      if (!dispatch) return { state: "executed", run: persisted.run };

      try {
        const queued = await input.dispatcher.dispatch({
          runId: persisted.run.runId,
          taskId: persisted.run.taskId,
          dispatchKey: dispatch.dispatchKey,
          reason: dispatch.reason,
          requestedAt: persisted.run.updatedAt,
          delayMs: dispatch.delayMs,
        });
        return { state: "executed", run: persisted.run, dispatchedJobId: queued.jobId };
      } catch {
        // MongoDB remains authoritative. A later recovery scan recreates the queue job.
        return { state: "executed", run: persisted.run };
      }
    } finally {
      heartbeat.stop();
    }
  } finally {
    await input.ledger.releaseLease({ runId: input.runId, owner: leaseOwner });
  }
}

export async function recoverAlpha2DueRuns(input: {
  ledger: Alpha2RunLedger;
  dispatcher: Alpha2ExecutionDispatcher;
  now?: string;
  limit?: number;
}) {
  const now = input.now ?? new Date().toISOString();
  const recoverable = await input.ledger.listRecoverable({ now, limit: input.limit });
  const results: Array<{ runId: string; jobId?: string; error?: string }> = [];

  for (const entry of recoverable) {
    const lastCheckpoint = entry.run.checkpoints.at(-1)?.checkpointId ?? "start";
    try {
      const queued = await input.dispatcher.dispatch({
        runId: entry.run.runId,
        taskId: entry.run.taskId,
        dispatchKey: `recovery_v${entry.version}_${lastCheckpoint}`,
        reason: "recovery",
        requestedAt: now,
      });
      results.push({ runId: entry.run.runId, jobId: queued.jobId });
    } catch (error: any) {
      results.push({ runId: entry.run.runId, error: String(error?.code ?? error?.message ?? error) });
    }
  }

  return results;
}

export function startAlpha2RecoveryScheduler(input: {
  ledger: Alpha2RunLedger;
  dispatcher: Alpha2ExecutionDispatcher;
  intervalMs?: number;
  batchSize?: number;
  onError?: (error: unknown) => void;
}) {
  const intervalMs = Math.max(10_000, input.intervalMs ?? 60_000);
  let active = true;
  let inFlight: ReturnType<typeof recoverAlpha2DueRuns> | null = null;

  const runTrackedScan = () => {
    if (!active) return Promise.resolve([]);
    if (inFlight) return inFlight;
    inFlight = recoverAlpha2DueRuns({
      ledger: input.ledger,
      dispatcher: input.dispatcher,
      limit: input.batchSize ?? 50,
    })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
  const tick = () =>
    runTrackedScan().catch((error) => {
      input.onError?.(error);
      return [];
    });

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  void tick();

  return {
    async stop() {
      active = false;
      clearInterval(timer);
      await inFlight?.catch(() => undefined);
    },
    recoverNow: runTrackedScan,
    tick,
  };
}
