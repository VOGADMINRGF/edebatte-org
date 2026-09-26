import { describe, expect, it } from "vitest";
import {
  PERSONAL_VOXY_MEMORY_GUARDRAILS,
  type PersonalVoxyMemoryRuntimeView,
} from "@/features/agenticRuntime/personalVoxyConsentedMemoryContract";
import {
  VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS,
  explainVoxyCivicRelevance,
  resolveVoxyCivicActivityProjection,
  type VoxyCivicActivityProjection,
  type VoxyCivicActivityProjectionInput,
} from "@/features/agenticRuntime/voxyCivicActivityRelevanceContract";

function consentedTopicMemory(): PersonalVoxyMemoryRuntimeView {
  return {
    usableEntries: [
      {
        key: "topic_interests",
        scope: "topic_relevance",
        value: ["climate"],
        consentRevision: 3,
        createdAt: "2026-09-26T04:00:00.000Z",
        updatedAt: "2026-09-26T04:00:00.000Z",
        provenance: {
          source: "explicit_user_input",
          reason: null,
          confidence: null,
          confirmedAt: "2026-09-26T04:00:00.000Z",
          conversationRef: "conversation:1",
        },
      },
    ],
    staleKeys: [],
    suppressedKeys: [],
    blockedReason: null,
    guardrails: PERSONAL_VOXY_MEMORY_GUARDRAILS,
  };
}

function input(
  overrides: Partial<VoxyCivicActivityProjectionInput> = {},
): VoxyCivicActivityProjectionInput {
  return {
    actorId: "user-1",
    occurredAt: "2026-09-26T04:30:00.000Z",
    activityClass: "observed_signal",
    provenance: "explicit_product_action",
    sourceOwner: "saved_topic",
    sourceId: "saved-topic:user-1:topic-42",
    sourceRevision: "7",
    sourceReceiptRef: "receipt:saved-topic:7",
    refs: {
      topicId: "topic-42",
    },
    ...overrides,
  };
}

function acceptedProjection(
  overrides: Partial<VoxyCivicActivityProjectionInput> = {},
): VoxyCivicActivityProjection {
  const result = resolveVoxyCivicActivityProjection(input(overrides));
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(result.reasonCodes.join(","));
  return result.projection;
}

