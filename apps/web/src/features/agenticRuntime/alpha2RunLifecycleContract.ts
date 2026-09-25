import { z } from "zod";
import {
  Alpha2RoleIdSchema,
  findAlpha2CapabilityRoute,
  isAlpha2OrganizationRoleId,
  resolveAlpha2Role,
  type Alpha2RoleId,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";
import {
  AGENT_SAFE_TRACE_ARTIFACT_TYPES,
  type AgentSafeTraceArtifactRef,
} from "@/features/agenticRuntime/agentRunArtifactSafeTraceContract";

export const ALPHA2_RUN_STATUSES = [
  "queued",
  "running",
  "waiting",
  "review",
  "human_gate",
  "failed",
  "completed",
  "cancelled",
] as const;

export const ALPHA2_RUN_KINDS = [
  "mission",
  "engineering_slice",
  "independent_review",
  "diagnostic",
  "content",
  "membership",
  "support",
  "funding",
  "research",
] as const;

export const ALPHA2_RISK_CLASSES = ["green", "yellow", "orange", "red"] as const;
export const ALPHA2_GATE_STATES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;
export const ALPHA2_ROUTE_MODES = ["automatic", "pinned"] as const;
export const ALPHA2_GATE_RESUME_MODES = [
  "start_new_attempt",
  "resume_attempt",
  "recover_abandoned_attempt",
] as const;
export const ALPHA2_PRE_EXECUTOR_RESUME_MODES = [
  "start_new_attempt",
  "resume_attempt",
] as const;

export type Alpha2RunStatus = (typeof ALPHA2_RUN_STATUSES)[number];
export type Alpha2RunKind = (typeof ALPHA2_RUN_KINDS)[number];
export type Alpha2RiskClass = (typeof ALPHA2_RISK_CLASSES)[number];
export type Alpha2GateState = (typeof ALPHA2_GATE_STATES)[number];
export type Alpha2RouteMode = (typeof ALPHA2_ROUTE_MODES)[number];
export type Alpha2SafeTraceArtifactRef = AgentSafeTraceArtifactRef;
export type Alpha2SafeTraceStepRef = {
  stepId: string;
  roleId: Alpha2RoleId;
};

const Alpha2RunStatusSchema = z.enum(ALPHA2_RUN_STATUSES);
const Alpha2RunKindSchema = z.enum(ALPHA2_RUN_KINDS);
const Alpha2RiskClassSchema = z.enum(ALPHA2_RISK_CLASSES);
const Alpha2GateStateSchema = z.enum(ALPHA2_GATE_STATES);
const Alpha2RouteModeSchema = z.enum(ALPHA2_ROUTE_MODES);
const Alpha2GateResumeModeSchema = z.enum(ALPHA2_GATE_RESUME_MODES);
const Alpha2PreExecutorResumeModeSchema = z.enum(ALPHA2_PRE_EXECUTOR_RESUME_MODES);
const DECIDED_HUMAN_GATE_STATES = new Set<Alpha2GateState>([
  "approved",
  "rejected",
  "expired",
]);
const SAFE_STRUCTURED_ERROR_CODE = /^alpha2_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const Alpha2ErrorCodeSchema = z.string().max(128).regex(SAFE_STRUCTURED_ERROR_CODE);
const ALPHA2_REVIEW_COMPLETION_GATE_PREFIX = "alpha2:review-completion";
const ALPHA2_REVIEW_RESUME_GATE_PREFIX = "alpha2:review-resume";

export function normalizeAlpha2ErrorCode(errorCode: unknown, fallback = "alpha2_run_failed") {
  return typeof errorCode === "string" &&
    errorCode.length <= 128 &&
    SAFE_STRUCTURED_ERROR_CODE.test(errorCode)
    ? errorCode
    : fallback;
}

export const Alpha2SafeTraceArtifactRefSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(AGENT_SAFE_TRACE_ARTIFACT_TYPES),
    label: z.string().min(1),
    reviewState: z.enum(["present", "planned", "review_required"]),
  })
  .strict();

export const Alpha2SafeTraceStepRefSchema = z
  .object({
    stepId: z.string().min(1),
    roleId: Alpha2RoleIdSchema,
  })
  .strict();

export const Alpha2BudgetSchema = z
  .object({
    maxAttempts: z.number().int().min(1).max(20).default(3),
    maxModelCalls: z.number().int().min(0).max(10_000).optional(),
    maxWallClockMs: z.number().int().positive().optional(),
    maxEstimatedCostEur: z.number().nonnegative().optional(),
  })
  .strict();

export const Alpha2ModelRouteSchema = z
  .object({
    mode: Alpha2RouteModeSchema,
    capabilityClass: z.string().min(1),
    providerId: z.string().min(1).optional(),
    modelId: z.string().min(1).optional(),
    fallbackAllowed: z.boolean().default(true),
  })
  .strict()
  .superRefine((route, ctx) => {
    if (route.mode === "pinned" && (!route.providerId || !route.modelId)) {
      ctx.addIssue({
        code: "custom",
        message: "alpha2_pinned_route_requires_provider_and_model",
      });
    }
  });

export const Alpha2ActorPrincipalSchema = z
  .object({
    actorId: z.string().min(1),
    roleId: Alpha2RoleIdSchema,
  })
  .strict();

export const Alpha2GateDecisionActorSchema = Alpha2ActorPrincipalSchema;

