import type {
  PersonalVoxyNotificationPolicy,
} from "@/features/agenticRuntime/personalVoxyProfileConsentOnboardingContract";
import type {
  VoxyToolCapabilityId,
} from "@/features/agenticRuntime/voxyToolCapabilityAdaptersContract";

export const VOXY_PROACTIVE_WATCH_SCHEMA_VERSION = "voxy.proactive-watch.v1" as const;

export const VOXY_PROACTIVE_WATCH_TRIGGER_KINDS = [
  "time",
  "recurrence",
  "state_change",
] as const;

export const VOXY_PROACTIVE_WATCH_STATUSES = [
  "active",
  "paused",
  "cancelled",
  "revoked",
  "completed",
] as const;

export const VOXY_PROACTIVE_WATCH_GUARDRAILS = {
  secondSchedulerAllowed: false,
  secondQueueAllowed: false,
  directNotificationAllowed: false,
  directToolExecutionAllowed: false,
  unboundedPollingAllowed: false,
  staleConsentExecutionAllowed: false,
  quietHoursBypassAllowed: false,
  unsubscribeBypassAllowed: false,
  humanGateDowngradeAllowed: false,
  politicalProfilingAllowed: false,
  politicalPersuasionAllowed: false,
  autoVoteAllowed: false,
  autoPublishAllowed: false,
  truthStatusMayChange: false,
  evidenceWeightingMayChange: false,
  safeTraceMayContainPrompt: false,
  safeTraceMayContainSecret: false,
  safeTraceMayContainRawPersonalData: false,
} as const;

export type VoxyProactiveWatchTriggerKind =
  (typeof VOXY_PROACTIVE_WATCH_TRIGGER_KINDS)[number];
export type VoxyProactiveWatchStatus =
  (typeof VOXY_PROACTIVE_WATCH_STATUSES)[number];

export type VoxyProactiveWatchTrigger =
  | {
      kind: "time";
      at: string;
    }
  | {
      kind: "recurrence";
      everyMinutes: number;
      nextEligibleAt: string;
    }
  | {
      kind: "state_change";
      ownerRef: string;
      conditionRef: string;
      nextEligibleAt: string;
      pollEveryMinutes: number;
      maxChecks: number;
      checksPerformed: number;
    };

export type VoxyProactiveWatchTask = {
  schemaVersion: typeof VOXY_PROACTIVE_WATCH_SCHEMA_VERSION;
  watchId: string;
  actorId: string;
  conversationId: string | null;
  status: VoxyProactiveWatchStatus;
  generation: number;
  capabilityId: VoxyToolCapabilityId;
  capabilityVersion: number;
  domainOwnerRef: string;
  trigger: VoxyProactiveWatchTrigger;
  locale: string;
  timezone: string;
  consentRevision: number;
  notificationPolicy: PersonalVoxyNotificationPolicy;
  createdAt: string;
  updatedAt: string;
  lastCompletedGeneration: number | null;
  guardrails: typeof VOXY_PROACTIVE_WATCH_GUARDRAILS;
};

export type VoxyProactiveWatchRuntimeContext = {
  now: string;
  currentConsentRevision: number;
  notificationsAllowed: boolean;
  unsubscribed: boolean;
  quietHoursBlocked: boolean;
  stateConditionMet?: boolean;
};

export type VoxyProactiveWatchActionCandidate = {
  candidateId: string;
  watchId: string;
  actorId: string;
  conversationId: string | null;
  generation: number;
  capabilityId: VoxyToolCapabilityId;
  capabilityVersion: number;
  domainOwnerRef: string;
  idempotencyKey: string;
  requiresVoxyToolCapabilityGate: true;
  requiresAlpha2ActionGate: true;
  requiresAlpha2ExecutionFence: true;
  directExecutionAllowed: false;
  directNotificationAllowed: false;
};

export type VoxyProactiveWatchEvaluation = {
  decision:
    | "blocked"
    | "not_due"
    | "condition_not_met"
    | "candidate_ready"
    | "completed";
  candidate: VoxyProactiveWatchActionCandidate | null;
  nextEligibleAt: string | null;
  reasonCodes: readonly string[];
};

export type VoxyProactiveWatchSafeTrace = {
  schemaVersion: typeof VOXY_PROACTIVE_WATCH_SCHEMA_VERSION;
  watchId: string;
  actorId: string;
  generation: number;
  status: VoxyProactiveWatchStatus;
  decision: VoxyProactiveWatchEvaluation["decision"];
  capabilityId: VoxyToolCapabilityId;
  domainOwnerRef: string;
  reasonCodes: readonly string[];
  containsPrompt: false;
  containsSecret: false;
  containsRawPersonalData: false;
};

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const MAX_RECURRENCE_MINUTES = 60 * 24 * 365;
const MIN_RECURRENCE_MINUTES = 60;
const MAX_STATE_CHANGE_CHECKS = 10_000;

