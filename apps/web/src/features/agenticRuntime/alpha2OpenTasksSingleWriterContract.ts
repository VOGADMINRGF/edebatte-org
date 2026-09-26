import {
  extractAlpha2OperativeOpenTasksHead,
  findAlpha2OpenTask,
  type Alpha2OpenTaskStatus,
  type Alpha2TaskOwnershipEvidence,
} from "@/features/agenticRuntime/alpha2OpenTasksEligibilityContract";

export const ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION = 1 as const;

export const ALPHA2_OPENTASKS_SINGLE_WRITER_GUARDRAILS = {
  secondOpenTasksAuthorityAllowed: false,
  lastWriterWinsAllowed: false,
  directGitHubMutationAllowed: false,
  mergeAuthorizationIncluded: false,
  deployAuthorizationIncluded: false,
  publishAuthorizationIncluded: false,
  human447AuthorityRetained: true,
  automaticCutoverAllowed: false,
  historicalCatalogMutationAllowed: false,
  secretInputAllowed: false,
} as const;

export type Alpha2OpenTasksMutationDecision =
  | "ready"
  | "blocked"
  | "already_applied";

export type Alpha2OpenTasksMutationInput = {
  openTasksText: string;
  expectedFileRevision: string;
  observedFileRevision: string;
  taskId: string;
  expectedFromStatus: Alpha2OpenTaskStatus;
  toStatus: Alpha2OpenTaskStatus;
  actorId: string;
  runId: string;
  evidenceRefs: readonly string[];
  requestedAt: string;
  dependenciesSatisfied: boolean;
  ownership?: Alpha2TaskOwnershipEvidence;
  humanGateRequired?: boolean;
  human447Authorization?: boolean;
};

export type Alpha2OpenTasksMutationPlan = {
  schemaVersion: typeof ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION;
  decision: Alpha2OpenTasksMutationDecision;
  taskId: string;
  fromStatus: Alpha2OpenTaskStatus;
  toStatus: Alpha2OpenTaskStatus;
  expectedFileRevision: string;
  observedFileRevision: string;
  idempotencyKey: string;
  actorId: string;
  runId: string;
  evidenceRefs: string[];
  requestedAt: string;
  reasonCodes: string[];
  directWriteAllowed: false;
  requiresCompareAndSwap: true;
  human447AuthorityRetained: true;
};

export type Alpha2OpenTasksMutationReceipt = {
  schemaVersion: typeof ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION;
  taskId: string;
  fromStatus: Alpha2OpenTaskStatus;
  toStatus: Alpha2OpenTaskStatus;
  actorId: string;
  runId: string;
  evidenceRefs: string[];
  requestedAt: string;
  idempotencyKey: string;
  applied: boolean;
  alreadyApplied: boolean;
  containsSecret: false;
  containsRawOpenTasks: false;
};

export type Alpha2OpenTasksMutationApplyResult = {
  decision: "applied" | "blocked" | "already_applied";
  nextText: string;
  reasonCodes: string[];
  receipt: Alpha2OpenTasksMutationReceipt;
};

const HISTORY_MARKERS = ["## Historischer Katalog und Evidenz", "## Historisches Archiv"] as const;

function unique(values: string[]) {
  return [...new Set(values)];
}

function cleanRefs(values: readonly string[]) {
  return unique(values.map((value) => value.trim()).filter(Boolean));
}

function safeKeyPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 180);
}

function buildIdempotencyKey(input: {
  taskId: string;
  fromStatus: Alpha2OpenTaskStatus;
  toStatus: Alpha2OpenTaskStatus;
  expectedFileRevision: string;
  runId: string;
}) {
  return [
    "alpha2-opentasks:v1",
    safeKeyPart(input.taskId),
    `${input.fromStatus}->${input.toStatus}`,
    safeKeyPart(input.expectedFileRevision),
    safeKeyPart(input.runId),
  ].join(":");
}

function hasOwner(ownership: Alpha2TaskOwnershipEvidence | undefined) {
  return Boolean(ownership?.branch || ownership?.prNumber);
}

function hasFreshReviewEvidence(ownership: Alpha2TaskOwnershipEvidence | undefined) {
  return Boolean(
    hasOwner(ownership) &&
      ownership?.exactHead === true &&
      ownership.ciState === "success" &&
      typeof ownership.unresolvedReviewThreads === "number" &&
      ownership.unresolvedReviewThreads === 0,
  );
}

function isHumanControlledTransition(
  fromStatus: Alpha2OpenTaskStatus,
  toStatus: Alpha2OpenTaskStatus,
) {
  return (
    (fromStatus === "blocked" && toStatus === "codex_ready") ||
    (fromStatus === "review" && toStatus === "done") ||
    ((fromStatus === "review" || fromStatus === "manual_gate") && toStatus === "codex_ready")
  );
}