export const Alpha2HumanGateSchema = z
  .object({
    state: Alpha2GateStateSchema,
    reason: z.string().min(1).optional(),
    gateRef: z.string().min(1).optional(),
    resumeMode: Alpha2GateResumeModeSchema.optional(),
    decisionRef: z.string().min(1).optional(),
    decidedAt: z.string().datetime().optional(),
    decisionActor: Alpha2GateDecisionActorSchema.optional(),
  })
  .strict()
  .superRefine((gate, ctx) => {
    if (gate.state === "pending" && !gate.reason) {
      ctx.addIssue({ code: "custom", message: "alpha2_pending_gate_requires_reason" });
    }
    if (["approved", "rejected", "expired"].includes(gate.state) && !gate.decisionRef) {
      ctx.addIssue({ code: "custom", message: "alpha2_gate_decision_requires_reference" });
    }
  });

export const Alpha2CheckpointSchema = z
  .object({
    checkpointId: z.string().min(1),
    createdAt: z.string().datetime(),
    status: Alpha2RunStatusSchema,
    cursor: z.string().min(1).optional(),
    errorCode: Alpha2ErrorCodeSchema.optional(),
    outcomeIdentity: z.string().regex(/^alpha2_outcome_[a-f0-9]{64}$/).optional(),
    evidenceRefs: z.array(z.string().min(1)).default([]),
    safeTraceStepRefs: z.array(Alpha2SafeTraceStepRefSchema).default([]),
    artifactRefs: z.array(Alpha2SafeTraceArtifactRefSchema).default([]),
  })
  .strict();

export const Alpha2RunRecordSchema = z
  .object({
    schemaVersion: z.literal("alpha2.run.v1"),
    runId: z.string().min(1),
    rootRunId: z.string().min(1),
    parentRunId: z.string().min(1).nullable(),
    childRunIds: z.array(z.string().min(1)).default([]),
    idempotencyKey: z.string().min(1),
    taskId: z.string().min(1),
    kind: Alpha2RunKindSchema,
    status: Alpha2RunStatusSchema,
    primaryRole: Alpha2RoleIdSchema,
    supportingRoles: z.array(Alpha2RoleIdSchema).default([]),
    primaryActor: Alpha2ActorPrincipalSchema.optional(),
    assignedReviewActor: Alpha2ActorPrincipalSchema.optional(),
    riskClass: Alpha2RiskClassSchema,
    humanGate: Alpha2HumanGateSchema,
    humanGateHistory: z.array(Alpha2HumanGateSchema).default([]),
    budget: Alpha2BudgetSchema,
    route: Alpha2ModelRouteSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    wallClockDeadlineAt: z.string().datetime().optional(),
    finishedAt: z.string().datetime().optional(),
    resumeAt: z.string().datetime().optional(),
    attempt: z.number().int().min(0),
    preExecutorResumeMode: Alpha2PreExecutorResumeModeSchema.optional(),
    checkpoints: z.array(Alpha2CheckpointSchema).default([]),
    evidenceRefs: z.array(z.string().min(1)).default([]),
    safeTraceStepRefs: z.array(Alpha2SafeTraceStepRefSchema).default([]),
    artifactRefs: z.array(Alpha2SafeTraceArtifactRefSchema).default([]),
    lastErrorCode: Alpha2ErrorCodeSchema.optional(),
  })
  .strict()
  .superRefine((run, ctx) => {
    const capabilityRoute = findAlpha2CapabilityRoute(run.route.capabilityClass);

    if (isAlpha2OrganizationRoleId(run.primaryRole)) {
      const primaryRole = resolveAlpha2Role(run.primaryRole);

      if (!capabilityRoute) {
        ctx.addIssue({
          code: "custom",
          message: `alpha2_capability_route_not_found:${run.route.capabilityClass}`,
        });
      } else if (!primaryRole.capabilities.includes(run.route.capabilityClass)) {
        ctx.addIssue({
          code: "custom",
          message: `alpha2_primary_role_capability_mismatch:${run.primaryRole}:${run.route.capabilityClass}`,
        });
      }

    }

    if (capabilityRoute?.independentReviewRequired) {
      if (run.primaryRole === "review_agent") {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_independent_reviewer_must_differ_from_primary",
        });
      }
      if (!run.supportingRoles.includes("review_agent")) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_independent_review_role_required",
        });
      }
      if (!run.primaryActor) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_primary_actor_required_for_independent_review",
        });
      } else if (run.primaryActor.roleId !== run.primaryRole) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_primary_actor_role_mismatch",
        });
      }
      if (!run.assignedReviewActor) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_assigned_review_actor_required",
        });
      } else if (
        run.assignedReviewActor.roleId !== "review_agent" ||
        !run.supportingRoles.includes(run.assignedReviewActor.roleId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_assigned_review_actor_not_assigned",
        });
      }
      if (
        run.primaryActor &&
        run.assignedReviewActor &&
        run.primaryActor.actorId === run.assignedReviewActor.actorId
      ) {
        ctx.addIssue({
          code: "custom",
          message: "alpha2_independent_reviewer_principal_must_differ_from_primary",
        });
      }
    } else if (run.primaryActor && run.primaryActor.roleId !== run.primaryRole) {
      ctx.addIssue({
        code: "custom",
        message: "alpha2_primary_actor_role_mismatch",
      });
    }

    if (run.parentRunId === null && run.rootRunId !== run.runId) {
      ctx.addIssue({ code: "custom", message: "alpha2_root_run_must_reference_itself" });
    }
    if (run.parentRunId !== null && run.parentRunId === run.runId) {
      ctx.addIssue({ code: "custom", message: "alpha2_run_cannot_parent_itself" });
    }
    if (run.parentRunId !== null && run.rootRunId === run.runId) {
      ctx.addIssue({ code: "custom", message: "alpha2_child_run_cannot_reference_itself_as_root" });
    }
    if (new Set(run.childRunIds).size !== run.childRunIds.length) {
      ctx.addIssue({ code: "custom", message: "alpha2_duplicate_child_run_id" });
    }
    if (run.childRunIds.includes(run.runId)) {
      ctx.addIssue({ code: "custom", message: "alpha2_run_cannot_be_own_child" });
    }
    if (run.status === "human_gate" && run.humanGate.state !== "pending") {
      ctx.addIssue({ code: "custom", message: "alpha2_human_gate_status_requires_pending_gate" });
    }
    if (run.humanGateHistory.some((gate) => !DECIDED_HUMAN_GATE_STATES.has(gate.state))) {
      ctx.addIssue({ code: "custom", message: "alpha2_human_gate_history_requires_decisions" });
    }
    if (run.humanGate.state === "pending" && run.status !== "human_gate") {
      ctx.addIssue({ code: "custom", message: "alpha2_pending_gate_requires_human_gate_status" });
    }
    if (["completed", "cancelled"].includes(run.status) && !run.finishedAt) {
      ctx.addIssue({ code: "custom", message: "alpha2_terminal_run_requires_finished_at" });
    }
    if (["completed", "cancelled", "review", "human_gate"].includes(run.status) && run.resumeAt) {
      ctx.addIssue({ code: "custom", message: "alpha2_nonresumable_status_cannot_have_resume_at" });
    }
    if (run.attempt > run.budget.maxAttempts) {
      ctx.addIssue({ code: "custom", message: "alpha2_attempt_exceeds_budget" });
    }
    if (run.preExecutorResumeMode && run.status !== "running") {
      ctx.addIssue({ code: "custom", message: "alpha2_pre_executor_resume_requires_running" });
    }
    if (run.preExecutorResumeMode && run.humanGate.state !== "not_required") {
      ctx.addIssue({
        code: "custom",
        message: "alpha2_pre_executor_resume_requires_consumed_gate",
      });
    }
  });