function stableId(value: string | null | undefined) {
  return typeof value === "string" && STABLE_ID.test(value.trim());
}

function positiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function parseIso(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validLocale(value: string) {
  return /^[A-Za-z]{2,16}(?:-[A-Za-z0-9]{2,16})*$/.test(value.trim());
}

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function dueAt(trigger: VoxyProactiveWatchTrigger) {
  return trigger.kind === "time" ? trigger.at : trigger.nextEligibleAt;
}

function candidateId(watch: VoxyProactiveWatchTask) {
  return `watch-candidate:${watch.watchId}:g${watch.generation}`;
}

export function validateVoxyProactiveWatchTask(
  watch: VoxyProactiveWatchTask,
): readonly string[] {
  const reasons: string[] = [];
  if (watch.schemaVersion !== VOXY_PROACTIVE_WATCH_SCHEMA_VERSION) {
    reasons.push("schema_version_invalid");
  }
  if (!stableId(watch.watchId)) reasons.push("watch_id_invalid");
  if (!stableId(watch.actorId)) reasons.push("actor_id_invalid");
  if (watch.conversationId !== null && !stableId(watch.conversationId)) {
    reasons.push("conversation_id_invalid");
  }
  if (!positiveInteger(watch.generation)) reasons.push("generation_invalid");
  if (!positiveInteger(watch.capabilityVersion)) reasons.push("capability_version_invalid");
  if (!stableId(watch.domainOwnerRef)) reasons.push("domain_owner_ref_invalid");
  if (!validLocale(watch.locale)) reasons.push("locale_invalid");
  if (!validTimezone(watch.timezone)) reasons.push("timezone_invalid");
  if (!positiveInteger(watch.consentRevision)) reasons.push("consent_revision_invalid");
  if (parseIso(watch.createdAt) === null) reasons.push("created_at_invalid");
  if (parseIso(watch.updatedAt) === null) reasons.push("updated_at_invalid");
  if (
    watch.lastCompletedGeneration !== null &&
    (!positiveInteger(watch.lastCompletedGeneration) ||
      watch.lastCompletedGeneration > watch.generation)
  ) {
    reasons.push("last_completed_generation_invalid");
  }

  if (parseIso(dueAt(watch.trigger)) === null) reasons.push("next_eligible_at_invalid");

  if (watch.trigger.kind === "recurrence") {
    if (
      !positiveInteger(watch.trigger.everyMinutes) ||
      watch.trigger.everyMinutes < MIN_RECURRENCE_MINUTES ||
      watch.trigger.everyMinutes > MAX_RECURRENCE_MINUTES
    ) {
      reasons.push("recurrence_interval_out_of_bounds");
    }
  }

  if (watch.trigger.kind === "state_change") {
    if (!stableId(watch.trigger.ownerRef)) reasons.push("state_owner_ref_invalid");
    if (!stableId(watch.trigger.conditionRef)) reasons.push("condition_ref_invalid");
    if (
      !positiveInteger(watch.trigger.pollEveryMinutes) ||
      watch.trigger.pollEveryMinutes < MIN_RECURRENCE_MINUTES ||
      watch.trigger.pollEveryMinutes > MAX_RECURRENCE_MINUTES
    ) {
      reasons.push("state_poll_interval_out_of_bounds");
    }
    if (
      !positiveInteger(watch.trigger.maxChecks) ||
      watch.trigger.maxChecks > MAX_STATE_CHANGE_CHECKS
    ) {
      reasons.push("state_max_checks_out_of_bounds");
    }
    if (
      !Number.isInteger(watch.trigger.checksPerformed) ||
      watch.trigger.checksPerformed < 0 ||
      watch.trigger.checksPerformed > watch.trigger.maxChecks
    ) {
      reasons.push("state_checks_performed_invalid");
    }
  }

  return reasons;
}

export function resolveVoxyProactiveWatch(
  watch: VoxyProactiveWatchTask,
  runtime: VoxyProactiveWatchRuntimeContext,
): VoxyProactiveWatchEvaluation {
  const invalid = validateVoxyProactiveWatchTask(watch);
  if (invalid.length > 0) {
    return { decision: "blocked", candidate: null, nextEligibleAt: null, reasonCodes: invalid };
  }

  if (["cancelled", "revoked"].includes(watch.status)) {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: [`watch_status:${watch.status}`],
    };
  }
  if (watch.status === "paused") {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: dueAt(watch.trigger),
      reasonCodes: ["watch_paused"],
    };
  }
  if (watch.status === "completed") {
    return {
      decision: "completed",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["watch_completed"],
    };
  }
  if (watch.lastCompletedGeneration === watch.generation) {
    return {
      decision: "completed",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["generation_already_completed"],
    };
  }

  if (
    !positiveInteger(runtime.currentConsentRevision) ||
    runtime.currentConsentRevision !== watch.consentRevision
  ) {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["stale_consent_revision"],
    };
  }
  if (!runtime.notificationsAllowed || watch.notificationPolicy === "off") {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["notifications_not_consented"],
    };
  }
  if (runtime.unsubscribed) {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["notifications_unsubscribed"],
    };
  }

  const now = parseIso(runtime.now);
  const eligibleAt = parseIso(dueAt(watch.trigger));
  if (now === null || eligibleAt === null) {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: null,
      reasonCodes: ["runtime_time_invalid"],
    };
  }
  if (now < eligibleAt) {
    return {
      decision: "not_due",
      candidate: null,
      nextEligibleAt: dueAt(watch.trigger),
      reasonCodes: ["next_eligible_at_not_reached"],
    };
  }

  if (watch.trigger.kind === "state_change") {
    if (watch.trigger.checksPerformed >= watch.trigger.maxChecks) {
      return {
        decision: "completed",
        candidate: null,
        nextEligibleAt: null,
        reasonCodes: ["state_change_check_budget_exhausted"],
      };
    }
    if (runtime.stateConditionMet !== true) {
      return {
        decision: "condition_not_met",
        candidate: null,
        nextEligibleAt: watch.trigger.nextEligibleAt,
        reasonCodes: ["state_change_condition_not_met"],
      };
    }
  }

  if (runtime.quietHoursBlocked) {
    return {
      decision: "blocked",
      candidate: null,
      nextEligibleAt: dueAt(watch.trigger),
      reasonCodes: ["quiet_hours"],
    };
  }

  const idempotencyKey = `voxy-watch:v1:${watch.watchId}:g${watch.generation}`;
  return {
    decision: "candidate_ready",
    candidate: {
      candidateId: candidateId(watch),
      watchId: watch.watchId,
      actorId: watch.actorId,
      conversationId: watch.conversationId,
      generation: watch.generation,
      capabilityId: watch.capabilityId,
      capabilityVersion: watch.capabilityVersion,
      domainOwnerRef: watch.domainOwnerRef,
      idempotencyKey,
      requiresVoxyToolCapabilityGate: true,
      requiresAlpha2ActionGate: true,
      requiresAlpha2ExecutionFence: true,
      directExecutionAllowed: false,
      directNotificationAllowed: false,
    },
    nextEligibleAt: null,
    reasonCodes: ["watch_candidate_requires_existing_execution_gates"],
  };
}

