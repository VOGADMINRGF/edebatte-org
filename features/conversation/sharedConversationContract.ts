export const SHARED_CONVERSATION_CONTRACT_VERSION = "shared-conversation.v1" as const;

export const SHARED_CONVERSATION_SCOPES = [
  "direct",
  "group",
  "topic",
  "regional",
  "project",
] as const;

export const SHARED_CONVERSATION_LIFECYCLES = [
  "active",
  "read_only",
  "archived",
  "closed",
] as const;

export const SHARED_CONVERSATION_ORIGIN_KINDS = [
  "direct_pair",
  "group",
  "topic",
  "region",
  "project",
] as const;

export type SharedConversationScope = (typeof SHARED_CONVERSATION_SCOPES)[number];
export type SharedConversationLifecycle = (typeof SHARED_CONVERSATION_LIFECYCLES)[number];
export type SharedConversationOriginKind = (typeof SHARED_CONVERSATION_ORIGIN_KINDS)[number];

export type SharedConversationOriginRef = {
  kind: SharedConversationOriginKind;
  refId: string;
};

export type SharedConversationParticipantPolicy = {
  membership: "explicit";
  activeParticipantIds: string[];
  leftParticipantIds: string[];
  removedParticipantIds: string[];
  moderatorActorIds: string[];
  inviterActorIds: string[];
};

export type SharedConversationVisibilityPolicy = {
  mode: "participants_only" | "restricted";
  allowedActorIds: string[];
};

export type SharedConversationRetentionPolicy =
  | { mode: "inherit_origin" }
  | { mode: "indefinite" }
  | { mode: "bounded_days"; days: number };

export type SharedConversationModerationPolicy = {
  mode: "review_first";
  blockedActorIds: string[];
};

export type SharedConversationHandoffPolicy = {
  mode: "disabled" | "review_required";
};

export type SharedConversation = {
  contractVersion: typeof SHARED_CONVERSATION_CONTRACT_VERSION;
  conversationId: string;
  scope: SharedConversationScope;
  origin: SharedConversationOriginRef;
  participantPolicy: SharedConversationParticipantPolicy;
  visibilityPolicy: SharedConversationVisibilityPolicy;
  lifecycle: SharedConversationLifecycle;
  retentionPolicy: SharedConversationRetentionPolicy;
  moderationPolicy: SharedConversationModerationPolicy;
  handoffPolicy: SharedConversationHandoffPolicy;
  representativenessStatus: "not_asserted";
  truthStatus: "not_asserted";
  publishStatus: "not_asserted";
};

export type SharedConversationMessage = {
  contractVersion: typeof SHARED_CONVERSATION_CONTRACT_VERSION;
  messageId: string;
  conversationId: string;
  authorActorId: string;
  createdAt: string;
  state: "active" | "edited" | "deleted";
  editedAt?: string | null;
  deletedAt?: string | null;
  authorityClaim: "none";
  publicProjection: false;
  claimPromotion: false;
  publishPromotion: false;
};

export type SharedConversationActorContext = {
  actorId: string;
  actorKnown: boolean;
  directMessagingAllowed?: boolean;
};

export type SharedConversationCapabilities = {
  canRead: boolean;
  canPost: boolean;
  canReply: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  canModerate: boolean;
  canInvite: boolean;
  canRequestHandoff: boolean;
  reviewRequired: boolean;
  reasonCodes: string[];
  handoffEffect: "none" | "review_candidate_only";
  canAutoHandoff: false;
  canPublish: false;
  canProjectPublic: false;
  canPromoteClaim: false;
};

export type SharedConversationValidation = {
  valid: boolean;
  reasonCodes: string[];
};

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

const ORIGIN_KIND_BY_SCOPE: Record<SharedConversationScope, SharedConversationOriginKind> = {
  direct: "direct_pair",
  group: "group",
  topic: "topic",
  regional: "region",
  project: "project",
};

function unique(values: readonly string[]) {
  return Array.from(new Set(values));
}

function isStableId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function allStableIds(values: unknown): values is string[] {
  return Array.isArray(values) && values.every(isStableId);
}

function hasNoCrossMembershipDuplicates(policy: SharedConversationParticipantPolicy) {
  const all = [
    ...policy.activeParticipantIds,
    ...policy.leftParticipantIds,
    ...policy.removedParticipantIds,
  ];
  return unique(all).length === all.length;
}