export type Alpha2Budget = z.infer<typeof Alpha2BudgetSchema>;
export type Alpha2ModelRoute = z.infer<typeof Alpha2ModelRouteSchema>;
export type Alpha2ActorPrincipal = z.infer<typeof Alpha2ActorPrincipalSchema>;
export type Alpha2GateDecisionActor = z.infer<typeof Alpha2GateDecisionActorSchema>;
export type Alpha2HumanGate = z.infer<typeof Alpha2HumanGateSchema>;
export type Alpha2Checkpoint = z.infer<typeof Alpha2CheckpointSchema>;
export type Alpha2RunRecord = z.infer<typeof Alpha2RunRecordSchema>;

type Alpha2ReviewDecisionState = {
  runId: string;
  status: Alpha2RunStatus;
  updatedAt: string;
};

export function alpha2ReviewCompletionGateRef(
  run: Alpha2ReviewDecisionState,
): string {
  if (run.status !== "review") {
    throw new Error("alpha2_review_completion_gate_requires_review");
  }
  return `${ALPHA2_REVIEW_COMPLETION_GATE_PREFIX}:${run.runId}:${run.updatedAt}`;
}

export function alpha2ReviewResumeGateRef(
  run: Alpha2ReviewDecisionState,
): string {
  if (run.status !== "review") {
    throw new Error("alpha2_review_resume_gate_requires_review");
  }
  return `${ALPHA2_REVIEW_RESUME_GATE_PREFIX}:${run.runId}:${run.updatedAt}`;
}

function hasCurrentReviewDecision(
  run: Alpha2ReviewDecisionState,
  humanGate: Alpha2HumanGate,
  gateRef: string,
) {
  return (
    humanGate.state === "approved" &&
    humanGate.gateRef === gateRef &&
    humanGate.decisionRef !== undefined &&
    humanGate.decidedAt !== undefined &&
    Date.parse(humanGate.decidedAt) >= Date.parse(run.updatedAt)
  );
}

function requiresIndependentAlpha2Review(run: Alpha2RunRecord) {
  return Boolean(
    findAlpha2CapabilityRoute(run.route.capabilityClass)?.independentReviewRequired,
  );
}

function assertAssignedIndependentReviewActor(
  run: Alpha2RunRecord,
  humanGate: Alpha2HumanGate,
) {
  if (!requiresIndependentAlpha2Review(run)) return;

  const actor = humanGate.decisionActor;
  if (!actor) {
    throw new Error("alpha2_review_approval_requires_actor_identity");
  }
  const primaryActor = run.primaryActor;
  const assignedReviewActor = run.assignedReviewActor;
  if (!primaryActor || !assignedReviewActor) {
    throw new Error("alpha2_review_principal_binding_missing");
  }
  if (
    actor.actorId === primaryActor.actorId ||
    actor.roleId === primaryActor.roleId
  ) {
    throw new Error("alpha2_review_approval_actor_matches_primary_principal");
  }
  if (
    actor.actorId !== assignedReviewActor.actorId ||
    actor.roleId !== assignedReviewActor.roleId
  ) {
    throw new Error("alpha2_review_approval_actor_not_assigned");
  }
}

function hasBoundAlpha2ReviewCompletionApproval(
  run: Alpha2RunRecord,
  humanGate: Alpha2HumanGate,
) {
  assertAssignedIndependentReviewActor(run, humanGate);
  return hasCurrentReviewDecision(
    run,
    humanGate,
    alpha2ReviewCompletionGateRef(run),
  );
}

