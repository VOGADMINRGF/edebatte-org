import { TOPIC_CHOICES, type TopicKey } from "@features/interests/topics";
import {
  PERSONAL_VOXY_MODES,
  type PersonalVoxyMode,
} from "@/features/agenticRuntime/agentRegistryBootstrapContract";
import {
  AGENT_SAFE_TRACE_CONFIDENCE_LABELS,
  buildAgentSafeTraceStep,
  type AgentSafeTraceStep,
} from "@/features/agenticRuntime/agentRunArtifactSafeTraceContract";
import {
  PERSONAL_VOXY_RELEVANCE_DEPTHS,
  type PersonalVoxyConsentScope,
  type PersonalVoxyProfileConsentOnboardingContract,
  type PersonalVoxyRelevanceDepth,
} from "@/features/agenticRuntime/personalVoxyProfileConsentOnboardingContract";

export const PERSONAL_VOXY_MEMORY_KEYS = [
  "region_context",
  "topic_interests",
  "relevance_depth",
  "preferred_language",
  "accessibility_preferences",
  "companion_mode",
] as const;

export const PERSONAL_VOXY_MEMORY_SCOPES = [
  "profile_memory",
  "topic_relevance",
  "regional_context",
] as const satisfies readonly PersonalVoxyConsentScope[];

export const PERSONAL_VOXY_ACCESSIBILITY_PREFERENCES = [
  "reduced_motion",
  "high_contrast",
  "large_text",
  "screen_reader_friendly",
] as const;

export const PERSONAL_VOXY_MEMORY_GUARDRAILS = {
  secondMemoryStoreAllowed: false,
  hiddenPoliticalProfilingAllowed: false,
  partyPreferenceStorageAllowed: false,
  voteIntentStorageAllowed: false,
  ideologyStorageAllowed: false,
  persuadabilityStorageAllowed: false,
  evidenceWeightingMayChange: false,
  truthStatusMayChange: false,
  materialFactsMayBeHidden: false,
  strongCounterargumentsMayBeHidden: false,
  autoPublishAllowed: false,
  actingOnBehalfOfUserAllowed: false,
} as const;

export type PersonalVoxyMemoryKey = (typeof PERSONAL_VOXY_MEMORY_KEYS)[number];
export type PersonalVoxyMemoryScope = (typeof PERSONAL_VOXY_MEMORY_SCOPES)[number];
export type PersonalVoxyAccessibilityPreference =
  (typeof PERSONAL_VOXY_ACCESSIBILITY_PREFERENCES)[number];
export type PersonalVoxyMemorySource = "explicit_user_input" | "confirmed_inference";
export type PersonalVoxyMemoryAction =
  | "write"
  | "delete"
  | "do_not_remember"
  | "clear_do_not_remember"
  | "revoke_scope"
  | "full_reset";

export type PersonalVoxyRegionContext = {
  city: string | null;
  region: string | null;
  countryCode: string | null;
};

export type PersonalVoxyMemoryValue =
  | PersonalVoxyRegionContext
  | TopicKey[]
  | PersonalVoxyRelevanceDepth
  | PersonalVoxyMode
  | string
  | PersonalVoxyAccessibilityPreference[];

export type PersonalVoxyMemoryProvenance = {
  source: PersonalVoxyMemorySource;
  reason: string | null;
  confidence: number | null;
  confirmedAt: string;
  conversationRef: string | null;
};

export type PersonalVoxyMemoryEntry = {
  key: PersonalVoxyMemoryKey;
  scope: PersonalVoxyMemoryScope;
  value: PersonalVoxyMemoryValue;
  consentRevision: number;
  createdAt: string;
  updatedAt: string;
  provenance: PersonalVoxyMemoryProvenance;
};

export type PersonalVoxyMemoryBarrier = {
  consentRevision: number;
  at: string;
};

export type PersonalVoxyMemoryState = {
  version: 1;
  revision: number;
  entries: Partial<Record<PersonalVoxyMemoryKey, PersonalVoxyMemoryEntry>>;
  suppressedKeys: PersonalVoxyMemoryKey[];
  revokedScopes: Partial<Record<PersonalVoxyMemoryScope, PersonalVoxyMemoryBarrier>>;
  resetBarrier: PersonalVoxyMemoryBarrier | null;
  updatedAt: string;
};