export function transitionVoxyProactiveWatch(input: {
  watch: VoxyProactiveWatchTask;
  action: "pause" | "resume" | "cancel" | "revoke" | "complete_generation";
  at: string;
}): VoxyProactiveWatchTask {
  const at = new Date(input.at);
  if (Number.isNaN(at.getTime())) throw new Error("watch_transition_timestamp_invalid");

  if (["cancelled", "revoked", "completed"].includes(input.watch.status)) {
    if (input.action === "complete_generation" && input.watch.status === "completed") {
      return input.watch;
    }
    throw new Error(`watch_terminal:${input.watch.status}`);
  }

  if (input.action === "complete_generation") {
    return {
      ...input.watch,
      status: input.watch.trigger.kind === "time" ? "completed" : input.watch.status,
      lastCompletedGeneration: input.watch.generation,
      updatedAt: at.toISOString(),
    };
  }

  const status: VoxyProactiveWatchStatus =
    input.action === "pause"
      ? "paused"
      : input.action === "resume"
        ? "active"
        : input.action === "cancel"
          ? "cancelled"
          : "revoked";

  return {
    ...input.watch,
    status,
    generation: input.watch.generation + 1,
    updatedAt: at.toISOString(),
  };
}

export function buildVoxyProactiveWatchSafeTrace(input: {
  watch: VoxyProactiveWatchTask;
  evaluation: VoxyProactiveWatchEvaluation;
}): VoxyProactiveWatchSafeTrace {
  return {
    schemaVersion: VOXY_PROACTIVE_WATCH_SCHEMA_VERSION,
    watchId: input.watch.watchId,
    actorId: input.watch.actorId,
    generation: input.watch.generation,
    status: input.watch.status,
    decision: input.evaluation.decision,
    capabilityId: input.watch.capabilityId,
    domainOwnerRef: input.watch.domainOwnerRef,
    reasonCodes: input.evaluation.reasonCodes,
    containsPrompt: false,
    containsSecret: false,
    containsRawPersonalData: false,
  };
}
