import { describe, expect, it } from "vitest";

import {
  SHARED_CONVERSATION_CONTRACT_VERSION,
  resolveSharedConversationCapabilities,
  validateSharedConversation,
  validateSharedConversationMessage,
  type SharedConversation,
  type SharedConversationScope,
} from "@features/conversation/sharedConversationContract";

const ORIGIN_BY_SCOPE: Record<SharedConversationScope, SharedConversation["origin"]["kind"]> = {
  direct: "direct_pair",
  group: "group",
  topic: "topic",
  regional: "region",
  project: "project",
};

function conversation(
  scope: SharedConversationScope,
  overrides: Partial<SharedConversation> = {},
): SharedConversation {
  return {
    contractVersion: SHARED_CONVERSATION_CONTRACT_VERSION,
    conversationId: `conversation:${scope}:1`,
    scope,
    origin: { kind: ORIGIN_BY_SCOPE[scope], refId: `origin:${scope}:1` },
    participantPolicy: {
      membership: "explicit",
      activeParticipantIds: ["actor:a", "actor:b"],
      leftParticipantIds: [],
      removedParticipantIds: [],
      moderatorActorIds: ["actor:a"],
      inviterActorIds: scope === "direct" ? [] : ["actor:a"],
    },
    visibilityPolicy: {
      mode: "participants_only",
      allowedActorIds: ["actor:a", "actor:b"],
    },
    lifecycle: "active",
    retentionPolicy: { mode: "inherit_origin" },
    moderationPolicy: { mode: "review_first", blockedActorIds: [] },
    handoffPolicy: { mode: "review_required" },
    representativenessStatus: "not_asserted",
    truthStatus: "not_asserted",
    publishStatus: "not_asserted",
    ...overrides,
  };
}

