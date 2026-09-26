import { describe, expect, it } from "vitest";
import { buildDefaultConsent } from "@/lib/privacy/consent";
import { buildPersonalVoxyProfileConsentOnboardingContract } from "@/features/agenticRuntime/personalVoxyProfileConsentOnboardingContract";
import {
  PERSONAL_VOXY_MEMORY_GUARDRAILS,
  applyPersonalVoxyMemoryDelete,
  applyPersonalVoxyMemoryWrite,
  buildPersonalVoxyMemoryRuntimeView,
  createEmptyPersonalVoxyMemoryState,
} from "@/features/agenticRuntime/personalVoxyConsentedMemoryContract";
import {
  VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS,
  resolveVoxyCivicActivityProjection,
} from "@/features/agenticRuntime/voxyCivicActivityRelevanceContract";
import {
  VOXY_REALTIME_VOICE_GUARDRAILS,
  applyVoxyRealtimeBargeIn,
  createVoxyRealtimeSession,
  resolveVoxyRealtimeTurn,
  transitionVoxyRealtimeSession,
} from "@/features/agenticRuntime/voxyRealtimeConversationVoiceContract";
import {
  VOXY_PROACTIVE_WATCH_GUARDRAILS,
  VOXY_PROACTIVE_WATCH_SCHEMA_VERSION,
  resolveVoxyProactiveWatch,
  type VoxyProactiveWatchTask,
} from "@/features/agenticRuntime/voxyProactiveWatchTasksContract";
import {
  VOXY_EXTERNAL_CONNECTOR_GUARDRAILS,
  VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION,
  buildVoxyExternalConnectorSafeTrace,
  resolveVoxyExternalConnectionDecision,
  type VoxyExternalPersonalConnection,
} from "@/features/agenticRuntime/voxyExternalPersonalConnectorsContract";
import { resolveAlpha2ActionGate } from "@/features/agenticRuntime/alpha2RiskGateContract";
import {
  SHARED_CONVERSATION_CONTRACT_VERSION,
  type SharedConversation,
} from "@features/conversation/sharedConversationContract";

const T0 = "2026-09-26T09:00:00.000Z";
const T1 = "2026-09-26T09:01:00.000Z";

function consentAuthorization(revision: number) {
  return {
    consentRevision: revision,
    contract: buildPersonalVoxyProfileConsentOnboardingContract({
      requestedMode: "active_companion",
      requestedRelevanceDepth: "balanced",
      requestedNotificationPolicy: "important_only",
      privacyConsent: buildDefaultConsent({
        requiredNoticeAcknowledged: true,
        timestamp: T0,
        source: "account",
      }),
      explicitPersonalVoxyConsent: true,
    }),
  };
}

function conversation(): SharedConversation {
  return {
    contractVersion: SHARED_CONVERSATION_CONTRACT_VERSION,
    conversationId: "conversation:aaa:1",
    scope: "group",
    origin: { kind: "group", refId: "origin:aaa:1" },
    participantPolicy: {
      membership: "explicit",
      activeParticipantIds: ["actor:a"],
      leftParticipantIds: [],
      removedParticipantIds: [],
      moderatorActorIds: ["actor:a"],
      inviterActorIds: ["actor:a"],
    },
    visibilityPolicy: { mode: "participants_only", allowedActorIds: ["actor:a"] },
    lifecycle: "active",
    retentionPolicy: { mode: "inherit_origin" },
    moderationPolicy: { mode: "review_first", blockedActorIds: [] },
    handoffPolicy: { mode: "review_required" },
    representativenessStatus: "not_asserted",
    truthStatus: "not_asserted",
    publishStatus: "not_asserted",
  };
}

