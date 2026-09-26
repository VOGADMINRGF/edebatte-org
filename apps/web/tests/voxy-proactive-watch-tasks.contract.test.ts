import { describe, expect, it } from "vitest";

import {
  VOXY_PROACTIVE_WATCH_GUARDRAILS,
  VOXY_PROACTIVE_WATCH_SCHEMA_VERSION,
  buildVoxyProactiveWatchSafeTrace,
  resolveVoxyProactiveWatch,
  transitionVoxyProactiveWatch,
  validateVoxyProactiveWatchTask,
  type VoxyProactiveWatchTask,
} from "@/features/agenticRuntime/voxyProactiveWatchTasksContract";

const BASE_NOW = "2026-09-26T07:00:00.000Z";

function watch(
  overrides: Partial<VoxyProactiveWatchTask> = {},
): VoxyProactiveWatchTask {
  return {
    schemaVersion: VOXY_PROACTIVE_WATCH_SCHEMA_VERSION,
    watchId: "watch:topic-update:1",
    actorId: "actor:user:1",
    conversationId: "conversation:direct:1",
    status: "active",
    generation: 1,
    capabilityId: "edebatte.external_notification.request",
    capabilityVersion: 1,
    domainOwnerRef: "topic:update:owner",
    trigger: {
      kind: "time",
      at: "2026-09-26T06:00:00.000Z",
    },
    locale: "de-DE",
    timezone: "Europe/Berlin",
    consentRevision: 4,
    notificationPolicy: "important_only",
    createdAt: "2026-09-25T12:00:00.000Z",
    updatedAt: "2026-09-25T12:00:00.000Z",
    lastCompletedGeneration: null,
    guardrails: VOXY_PROACTIVE_WATCH_GUARDRAILS,
    ...overrides,
  };
}

function runtime(overrides: Partial<Parameters<typeof resolveVoxyProactiveWatch>[1]> = {}) {
  return {
    now: BASE_NOW,
    currentConsentRevision: 4,
    notificationsAllowed: true,
    unsubscribed: false,
    quietHoursBlocked: false,
    ...overrides,
  };
}