describe("shared conversation contract", () => {
  it.each(["direct", "group", "topic", "regional", "project"] as const)(
    "validates the canonical %s scope without copying domain truth",
    (scope) => {
      const model = conversation(scope);
      expect(validateSharedConversation(model)).toEqual({ valid: true, reasonCodes: [] });
      expect(model.origin).toEqual({ kind: ORIGIN_BY_SCOPE[scope], refId: `origin:${scope}:1` });
      expect(model.representativenessStatus).toBe("not_asserted");
      expect(model.truthStatus).toBe("not_asserted");
      expect(model.publishStatus).toBe("not_asserted");
    },
  );

  it("allows a confirmed direct participant to message while keeping handoff review-only", () => {
    const model = conversation("direct");
    const capabilities = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:a", actorKnown: true, directMessagingAllowed: true },
      messageAuthorActorId: "actor:a",
    });

    expect(capabilities).toMatchObject({
      canRead: true,
      canPost: true,
      canReply: true,
      canEditOwn: true,
      canDeleteOwn: true,
      canModerate: true,
      canInvite: false,
      canRequestHandoff: true,
      reviewRequired: true,
      handoffEffect: "review_candidate_only",
      canAutoHandoff: false,
      canPublish: false,
      canProjectPublic: false,
      canPromoteClaim: false,
    });
  });

  it("supports explicit group participation and server-controlled invite/moderation capabilities", () => {
    const model = conversation("group");
    const moderator = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:a", actorKnown: true },
    });
    const participant = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:b", actorKnown: true },
    });

    expect(moderator.canModerate).toBe(true);
    expect(moderator.canInvite).toBe(true);
    expect(participant.canModerate).toBe(false);
    expect(participant.canInvite).toBe(false);
    expect(participant.canPost).toBe(true);
  });

  it("makes read_only readable but not writable and keeps archived distinct", () => {
    const readOnly = resolveSharedConversationCapabilities({
      conversation: conversation("topic", { lifecycle: "read_only" }),
      actor: { actorId: "actor:a", actorKnown: true },
    });
    const archived = resolveSharedConversationCapabilities({
      conversation: conversation("topic", { lifecycle: "archived" }),
      actor: { actorId: "actor:a", actorKnown: true },
    });

    expect(readOnly.canRead).toBe(true);
    expect(readOnly.canPost).toBe(false);
    expect(readOnly.reasonCodes).toContain("conversation_read_only");
    expect(archived.canRead).toBe(true);
    expect(archived.canPost).toBe(false);
    expect(archived.reasonCodes).toContain("conversation_archived");
  });

  it("fails closed for strangers, removed participants and blocked actors", () => {
    const model = conversation("group", {
      participantPolicy: {
        membership: "explicit",
        activeParticipantIds: ["actor:a"],
        leftParticipantIds: ["actor:left"],
        removedParticipantIds: ["actor:removed"],
        moderatorActorIds: ["actor:a"],
        inviterActorIds: ["actor:a"],
      },
      visibilityPolicy: {
        mode: "participants_only",
        allowedActorIds: ["actor:a", "actor:left", "actor:removed"],
      },
      moderationPolicy: { mode: "review_first", blockedActorIds: ["actor:removed"] },
    });

    const stranger = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:stranger", actorKnown: true },
    });
    const left = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:left", actorKnown: true },
    });
    const removed = resolveSharedConversationCapabilities({
      conversation: model,
      actor: { actorId: "actor:removed", actorKnown: true },
    });

    expect(stranger.canRead).toBe(false);
    expect(stranger.canPost).toBe(false);
    expect(stranger.reasonCodes).toContain("actor_not_visible_participant");
    expect(left.canRead).toBe(true);
    expect(left.canPost).toBe(false);
    expect(left.reasonCodes).toContain("actor_not_active_participant");
    expect(removed.canRead).toBe(false);
    expect(removed.canPost).toBe(false);
    expect(removed.reasonCodes).toContain("actor_blocked");
  });

  it("ignores client-claimed authority because only server contract state grants capabilities", () => {
    const model = conversation("group");
    const actor = {
      actorId: "actor:b",
      actorKnown: true,
      claimedModerator: true,
      claimedPublisher: true,
    } as unknown as { actorId: string; actorKnown: boolean };
    const capabilities = resolveSharedConversationCapabilities({ conversation: model, actor });

    expect(capabilities.canModerate).toBe(false);
    expect(capabilities.canPublish).toBe(false);
    expect(capabilities.canProjectPublic).toBe(false);
  });

  it("rejects origin reinterpretation and missing policy data", () => {
    const mismatch = {
      ...conversation("direct"),
      origin: { kind: "region", refId: "origin:region:1" },
    };
    const missingPolicy = {
      ...conversation("project"),
      participantPolicy: undefined,
    };

    expect(validateSharedConversation(mismatch).reasonCodes).toContain("origin_scope_mismatch");
    expect(validateSharedConversation(missingPolicy).reasonCodes).toContain(
      "participant_policy_missing_or_invalid",
    );

    const capabilities = resolveSharedConversationCapabilities({
      conversation: mismatch,
      actor: { actorId: "actor:a", actorKnown: true },
    });
    expect(capabilities.canRead).toBe(false);
    expect(capabilities.reviewRequired).toBe(true);
  });

  it("keeps direct messaging fail-closed when the existing relationship capability is false", () => {
    const capabilities = resolveSharedConversationCapabilities({
      conversation: conversation("direct"),
      actor: { actorId: "actor:a", actorKnown: true, directMessagingAllowed: false },
    });
    expect(capabilities.canRead).toBe(true);
    expect(capabilities.canPost).toBe(false);
    expect(capabilities.reasonCodes).toContain("direct_messaging_not_allowed");
  });

  it("validates message identity and prevents automatic truth/public/publish promotion", () => {
    const model = conversation("topic");
    const message = {
      contractVersion: SHARED_CONVERSATION_CONTRACT_VERSION,
      messageId: "message:1",
      conversationId: model.conversationId,
      authorActorId: "actor:a",
      createdAt: "2026-09-25T12:00:00.000Z",
      state: "active" as const,
      authorityClaim: "none" as const,
      publicProjection: false as const,
      claimPromotion: false as const,
      publishPromotion: false as const,
    };

    expect(validateSharedConversationMessage(message, model)).toEqual({ valid: true, reasonCodes: [] });
    expect(
      validateSharedConversationMessage(
        { ...message, conversationId: "conversation:other", publicProjection: true },
        model,
      ).reasonCodes,
    ).toEqual(expect.arrayContaining(["message_conversation_mismatch", "public_projection_forbidden"]));
  });

  it("never turns a closed conversation into public or claim truth", () => {
    const capabilities = resolveSharedConversationCapabilities({
      conversation: conversation("regional", { lifecycle: "closed" }),
      actor: { actorId: "actor:a", actorKnown: true },
    });
    expect(capabilities.canRead).toBe(false);
    expect(capabilities.canPost).toBe(false);
    expect(capabilities.canRequestHandoff).toBe(false);
    expect(capabilities.canPublish).toBe(false);
    expect(capabilities.canProjectPublic).toBe(false);
    expect(capabilities.canPromoteClaim).toBe(false);
  });
});
