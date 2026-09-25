import { describe, expect, it } from "vitest";

import {
  buildVoxyOperationsAgentAdvisories,
  buildVoxyOperationsSnapshot,
  VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
  VOXY_OPERATIONS_ADVISORY_ROLE_IDS,
  type VoxyWorkerHeartbeat,
} from "@/features/voxyVideo/localCompositionOperations";

type Status = "queued" | "rendering" | "rendered" | "failed" | "review_ready";

const persistent = {
  mode: "persistent_primary",
  productionTruth: true,
  restartReconstructable: true,
  deploymentReconstructable: true,
};

function heartbeat(overrides: Partial<VoxyWorkerHeartbeat> = {}): VoxyWorkerHeartbeat {
  return {
    version: "voxy-worker-heartbeat-v1",
    workerId: "voxy-local-composition-worker",
    state: "healthy",
    cycleStartedAt: "2026-09-25T10:55:00.000Z",
    heartbeatAt: "2026-09-25T10:59:00.000Z",
    cycleCompletedAt: "2026-09-25T10:59:00.000Z",
    processedCount: 1,
    recoveryOrphanAfterMs: VOXY_LOCAL_COMPOSITION_RECOVERY_ORPHAN_AFTER_MS,
    lastSafeErrorCode: null,
    leaseModel: "job_status_cas",
    autoRepair: false,
    autoDeploy: false,
    autoPublish: false,
    ...overrides,
  };
}

function job(status: Status, updatedAt: string, safeErrorCode: string | null = null) {
  return {
    jobId: `${status}-${updatedAt}-${safeErrorCode ?? "ok"}`,
    status,
    updatedAt,
    safeErrorCode,
    attempt: 1,
  };
}

function snapshot(overrides: Partial<Parameters<typeof buildVoxyOperationsSnapshot>[0]> = {}) {
  return buildVoxyOperationsSnapshot({
    observedAt: "2026-09-25T11:00:00.000Z",
    heartbeat: heartbeat(),
    heartbeatPersistence: persistent,
    persistence: {
      runtime: persistent,
      audio: persistent,
      editorialReview: persistent,
      editorialCouncil: persistent,
    },
    jobsByStatus: {
      queued: [],
      rendering: [],
      rendered: [],
      failed: [],
      review_ready: [],
    },
    ...overrides,
  });
}

describe("Voxy production operations readiness", () => {
  it("is production-ready only from deterministic persistent health truth", () => {
    const result = snapshot();
    expect(result.productionReady).toBe(true);
    expect(result.health).toBe("ready");
    expect(result.blockers).toEqual([]);
    expect(result.agentAdvisory).toMatchObject({
      roleIds: VOXY_OPERATIONS_ADVISORY_ROLE_IDS,
      healthMayBeUpgradedByAgent: false,
      mutationAllowed: false,
      providerInvocationRequired: false,
    });
    expect(result.capabilities).toEqual({
      deterministicHealth: true,
      autoRepair: false,
      autoRestart: false,
      autoDeploy: false,
      autoRollback: false,
      autoReapprove: false,
      autoPublish: false,
      externalNotification: false,
    });
  });

  it("blocks fallback persistence and stale or failed heartbeat", () => {
    const fallback = { mode: "in_memory_fallback", productionTruth: false };
    const result = snapshot({
      heartbeat: heartbeat({
        state: "failed",
        heartbeatAt: "2026-09-25T10:00:00.000Z",
        lastSafeErrorCode: "worker_process_exit_nonzero",
      }),
      heartbeatPersistence: fallback,
      persistence: {
        runtime: fallback,
        audio: persistent,
        editorialReview: persistent,
        editorialCouncil: persistent,
      },
    });
    expect(result.productionReady).toBe(false);
    expect(result.health).toBe("blocked");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "runtime_persistence_not_production_truth",
        "heartbeat_persistence_not_production_truth",
        "worker_heartbeat_stale",
      ]),
    );
  });

  it("blocks orphan recovery drift, stale rendered jobs and repeated safe failures", () => {
    const result = snapshot({
      jobsByStatus: {
        queued: [],
        rendering: [job("rendering", "2026-09-25T05:00:00.000Z")],
        rendered: [job("rendered", "2026-09-25T10:00:00.000Z")],
        failed: [
          job("failed", "2026-09-25T10:50:00.000Z", "ffmpeg_failed"),
          job("failed", "2026-09-25T10:51:00.000Z", "ffmpeg_failed"),
          job("failed", "2026-09-25T10:52:00.000Z", "ffmpeg_failed"),
        ],
        review_ready: [],
      },
    });
    expect(result.productionReady).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "rendering_orphan_recovery_required",
        "rendered_recovery_drift_detected",
        "repeated_safe_worker_failures",
      ]),
    );
    expect(result.queue.repeatedSafeFailureCodes).toEqual(["ffmpeg_failed"]);
  });

  it("lets all required operations agents inspect but never mutate or upgrade health", () => {
    const result = snapshot({
      jobsByStatus: {
        queued: [],
        rendering: [],
        rendered: [],
        failed: [job("failed", "2026-09-25T10:50:00.000Z", "single_safe_failure")],
        review_ready: [],
      },
    });
    const advisories = buildVoxyOperationsAgentAdvisories(result);
    expect(advisories.map((entry) => entry.roleId)).toEqual(VOXY_OPERATIONS_ADVISORY_ROLE_IDS);
    expect(advisories.every((entry) => entry.mayMutate === false)).toBe(true);
    expect(advisories.every((entry) => entry.mayUpgradeHealth === false)).toBe(true);
    expect(advisories.every((entry) => entry.providerInvocationUsed === false)).toBe(true);
    expect(advisories.every((entry) => entry.verdict === "attention")).toBe(true);
  });
});