function transitionAllowed(input: Alpha2OpenTasksMutationInput, reasons: string[]) {
  const { expectedFromStatus: fromStatus, toStatus } = input;

  if (fromStatus === toStatus) {
    reasons.push("status_unchanged");
    return false;
  }

  if (fromStatus === "done") {
    reasons.push("done_is_terminal");
    return false;
  }

  if (isHumanControlledTransition(fromStatus, toStatus)) {
    if (input.human447Authorization !== true) {
      reasons.push("human_447_authorization_required");
      return false;
    }
    return true;
  }

  if (fromStatus === "codex_ready" && toStatus === "in_progress") {
    if (!input.dependenciesSatisfied) reasons.push("dependencies_not_satisfied");
    if (!hasOwner(input.ownership)) reasons.push("owner_evidence_required");
    if (input.ownership?.exactHead !== true) reasons.push("owner_not_exact_head");
    return reasons.length === 0;
  }

  if (
    (fromStatus === "codex_ready" || fromStatus === "in_progress") &&
    toStatus === "review"
  ) {
    if (!input.dependenciesSatisfied) reasons.push("dependencies_not_satisfied");
    if (!hasFreshReviewEvidence(input.ownership)) reasons.push("fresh_review_evidence_required");
    return reasons.length === 0;
  }

  if (
    (fromStatus === "codex_ready" || fromStatus === "in_progress" || fromStatus === "review") &&
    toStatus === "manual_gate"
  ) {
    if (input.humanGateRequired !== true) reasons.push("human_gate_evidence_required");
    return reasons.length === 0;
  }

  reasons.push("transition_not_authorized");
  return false;
}

function findHistoryStart(text: string) {
  const starts = HISTORY_MARKERS.map((marker) => text.indexOf(marker)).filter((index) => index >= 0);
  return starts.length > 0 ? Math.min(...starts) : -1;
}

function findOperativeTaskLine(text: string, taskId: string) {
  const head = extractAlpha2OperativeOpenTasksHead(text);
  const headStart = text.indexOf(head);
  const matching = head
    .split(/\r?\n/)
    .map((line) => ({ line, trimmed: line.trim() }))
    .filter(({ trimmed }) => trimmed.startsWith(`| ${taskId} |`));

  if (matching.length !== 1) {
    throw new Error(`alpha2_single_writer_task_line_count:${taskId}:${matching.length}`);
  }

  const line = matching[0]!.line;
  const relativeStart = head.indexOf(line);
  if (relativeStart < 0) throw new Error("alpha2_single_writer_task_line_offset_missing");

  return {
    line,
    start: headStart + relativeStart,
    end: headStart + relativeStart + line.length,
  };
}

export function planAlpha2OpenTasksMutation(
  input: Alpha2OpenTasksMutationInput,
): Alpha2OpenTasksMutationPlan {
  const reasons: string[] = [];
  const evidenceRefs = cleanRefs(input.evidenceRefs);
  const idempotencyKey = buildIdempotencyKey({
    taskId: input.taskId,
    fromStatus: input.expectedFromStatus,
    toStatus: input.toStatus,
    expectedFileRevision: input.expectedFileRevision,
    runId: input.runId,
  });

  if (!input.taskId.trim()) reasons.push("task_id_required");
  if (!input.actorId.trim()) reasons.push("actor_id_required");
  if (!input.runId.trim()) reasons.push("run_id_required");
  if (!input.expectedFileRevision.trim()) reasons.push("expected_file_revision_required");
  if (!input.observedFileRevision.trim()) reasons.push("observed_file_revision_required");
  if (!Number.isFinite(Date.parse(input.requestedAt))) reasons.push("requested_at_invalid");
  if (evidenceRefs.length === 0) reasons.push("evidence_refs_required");

  let task = null;
  try {
    task = findAlpha2OpenTask(input.openTasksText, input.taskId);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "opentasks_parse_failed");
  }

  if (!task) {
    reasons.push("task_missing_from_operative_head");
  } else if (task.status === input.toStatus) {
    return {
      schemaVersion: ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION,
      decision: "already_applied",
      taskId: input.taskId,
      fromStatus: input.expectedFromStatus,
      toStatus: input.toStatus,
      expectedFileRevision: input.expectedFileRevision,
      observedFileRevision: input.observedFileRevision,
      idempotencyKey,
      actorId: input.actorId,
      runId: input.runId,
      evidenceRefs,
      requestedAt: input.requestedAt,
      reasonCodes: ["target_status_already_present"],
      directWriteAllowed: false,
      requiresCompareAndSwap: true,
      human447AuthorityRetained: true,
    };
  } else if (task.status !== input.expectedFromStatus) {
    reasons.push(`task_status_conflict:${task.status}`);
  }

  if (input.observedFileRevision !== input.expectedFileRevision) {
    reasons.push("file_revision_conflict");
  }

  if (reasons.length === 0) transitionAllowed(input, reasons);

  return {
    schemaVersion: ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION,
    decision: reasons.length === 0 ? "ready" : "blocked",
    taskId: input.taskId,
    fromStatus: input.expectedFromStatus,
    toStatus: input.toStatus,
    expectedFileRevision: input.expectedFileRevision,
    observedFileRevision: input.observedFileRevision,
    idempotencyKey,
    actorId: input.actorId,
    runId: input.runId,
    evidenceRefs,
    requestedAt: input.requestedAt,
    reasonCodes: unique(reasons),
    directWriteAllowed: false,
    requiresCompareAndSwap: true,
    human447AuthorityRetained: true,
  };
}

