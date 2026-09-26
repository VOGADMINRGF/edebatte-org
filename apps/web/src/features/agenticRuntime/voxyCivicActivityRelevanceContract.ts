import type { PersonalVoxyMemoryRuntimeView } from "@/features/agenticRuntime/personalVoxyConsentedMemoryContract";

export const VOXY_CIVIC_ACTIVITY_SCHEMA_VERSION = "voxy.civic-activity.v1" as const;

export const VOXY_CIVIC_ACTIVITY_CLASSES = [
  "observed_signal",
  "confirmed_interest",
  "explicit_participation",
] as const;

export const VOXY_CIVIC_ACTIVITY_PROVENANCE = [
  "explicit_product_action",
  "explicit_share_to_voxy",
  "confirmed_interest",
] as const;

export const VOXY_CIVIC_ACTIVITY_SOURCE_OWNERS = [
  "canonical_topic",
  "decision_question",
  "contribution",
  "round",
  "dossier",
  "watchlist",
  "saved_topic",
  "share_to_voxy",
  "personal_voxy_memory",
  "other_canonical_owner",
] as const;

export const VOXY_CIVIC_RELEVANCE_REASON_CODES = [
  "saved_topic",
  "watchlist_topic",
  "explicit_participation",
  "confirmed_interest",
  "explicit_share_to_voxy",
  "selected_region",
  "no_explainable_personalized_basis",
] as const;

export const VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS = {
  secondActivityTruthStoreAllowed: false,
  secondMemoryStoreAllowed: false,
  politicalPositionMayBeInferredFromObservation: false,
  partyPreferenceInferenceAllowed: false,
  ideologyInferenceAllowed: false,
  voteIntentInferenceAllowed: false,
  persuadabilityInferenceAllowed: false,
  evidenceWeightingMayChange: false,
  truthStatusMayChange: false,
  materialFactsMayBeHidden: false,
  strongCounterargumentsMayBeHidden: false,
  participationRightsMayChange: false,
  autoVoteAllowed: false,
  autoPublishAllowed: false,
  socialAccountAutonomyAllowed: false,
} as const;

export type VoxyCivicActivityClass = (typeof VOXY_CIVIC_ACTIVITY_CLASSES)[number];
export type VoxyCivicActivityProvenance = (typeof VOXY_CIVIC_ACTIVITY_PROVENANCE)[number];
export type VoxyCivicActivitySourceOwner = (typeof VOXY_CIVIC_ACTIVITY_SOURCE_OWNERS)[number];
export type VoxyCivicRelevanceReasonCode =
  (typeof VOXY_CIVIC_RELEVANCE_REASON_CODES)[number];

export type VoxyCivicActivityCanonicalRefs = {
  topicId?: string | null;
  decisionQuestionId?: string | null;
  roundId?: string | null;
  dossierId?: string | null;
  contributionId?: string | null;
  regionRef?: string | null;
  interestTopicKey?: string | null;
};

export type VoxyCivicActivityProjectionInput = {
  actorId: string;
  occurredAt: string;
  activityClass: VoxyCivicActivityClass;
  provenance: VoxyCivicActivityProvenance;
  sourceOwner: VoxyCivicActivitySourceOwner;
  sourceId: string;
  sourceRevision?: string | null;
  sourceReceiptRef?: string | null;
  refs?: VoxyCivicActivityCanonicalRefs;
  memoryView?: PersonalVoxyMemoryRuntimeView | null;
};

export type VoxyCivicActivityProjection = {
  schemaVersion: typeof VOXY_CIVIC_ACTIVITY_SCHEMA_VERSION;
  eventId: string;
  actorId: string;
  occurredAt: string;
  activityClass: VoxyCivicActivityClass;
  provenance: VoxyCivicActivityProvenance;
  sourceOwner: VoxyCivicActivitySourceOwner;
  sourceId: string;
  sourceRevision: string | null;
  sourceReceiptRef: string | null;
  refs: VoxyCivicActivityCanonicalRefs;
  visibility: "user_visible";
  controls: {
    hideProjectionAllowed: true;
    memoryControlRequired: boolean;
    domainTruthMutationAllowed: false;
  };
  guardrails: typeof VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS;
};

export type VoxyCivicActivityProjectionDecision =
  | {
      accepted: true;
      projection: VoxyCivicActivityProjection;
      reasonCodes: readonly string[];
    }
  | {
      accepted: false;
      projection: null;
      reasonCodes: readonly string[];
    };

export type VoxyCivicRelevanceCandidate = {
  itemId: string;
  personalized: boolean;
  topicId?: string | null;
  decisionQuestionId?: string | null;
  roundId?: string | null;
  dossierId?: string | null;
  contributionId?: string | null;
  regionRef?: string | null;
};