export type PersonalVoxyMemoryAuthorization = {
  contract: PersonalVoxyProfileConsentOnboardingContract;
  consentRevision: number;
};

export type PersonalVoxyMemoryWriteRequest = {
  key: PersonalVoxyMemoryKey;
  value: unknown;
  source: PersonalVoxyMemorySource;
  reason?: string | null;
  confidence?: number | null;
  confirmedAt?: string | null;
  confirmedByUser?: boolean;
  conversationRef?: string | null;
};

export type PersonalVoxyMemoryMutationResult = {
  accepted: boolean;
  changed: boolean;
  reason: string | null;
  state: PersonalVoxyMemoryState;
  safeTrace: AgentSafeTraceStep;
};

export type PersonalVoxyMemoryRuntimeView = {
  usableEntries: PersonalVoxyMemoryEntry[];
  staleKeys: PersonalVoxyMemoryKey[];
  suppressedKeys: PersonalVoxyMemoryKey[];
  blockedReason: string | null;
  guardrails: typeof PERSONAL_VOXY_MEMORY_GUARDRAILS;
};

const TOPIC_KEYS = new Set<TopicKey>(TOPIC_CHOICES.map((topic) => topic.key));
const RELEVANCE_DEPTHS = new Set<string>(PERSONAL_VOXY_RELEVANCE_DEPTHS);
const VOXY_MODES = new Set<string>(PERSONAL_VOXY_MODES);
const ACCESSIBILITY_PREFERENCES = new Set<string>(PERSONAL_VOXY_ACCESSIBILITY_PREFERENCES);

function nowIso(now?: Date | string) {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === "string" && !Number.isNaN(new Date(now).getTime())) {
    return new Date(now).toISOString();
  }
  return new Date().toISOString();
}

function isPositiveRevision(value: number) {
  return Number.isInteger(value) && value > 0;
}

function normalizeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

function normalizeOptionalText(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") return null;
  return normalizeText(value, max);
}

function normalizeCountryCode(value: unknown) {
  const text = normalizeOptionalText(value, 8);
  if (!text) return null;
  if (!/^[A-Za-z]{2,8}$/.test(text)) return null;
  return text.toUpperCase();
}

function normalizeLanguage(value: unknown) {
  const text = normalizeText(value, 35);
  if (!text) return null;
  if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(text)) return null;
  return text;
}

function normalizeMemoryValue(
  key: PersonalVoxyMemoryKey,
  value: unknown,
): PersonalVoxyMemoryValue | null {
  if (key === "region_context") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const city = normalizeOptionalText(record.city, 120);
    const region = normalizeOptionalText(record.region, 120);
    const countryCode = normalizeCountryCode(record.countryCode);
    if (!city && !region && !countryCode) return null;
    return { city, region, countryCode };
  }

  if (key === "topic_interests") {
    if (!Array.isArray(value)) return null;
    const topics = Array.from(
      new Set(
        value.filter(
          (entry): entry is TopicKey =>
            typeof entry === "string" && TOPIC_KEYS.has(entry as TopicKey),
        ),
      ),
    );
    if (topics.length === 0 || topics.length > TOPIC_KEYS.size) return null;
    return topics;
  }

  if (key === "relevance_depth") {
    return typeof value === "string" && RELEVANCE_DEPTHS.has(value)
      ? (value as PersonalVoxyRelevanceDepth)
      : null;
  }

  if (key === "preferred_language") {
    return normalizeLanguage(value);
  }

  if (key === "accessibility_preferences") {
    if (!Array.isArray(value)) return null;
    const preferences = Array.from(
      new Set(
        value.filter(
          (entry): entry is PersonalVoxyAccessibilityPreference =>
            typeof entry === "string" && ACCESSIBILITY_PREFERENCES.has(entry),
        ),
      ),
    );
    if (preferences.length !== value.length) return null;
    return preferences;
  }

  if (key === "companion_mode") {
    return typeof value === "string" && VOXY_MODES.has(value)
      ? (value as PersonalVoxyMode)
      : null;
  }

  return null;
}

export function getPersonalVoxyMemoryScope(key: PersonalVoxyMemoryKey): PersonalVoxyMemoryScope {
  if (key === "region_context") return "regional_context";
  if (key === "topic_interests") return "topic_relevance";
  return "profile_memory";
}