function buildReceipt(plan: Alpha2OpenTasksMutationPlan, applied: boolean, alreadyApplied: boolean) {
  return {
    schemaVersion: ALPHA2_OPENTASKS_SINGLE_WRITER_SCHEMA_VERSION,
    taskId: plan.taskId,
    fromStatus: plan.fromStatus,
    toStatus: plan.toStatus,
    actorId: plan.actorId,
    runId: plan.runId,
    evidenceRefs: plan.evidenceRefs,
    requestedAt: plan.requestedAt,
    idempotencyKey: plan.idempotencyKey,
    applied,
    alreadyApplied,
    containsSecret: false,
    containsRawOpenTasks: false,
  } satisfies Alpha2OpenTasksMutationReceipt;
}

export function applyAlpha2OpenTasksMutation(input: {
  currentText: string;
  currentFileRevision: string;
  plan: Alpha2OpenTasksMutationPlan;
}): Alpha2OpenTasksMutationApplyResult {
  const { plan } = input;

  const currentTask = findAlpha2OpenTask(input.currentText, plan.taskId);
  if (currentTask?.status === plan.toStatus) {
    return {
      decision: "already_applied",
      nextText: input.currentText,
      reasonCodes: ["target_status_already_present"],
      receipt: buildReceipt(plan, false, true),
    };
  }

  if (plan.decision !== "ready") {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: plan.reasonCodes,
      receipt: buildReceipt(plan, false, false),
    };
  }

  if (input.currentFileRevision !== plan.expectedFileRevision) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: ["compare_and_swap_failed"],
      receipt: buildReceipt(plan, false, false),
    };
  }

  if (!currentTask) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: ["task_missing_from_operative_head"],
      receipt: buildReceipt(plan, false, false),
    };
  }

  if (currentTask.status !== plan.fromStatus) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: [`task_status_conflict:${currentTask.status}`],
      receipt: buildReceipt(plan, false, false),
    };
  }

  const historyStart = findHistoryStart(input.currentText);
  if (historyStart < 0) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: ["history_boundary_missing"],
      receipt: buildReceipt(plan, false, false),
    };
  }
  const historyTail = input.currentText.slice(historyStart);

  let taskLine;
  try {
    taskLine = findOperativeTaskLine(input.currentText, plan.taskId);
  } catch (error) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: [error instanceof Error ? error.message : "task_line_resolution_failed"],
      receipt: buildReceipt(plan, false, false),
    };
  }

  const expectedCell = `| ${plan.taskId} | ${plan.fromStatus} |`;
  const replacementCell = `| ${plan.taskId} | ${plan.toStatus} |`;
  if (!taskLine.line.trim().startsWith(expectedCell)) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: ["task_line_status_cell_mismatch"],
      receipt: buildReceipt(plan, false, false),
    };
  }

  const nextLine = taskLine.line.replace(expectedCell, replacementCell);
  const nextText =
    input.currentText.slice(0, taskLine.start) + nextLine + input.currentText.slice(taskLine.end);

  if (nextText.slice(nextText.indexOf(historyTail)) !== historyTail) {
    return {
      decision: "blocked",
      nextText: input.currentText,
      reasonCodes: ["historical_catalog_changed"],
      receipt: buildReceipt(plan, false, false),
    };
  }

  return {
    decision: "applied",
    nextText,
    reasonCodes: [],
    receipt: buildReceipt(plan, true, false),
  };
}

export function buildAlpha2OpenTasksSingleWriterSafeTrace(plan: Alpha2OpenTasksMutationPlan) {
  return {
    schemaVersion: plan.schemaVersion,
    taskId: plan.taskId,
    fromStatus: plan.fromStatus,
    toStatus: plan.toStatus,
    decision: plan.decision,
    actorId: plan.actorId,
    runId: plan.runId,
    evidenceRefCount: plan.evidenceRefs.length,
    idempotencyKey: plan.idempotencyKey,
    reasonCodes: plan.reasonCodes,
    containsSecret: false,
    containsRawOpenTasks: false,
    containsCredential: false,
    containsToken: false,
    directGitHubMutationAllowed: false,
  } as const;
}