function hasBoundAlpha2ReviewResumeApproval(
  run: Alpha2RunRecord,
  humanGate: Alpha2HumanGate,
) {
  assertAssignedIndependentReviewActor(run, humanGate);
  return hasCurrentReviewDecision(run, humanGate, alpha2ReviewResumeGateRef(run));
}

export function assertAlpha2InitialRunPersistence(run: Alpha2RunRecord) {
  if (run.status !== "queued" && run.status !== "human_gate") {
    throw new Error(`alpha2_invalid_initial_run_status:${run.status}`);
  }
  if (run.attempt !== 0) {
    throw new Error("alpha2_invalid_initial_run_attempt");
  }
  if (run.createdAt !== run.updatedAt) {
    throw new Error("alpha2_invalid_initial_run_timestamps");
  }
  if (
    run.startedAt !== undefined ||
    run.wallClockDeadlineAt !== undefined ||
    run.finishedAt !== undefined ||
    run.resumeAt !== undefined ||
    run.preExecutorResumeMode !== undefined ||
    run.checkpoints.length > 0 ||
    run.humanGateHistory.length > 0
  ) {
    throw new Error("alpha2_invalid_initial_run_lifecycle_state");
  }
}

const ALLOWED_TRANSITIONS: Record<Alpha2RunStatus, readonly Alpha2RunStatus[]> = {
  queued: ["running", "review", "human_gate", "cancelled"],
  running: ["waiting", "review", "human_gate", "failed", "completed", "cancelled"],
  waiting: ["running", "review", "human_gate", "failed", "cancelled"],
  review: ["running", "human_gate", "failed", "completed", "cancelled"],
  human_gate: ["running", "review", "failed", "cancelled"],
  failed: ["queued", "cancelled"],
  completed: [],
  cancelled: [],
};

function canonicalPendingResumeMode(input: {
  status: Alpha2RunStatus;
  attempt: number;
  requested?: (typeof ALPHA2_GATE_RESUME_MODES)[number];
}) {
  if (input.status === "queued" && input.attempt === 0) {
    if (input.requested && input.requested !== "start_new_attempt") {
      throw new Error("alpha2_human_gate_resume_mode_mismatch");
    }
    return "start_new_attempt" as const;
  }
  return input.requested;
}