export function createEmptyPersonalVoxyMemoryState(now?: Date | string): PersonalVoxyMemoryState {
  return {
    version: 1,
    revision: 0,
    entries: {},
    suppressedKeys: [],
    revokedScopes: {},
    resetBarrier: null,
    updatedAt: nowIso(now),
  };
}

function cloneState(state: PersonalVoxyMemoryState | null | undefined, now?: Date | string) {
  const current = state ?? createEmptyPersonalVoxyMemoryState(now);
  return {
    ...current,
    entries: { ...current.entries },
    suppressedKeys: [...current.suppressedKeys],
    revokedScopes: { ...current.revokedScopes },
  } satisfies PersonalVoxyMemoryState;
}

function scopeDecision(
  authorization: PersonalVoxyMemoryAuthorization,
  scope: PersonalVoxyMemoryScope,
) {
  return authorization.contract.consentDecisions.find((decision) => decision.scope === scope) ?? null;
}

function authorizationFailure(
  authorization: PersonalVoxyMemoryAuthorization,
  scope: PersonalVoxyMemoryScope,
) {
  if (!isPositiveRevision(authorization.consentRevision)) return "invalid_consent_revision";
  if (authorization.contract.segment !== "b2c") return "personal_voxy_not_available_for_segment";
  if (!authorization.contract.profilePersistenceAllowed) return "profile_persistence_not_consented";
  const decision = scopeDecision(authorization, scope);
  if (!decision?.granted || !decision.persistenceAllowed) return `scope_not_consented:${scope}`;
  return null;
}

function normalizeProvenance(
  request: PersonalVoxyMemoryWriteRequest,
  at: string,
): PersonalVoxyMemoryProvenance | null {
  const conversationRef = request.conversationRef
    ? normalizeText(request.conversationRef, 160)
    : null;
  if (request.conversationRef && !conversationRef) return null;

  if (request.source === "explicit_user_input") {
    return {
      source: request.source,
      reason: null,
      confidence: null,
      confirmedAt: at,
      conversationRef,
    };
  }

  if (request.confirmedByUser !== true) return null;
  const reason = normalizeText(request.reason, 280);
  if (!reason) return null;
  if (
    typeof request.confidence !== "number" ||
    !Number.isFinite(request.confidence) ||
    request.confidence < 0 ||
    request.confidence > 1
  ) {
    return null;
  }
  const confirmedAt = request.confirmedAt ? nowIso(request.confirmedAt) : null;
  if (!confirmedAt) return null;

  return {
    source: request.source,
    reason,
    confidence: request.confidence,
    confirmedAt,
    conversationRef,
  };
}

function buildMemorySafeTrace(input: {
  action: PersonalVoxyMemoryAction;
  accepted: boolean;
  key?: PersonalVoxyMemoryKey;
  scope?: PersonalVoxyMemoryScope;
  consentRevision?: number;
  reason?: string | null;
}): AgentSafeTraceStep {
  const target = input.key ?? input.scope ?? "all_memory";
  const evidenceRefs = [
    `action:${input.action}`,
    `target:${target}`,
    ...(input.consentRevision ? [`consent_revision:${input.consentRevision}`] : []),
    ...(input.reason ? [`reason:${input.reason}`] : []),
  ];

  return buildAgentSafeTraceStep({
    taskId: "PERSONAL-VOXY-CONSENTED-MEMORY-RUNTIME-01",
    stepId: `personal_voxy_memory_${input.action}`,
    surface: "/account",
    userSafeLabel: input.accepted
      ? `Personal-Voxy-Speicheraktion '${input.action}' wurde ohne Rohinhalt im Trace verarbeitet.`
      : `Personal-Voxy-Speicheraktion '${input.action}' blieb fail-closed.` ,
    status: input.accepted ? "completed" : "blocked",
    confidenceLabel: input.accepted
      ? AGENT_SAFE_TRACE_CONFIDENCE_LABELS[2]
      : AGENT_SAFE_TRACE_CONFIDENCE_LABELS[0],
    requiredHumanAction: input.accepted ? "none" : "continue_manually",
    inputArtifacts: [
      {
        id: `personal-voxy-memory:${input.action}:input`,
        type: "human_input",
        label: "Consent-/Memory-Steuerung ohne Rohwert im Trace",
        reviewState: "present",
      },
    ],
    outputArtifacts: [
      {
        id: `personal-voxy-memory:${input.action}:result`,
        type: "review_handoff",
        label: input.accepted ? "Memory-State aktualisiert" : "Memory-State unveraendert",
        reviewState: input.accepted ? "present" : "review_required",
      },
    ],
    evidenceRefs,
    reviewState: input.accepted ? "present" : "review_required",
    publishState: "publish_blocked",
    primaryRole: "personal_voxy",
    supportingRoles: ["governance_compliance"],
  });
}