export function validateSharedConversation(input: unknown): SharedConversationValidation {
  const reasonCodes: string[] = [];
  const value = input as Partial<SharedConversation> | null;

  if (!value || typeof value !== "object") {
    return { valid: false, reasonCodes: ["conversation_missing"] };
  }

  if (value.contractVersion !== SHARED_CONVERSATION_CONTRACT_VERSION) {
    reasonCodes.push("contract_version_invalid");
  }
  if (!isStableId(value.conversationId)) reasonCodes.push("conversation_id_invalid");
  if (!SHARED_CONVERSATION_SCOPES.includes(value.scope as SharedConversationScope)) {
    reasonCodes.push("scope_invalid");
  }

  const origin = value.origin as Partial<SharedConversationOriginRef> | undefined;
  if (!origin || !isStableId(origin.refId)) {
    reasonCodes.push("origin_missing_or_invalid");
  } else if (
    value.scope &&
    SHARED_CONVERSATION_SCOPES.includes(value.scope as SharedConversationScope) &&
    origin.kind !== ORIGIN_KIND_BY_SCOPE[value.scope as SharedConversationScope]
  ) {
    reasonCodes.push("origin_scope_mismatch");
  }

  const participantPolicy = value.participantPolicy as SharedConversationParticipantPolicy | undefined;
  if (
    !participantPolicy ||
    participantPolicy.membership !== "explicit" ||
    !allStableIds(participantPolicy.activeParticipantIds) ||
    !allStableIds(participantPolicy.leftParticipantIds) ||
    !allStableIds(participantPolicy.removedParticipantIds) ||
    !allStableIds(participantPolicy.moderatorActorIds) ||
    !allStableIds(participantPolicy.inviterActorIds)
  ) {
    reasonCodes.push("participant_policy_missing_or_invalid");
  } else {
    if (!hasNoCrossMembershipDuplicates(participantPolicy)) {
      reasonCodes.push("participant_membership_ambiguous");
    }
    const active = new Set(participantPolicy.activeParticipantIds);
    if (participantPolicy.moderatorActorIds.some((id) => !active.has(id))) {
      reasonCodes.push("moderator_not_active_participant");
    }
    if (participantPolicy.inviterActorIds.some((id) => !active.has(id))) {
      reasonCodes.push("inviter_not_active_participant");
    }
  }

  const visibilityPolicy = value.visibilityPolicy as SharedConversationVisibilityPolicy | undefined;
  if (
    !visibilityPolicy ||
    !["participants_only", "restricted"].includes(visibilityPolicy.mode) ||
    !allStableIds(visibilityPolicy.allowedActorIds)
  ) {
    reasonCodes.push("visibility_policy_missing_or_invalid");
  } else if (participantPolicy) {
    const knownParticipants = new Set([
      ...participantPolicy.activeParticipantIds,
      ...participantPolicy.leftParticipantIds,
      ...participantPolicy.removedParticipantIds,
    ]);
    if (visibilityPolicy.allowedActorIds.some((id) => !knownParticipants.has(id))) {
      reasonCodes.push("visibility_actor_not_participant");
    }
  }

  if (!SHARED_CONVERSATION_LIFECYCLES.includes(value.lifecycle as SharedConversationLifecycle)) {
    reasonCodes.push("lifecycle_invalid");
  }

  const retention = value.retentionPolicy as SharedConversationRetentionPolicy | undefined;
  if (!retention || !["inherit_origin", "indefinite", "bounded_days"].includes(retention.mode)) {
    reasonCodes.push("retention_policy_missing_or_invalid");
  } else if (
    retention.mode === "bounded_days" &&
    (!Number.isInteger(retention.days) || retention.days < 1 || retention.days > 3650)
  ) {
    reasonCodes.push("retention_days_invalid");
  }

  const moderation = value.moderationPolicy as SharedConversationModerationPolicy | undefined;
  if (
    !moderation ||
    moderation.mode !== "review_first" ||
    !allStableIds(moderation.blockedActorIds)
  ) {
    reasonCodes.push("moderation_policy_missing_or_invalid");
  }

  if (!value.handoffPolicy || !["disabled", "review_required"].includes(value.handoffPolicy.mode)) {
    reasonCodes.push("handoff_policy_missing_or_invalid");
  }

  if (value.representativenessStatus !== "not_asserted") {
    reasonCodes.push("representativeness_status_forbidden");
  }
  if (value.truthStatus !== "not_asserted") reasonCodes.push("truth_status_forbidden");
  if (value.publishStatus !== "not_asserted") reasonCodes.push("publish_status_forbidden");

  return { valid: reasonCodes.length === 0, reasonCodes: unique(reasonCodes) };
}

