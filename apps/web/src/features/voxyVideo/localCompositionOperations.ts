import "server-only";

import { coreCol, shouldUseInMemoryMongoFallback } from "@core/db/triMongo";
import { getReviewQueueOperationsRepository } from "@features/reviewQueueOperations";
import { loadAlpha2AgentFleetRegistry } from "@/features/agenticRuntime/alpha2AgentFleetContract";
import { getVoxyEditorialCouncilArtifactRepository } from "./editorialAgentCouncilStore";
import { getVoxyLocalCompositionAudioInputRepository } from "./localCompositionAudioAssetStore";
import type { VoxyLocalCompositionJob } from "./localCompositionRuntime";
import { VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS } from "./localCompositionRuntimeService";
import { getVoxyLocalCompositionRepository } from "./localCompositionRuntimeStore";

export const VOXY_OPERATIONS_SNAPSHOT_VERSION = "voxy-operations-snapshot-v1" as const;
export const VOXY_WORKER_HEARTBEAT_VERSION = "voxy-worker-heartbeat-v1" as const;
export const VOXY_WORKER_HEARTBEAT_STALE_AFTER_MS = 15 * 60 * 1_000;
export const VOXY_QUEUE_MAX_READY_AGE_MS = 30 * 60 * 1_000;
export const VOXY_RENDERED_MAX_RECOVERY_AGE_MS = 15 * 60 * 1_000;

const OPERATIONS_COLLECTION = "voxy_local_composition_operations";
const HEARTBEAT_ID = "worker-heartbeat:local-composition";
const JOB_QUERY_LIMIT = 50;
const SAFE_CODE = /^[a-z0-9_.:-]{1,160}$/i;

export const VOXY_OPERATIONS_ADVISORY_ROLE_IDS = [
  "sre_support_agent",
  "security_agent",
  "qa_agent",
  "visual_qa_agent",
  "risk_governor",
  "review_agent",
  "voxy_agent",
] as const;

export type VoxyOperationsAdvisoryRoleId =
  (typeof VOXY_OPERATIONS_ADVISORY_ROLE_IDS)[number];

export type VoxyWorkerHeartbeat = {
  version: typeof VOXY_WORKER_HEARTBEAT_VERSION;
  workerId: string;
  state: "running" | "healthy" | "failed";
  cycleStartedAt: string;
  heartbeatAt: string;
  cycleCompletedAt: string | null;
  processedCount: number;
  recoveryOrphanAfterMs: number;
  lastSafeErrorCode: string | null;
  leaseModel: "job_status_cas";
  autoRepair: false;
  autoDeploy: false;
  autoPublish: false;
};

export type VoxyOperationsPersistenceState = {
  mode: string;
  productionTruth: boolean;
  restartReconstructable?: boolean;
  deploymentReconstructable?: boolean;
};

export type VoxyOperationsJobSummary = Pick<
  VoxyLocalCompositionJob,
  "jobId" | "status" | "updatedAt" | "safeErrorCode" | "attempt"
>;

export type VoxyOperationsSnapshot = {
  version: typeof VOXY_OPERATIONS_SNAPSHOT_VERSION;
  observedAt: string;
  health: "ready" | "degraded" | "blocked";
  productionReady: boolean;
  blockers: string[];
  warnings: string[];
  persistence: {
    runtime: VoxyOperationsPersistenceState;
    audio: VoxyOperationsPersistenceState;
    editorialReview: VoxyOperationsPersistenceState;
    editorialCouncil: VoxyOperationsPersistenceState;
    heartbeat: VoxyOperationsPersistenceState;
  };
  heartbeat: {
    present: boolean;
    stale: boolean;
    ageMs: number | null;
    record: VoxyWorkerHeartbeat | null;
  };
  queue: {
    queued: number;
    rendering: number;
    rendered: number;
    failed: number;
    reviewReady: number;
    countCapped: boolean;
    oldestQueuedAgeMs: number | null;
    orphanRendering: number;
    staleRendered: number;
    repeatedSafeFailureCodes: string[];
  };
  agentAdvisory: {
    roleIds: VoxyOperationsAdvisoryRoleId[];
    healthMayBeUpgradedByAgent: false;
    mutationAllowed: false;
    providerInvocationRequired: false;
  };
  capabilities: {
    deterministicHealth: true;
    autoRepair: false;
    autoRestart: false;
    autoDeploy: false;
    autoRollback: false;
    autoReapprove: false;
    autoPublish: false;
    externalNotification: false;
  };
};