function blockedMutation(
  state: PersonalVoxyMemoryState,
  input: {
    action: PersonalVoxyMemoryAction;
    reason: string;
    key?: PersonalVoxyMemoryKey;
    scope?: PersonalVoxyMemoryScope;
    consentRevision?: number;
  },
): PersonalVoxyMemoryMutationResult {
  return {
    accepted: false,
    changed: false,
    reason: input.reason,
    state,
    safeTrace: buildMemorySafeTrace({ ...input, accepted: false }),
  };
}

function completedMutation(
  state: PersonalVoxyMemoryState,
  input: {
    action: PersonalVoxyMemoryAction;
    changed: boolean;
    key?: PersonalVoxyMemoryKey;
    scope?: PersonalVoxyMemoryScope;
    consentRevision?: number;
  },
): PersonalVoxyMemoryMutationResult {
  return {
    accepted: true,
    changed: input.changed,
    reason: null,
    state,
    safeTrace: buildMemorySafeTrace({ ...input, accepted: true }),
  };
}

export function applyPersonalVoxyMemoryWrite(input: {
  state?: PersonalVoxyMemoryState | null;
  authorization: PersonalVoxyMemoryAuthorization;
  request: PersonalVoxyMemoryWriteRequest;
  now?: Date | string;
}): PersonalVoxyMemoryMutationResult {
  const at = nowIso(input.now);
  const state = cloneState(input.state, at);
  const scope = getPersonalVoxyMemoryScope(input.request.key);
  const authorizationReason = authorizationFailure(input.authorization, scope);
  if (authorizationReason) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: authorizationReason,
    });
  }

  if (state.suppressedKeys.includes(input.request.key)) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: "do_not_remember_active",
    });
  }

  const resetBarrier = state.resetBarrier?.consentRevision ?? 0;
  if (input.authorization.consentRevision <= resetBarrier) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: "consent_revision_not_newer_than_reset",
    });
  }

  const revokeBarrier = state.revokedScopes[scope]?.consentRevision ?? 0;
  if (input.authorization.consentRevision <= revokeBarrier) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: "consent_revision_not_newer_than_revoke",
    });
  }

  const currentEntry = state.entries[input.request.key];
  if (currentEntry && currentEntry.consentRevision > input.authorization.consentRevision) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: "stale_consent_revision",
    });
  }

  const value = normalizeMemoryValue(input.request.key, input.request.value);
  if (value === null) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason: "invalid_memory_value",
    });
  }

  const provenance = normalizeProvenance(input.request, at);
  if (!provenance) {
    return blockedMutation(state, {
      action: "write",
      key: input.request.key,
      scope,
      consentRevision: input.authorization.consentRevision,
      reason:
        input.request.source === "confirmed_inference"
          ? "confirmed_inference_requires_user_confirmation_reason_confidence"
          : "invalid_memory_provenance",
    });
  }

  const next: PersonalVoxyMemoryState = {
    ...state,
    revision: state.revision + 1,
    entries: {
      ...state.entries,
      [input.request.key]: {
        key: input.request.key,
        scope,
        value,
        consentRevision: input.authorization.consentRevision,
        createdAt: currentEntry?.createdAt ?? at,
        updatedAt: at,
        provenance,
      } satisfies PersonalVoxyMemoryEntry,
    },
    updatedAt: at,
  };

  return completedMutation(next, {
    action: "write",
    changed: true,
    key: input.request.key,
    scope,
    consentRevision: input.authorization.consentRevision,
  });
}