export function validateSharedConversationMessage(
  input: unknown,
  conversation?: Pick<SharedConversation, "conversationId">,
): SharedConversationValidation {
  const reasonCodes: string[] = [];
  const value = input as Partial<SharedConversationMessage> | null;
  if (!value || typeof value !== "object") {
    return { valid: false, reasonCodes: ["message_missing"] };
  }
  if (value.contractVersion !== SHARED_CONVERSATION_CONTRACT_VERSION) {
    reasonCodes.push("contract_version_invalid");
  }
  if (!isStableId(value.messageId)) reasonCodes.push("message_id_invalid");
  if (!isStableId(value.conversationId)) reasonCodes.push("conversation_id_invalid");
  if (conversation && value.conversationId !== conversation.conversationId) {
    reasonCodes.push("message_conversation_mismatch");
  }
  if (!isStableId(value.authorActorId)) reasonCodes.push("author_actor_id_invalid");
  if (!isIsoTimestamp(value.createdAt)) reasonCodes.push("created_at_invalid");
  if (!value.state || !["active", "edited", "deleted"].includes(value.state)) {
    reasonCodes.push("message_state_invalid");
  }
  if (value.authorityClaim !== "none") reasonCodes.push("authority_claim_forbidden");
  if (value.publicProjection !== false) reasonCodes.push("public_projection_forbidden");
  if (value.claimPromotion !== false) reasonCodes.push("claim_promotion_forbidden");
  if (value.publishPromotion !== false) reasonCodes.push("publish_promotion_forbidden");
  return { valid: reasonCodes.length === 0, reasonCodes: unique(reasonCodes) };
}

export function resolveSharedConversationCapabilities(input: {
  conversation: unknown;
  actor: SharedConversationActorContext;
  messageAuthorActorId?: string | null;
}): SharedConversationCapabilities {
  const validation = validateSharedConversation(input.conversation);
  const reasonCodes = [...validation.reasonCodes];
  const deny = (extra: string[] = []): SharedConversationCapabilities => ({
    canRead: false,
    canPost: false,
    canReply: false,
    canEditOwn: false,
    canDeleteOwn: false,
    canModerate: false,
    canInvite: false,
    canRequestHandoff: false,
    reviewRequired: true,
    reasonCodes: unique([...reasonCodes, ...extra]),
    handoffEffect: "none",
    canAutoHandoff: false,
    canPublish: false,
    canProjectPublic: false,
    canPromoteClaim: false,
  });

  if (!validation.valid) return deny();
  if (!input.actor.actorKnown || !isStableId(input.actor.actorId)) {
    return deny(["actor_unknown_or_invalid"]);
  }

  const conversation = input.conversation as SharedConversation;
  const actorId = input.actor.actorId;
  const participants = conversation.participantPolicy;
  const active = participants.activeParticipantIds.includes(actorId);
  const knownParticipant =
    active ||
    participants.leftParticipantIds.includes(actorId) ||
    participants.removedParticipantIds.includes(actorId);
  const blocked = conversation.moderationPolicy.blockedActorIds.includes(actorId);
  const visibilityAllows =
    conversation.visibilityPolicy.mode === "participants_only"
      ? knownParticipant
      : conversation.visibilityPolicy.allowedActorIds.includes(actorId);

  if (!visibilityAllows) return deny(["actor_not_visible_participant"]);
  if (blocked) return deny(["actor_blocked"]);

  const canRead = knownParticipant && conversation.lifecycle !== "closed";
  const lifecycleAllowsPost = conversation.lifecycle === "active";
  const directAllowsPost =
    conversation.scope !== "direct" || input.actor.directMessagingAllowed === true;
  const canPost = active && lifecycleAllowsPost && directAllowsPost;
  const ownsMessage =
    Boolean(input.messageAuthorActorId) && input.messageAuthorActorId === actorId;
  const canModerate = active && participants.moderatorActorIds.includes(actorId);
  const canInvite =
    active &&
    conversation.scope !== "direct" &&
    participants.inviterActorIds.includes(actorId) &&
    conversation.lifecycle === "active";
  const canRequestHandoff =
    active &&
    conversation.lifecycle === "active" &&
    conversation.handoffPolicy.mode === "review_required";

  if (conversation.lifecycle === "read_only") reasonCodes.push("conversation_read_only");
  if (conversation.lifecycle === "archived") reasonCodes.push("conversation_archived");
  if (conversation.scope === "direct" && input.actor.directMessagingAllowed !== true) {
    reasonCodes.push("direct_messaging_not_allowed");
  }
  if (!active && knownParticipant) reasonCodes.push("actor_not_active_participant");

  return {
    canRead,
    canPost,
    canReply: canPost,
    canEditOwn: canPost && ownsMessage,
    canDeleteOwn: canPost && ownsMessage,
    canModerate,
    canInvite,
    canRequestHandoff,
    reviewRequired: canRequestHandoff,
    reasonCodes: unique(reasonCodes),
    handoffEffect: canRequestHandoff ? "review_candidate_only" : "none",
    canAutoHandoff: false,
    canPublish: false,
    canProjectPublic: false,
    canPromoteClaim: false,
  };
}