export function isAlpha2RunTransitionAllowed(from: Alpha2RunStatus, to: Alpha2RunStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertAlpha2RunTransition(from: Alpha2RunStatus, to: Alpha2RunStatus) {
  if (!isAlpha2RunTransitionAllowed(from, to)) {
    throw new Error(`alpha2_invalid_run_transition:${from}->${to}`);
  }
}

export function createAlpha2RunRecord(input: {
  runId: string;
  parentRunId?: string | null;
  rootRunId?: string;
  idempotencyKey: string;
  taskId: string;
  kind: Alpha2RunKind;
  primaryRole: Alpha2RoleId;
  supportingRoles?: Alpha2RoleId[];
  primaryActor?: Alpha2ActorPrincipal;
  assignedReviewActor?: Alpha2ActorPrincipal;
  riskClass: Alpha2RiskClass;
  route: Alpha2ModelRoute;
  budget?: Partial<Alpha2Budget>;
  humanGate?: Alpha2HumanGate;
  now?: string;
}): Alpha2RunRecord {
  const now = input.now ?? new Date().toISOString();
  const parentRunId = input.parentRunId ?? null;

  if (parentRunId !== null && !input.rootRunId) {
    throw new Error("alpha2_child_run_requires_root_run_id");
  }

  const rootRunId = input.rootRunId ?? input.runId;
  const initialHumanGate =
    input.humanGate?.state === "pending"
      ? {
          ...input.humanGate,
          resumeMode: canonicalPendingResumeMode({
            status: "queued",
            attempt: 0,
            requested: input.humanGate.resumeMode,
          }),
        }
      : (input.humanGate ?? { state: "not_required" as const });

  return Alpha2RunRecordSchema.parse({
    schemaVersion: "alpha2.run.v1",
    runId: input.runId,
    rootRunId,
    parentRunId,
    childRunIds: [],
    idempotencyKey: input.idempotencyKey,
    taskId: input.taskId,
    kind: input.kind,
    status: initialHumanGate.state === "pending" ? "human_gate" : "queued",
    primaryRole: input.primaryRole,
    supportingRoles: Array.from(new Set(input.supportingRoles ?? [])).filter(
      (role) => role !== input.primaryRole,
    ),
    primaryActor: input.primaryActor,
    assignedReviewActor: input.assignedReviewActor,
    riskClass: input.riskClass,
    humanGate: initialHumanGate,
    humanGateHistory: [],
    budget: {
      maxAttempts: input.budget?.maxAttempts ?? 3,
      maxModelCalls: input.budget?.maxModelCalls,
      maxWallClockMs: input.budget?.maxWallClockMs,
      maxEstimatedCostEur: input.budget?.maxEstimatedCostEur,
    },
    route: input.route,
    createdAt: now,
    updatedAt: now,
    attempt: 0,
    checkpoints: [],
    evidenceRefs: [],
    safeTraceStepRefs: [],
    artifactRefs: [],
  });
}

export function transitionAlpha2RunToNewHumanGate(
  run: Alpha2RunRecord,
  input: {
    reason: string;
    gateRef: string;
    resumeMode: (typeof ALPHA2_GATE_RESUME_MODES)[number];
    now?: string;
  },
): Alpha2RunRecord {
  assertAlpha2RunTransition(run.status, "human_gate");
  const now = input.now ?? new Date().toISOString();
  const preservesDecision = DECIDED_HUMAN_GATE_STATES.has(run.humanGate.state);
  const resumeMode = canonicalPendingResumeMode({
    status: run.status,
    attempt: run.attempt,
    requested: input.resumeMode,
  });

  return Alpha2RunRecordSchema.parse({
    ...run,
    status: "human_gate",
    updatedAt: now,
    resumeAt: undefined,
    preExecutorResumeMode: undefined,
    humanGate: {
      state: "pending",
      reason: input.reason,
      gateRef: input.gateRef,
      resumeMode,
    },
    humanGateHistory: preservesDecision
      ? [...run.humanGateHistory, run.humanGate]
      : run.humanGateHistory,
  });
}

export function consumeAlpha2HumanGateApproval(
  run: Alpha2RunRecord,
  input: { gateRef: string; now?: string },
): Alpha2RunRecord {
  if (
    run.humanGate.state !== "approved" ||
    run.humanGate.gateRef !== input.gateRef ||
    !run.humanGate.decisionRef
  ) {
    throw new Error("alpha2_human_gate_approval_mismatch");
  }
  const now = input.now ?? new Date().toISOString();
  const resumeMode = run.humanGate.resumeMode;
  const attempt = run.attempt + (resumeMode === "start_new_attempt" ? 1 : 0);
  if (attempt > run.budget.maxAttempts) {
    throw new Error("alpha2_attempt_budget_exhausted");
  }
  return Alpha2RunRecordSchema.parse({
    ...run,
    updatedAt: now,
    attempt,
    preExecutorResumeMode:
      resumeMode === "start_new_attempt" || resumeMode === "resume_attempt"
        ? resumeMode
        : undefined,
    humanGate: { state: "not_required" },
    humanGateHistory: [...run.humanGateHistory, run.humanGate],
  });
}

export function consumeAlpha2HumanResumeApproval(
  run: Alpha2RunRecord,
  input: { now?: string } = {},
): Alpha2RunRecord {
  if (
    run.humanGate.state !== "approved" ||
    run.humanGate.gateRef !== undefined ||
    !["start_new_attempt", "resume_attempt"].includes(run.humanGate.resumeMode ?? "") ||
    !run.humanGate.decisionRef
  ) {
    throw new Error("alpha2_human_resume_approval_mismatch");
  }
  const now = input.now ?? new Date().toISOString();
  const resumeMode = run.humanGate.resumeMode as (typeof ALPHA2_PRE_EXECUTOR_RESUME_MODES)[number];
  const attempt = run.attempt + (resumeMode === "start_new_attempt" ? 1 : 0);
  if (attempt > run.budget.maxAttempts) {
    throw new Error("alpha2_attempt_budget_exhausted");
  }
  return Alpha2RunRecordSchema.parse({
    ...run,
    updatedAt: now,
    attempt,
    preExecutorResumeMode: resumeMode,
    humanGate: { state: "not_required" },
    humanGateHistory: [...run.humanGateHistory, run.humanGate],
  });
}

export function transitionAlpha2Run(
  run: Alpha2RunRecord,
  to: Alpha2RunStatus,
  input: {
    now?: string;
    humanGate?: Alpha2HumanGate;
    errorCode?: string;
    resumeAt?: string;
  } = {},
): Alpha2RunRecord {
  assertAlpha2RunTransition(run.status, to);
  if (
    to === "completed" &&
    run.status !== "review" &&
    findAlpha2CapabilityRoute(run.route.capabilityClass)?.independentReviewRequired
  ) {
    throw new Error("alpha2_independent_review_required_before_completion");
  }
  const now = input.now ?? new Date().toISOString();

  const replacesPriorReviewDecision =
    run.status === "review" && to === "running" && input.humanGate !== undefined;
  if (
    DECIDED_HUMAN_GATE_STATES.has(run.humanGate.state) &&
    input.humanGate &&
    !replacesPriorReviewDecision
  ) {
    throw new Error("alpha2_human_gate_decision_is_immutable");
  }

  const requestedHumanGate = input.humanGate ?? run.humanGate;
  const candidateHumanGate =
    to === "human_gate" && requestedHumanGate.state === "pending"
      ? {
          ...requestedHumanGate,
          resumeMode: canonicalPendingResumeMode({
            status: run.status,
            attempt: run.attempt,
            requested: requestedHumanGate.resumeMode,
          }),
        }
      : requestedHumanGate;
  const expectedResumeMode =
    to === "running" &&
    ["review", "human_gate"].includes(run.status) &&
    candidateHumanGate.state === "approved"
      ? run.humanGate.resumeMode ??
        (run.attempt === 0 ? "start_new_attempt" : "resume_attempt")
      : undefined;

  if (
    expectedResumeMode &&
    candidateHumanGate.resumeMode &&
    candidateHumanGate.resumeMode !== expectedResumeMode
  ) {
    throw new Error("alpha2_human_gate_resume_mode_mismatch");
  }

  const nextHumanGate = expectedResumeMode
    ? {
        ...candidateHumanGate,
        resumeMode: expectedResumeMode,
      }
    : candidateHumanGate;

  if (
    run.status === "human_gate" &&
    run.humanGate.gateRef &&
    nextHumanGate.state === "approved" &&
    nextHumanGate.gateRef !== run.humanGate.gateRef
  ) {
    throw new Error("alpha2_human_gate_approval_ref_mismatch");
  }
  if (
    run.status === "human_gate" &&
    run.humanGate.resumeMode &&
    nextHumanGate.state === "approved" &&
    nextHumanGate.resumeMode !== run.humanGate.resumeMode
  ) {
    throw new Error("alpha2_human_gate_resume_mode_mismatch");
  }

  if (run.status === "human_gate" && ["running", "review"].includes(to)) {
    if (nextHumanGate.state !== "approved") {
      throw new Error("alpha2_human_gate_exit_requires_approval");
    }
  }

  if (run.status === "review" && to === "running") {
    if (nextHumanGate.state !== "approved") {
      throw new Error("alpha2_review_exit_requires_approval");
    }
    if (!nextHumanGate.decisionRef || !nextHumanGate.decidedAt) {
      throw new Error("alpha2_review_exit_requires_audited_approval");
    }
    if (!hasBoundAlpha2ReviewResumeApproval(run, nextHumanGate)) {
      throw new Error("alpha2_review_resume_requires_bound_approval");
    }
  }
  if (run.status === "review" && to === "completed") {
    if (nextHumanGate.state !== "approved") {
      throw new Error("alpha2_review_exit_requires_approval");
    }
    if (!nextHumanGate.decisionRef || !nextHumanGate.decidedAt) {
      throw new Error("alpha2_review_exit_requires_audited_approval");
    }
    if (
      run.humanGate.state !== "not_required" ||
      !hasBoundAlpha2ReviewCompletionApproval(run, nextHumanGate)
    ) {
      throw new Error("alpha2_review_completion_requires_bound_approval");
    }
  }

  if (run.status === "human_gate" && !DECIDED_HUMAN_GATE_STATES.has(nextHumanGate.state)) {
    throw new Error("alpha2_human_gate_exit_requires_decision");
  }

  if (to === "running" && !["not_required", "approved"].includes(nextHumanGate.state)) {
    throw new Error("alpha2_execution_blocked_by_human_gate_decision");
  }

  const preservesResumeAt = to === "waiting" || to === "failed";
  const normalizedErrorCode =
    to === "failed" ? normalizeAlpha2ErrorCode(input.errorCode, "alpha2_run_failed") : undefined;
  const latestCheckpoint = run.checkpoints.at(-1);
  const checkpoints =
    to === "failed" &&
    normalizedErrorCode &&
    latestCheckpoint?.status === "failed" &&
    latestCheckpoint.createdAt === now &&
    latestCheckpoint.errorCode === undefined
      ? run.checkpoints.map((checkpoint, index) =>
          index === run.checkpoints.length - 1
            ? { ...checkpoint, errorCode: normalizedErrorCode }
            : checkpoint,
        )
      : run.checkpoints;
  const archivesPriorReviewDecision =
    run.status === "review" &&
    to === "running" &&
    DECIDED_HUMAN_GATE_STATES.has(run.humanGate.state) &&
    input.humanGate !== undefined &&
    hasBoundAlpha2ReviewResumeApproval(run, nextHumanGate);
  const next = {
    ...run,
    status: to,
    updatedAt: now,
    startedAt: to === "running" ? (run.startedAt ?? now) : run.startedAt,
    finishedAt: ["completed", "cancelled"].includes(to) ? now : undefined,
    resumeAt: preservesResumeAt ? input.resumeAt : undefined,
    attempt: to === "running" && run.status === "queued" ? run.attempt + 1 : run.attempt,
    preExecutorResumeMode: to === "running" ? run.preExecutorResumeMode : undefined,
    humanGate: nextHumanGate,
    humanGateHistory: archivesPriorReviewDecision
      ? [...run.humanGateHistory, run.humanGate]
      : run.humanGateHistory,
    checkpoints,
    lastErrorCode: normalizedErrorCode,
  } satisfies Alpha2RunRecord;

  return Alpha2RunRecordSchema.parse(next);
}

function sameLifecycleValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertAppendOnlyPrefix(
  existing: readonly unknown[],
  incoming: readonly unknown[],
  errorCode: string,
) {
  if (
    incoming.length < existing.length ||
    existing.some((value, index) => !sameLifecycleValue(value, incoming[index]))
  ) {
    throw new Error(errorCode);
  }
}

function historyAppendsCurrentGate(existing: Alpha2RunRecord, incoming: Alpha2RunRecord) {
  return (
    incoming.humanGateHistory.length === existing.humanGateHistory.length + 1 &&
    existing.humanGateHistory.every((gate, index) =>
      sameLifecycleValue(gate, incoming.humanGateHistory[index]),
    ) &&
    sameLifecycleValue(incoming.humanGateHistory.at(-1), existing.humanGate)
  );
}

export function assertAlpha2RunEvolution(
  existing: Alpha2RunRecord,
  incoming: Alpha2RunRecord,
) {
  if (existing.kind !== incoming.kind) {
    throw new Error("alpha2_run_kind_is_immutable");
  }
  if (existing.riskClass !== incoming.riskClass) {
    throw new Error("alpha2_risk_class_is_immutable");
  }
  if (!sameLifecycleValue(existing.budget, incoming.budget)) {
    throw new Error("alpha2_budget_is_immutable");
  }
  if (!sameLifecycleValue(existing.route, incoming.route)) {
    throw new Error("alpha2_route_is_immutable");
  }
  if (
    existing.primaryRole !== incoming.primaryRole ||
    !sameLifecycleValue(existing.supportingRoles, incoming.supportingRoles)
  ) {
    throw new Error("alpha2_role_assignments_are_immutable");
  }
  if (
    !sameLifecycleValue(existing.primaryActor, incoming.primaryActor) ||
    !sameLifecycleValue(existing.assignedReviewActor, incoming.assignedReviewActor)
  ) {
    throw new Error("alpha2_principal_assignments_are_immutable");
  }
  if (existing.createdAt !== incoming.createdAt) {
    throw new Error("alpha2_run_created_at_is_immutable");
  }
  assertAppendOnlyPrefix(
    existing.childRunIds,
    incoming.childRunIds,
    "alpha2_child_run_history_conflict",
  );

  if (existing.status !== incoming.status) {
    assertAlpha2RunTransition(existing.status, incoming.status);
  }
  if (
    incoming.status === "completed" &&
    existing.status !== "review" &&
    findAlpha2CapabilityRoute(existing.route.capabilityClass)?.independentReviewRequired
  ) {
    throw new Error("alpha2_independent_review_required_before_completion");
  }

  assertAppendOnlyPrefix(
    existing.checkpoints,
    incoming.checkpoints,
    "alpha2_checkpoint_history_conflict",
  );
  if (
    new Set(incoming.checkpoints.map((checkpoint) => checkpoint.checkpointId)).size !==
    incoming.checkpoints.length
  ) {
    throw new Error("alpha2_checkpoint_id_conflict");
  }
  assertAppendOnlyPrefix(
    existing.evidenceRefs,
    incoming.evidenceRefs,
    "alpha2_evidence_history_conflict",
  );
  assertAppendOnlyPrefix(
    existing.safeTraceStepRefs,
    incoming.safeTraceStepRefs,
    "alpha2_safe_trace_history_conflict",
  );
  assertAppendOnlyPrefix(
    existing.artifactRefs,
    incoming.artifactRefs,
    "alpha2_artifact_history_conflict",
  );
  assertAppendOnlyPrefix(
    existing.humanGateHistory,
    incoming.humanGateHistory,
    "alpha2_human_gate_history_conflict",
  );

  const gateUnchanged = sameLifecycleValue(existing.humanGate, incoming.humanGate);
  const historyUnchanged = sameLifecycleValue(
    existing.humanGateHistory,
    incoming.humanGateHistory,
  );
  const archivesCurrentGate = historyAppendsCurrentGate(existing, incoming);
  const expectedReviewResumeMode =
    existing.humanGate.resumeMode ??
    (existing.attempt === 0 ? "start_new_attempt" : "resume_attempt");
  const addsBoundReviewResumeApproval =
    existing.status === "review" &&
    incoming.status === "running" &&
    incoming.humanGate.state === "approved" &&
    incoming.humanGate.resumeMode === expectedReviewResumeMode &&
    hasBoundAlpha2ReviewResumeApproval(existing, incoming.humanGate) &&
    ((existing.humanGate.state === "not_required" && historyUnchanged) ||
      (DECIDED_HUMAN_GATE_STATES.has(existing.humanGate.state) &&
        archivesCurrentGate));
  const addsBoundReviewCompletionApproval =
    existing.status === "review" &&
    incoming.status === "completed" &&
    existing.humanGate.state === "not_required" &&
    historyUnchanged &&
    hasBoundAlpha2ReviewCompletionApproval(existing, incoming.humanGate);
  const auditedReviewResume = addsBoundReviewResumeApproval;
  const boundReviewCompletion = addsBoundReviewCompletionApproval;

  if (
    existing.status === "review" &&
    incoming.status === "running" &&
    !auditedReviewResume
  ) {
    throw new Error("alpha2_review_exit_requires_audited_approval");
  }
  if (existing.status === "review" && incoming.status === "completed") {
    if (
      incoming.humanGate.state !== "approved" ||
      !incoming.humanGate.decisionRef ||
      !incoming.humanGate.decidedAt
    ) {
      throw new Error("alpha2_review_exit_requires_audited_approval");
    }
    if (!boundReviewCompletion) {
      throw new Error("alpha2_review_completion_requires_bound_approval");
    }
  }

  if (addsBoundReviewResumeApproval || addsBoundReviewCompletionApproval) {
    // An audited decision is the only valid not_required -> approved mutation
    // at a review exit.
  } else if (existing.humanGate.state === "pending") {
    if (incoming.humanGate.state === "pending") {
      if (!gateUnchanged || !historyUnchanged) {
        throw new Error("alpha2_pending_human_gate_is_immutable");
      }
    } else {
      if (!DECIDED_HUMAN_GATE_STATES.has(incoming.humanGate.state)) {
        throw new Error("alpha2_human_gate_exit_requires_decision");
      }
      if (
        existing.humanGate.gateRef &&
        incoming.humanGate.gateRef !== existing.humanGate.gateRef
      ) {
        throw new Error("alpha2_human_gate_approval_ref_mismatch");
      }
      if (
        existing.humanGate.resumeMode &&
        incoming.humanGate.resumeMode !== existing.humanGate.resumeMode
      ) {
        throw new Error("alpha2_human_gate_resume_mode_mismatch");
      }
      if (!historyUnchanged) {
        throw new Error("alpha2_human_gate_history_conflict");
      }
    }
  } else if (DECIDED_HUMAN_GATE_STATES.has(existing.humanGate.state)) {
    if (gateUnchanged) {
      if (!historyUnchanged) throw new Error("alpha2_human_gate_history_conflict");
    } else if (incoming.humanGate.state === "not_required") {
      if (
        existing.status !== "running" ||
        existing.humanGate.state !== "approved" ||
        !archivesCurrentGate
      ) {
        throw new Error("alpha2_human_gate_decision_is_immutable");
      }
    } else if (incoming.humanGate.state === "pending") {
      if (incoming.status !== "human_gate" || !archivesCurrentGate) {
        throw new Error("alpha2_human_gate_decision_is_immutable");
      }
    } else {
      throw new Error("alpha2_human_gate_decision_is_immutable");
    }
  } else if (gateUnchanged) {
    if (!historyUnchanged) throw new Error("alpha2_human_gate_history_conflict");
  } else if (incoming.humanGate.state === "pending") {
    if (incoming.status !== "human_gate" || !historyUnchanged) {
      throw new Error("alpha2_human_gate_evolution_invalid");
    }
  } else {
    throw new Error("alpha2_human_gate_evolution_invalid");
  }

  if (
    existing.status === "human_gate" &&
    ["running", "review"].includes(incoming.status) &&
    incoming.humanGate.state !== "approved"
  ) {
    throw new Error("alpha2_human_gate_exit_requires_approval");
  }
  if (
    incoming.status === "running" &&
    !["not_required", "approved"].includes(incoming.humanGate.state)
  ) {
    throw new Error("alpha2_execution_blocked_by_human_gate_decision");
  }

  const consumedStartApproval =
    existing.status === "running" &&
    existing.humanGate.state === "approved" &&
    incoming.humanGate.state === "not_required" &&
    existing.humanGate.resumeMode === "start_new_attempt";
  const expectedAttempt =
    existing.status === "queued" && incoming.status === "running"
      ? existing.attempt + 1
      : consumedStartApproval
        ? existing.attempt + 1
        : existing.attempt;
  if (incoming.attempt !== expectedAttempt) {
    throw new Error("alpha2_run_attempt_evolution_invalid");
  }

  const consumesApprovedResume =
    existing.status === "running" &&
    existing.humanGate.state === "approved" &&
    incoming.humanGate.state === "not_required";
  if (
    consumesApprovedResume &&
    ["start_new_attempt", "resume_attempt"].includes(existing.humanGate.resumeMode ?? "") &&
    incoming.preExecutorResumeMode !== existing.humanGate.resumeMode
  ) {
    throw new Error("alpha2_pre_executor_resume_marker_required");
  }

  if (incoming.preExecutorResumeMode) {
    const markerUnchanged =
      incoming.preExecutorResumeMode === existing.preExecutorResumeMode;
    const reservesNormalExecutorEntry =
      incoming.status === "running" &&
      incoming.humanGate.state === "not_required" &&
      gateUnchanged &&
      historyUnchanged &&
      ((existing.status === "queued" &&
        incoming.preExecutorResumeMode === "start_new_attempt") ||
        (existing.status === "waiting" &&
          incoming.preExecutorResumeMode === "resume_attempt"));
    const consumedApprovedResume =
      existing.status === "running" &&
      existing.humanGate.state === "approved" &&
      incoming.humanGate.state === "not_required" &&
      incoming.preExecutorResumeMode === existing.humanGate.resumeMode &&
      archivesCurrentGate;
    if (!markerUnchanged && !reservesNormalExecutorEntry && !consumedApprovedResume) {
      throw new Error("alpha2_pre_executor_resume_marker_invalid");
    }
  } else if (existing.preExecutorResumeMode) {
    const executorEntry =
      incoming.status === "running" &&
      incoming.humanGate.state === "not_required" &&
      gateUnchanged &&
      historyUnchanged;
    const replacesResumeWithGate =
      incoming.status === "human_gate" && incoming.humanGate.state === "pending";
    const persistsPreExecutorFailure =
      incoming.status === "failed" &&
      Boolean(incoming.lastErrorCode) &&
      incoming.checkpoints.length > existing.checkpoints.length &&
      incoming.checkpoints.at(-1)?.status === "failed" &&
      incoming.checkpoints.at(-1)?.errorCode === incoming.lastErrorCode;
    if (!executorEntry && !replacesResumeWithGate && !persistsPreExecutorFailure) {
      throw new Error("alpha2_pre_executor_resume_marker_invalid");
    }
  }
}

export function markAlpha2ExecutorEntered(
  run: Alpha2RunRecord,
  input: { now?: string } = {},
) {
  if (run.status !== "running" || !run.preExecutorResumeMode) {
    throw new Error("alpha2_pre_executor_resume_marker_missing");
  }
  return Alpha2RunRecordSchema.parse({
    ...run,
    updatedAt: input.now ?? new Date().toISOString(),
    preExecutorResumeMode: undefined,
  });
}

export function appendAlpha2Checkpoint(
  run: Alpha2RunRecord,
  checkpoint: Omit<Alpha2Checkpoint, "status"> & { status?: Alpha2RunStatus },
): Alpha2RunRecord {
  const candidate = Alpha2CheckpointSchema.parse({
    ...checkpoint,
    status: checkpoint.status ?? run.status,
  });
  const existing = run.checkpoints.find(
    (entry) => entry.checkpointId === candidate.checkpointId,
  );
  if (existing) {
    const { createdAt: _existingCreatedAt, ...existingIdentity } = existing;
    const { createdAt: _candidateCreatedAt, ...candidateIdentity } = candidate;
    if (JSON.stringify(existingIdentity) !== JSON.stringify(candidateIdentity)) {
      throw new Error("alpha2_checkpoint_id_conflict");
    }
    return run;
  }

  return Alpha2RunRecordSchema.parse({
    ...run,
    updatedAt: checkpoint.createdAt,
    checkpoints: [
      ...run.checkpoints,
      candidate,
    ],
  });
}

export function linkAlpha2ChildRun(parent: Alpha2RunRecord, child: Alpha2RunRecord): Alpha2RunRecord {
  if (child.parentRunId !== parent.runId) {
    throw new Error("alpha2_child_parent_mismatch");
  }
  if (child.rootRunId !== parent.rootRunId) {
    throw new Error("alpha2_child_root_mismatch");
  }
  if (parent.childRunIds.includes(child.runId)) return parent;

  return Alpha2RunRecordSchema.parse({
    ...parent,
    childRunIds: [...parent.childRunIds, child.runId],
  });
}