function watch(overrides: Partial<VoxyProactiveWatchTask> = {}): VoxyProactiveWatchTask {
  return {
    schemaVersion: VOXY_PROACTIVE_WATCH_SCHEMA_VERSION,
    watchId: "watch:aaa:1",
    actorId: "actor:a",
    conversationId: "conversation:aaa:1",
    status: "active",
    generation: 1,
    capabilityId: "edebatte.external_notification.request",
    capabilityVersion: 1,
    domainOwnerRef: "topic:update:owner",
    trigger: { kind: "time", at: "2026-09-26T08:00:00.000Z" },
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

function calendarConnection(status: VoxyExternalPersonalConnection["status"] = "active") {
  return {
    schemaVersion: VOXY_EXTERNAL_PERSONAL_CONNECTOR_SCHEMA_VERSION,
    connectionId: "connection:calendar:actor-a",
    actorId: "actor:a",
    providerKind: "calendar",
    capabilityScopes: ["calendar.write"],
    status,
    credentialRef: "secret-ref:personal-connections/calendar/actor-a",
    visibleScopeSummary: ["Kalender verwalten"],
    createdAt: "2026-09-26T08:00:00.000Z",
    updatedAt: "2026-09-26T08:00:00.000Z",
    expiresAt: "2026-10-26T08:00:00.000Z",
    lastVerifiedAt: "2026-09-26T08:00:00.000Z",
    revokeHandoffRef: "personal-connections/revoke/calendar",
    reauthorizeHandoffRef: "personal-connections/reauthorize/calendar",
    guardrails: VOXY_EXTERNAL_CONNECTOR_GUARDRAILS,
  } satisfies VoxyExternalPersonalConnection;
}

describe("Voxy AAA cross-contract red-team acceptance", () => {
  it("prevents revoked/do-not-remember memory from becoming civic personalization", () => {
    const authorization = consentAuthorization(4);
    const written = applyPersonalVoxyMemoryWrite({
      state: createEmptyPersonalVoxyMemoryState(T0),
      authorization,
      request: {
        key: "topic_interests",
        value: ["climate"],
        source: "explicit_user_input",
        conversationRef: "conversation:aaa:1",
      },
      now: T0,
    });
    expect(written.accepted).toBe(true);

    const suppressed = applyPersonalVoxyMemoryDelete({
      state: written.state,
      key: "topic_interests",
      doNotRemember: true,
      now: T1,
    });
    const view = buildPersonalVoxyMemoryRuntimeView({ state: suppressed.state, authorization });
    expect(view.usableEntries).toEqual([]);
    expect(view.suppressedKeys).toContain("topic_interests");

    const civic = resolveVoxyCivicActivityProjection({
      actorId: "actor:a",
      occurredAt: T1,
      activityClass: "confirmed_interest",
      provenance: "confirmed_interest",
      sourceOwner: "personal_voxy_memory",
      sourceId: "memory:topic_interests",
      sourceRevision: "4",
      sourceReceiptRef: "receipt:memory:4",
      refs: { topicId: "topic:climate", interestTopicKey: "climate" },
      memoryView: view,
    });
    expect(civic.accepted).toBe(false);
    expect(civic.reasonCodes).toContain("current_consented_memory_interest_required");
  });

  it("keeps shared observations from becoming inferred political positions", () => {
    const civic = resolveVoxyCivicActivityProjection({
      actorId: "actor:a",
      occurredAt: T0,
      activityClass: "observed_signal",
      provenance: "explicit_share_to_voxy",
      sourceOwner: "share_to_voxy",
      sourceId: "source-receipt:aaa",
      sourceRevision: "1",
      sourceReceiptRef: "receipt:share:aaa",
      refs: { topicId: "topic:42" },
    });
    expect(civic.accepted).toBe(true);
    if (!civic.accepted) return;
    expect(civic.projection.activityClass).toBe("observed_signal");
    expect(civic.projection).not.toHaveProperty("partyPreference");
    expect(civic.projection).not.toHaveProperty("ideology");
    expect(civic.projection).not.toHaveProperty("voteIntent");
  });

  it("never lets interim voice or a barge-in bypass tool/action gates", () => {
    const created = createVoxyRealtimeSession({
      sessionId: "voice-session:aaa",
      conversation: conversation(),
      actorId: "actor:a",
      locale: "de-DE",
      audioConsent: { allowed: true, revision: 1, acknowledgedAt: T0 },
    });
    expect(created.accepted).toBe(true);
    if (!created.accepted) return;
    const ready = transitionVoxyRealtimeSession({ session: created.session, nextState: "ready" });
    expect(ready.accepted).toBe(true);
    if (!ready.accepted) return;
    const listening = transitionVoxyRealtimeSession({ session: ready.session, nextState: "listening" });
    expect(listening.accepted).toBe(true);
    if (!listening.accepted) return;

    const interim = resolveVoxyRealtimeTurn({
      session: listening.session,
      turnId: "turn:aaa:interim",
      conversationId: listening.session.conversationId,
      actorId: listening.session.actorId,
      generation: listening.session.generation,
      modality: "audio",
      transcriptState: "interim",
      transientText: "Schick das schon mal ...",
      language: "de-DE",
    });
    expect(interim.accepted).toBe(true);
    if (interim.accepted) expect(interim.intentCandidate).toBeNull();

    const interrupted = applyVoxyRealtimeBargeIn(listening.session);
    expect(interrupted.accepted).toBe(true);
    if (interrupted.accepted) {
      expect(interrupted.session.generation).toBe(listening.session.generation + 1);
      expect(interrupted.session.currentOutputId).toBeNull();
    }
  });

  it("blocks proactive execution after consent drift, unsubscribe or quiet hours", () => {
    const base = {
      now: T0,
      currentConsentRevision: 4,
      notificationsAllowed: true,
      unsubscribed: false,
      quietHoursBlocked: false,
    };
    expect(resolveVoxyProactiveWatch(watch(), { ...base, currentConsentRevision: 5 })).toMatchObject({
      decision: "blocked",
      reasonCodes: ["stale_consent_revision"],
    });
    expect(resolveVoxyProactiveWatch(watch(), { ...base, unsubscribed: true })).toMatchObject({
      decision: "blocked",
      reasonCodes: ["notifications_unsubscribed"],
    });
    expect(resolveVoxyProactiveWatch(watch(), { ...base, quietHoursBlocked: true })).toMatchObject({
      decision: "blocked",
      reasonCodes: ["quiet_hours"],
    });
  });

  it("re-checks external connection state and preserves human sovereignty for external effects", () => {
    const revoked = resolveVoxyExternalConnectionDecision({
      actorId: "actor:a",
      now: T0,
      currentConnection: calendarConnection("revoked"),
      requestedOperationId: "calendar.event.create",
      currentUserContextPresent: true,
      voxyToolCapabilityAuthorized: true,
      alpha2ActionGateAuthorized: true,
      alpha2ExecutionFencePresent: true,
      explicitConfirmationPresent: true,
    });
    expect(revoked.allowed).toBe(false);
    expect(revoked.reasonCodes).toContain("connection_status:revoked");

    for (const actionKind of ["notify_external", "spend_money", "merge_code", "deploy"] as const) {
      const gate = resolveAlpha2ActionGate({
        actionKind,
        riskClass: "green",
        confidence: "high",
        reversible: false,
        evidenceRefs: ["aaa:red-team"],
      });
      expect(gate.decision).toBe("human_only");
      expect(gate.autoExecutionAllowed).toBe(false);
    }
  });

  it("keeps all personalization/transport/watch/connector layers outside political truth and autonomous authority", () => {
    expect(PERSONAL_VOXY_MEMORY_GUARDRAILS).toMatchObject({
      hiddenPoliticalProfilingAllowed: false,
      voteIntentStorageAllowed: false,
      ideologyStorageAllowed: false,
      persuadabilityStorageAllowed: false,
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      autoPublishAllowed: false,
      actingOnBehalfOfUserAllowed: false,
    });
    expect(VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS).toMatchObject({
      partyPreferenceInferenceAllowed: false,
      ideologyInferenceAllowed: false,
      voteIntentInferenceAllowed: false,
      persuadabilityInferenceAllowed: false,
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
    });
    expect(VOXY_REALTIME_VOICE_GUARDRAILS).toMatchObject({
      interimToolExecutionAllowed: false,
      directToolExecutionAllowed: false,
      actionGateBypassAllowed: false,
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      politicalProfilingAllowed: false,
      politicalPersuasionAllowed: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
    });
    expect(VOXY_PROACTIVE_WATCH_GUARDRAILS).toMatchObject({
      directNotificationAllowed: false,
      directToolExecutionAllowed: false,
      humanGateDowngradeAllowed: false,
      politicalProfilingAllowed: false,
      politicalPersuasionAllowed: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
      truthStatusMayChange: false,
      evidenceWeightingMayChange: false,
    });
    expect(VOXY_EXTERNAL_CONNECTOR_GUARDRAILS).toMatchObject({
      directProviderExecutionAllowed: false,
      directCredentialExposureAllowed: false,
      directWriteWithoutToolGateAllowed: false,
      humanGateDowngradeAllowed: false,
      politicalProfilingAllowed: false,
      providerActivationIncluded: false,
      oauthActivationIncluded: false,
      secretProvisioningIncluded: false,
    });
  });

  it("keeps connector trace metadata free of opaque credentials", () => {
    const currentConnection = calendarConnection("active");
    const runtime = {
      actorId: "actor:a",
      now: T0,
      currentConnection,
      requestedOperationId: "calendar.event.create" as const,
      currentUserContextPresent: true,
      voxyToolCapabilityAuthorized: true,
      alpha2ActionGateAuthorized: false,
      alpha2ExecutionFencePresent: false,
      explicitConfirmationPresent: false,
    };
    const decision = resolveVoxyExternalConnectionDecision(runtime);
    const trace = buildVoxyExternalConnectorSafeTrace({ runtime, decision });
    expect(trace).toMatchObject({
      containsCredential: false,
      containsToken: false,
      containsCookie: false,
      containsRawProviderPayload: false,
    });
    expect(JSON.stringify(trace)).not.toContain(currentConnection.credentialRef);
  });
});