export function applyPersonalVoxyMemoryDelete(input: {
  state?: PersonalVoxyMemoryState | null;
  key: PersonalVoxyMemoryKey;
  doNotRemember?: boolean;
  now?: Date | string;
}): PersonalVoxyMemoryMutationResult {
  const at = nowIso(input.now);
  const state = cloneState(input.state, at);
  const hadEntry = Boolean(state.entries[input.key]);
  const alreadySuppressed = state.suppressedKeys.includes(input.key);
  const shouldSuppress = input.doNotRemember === true;
  const nextSuppressed = shouldSuppress && !alreadySuppressed
    ? [...state.suppressedKeys, input.key]
    : state.suppressedKeys;
  const changed = hadEntry || (shouldSuppress && !alreadySuppressed);

  if (!changed) {
    return completedMutation(state, {
      action: shouldSuppress ? "do_not_remember" : "delete",
      changed: false,
      key: input.key,
      scope: getPersonalVoxyMemoryScope(input.key),
    });
  }

  const entries = { ...state.entries };
  delete entries[input.key];
  const next: PersonalVoxyMemoryState = {
    ...state,
    revision: state.revision + 1,
    entries,
    suppressedKeys: nextSuppressed,
    updatedAt: at,
  };

  return completedMutation(next, {
    action: shouldSuppress ? "do_not_remember" : "delete",
    changed: true,
    key: input.key,
    scope: getPersonalVoxyMemoryScope(input.key),
  });
}

export function applyPersonalVoxyMemoryClearDoNotRemember(input: {
  state?: PersonalVoxyMemoryState | null;
  authorization: PersonalVoxyMemoryAuthorization;
  key: PersonalVoxyMemoryKey;
  now?: Date | string;
}): PersonalVoxyMemoryMutationResult {
  const at = nowIso(input.now);
  const state = cloneState(input.state, at);
  const scope = getPersonalVoxyMemoryScope(input.key);
  const authorizationReason = authorizationFailure(input.authorization, scope);
  if (authorizationReason) {
    return blockedMutation(state, {
      action: "clear_do_not_remember",
      reason: authorizationReason,
      key: input.key,
      scope,
      consentRevision: input.authorization.consentRevision,
    });
  }

  if (!state.suppressedKeys.includes(input.key)) {
    return completedMutation(state, {
      action: "clear_do_not_remember",
      changed: false,
      key: input.key,
      scope,
      consentRevision: input.authorization.consentRevision,
    });
  }

  const next: PersonalVoxyMemoryState = {
    ...state,
    revision: state.revision + 1,
    suppressedKeys: state.suppressedKeys.filter((key) => key !== input.key),
    updatedAt: at,
  };
  return completedMutation(next, {
    action: "clear_do_not_remember",
    changed: true,
    key: input.key,
    scope,
    consentRevision: input.authorization.consentRevision,
  });
}

export function applyPersonalVoxyMemoryScopeRevoke(input: {
  state?: PersonalVoxyMemoryState | null;
  scope: PersonalVoxyMemoryScope;
  consentRevision: number;
  now?: Date | string;
}): PersonalVoxyMemoryMutationResult {
  const at = nowIso(input.now);
  const state = cloneState(input.state, at);
  if (!isPositiveRevision(input.consentRevision)) {
    return blockedMutation(state, {
      action: "revoke_scope",
      reason: "invalid_consent_revision",
      scope: input.scope,
      consentRevision: input.consentRevision,
    });
  }

  const existingBarrier = state.revokedScopes[input.scope]?.consentRevision ?? 0;
  if (input.consentRevision < existingBarrier) {
    return blockedMutation(state, {
      action: "revoke_scope",
      reason: "stale_consent_revision",
      scope: input.scope,
      consentRevision: input.consentRevision,
    });
  }

  const entries = { ...state.entries };
  let removed = false;
  for (const key of PERSONAL_VOXY_MEMORY_KEYS) {
    if (entries[key]?.scope === input.scope) {
      delete entries[key];
      removed = true;
    }
  }
  const barrierChanged = input.consentRevision > existingBarrier;
  if (!removed && !barrierChanged) {
    return completedMutation(state, {
      action: "revoke_scope",
      changed: false,
      scope: input.scope,
      consentRevision: input.consentRevision,
    });
  }

  const next: PersonalVoxyMemoryState = {
    ...state,
    revision: state.revision + 1,
    entries,
    revokedScopes: {
      ...state.revokedScopes,
      [input.scope]: { consentRevision: input.consentRevision, at },
    },
    updatedAt: at,
  };
  return completedMutation(next, {
    action: "revoke_scope",
    changed: true,
    scope: input.scope,
    consentRevision: input.consentRevision,
  });
}