describe("Voxy proactive watch tasks contract", () => {
  it("creates only a gated deterministic action candidate", () => {
    const model = watch();
    expect(validateVoxyProactiveWatchTask(model)).toEqual([]);

    const first = resolveVoxyProactiveWatch(model, runtime());
    const replay = resolveVoxyProactiveWatch(model, runtime());

    expect(first).toMatchObject({
      decision: "candidate_ready",
      candidate: {
        watchId: model.watchId,
        generation: 1,
        capabilityId: "edebatte.external_notification.request",
        idempotencyKey: "voxy-watch:v1:watch:topic-update:1:g1",
        requiresVoxyToolCapabilityGate: true,
        requiresAlpha2ActionGate: true,
        requiresAlpha2ExecutionFence: true,
        directExecutionAllowed: false,
        directNotificationAllowed: false,
      },
    });
    expect(replay.candidate?.idempotencyKey).toBe(first.candidate?.idempotencyKey);
    expect(model.guardrails.secondSchedulerAllowed).toBe(false);
    expect(model.guardrails.secondQueueAllowed).toBe(false);
  });

  it("fails closed when consent is stale, notifications are off or the user unsubscribed", () => {
    expect(
      resolveVoxyProactiveWatch(watch(), runtime({ currentConsentRevision: 5 })),
    ).toMatchObject({ decision: "blocked", reasonCodes: ["stale_consent_revision"] });

    expect(
      resolveVoxyProactiveWatch(watch(), runtime({ notificationsAllowed: false })),
    ).toMatchObject({ decision: "blocked", reasonCodes: ["notifications_not_consented"] });

    expect(
      resolveVoxyProactiveWatch(watch({ notificationPolicy: "off" }), runtime()),
    ).toMatchObject({ decision: "blocked", reasonCodes: ["notifications_not_consented"] });

    expect(
      resolveVoxyProactiveWatch(watch(), runtime({ unsubscribed: true })),
    ).toMatchObject({ decision: "blocked", reasonCodes: ["notifications_unsubscribed"] });
  });

  it("does not bypass quiet hours and never sends directly", () => {
    const result = resolveVoxyProactiveWatch(watch(), runtime({ quietHoursBlocked: true }));
    expect(result).toEqual({
      decision: "blocked",
      candidate: null,
      nextEligibleAt: "2026-09-26T06:00:00.000Z",
      reasonCodes: ["quiet_hours"],
    });
  });

  it("does not produce a state-change candidate before the canonical condition is met", () => {
    const model = watch({
      trigger: {
        kind: "state_change",
        ownerRef: "topic:update:owner",
        conditionRef: "condition:new-material-change",
        nextEligibleAt: "2026-09-26T06:00:00.000Z",
        pollEveryMinutes: 60,
        maxChecks: 48,
        checksPerformed: 2,
      },
    });

    expect(
      resolveVoxyProactiveWatch(model, runtime({ stateConditionMet: false })),
    ).toMatchObject({
      decision: "condition_not_met",
      candidate: null,
      reasonCodes: ["state_change_condition_not_met"],
    });

    expect(
      resolveVoxyProactiveWatch(model, runtime({ stateConditionMet: true })),
    ).toMatchObject({ decision: "candidate_ready" });
  });

  it("bounds recurring and state-change polling instead of allowing unbounded loops", () => {
    expect(
      validateVoxyProactiveWatchTask(
        watch({
          trigger: {
            kind: "recurrence",
            everyMinutes: 1,
            nextEligibleAt: "2026-09-26T08:00:00.000Z",
          },
        }),
      ),
    ).toContain("recurrence_interval_out_of_bounds");

    const exhausted = watch({
      trigger: {
        kind: "state_change",
        ownerRef: "topic:update:owner",
        conditionRef: "condition:new-material-change",
        nextEligibleAt: "2026-09-26T06:00:00.000Z",
        pollEveryMinutes: 60,
        maxChecks: 3,
        checksPerformed: 3,
      },
    });
    expect(resolveVoxyProactiveWatch(exhausted, runtime())).toMatchObject({
      decision: "completed",
      candidate: null,
      reasonCodes: ["state_change_check_budget_exhausted"],
    });
  });

  it("invalidates the prior generation on pause, cancel and revoke", () => {
    const paused = transitionVoxyProactiveWatch({
      watch: watch(),
      action: "pause",
      at: BASE_NOW,
    });
    expect(paused).toMatchObject({ status: "paused", generation: 2 });
    expect(resolveVoxyProactiveWatch(paused, runtime())).toMatchObject({
      decision: "blocked",
      reasonCodes: ["watch_paused"],
    });

    const cancelled = transitionVoxyProactiveWatch({
      watch: watch(),
      action: "cancel",
      at: BASE_NOW,
    });
    expect(cancelled).toMatchObject({ status: "cancelled", generation: 2 });
    expect(resolveVoxyProactiveWatch(cancelled, runtime())).toMatchObject({
      decision: "blocked",
      reasonCodes: ["watch_status:cancelled"],
    });

    const revoked = transitionVoxyProactiveWatch({
      watch: watch(),
      action: "revoke",
      at: BASE_NOW,
    });
    expect(revoked).toMatchObject({ status: "revoked", generation: 2 });
    expect(resolveVoxyProactiveWatch(revoked, runtime())).toMatchObject({
      decision: "blocked",
      reasonCodes: ["watch_status:revoked"],
    });
  });

  it("marks a completed generation so recovery/replay cannot produce a duplicate candidate", () => {
    const completed = transitionVoxyProactiveWatch({
      watch: watch(),
      action: "complete_generation",
      at: BASE_NOW,
    });
    expect(completed.lastCompletedGeneration).toBe(1);
    expect(resolveVoxyProactiveWatch(completed, runtime())).toMatchObject({
      decision: "completed",
      candidate: null,
    });
  });

  it("keeps SafeTrace metadata-only and preserves civic sovereignty guardrails", () => {
    const model = watch();
    const evaluation = resolveVoxyProactiveWatch(model, runtime());
    const trace = buildVoxyProactiveWatchSafeTrace({ watch: model, evaluation });

    expect(trace).toMatchObject({
      watchId: model.watchId,
      decision: "candidate_ready",
      containsPrompt: false,
      containsSecret: false,
      containsRawPersonalData: false,
    });
    expect(VOXY_PROACTIVE_WATCH_GUARDRAILS).toMatchObject({
      politicalProfilingAllowed: false,
      politicalPersuasionAllowed: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
      truthStatusMayChange: false,
      evidenceWeightingMayChange: false,
      humanGateDowngradeAllowed: false,
    });
  });
});