export type VoxyCivicRelevanceExplanation = {
  itemId: string;
  personalized: boolean;
  personalizationAllowed: boolean;
  reasonCodes: VoxyCivicRelevanceReasonCode[];
  messages: string[];
  activityEventIds: string[];
  guardrails: typeof VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS;
};

function normalizeRequiredRef(value: string) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 && normalized.length <= 320 ? normalized : null;
}

function normalizeOptionalRef(value?: string | null) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeRequiredRef(value);
}

function normalizeOccurredAt(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toISOString();
}

function stableEventId(input: {
  actorId: string;
  activityClass: VoxyCivicActivityClass;
  sourceOwner: VoxyCivicActivitySourceOwner;
  sourceId: string;
  sourceRevision: string | null;
}) {
  return [
    "voxy-civic",
    "v1",
    input.actorId,
    input.activityClass,
    input.sourceOwner,
    input.sourceId,
    input.sourceRevision ?? "current",
  ]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

function matchingUsableTopicInterest(
  memoryView: PersonalVoxyMemoryRuntimeView | null | undefined,
  topicKey: string | null,
) {
  if (!memoryView || memoryView.blockedReason || !topicKey) return false;
  const topicEntry = memoryView.usableEntries.find((entry) => entry.key === "topic_interests");
  return Array.isArray(topicEntry?.value) && topicEntry.value.some((value) => value === topicKey);
}

function hasConcreteParticipationRef(refs: VoxyCivicActivityCanonicalRefs) {
  return Boolean(refs.decisionQuestionId || refs.contributionId || refs.roundId);
}

function canonicalRefs(input?: VoxyCivicActivityCanonicalRefs): VoxyCivicActivityCanonicalRefs {
  return {
    topicId: normalizeOptionalRef(input?.topicId),
    decisionQuestionId: normalizeOptionalRef(input?.decisionQuestionId),
    roundId: normalizeOptionalRef(input?.roundId),
    dossierId: normalizeOptionalRef(input?.dossierId),
    contributionId: normalizeOptionalRef(input?.contributionId),
    regionRef: normalizeOptionalRef(input?.regionRef),
    interestTopicKey: normalizeOptionalRef(input?.interestTopicKey),
  };
}

export function resolveVoxyCivicActivityProjection(
  input: VoxyCivicActivityProjectionInput,
): VoxyCivicActivityProjectionDecision {
  const actorId = normalizeRequiredRef(input.actorId);
  const sourceId = normalizeRequiredRef(input.sourceId);
  const occurredAt = normalizeOccurredAt(input.occurredAt);
  const sourceRevision = normalizeOptionalRef(input.sourceRevision);
  const sourceReceiptRef = normalizeOptionalRef(input.sourceReceiptRef);
  const refs = canonicalRefs(input.refs);
  const reasons: string[] = [];

  if (!actorId) reasons.push("invalid_actor_ref");
  if (!sourceId) reasons.push("invalid_source_ref");
  if (!occurredAt) reasons.push("invalid_occurred_at");

  if (input.provenance === "explicit_share_to_voxy" && input.activityClass !== "observed_signal") {
    reasons.push("shared_content_is_observation_only");
  }

  if (input.activityClass === "observed_signal" && input.provenance === "confirmed_interest") {
    reasons.push("observed_signal_cannot_claim_confirmed_interest");
  }

  if (input.activityClass === "confirmed_interest") {
    if (input.provenance !== "confirmed_interest") {
      reasons.push("confirmed_interest_requires_confirmed_provenance");
    }
    if (!matchingUsableTopicInterest(input.memoryView, refs.interestTopicKey ?? null)) {
      reasons.push("current_consented_memory_interest_required");
    }
  }

  if (input.activityClass === "explicit_participation") {
    if (input.provenance !== "explicit_product_action") {
      reasons.push("explicit_participation_requires_product_action");
    }
    if (!hasConcreteParticipationRef(refs)) {
      reasons.push("explicit_participation_requires_concrete_domain_ref");
    }
  }

  if (reasons.length > 0 || !actorId || !sourceId || !occurredAt) {
    return { accepted: false, projection: null, reasonCodes: reasons };
  }

  const projection: VoxyCivicActivityProjection = {
    schemaVersion: VOXY_CIVIC_ACTIVITY_SCHEMA_VERSION,
    eventId: stableEventId({
      actorId,
      activityClass: input.activityClass,
      sourceOwner: input.sourceOwner,
      sourceId,
      sourceRevision,
    }),
    actorId,
    occurredAt,
    activityClass: input.activityClass,
    provenance: input.provenance,
    sourceOwner: input.sourceOwner,
    sourceId,
    sourceRevision,
    sourceReceiptRef,
    refs,
    visibility: "user_visible",
    controls: {
      hideProjectionAllowed: true,
      memoryControlRequired: input.activityClass === "confirmed_interest",
      domainTruthMutationAllowed: false,
    },
    guardrails: VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS,
  };

  return {
    accepted: true,
    projection,
    reasonCodes: ["canonical_activity_projection"],
  };
}

function exactRefMatch(
  candidateValue: string | null | undefined,
  activityValue: string | null | undefined,
) {
  return Boolean(candidateValue && activityValue && candidateValue === activityValue);
}

function topicMatch(candidate: VoxyCivicRelevanceCandidate, activity: VoxyCivicActivityProjection) {
  return exactRefMatch(candidate.topicId, activity.refs.topicId);
}

function participationMatch(
  candidate: VoxyCivicRelevanceCandidate,
  activity: VoxyCivicActivityProjection,
) {
  return (
    exactRefMatch(candidate.decisionQuestionId, activity.refs.decisionQuestionId) ||
    exactRefMatch(candidate.contributionId, activity.refs.contributionId) ||
    exactRefMatch(candidate.roundId, activity.refs.roundId)
  );
}

function pushReason(input: {
  code: VoxyCivicRelevanceReasonCode;
  message: string;
  activity: VoxyCivicActivityProjection;
  reasonCodes: VoxyCivicRelevanceReasonCode[];
  messages: string[];
  activityEventIds: string[];
}) {
  if (!input.reasonCodes.includes(input.code)) {
    input.reasonCodes.push(input.code);
    input.messages.push(input.message);
  }
  if (!input.activityEventIds.includes(input.activity.eventId)) {
    input.activityEventIds.push(input.activity.eventId);
  }
}

export function explainVoxyCivicRelevance(input: {
  candidate: VoxyCivicRelevanceCandidate;
  activities: readonly VoxyCivicActivityProjection[];
}): VoxyCivicRelevanceExplanation {
  const reasonCodes: VoxyCivicRelevanceReasonCode[] = [];
  const messages: string[] = [];
  const activityEventIds: string[] = [];

  for (const activity of input.activities) {
    if (activity.activityClass === "explicit_participation" && participationMatch(input.candidate, activity)) {
      pushReason({
        code: "explicit_participation",
        message: "Du hast bei dieser konkreten eDebatte-Frage oder Beteiligung teilgenommen.",
        activity,
        reasonCodes,
        messages,
        activityEventIds,
      });
      continue;
    }

    if (activity.activityClass === "confirmed_interest" && topicMatch(input.candidate, activity)) {
      pushReason({
        code: "confirmed_interest",
        message: "Du hast Voxy erlaubt, dieses Interesse zu berücksichtigen.",
        activity,
        reasonCodes,
        messages,
        activityEventIds,
      });
    }

    if (activity.activityClass === "observed_signal" && topicMatch(input.candidate, activity)) {
      if (activity.sourceOwner === "saved_topic") {
        pushReason({
          code: "saved_topic",
          message: "Du hast dieses Thema gespeichert.",
          activity,
          reasonCodes,
          messages,
          activityEventIds,
        });
      } else if (activity.sourceOwner === "watchlist") {
        pushReason({
          code: "watchlist_topic",
          message: "Dieses Thema steht auf deiner Watchlist.",
          activity,
          reasonCodes,
          messages,
          activityEventIds,
        });
      } else if (activity.provenance === "explicit_share_to_voxy") {
        pushReason({
          code: "explicit_share_to_voxy",
          message: "Du hast diesen Inhalt bewusst mit Voxy geteilt.",
          activity,
          reasonCodes,
          messages,
          activityEventIds,
        });
      }
    }

    if (exactRefMatch(input.candidate.regionRef, activity.refs.regionRef)) {
      pushReason({
        code: "selected_region",
        message: "Dieses Update betrifft eine von dir ausgewählte Region.",
        activity,
        reasonCodes,
        messages,
        activityEventIds,
      });
    }
  }

  if (input.candidate.personalized && reasonCodes.length === 0) {
    reasonCodes.push("no_explainable_personalized_basis");
  }

  return {
    itemId: input.candidate.itemId,
    personalized: input.candidate.personalized,
    personalizationAllowed: !input.candidate.personalized || activityEventIds.length > 0,
    reasonCodes,
    messages,
    activityEventIds,
    guardrails: VOXY_CIVIC_ACTIVITY_RELEVANCE_GUARDRAILS,
  };
}