export function applyPersonalVoxyMemoryFullReset(input: {
  state?: PersonalVoxyMemoryState | null;
  consentRevision: number;
  now?: Date | string;
}): PersonalVoxyMemoryMutationResult {
  const at = nowIso(input.now);
  const state = cloneState(input.state, at);
  if (!isPositiveRevision(input.consentRevision)) {
    return blockedMutation(state, {
      action: "full_reset",
      reason: "invalid_consent_revision",
      consentRevision: input.consentRevision,
    });
  }

  const existingBarrier = state.resetBarrier?.consentRevision ?? 0;
  if (input.consentRevision < existingBarrier) {
    return blockedMutation(state, {
      action: "full_reset",
      reason: "stale_consent_revision",
      consentRevision: input.consentRevision,
    });
  }

  const hadEntries = Object.keys(state.entries).length > 0;
  const barrierChanged = input.consentRevision > existingBarrier;
  if (!hadEntries && !barrierChanged) {
    return completedMutation(state, {
      action: "full_reset",
      changed: false,
      consentRevision: input.consentRevision,
    });
  }

  const next: PersonalVoxyMemoryState = {
    ...state,
    revision: state.revision + 1,
    entries: {},
    resetBarrier: { consentRevision: input.consentRevision, at },
    updatedAt: at,
  };
  return completedMutation(next, {
    action: "full_reset",
    changed: true,
    consentRevision: input.consentRevision,
  });
}

export function buildPersonalVoxyMemoryRuntimeView(input: {
  state?: PersonalVoxyMemoryState | null;
  authorization?: PersonalVoxyMemoryAuthorization | null;
}): PersonalVoxyMemoryRuntimeView {
  const state = input.state ?? createEmptyPersonalVoxyMemoryState();
  const authorization = input.authorization ?? null;
  if (!authorization || !isPositiveRevision(authorization.consentRevision)) {
    return {
      usableEntries: [],
      staleKeys: Object.keys(state.entries) as PersonalVoxyMemoryKey[],
      suppressedKeys: [...state.suppressedKeys],
      blockedReason: "current_consent_required",
      guardrails: PERSONAL_VOXY_MEMORY_GUARDRAILS,
    };
  }

  const usableEntries: PersonalVoxyMemoryEntry[] = [];
  const staleKeys: PersonalVoxyMemoryKey[] = [];
  for (const key of PERSONAL_VOXY_MEMORY_KEYS) {
    const entry = state.entries[key];
    if (!entry) continue;
    const decisionReason = authorizationFailure(authorization, entry.scope);
    const resetBlocked = authorization.consentRevision <= (state.resetBarrier?.consentRevision ?? 0);
    const revokeBlocked =
      authorization.consentRevision <= (state.revokedScopes[entry.scope]?.consentRevision ?? 0);
    const revisionMismatch = entry.consentRevision !== authorization.consentRevision;
    const suppressed = state.suppressedKeys.includes(key);

    if (decisionReason || resetBlocked || revokeBlocked || revisionMismatch || suppressed) {
      staleKeys.push(key);
      continue;
    }
    usableEntries.push(entry);
  }

  const blockedReason = authorization.contract.profilePersistenceAllowed
    ? null
    : "profile_persistence_not_consented";
  return {
    usableEntries,
    staleKeys,
    suppressedKeys: [...state.suppressedKeys],
    blockedReason,
    guardrails: PERSONAL_VOXY_MEMORY_GUARDRAILS,
  };
}

export function listPersonalVoxyMemoryForUserControl(
  state?: PersonalVoxyMemoryState | null,
): PersonalVoxyMemoryEntry[] {
  const current = state ?? createEmptyPersonalVoxyMemoryState();
  return PERSONAL_VOXY_MEMORY_KEYS.map((key) => current.entries[key]).filter(
    (entry): entry is PersonalVoxyMemoryEntry => Boolean(entry),
  );
}