export type VoxyOperationsAgentAdvisory = {
  roleId: VoxyOperationsAdvisoryRoleId;
  verdict: "pass" | "attention" | "blocked";
  focus: string;
  reasons: string[];
  mayMutate: false;
  mayUpgradeHealth: false;
  providerInvocationUsed: false;
};

let inMemoryHeartbeat: VoxyWorkerHeartbeat | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ageMs(nowIso: string, value: string | null | undefined): number | null {
  const now = Date.parse(nowIso);
  const then = Date.parse(String(value ?? ""));
  if (!Number.isFinite(now) || !Number.isFinite(then) || then > now) return null;
  return now - then;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function persistenceBlocker(name: string, state: VoxyOperationsPersistenceState) {
  return state.mode !== "persistent_primary" || state.productionTruth !== true
    ? `${name}_persistence_not_production_truth`
    : null;
}

function safeWorkerId(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return SAFE_CODE.test(normalized) ? normalized : "voxy-local-composition-worker";
}

function safeErrorCode(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized && SAFE_CODE.test(normalized) ? normalized : null;
}

export async function writeVoxyWorkerHeartbeat(input: {
  workerId?: string | null;
  state: VoxyWorkerHeartbeat["state"];
  cycleStartedAt: string;
  now?: string;
  cycleCompletedAt?: string | null;
  processedCount?: number;
  recoveryOrphanAfterMs?: number;
  lastSafeErrorCode?: string | null;
}): Promise<VoxyWorkerHeartbeat> {
  const heartbeat: VoxyWorkerHeartbeat = {
    version: VOXY_WORKER_HEARTBEAT_VERSION,
    workerId: safeWorkerId(input.workerId),
    state: input.state,
    cycleStartedAt: input.cycleStartedAt,
    heartbeatAt: input.now ?? new Date().toISOString(),
    cycleCompletedAt: input.cycleCompletedAt ?? null,
    processedCount: Math.max(0, Math.trunc(input.processedCount ?? 0)),
    recoveryOrphanAfterMs: Math.max(
      1,
      Math.trunc(input.recoveryOrphanAfterMs ?? VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS),
    ),
    lastSafeErrorCode: safeErrorCode(input.lastSafeErrorCode),
    leaseModel: "job_status_cas",
    autoRepair: false,
    autoDeploy: false,
    autoPublish: false,
  };

  if (shouldUseInMemoryMongoFallback()) {
    inMemoryHeartbeat = clone(heartbeat);
    return clone(heartbeat);
  }

  const col = await coreCol<any>(OPERATIONS_COLLECTION);
  await col.updateOne(
    { _id: HEARTBEAT_ID },
    {
      $set: {
        kind: "worker_heartbeat",
        record: clone(heartbeat),
        heartbeatAt: heartbeat.heartbeatAt,
      },
    },
    { upsert: true },
  );
  return heartbeat;
}

export async function readVoxyWorkerHeartbeat(): Promise<VoxyWorkerHeartbeat | null> {
  if (shouldUseInMemoryMongoFallback()) {
    return inMemoryHeartbeat ? clone(inMemoryHeartbeat) : null;
  }
  const col = await coreCol<any>(OPERATIONS_COLLECTION);
  const doc = await col.findOne({ _id: HEARTBEAT_ID, kind: "worker_heartbeat" });
  return doc?.record ? clone(doc.record as VoxyWorkerHeartbeat) : null;
}

export function resetVoxyWorkerHeartbeatForTests() {
  inMemoryHeartbeat = null;
}

export function buildVoxyOperationsSnapshot(input: {
  observedAt: string;
  heartbeat: VoxyWorkerHeartbeat | null;
  heartbeatPersistence: VoxyOperationsPersistenceState;
  persistence: {
    runtime: VoxyOperationsPersistenceState;
    audio: VoxyOperationsPersistenceState;
    editorialReview: VoxyOperationsPersistenceState;
    editorialCouncil: VoxyOperationsPersistenceState;
  };
  jobsByStatus: {
    queued: VoxyOperationsJobSummary[];
    rendering: VoxyOperationsJobSummary[];
    rendered: VoxyOperationsJobSummary[];
    failed: VoxyOperationsJobSummary[];
    review_ready: VoxyOperationsJobSummary[];
  };
  heartbeatStaleAfterMs?: number;
}): VoxyOperationsSnapshot {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const heartbeatStaleAfterMs = Math.max(
    1,
    Math.trunc(input.heartbeatStaleAfterMs ?? VOXY_WORKER_HEARTBEAT_STALE_AFTER_MS),
  );

  for (const [name, state] of Object.entries({
    runtime: input.persistence.runtime,
    audio: input.persistence.audio,
    editorial_review: input.persistence.editorialReview,
    editorial_council: input.persistence.editorialCouncil,
    heartbeat: input.heartbeatPersistence,
  })) {
    const blocker = persistenceBlocker(name, state);
    if (blocker) blockers.push(blocker);
  }
  if (
    input.persistence.runtime.restartReconstructable === false ||
    input.persistence.runtime.deploymentReconstructable === false
  ) {
    blockers.push("runtime_not_restart_and_deployment_reconstructable");
  }

  const heartbeatAge = input.heartbeat
    ? ageMs(input.observedAt, input.heartbeat.heartbeatAt)
    : null;
  const heartbeatStale = heartbeatAge === null || heartbeatAge > heartbeatStaleAfterMs;
  if (!input.heartbeat) blockers.push("worker_heartbeat_missing");
  else if (heartbeatStale) blockers.push("worker_heartbeat_stale");
  else if (input.heartbeat.state === "failed") blockers.push("worker_last_cycle_failed");

  const oldestQueuedAgeMs = input.jobsByStatus.queued
    .map((job) => ageMs(input.observedAt, job.updatedAt))
    .filter((value): value is number => value !== null)
    .sort((a, b) => b - a)[0] ?? null;
  if (oldestQueuedAgeMs !== null && oldestQueuedAgeMs > VOXY_QUEUE_MAX_READY_AGE_MS) {
    blockers.push("queue_oldest_job_exceeds_ready_age");
  }
  if (input.jobsByStatus.queued.length >= 10) warnings.push("queue_backlog_elevated");

  const orphanRendering = input.jobsByStatus.rendering.filter((job) => {
    const age = ageMs(input.observedAt, job.updatedAt);
    return age !== null && age >= VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS;
  }).length;
  if (orphanRendering > 0) blockers.push("rendering_orphan_recovery_required");

  const staleRendered = input.jobsByStatus.rendered.filter((job) => {
    const age = ageMs(input.observedAt, job.updatedAt);
    return age !== null && age >= VOXY_RENDERED_MAX_RECOVERY_AGE_MS;
  }).length;
  if (staleRendered > 0) blockers.push("rendered_recovery_drift_detected");

  const recentFailureCutoffMs = 60 * 60 * 1_000;
  const recentFailures = input.jobsByStatus.failed.filter((job) => {
    const age = ageMs(input.observedAt, job.updatedAt);
    return age !== null && age <= recentFailureCutoffMs;
  });
  const failureCounts = new Map<string, number>();
  for (const job of recentFailures) {
    const code = safeErrorCode(job.safeErrorCode) ?? "unknown_safe_failure";
    failureCounts.set(code, (failureCounts.get(code) ?? 0) + 1);
  }
  const repeatedSafeFailureCodes = Array.from(failureCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([code]) => code)
    .sort();
  if (repeatedSafeFailureCodes.length > 0) blockers.push("repeated_safe_worker_failures");
  else if (recentFailures.length > 0) warnings.push("recent_worker_failure_present");

  const countCapped = Object.values(input.jobsByStatus).some(
    (jobs) => jobs.length >= JOB_QUERY_LIMIT,
  );
  if (countCapped) blockers.push("operations_job_query_cap_reached");

  const uniqueBlockers = unique(blockers);
  const uniqueWarnings = unique(warnings);
  const productionReady = uniqueBlockers.length === 0;
  return {
    version: VOXY_OPERATIONS_SNAPSHOT_VERSION,
    observedAt: input.observedAt,
    health: productionReady ? (uniqueWarnings.length ? "degraded" : "ready") : "blocked",
    productionReady,
    blockers: uniqueBlockers,
    warnings: uniqueWarnings,
    persistence: {
      ...input.persistence,
      heartbeat: input.heartbeatPersistence,
    },
    heartbeat: {
      present: Boolean(input.heartbeat),
      stale: heartbeatStale,
      ageMs: heartbeatAge,
      record: input.heartbeat ? clone(input.heartbeat) : null,
    },
    queue: {
      queued: input.jobsByStatus.queued.length,
      rendering: input.jobsByStatus.rendering.length,
      rendered: input.jobsByStatus.rendered.length,
      failed: input.jobsByStatus.failed.length,
      reviewReady: input.jobsByStatus.review_ready.length,
      countCapped,
      oldestQueuedAgeMs,
      orphanRendering,
      staleRendered,
      repeatedSafeFailureCodes,
    },
    agentAdvisory: {
      roleIds: [...VOXY_OPERATIONS_ADVISORY_ROLE_IDS],
      healthMayBeUpgradedByAgent: false,
      mutationAllowed: false,
      providerInvocationRequired: false,
    },
    capabilities: {
      deterministicHealth: true,
      autoRepair: false,
      autoRestart: false,
      autoDeploy: false,
      autoRollback: false,
      autoReapprove: false,
      autoPublish: false,
      externalNotification: false,
    },
  };
}

function heartbeatPersistenceState(): VoxyOperationsPersistenceState {
  return shouldUseInMemoryMongoFallback()
    ? { mode: "in_memory_fallback", productionTruth: false }
    : {
        mode: "persistent_primary",
        productionTruth: true,
        restartReconstructable: true,
        deploymentReconstructable: true,
      };
}

export async function loadVoxyOperationsSnapshot(input?: {
  now?: string;
  heartbeatStaleAfterMs?: number;
}): Promise<VoxyOperationsSnapshot> {
  const repository = getVoxyLocalCompositionRepository();
  const audioRepository = getVoxyLocalCompositionAudioInputRepository();
  const reviewRepository = getReviewQueueOperationsRepository();
  const councilRepository = getVoxyEditorialCouncilArtifactRepository();
  const [heartbeat, queued, rendering, rendered, failed, reviewReady] = await Promise.all([
    readVoxyWorkerHeartbeat(),
    repository.listJobsByStatus("queued", JOB_QUERY_LIMIT),
    repository.listJobsByStatus("rendering", JOB_QUERY_LIMIT),
    repository.listJobsByStatus("rendered", JOB_QUERY_LIMIT),
    repository.listJobsByStatus("failed", JOB_QUERY_LIMIT),
    repository.listJobsByStatus("review_ready", JOB_QUERY_LIMIT),
  ]);

  return buildVoxyOperationsSnapshot({
    observedAt: input?.now ?? new Date().toISOString(),
    heartbeat,
    heartbeatPersistence: heartbeatPersistenceState(),
    heartbeatStaleAfterMs: input?.heartbeatStaleAfterMs,
    persistence: {
      runtime: repository.getPersistenceState(),
      audio: audioRepository.getPersistenceState(),
      editorialReview: reviewRepository.getPersistenceState(),
      editorialCouncil: councilRepository.getPersistenceState(),
    },
    jobsByStatus: { queued, rendering, rendered, failed, review_ready: reviewReady },
  });
}

export function buildVoxyOperationsAgentAdvisories(
  snapshot: VoxyOperationsSnapshot,
): VoxyOperationsAgentAdvisory[] {
  const fleet = loadAlpha2AgentFleetRegistry();
  const registered = new Set(fleet.organizationRoles.map((role) => role.id));
  const focuses: Record<VoxyOperationsAdvisoryRoleId, string> = {
    sre_support_agent: "heartbeat_queue_recovery_incident",
    security_agent: "persistence_safe_telemetry_and_denied_actions",
    qa_agent: "runtime_failure_and_regression_readiness",
    visual_qa_agent: "render_review_pipeline_readiness",
    risk_governor: "human_gate_and_fail_closed_readiness",
    review_agent: "independent_operations_readiness_review",
    voxy_agent: "editorial_runtime_service_continuity",
  };

  return VOXY_OPERATIONS_ADVISORY_ROLE_IDS.map((roleId) => {
    if (!registered.has(roleId)) {
      throw new Error(`voxy_operations_advisory_role_missing:${roleId}`);
    }
    const reasons = snapshot.productionReady
      ? snapshot.warnings.length
        ? [...snapshot.warnings]
        : ["deterministic_operations_health_ready"]
      : [...snapshot.blockers];
    return {
      roleId,
      verdict: snapshot.productionReady
        ? snapshot.warnings.length
          ? "attention"
          : "pass"
        : "blocked",
      focus: focuses[roleId],
      reasons,
      mayMutate: false,
      mayUpgradeHealth: false,
      providerInvocationUsed: false,
    };
  });
}