describe("Voxy civic activity and relevance", () => {
  it("derives the same projection identity from the same canonical activity refs", () => {
    const first = acceptedProjection();
    const replay = acceptedProjection({ occurredAt: "2026-09-26T05:30:00.000Z" });

    expect(replay.eventId).toBe(first.eventId);
    expect(first.visibility).toBe("user_visible");
    expect(first.controls.domainTruthMutationAllowed).toBe(false);

    const revised = acceptedProjection({ sourceRevision: "8" });
    expect(revised.eventId).not.toBe(first.eventId);
  });

  it("keeps intentional Share to Voxy as observation and never as an inferred political position", () => {
    const shared = resolveVoxyCivicActivityProjection(
      input({
        provenance: "explicit_share_to_voxy",
        sourceOwner: "share_to_voxy",
        sourceId: "source-receipt:123",
      }),
    );
    expect(shared.accepted).toBe(true);
    if (!shared.accepted) return;

    expect(shared.projection.activityClass).toBe("observed_signal");
    expect(shared.projection.guardrails.politicalPositionMayBeInferredFromObservation).toBe(false);
    expect(shared.projection).not.toHaveProperty("partyPreference");
    expect(shared.projection).not.toHaveProperty("ideology");
    expect(shared.projection).not.toHaveProperty("voteIntent");

    const promotedWithoutConsent = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "confirmed_interest",
        provenance: "explicit_share_to_voxy",
        sourceOwner: "share_to_voxy",
        refs: { topicId: "topic-42", interestTopicKey: "climate" },
        memoryView: consentedTopicMemory(),
      }),
    );
    expect(promotedWithoutConsent.accepted).toBe(false);
    expect(promotedWithoutConsent.reasonCodes).toContain("shared_content_is_observation_only");
  });

  it("requires current consented Personal Voxy memory for confirmed interests", () => {
    const withoutMemory = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "confirmed_interest",
        provenance: "confirmed_interest",
        sourceOwner: "personal_voxy_memory",
        sourceId: "memory:topic_interests",
        refs: { topicId: "topic-42", interestTopicKey: "climate" },
      }),
    );
    expect(withoutMemory.accepted).toBe(false);
    expect(withoutMemory.reasonCodes).toContain("current_consented_memory_interest_required");

    const withMemory = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "confirmed_interest",
        provenance: "confirmed_interest",
        sourceOwner: "personal_voxy_memory",
        sourceId: "memory:topic_interests",
        refs: { topicId: "topic-42", interestTopicKey: "climate" },
        memoryView: consentedTopicMemory(),
      }),
    );
    expect(withMemory.accepted).toBe(true);
    if (withMemory.accepted) {
      expect(withMemory.projection.controls.memoryControlRequired).toBe(true);
    }
  });

  it("fails closed after revoke or do-not-remember removes the interest from the usable memory view", () => {
    const revoked: PersonalVoxyMemoryRuntimeView = {
      usableEntries: [],
      staleKeys: ["topic_interests"],
      suppressedKeys: ["topic_interests"],
      blockedReason: null,
      guardrails: PERSONAL_VOXY_MEMORY_GUARDRAILS,
    };

    const result = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "confirmed_interest",
        provenance: "confirmed_interest",
        sourceOwner: "personal_voxy_memory",
        sourceId: "memory:topic_interests",
        refs: { topicId: "topic-42", interestTopicKey: "climate" },
        memoryView: revoked,
      }),
    );
    expect(result.accepted).toBe(false);
    expect(result.reasonCodes).toContain("current_consented_memory_interest_required");
  });

  it("keeps explicit participation bound to a concrete canonical action or question", () => {
    const vague = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "explicit_participation",
        provenance: "explicit_product_action",
        sourceOwner: "decision_question",
        sourceId: "participation:1",
        refs: { topicId: "topic-42" },
      }),
    );
    expect(vague.accepted).toBe(false);
    expect(vague.reasonCodes).toContain("explicit_participation_requires_concrete_domain_ref");

    const concrete = resolveVoxyCivicActivityProjection(
      input({
        activityClass: "explicit_participation",
        provenance: "explicit_product_action",
        sourceOwner: "decision_question",
        sourceId: "participation:decision-9",
        refs: { topicId: "topic-42", decisionQuestionId: "decision-9" },
      }),
    );
    expect(concrete.accepted).toBe(true);
  });

  it("explains personalized entries only from concrete user-visible provenance", () => {
    const saved = acceptedProjection();
    const participated = acceptedProjection({
      activityClass: "explicit_participation",
      provenance: "explicit_product_action",
      sourceOwner: "decision_question",
      sourceId: "participation:decision-9",
      refs: { topicId: "topic-42", decisionQuestionId: "decision-9" },
    });

    const explanation = explainVoxyCivicRelevance({
      candidate: {
        itemId: "update-1",
        personalized: true,
        topicId: "topic-42",
        decisionQuestionId: "decision-9",
      },
      activities: [saved, participated],
    });

    expect(explanation.personalizationAllowed).toBe(true);
    expect(explanation.reasonCodes).toContain("saved_topic");
    expect(explanation.reasonCodes).toContain("explicit_participation");
    expect(explanation.messages.length).toBeGreaterThan(0);
    expect(explanation.activityEventIds).toContain(saved.eventId);
    expect(explanation.activityEventIds).toContain(participated.eventId);
  });

  it("does not invent personalization when no explainable basis exists", () => {
    const explanation = explainVoxyCivicRelevance({
      candidate: { itemId: "update-unrelated", personalized: true, topicId: "topic-other" },
      activities: [acceptedProjection()],
    });

    expect(explanation.personalizationAllowed).toBe(false);
    expect(explanation.reasonCodes).toEqual(["no_explainable_personalized_basis"]);
    expect(explanation.messages).toEqual([]);
    expect(explanation.activityEventIds).toEqual([]);
  });

  it("makes relevance incapable of changing evidence, truth, counterarguments, rights, voting or publishing", () => {
    expect(VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS).toMatchObject({
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      materialFactsMayBeHidden: false,
      strongCounterargumentsMayBeHidden: false,
      participationRightsMayChange: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
      partyPreferenceInferenceAllowed: false,
      ideologyInferenceAllowed: false,
      voteIntentInferenceAllowed: false,
      persuadabilityInferenceAllowed: false,
    });
  });
});
