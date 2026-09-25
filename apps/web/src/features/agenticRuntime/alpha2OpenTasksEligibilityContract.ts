export const ALPHA2_OPEN_TASK_STATUSES = [
  "blocked",
  "codex_ready",
  "in_progress",
  "review",
  "manual_gate",
  "done",
] as const;

export type Alpha2OpenTaskStatus = (typeof ALPHA2_OPEN_TASK_STATUSES)[number];

export type Alpha2OpenTaskRecord = {
  id: string;
  status: Alpha2OpenTaskStatus;
  priority: string;
  dependencies: string;
  scope: string;
  acceptance: string;
};

export type Alpha2TaskOwnershipEvidence = {
  branch?: string | null;
  prNumber?: number | null;
  exactHead?: boolean | null;
  ciState?: "unknown" | "pending" | "success" | "failure";
  unresolvedReviewThreads?: number | null;
};

export type Alpha2TaskEligibility = {
  taskId: string;
  status: Alpha2OpenTaskStatus;
  newSliceEligible: boolean;
  continuationEligible: boolean;
  mustReuseExistingOwner: boolean;
  requiresHumanDecision: boolean;
  reasonCodes: string[];
  ownership: Alpha2TaskOwnershipEvidence;
};

const STATUS_SET = new Set<string>(ALPHA2_OPEN_TASK_STATUSES);
const OPERATIVE_HEAD_MARKER = "## Kanonischer Operativteil";
const HISTORY_MARKERS = ["## Historischer Katalog und Evidenz", "## Historisches Archiv"] as const;

function cleanCell(value: string | undefined) {
  return (value ?? "").trim();
}

export function extractAlpha2OperativeOpenTasksHead(text: string) {
  const headStart = text.indexOf(OPERATIVE_HEAD_MARKER);
  if (headStart === -1) {
    throw new Error("alpha2_opentasks_operativteil_missing");
  }

  const historyStarts = HISTORY_MARKERS.map((marker) => text.indexOf(marker, headStart + 1)).filter(
    (index) => index !== -1,
  );
  const historyStart = historyStarts.length > 0 ? Math.min(...historyStarts) : -1;

  if (historyStart === -1 || historyStart <= headStart) {
    throw new Error("alpha2_opentasks_history_boundary_missing");
  }

  return text.slice(headStart, historyStart);
}

/**
 * Parse only the canonical operative OpenTasks head without creating another backlog truth.
 * Historical/archive sections are never eligible input, even when they contain recognized
 * statuses such as codex_ready.
 */
export function parseAlpha2CanonicalOpenTasks(text: string): Alpha2OpenTaskRecord[] {
  const records = new Map<string, Alpha2OpenTaskRecord>();
  const seenTaskIds = new Set<string>();
  const operativeHead = extractAlpha2OperativeOpenTasksHead(text);

  for (const rawLine of operativeHead.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2) continue;
    const id = cleanCell(cells[0]);
    const status = cleanCell(cells[1]);

    if (!id || id === "ID" || id.startsWith("---")) continue;
    if (seenTaskIds.has(id)) {
      throw new Error(`alpha2_duplicate_task_id_in_operative_head:${id}`);
    }
    seenTaskIds.add(id);

    if (!STATUS_SET.has(status)) continue;

    records.set(id, {
      id,
      status: status as Alpha2OpenTaskStatus,
      priority: cleanCell(cells[2]),
      dependencies: cleanCell(cells[3]),
      scope: cleanCell(cells[4]),
      acceptance: cleanCell(cells[5]),
    });
  }

  return [...records.values()];
}

export function findAlpha2OpenTask(text: string, taskId: string) {
  return parseAlpha2CanonicalOpenTasks(text).find((task) => task.id === taskId) ?? null;
}

export function evaluateAlpha2TaskEligibility(input: {
  task: Alpha2OpenTaskRecord;
  ownership?: Alpha2TaskOwnershipEvidence;
}): Alpha2TaskEligibility {
  const ownership = input.ownership ?? {};
  const hasOwner = Boolean(ownership.branch || ownership.prNumber);
  const reasonCodes: string[] = [];

  let newSliceEligible = false;
  let continuationEligible = false;
  let mustReuseExistingOwner = false;
  let requiresHumanDecision = false;

  switch (input.task.status) {
    case "codex_ready":
      if (hasOwner) {
        continuationEligible = true;
        mustReuseExistingOwner = true;
        reasonCodes.push("existing_owner_must_be_reused");
      } else {
        newSliceEligible = true;
        reasonCodes.push("codex_ready_without_existing_owner");
      }
      break;
    case "in_progress":
      if (hasOwner) {
        continuationEligible = true;
        mustReuseExistingOwner = true;
        reasonCodes.push("in_progress_reuse_existing_owner");
      } else {
        requiresHumanDecision = true;
        reasonCodes.push("in_progress_missing_owner_evidence");
      }
      break;
    case "review":
      requiresHumanDecision = true;
      reasonCodes.push("review_is_fail_closed");
      break;
    case "manual_gate":
      requiresHumanDecision = true;
      reasonCodes.push("manual_gate_is_fail_closed");
      break;
    case "blocked":
      reasonCodes.push("task_blocked");
      break;
    case "done":
      reasonCodes.push("task_already_done");
      break;
  }

  if (ownership.ciState === "failure") {
    newSliceEligible = false;
    reasonCodes.push("ci_failure_requires_repair_or_review");
  }

  if ((ownership.unresolvedReviewThreads ?? 0) > 0) {
    newSliceEligible = false;
    reasonCodes.push("unresolved_review_threads");
  }

  if (ownership.exactHead === false && hasOwner) {
    continuationEligible = false;
    reasonCodes.push("owner_not_on_exact_head");
  }

  return {
    taskId: input.task.id,
    status: input.task.status,
    newSliceEligible,
    continuationEligible,
    mustReuseExistingOwner,
    requiresHumanDecision,
    reasonCodes,
    ownership,
  };
}

export function listAlpha2EligibleTasks(input: {
  openTasksText: string;
  ownershipByTaskId?: Record<string, Alpha2TaskOwnershipEvidence | undefined>;
}) {
  return parseAlpha2CanonicalOpenTasks(input.openTasksText)
    .map((task) =>
      evaluateAlpha2TaskEligibility({
        task,
        ownership: input.ownershipByTaskId?.[task.id],
      }),
    )
    .filter((result) => result.newSliceEligible || result.continuationEligible);
}
