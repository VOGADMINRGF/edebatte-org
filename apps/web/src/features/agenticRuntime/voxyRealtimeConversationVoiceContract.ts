import {
  resolveSharedConversationCapabilities,
  type SharedConversation,
} from "@features/conversation/sharedConversationContract";

export const VOXY_REALTIME_VOICE_SCHEMA_VERSION = "voxy.realtime-conversation.v1" as const;

export const VOXY_REALTIME_SESSION_STATES = [
  "connecting",
  "ready",
  "listening",
  "thinking",
  "speaking",
  "interrupted",
  "reconnecting",
  "closed",
  "failed",
] as const;

export const VOXY_REALTIME_TRANSCRIPT_STATES = ["interim", "final"] as const;
export const VOXY_REALTIME_INPUT_MODALITIES = ["audio", "text"] as const;

export const VOXY_REALTIME_VOICE_GUARDRAILS = {
  secondConversationStoreAllowed: false,
  secondOrchestratorAllowed: false,
  rawAudioPersistenceDefault: false,
  rawTranscriptPersistenceDefault: false,
  interimIntentHandoffAllowed: false,
  interimToolExecutionAllowed: false,
  directToolExecutionAllowed: false,
  actionGateBypassAllowed: false,
  staleGenerationExecutionAllowed: false,
  evidenceWeightingMayChange: false,
  truthStatusMayChange: false,
  translationMayRaiseTrust: false,
  politicalProfilingAllowed: false,
  politicalPersuasionAllowed: false,
  autoVoteAllowed: false,
  autoPublishAllowed: false,
  externalNotificationAllowed: false,
  safeTraceMayContainRawTranscript: false,
  safeTraceMayContainRawAudio: false,
  safeTraceMayContainPrompt: false,
  safeTraceMayContainSecret: false,
  safeTraceMayContainChainOfThought: false,
} as const;

export type VoxyRealtimeSessionState = (typeof VOXY_REALTIME_SESSION_STATES)[number];
export type VoxyRealtimeTranscriptState = (typeof VOXY_REALTIME_TRANSCRIPT_STATES)[number];
export type VoxyRealtimeInputModality = (typeof VOXY_REALTIME_INPUT_MODALITIES)[number];

export type VoxyRealtimeAudioConsent = {
  allowed: boolean;
  revision: number;
  acknowledgedAt: string | null;
};

export type VoxyRealtimeSession = {
  schemaVersion: typeof VOXY_REALTIME_VOICE_SCHEMA_VERSION;
  sessionId: string;
  conversationId: string;
  actorId: string;
  locale: string;
  state: VoxyRealtimeSessionState;
  generation: number;
  lastAcceptedFinalTurnKey: string | null;
  currentOutputId: string | null;
  audioConsent: VoxyRealtimeAudioConsent;
  privacy: {
    rawAudioPersistenceAllowed: false;
    rawTranscriptPersistenceAllowed: false;
    captionsAvailable: true;
    textFallbackAvailable: true;
  };
  guardrails: typeof VOXY_REALTIME_VOICE_GUARDRAILS;
};

export type CreateVoxyRealtimeSessionInput = {
  sessionId: string;
  conversation: SharedConversation;
  actorId: string;
  directMessagingAllowed?: boolean;
  locale: string;
  audioConsent?: VoxyRealtimeAudioConsent | null;
};

export type VoxyRealtimeSessionDecision =
  | { accepted: true; session: VoxyRealtimeSession; reasonCodes: readonly string[] }
  | { accepted: false; session: null; reasonCodes: readonly string[] };

export type VoxyRealtimeTurnInput = {
  session: VoxyRealtimeSession;
  turnId: string;
  conversationId: string;
  actorId: string;
  generation: number;
  modality: VoxyRealtimeInputModality;
  transcriptState: VoxyRealtimeTranscriptState;
  transientText: string;
  language: string;
};

export type VoxyRealtimeIntentCandidate = {
  candidateId: string;
  sessionId: string;
  turnKey: string;
  conversationId: string;
  actorId: string;
  generation: number;
  language: string;
  ephemeralText: string;
  persistence: "forbidden";
  requiresVoxyToolCapabilityGate: true;
  requiresAlpha2ActionGate: true;
  directExecutionAllowed: false;
};

export type VoxyRealtimeTurnBinding = {
  sessionId: string;
  conversationId: string;
  actorId: string;
  generation: number;
};

export type VoxyRealtimeTurnDecision =
  | {
      accepted: true;
      binding: VoxyRealtimeTurnBinding;
      duplicateFinalTurn: boolean;
      turnKey: string;
      transcriptState: VoxyRealtimeTranscriptState;
      persistRawTranscript: false;
      persistRawAudio: false;
      intentCandidate: VoxyRealtimeIntentCandidate | null;
      reasonCodes: readonly string[];
    }
  | {
      accepted: false;
      binding: null;
      duplicateFinalTurn: false;
      turnKey: null;
      transcriptState: VoxyRealtimeTranscriptState;
      persistRawTranscript: false;
      persistRawAudio: false;
      intentCandidate: null;
      reasonCodes: readonly string[];
    };

export type VoxyRealtimeSafeTrace = {
  schemaVersion: typeof VOXY_REALTIME_VOICE_SCHEMA_VERSION;
  sessionId: string;
  conversationId: string;
  actorId: string;
  generation: number;
  state: VoxyRealtimeSessionState;
  providerRef: string | null;
  modelRef: string | null;
  correlationRef: string | null;
  latencyMs: number | null;
  errorClass: string | null;
  containsRawTranscript: false;
  containsRawAudio: false;
  containsPrompt: false;
  containsSecret: false;
  containsChainOfThought: false;
};

const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const LANGUAGE_TAG = /^[A-Za-z]{2,16}(?:-[A-Za-z0-9]{2,16})*$/;

const ALLOWED_TRANSITIONS: Record<VoxyRealtimeSessionState, readonly VoxyRealtimeSessionState[]> = {
  connecting: ["ready", "failed", "closed"],
  ready: ["listening", "thinking", "reconnecting", "closed", "failed"],
  listening: ["thinking", "interrupted", "reconnecting", "closed", "failed"],
  thinking: ["speaking", "interrupted", "reconnecting", "ready", "closed", "failed"],
  speaking: ["ready", "interrupted", "reconnecting", "closed", "failed"],
  interrupted: ["ready", "listening", "reconnecting", "closed", "failed"],
  reconnecting: ["ready", "closed", "failed"],
  closed: [],
  failed: ["reconnecting", "closed"],
};

function stableId(value: string) {
  return STABLE_ID.test(String(value ?? "").trim());
}

function validRevision(value: number) {
  return Number.isInteger(value) && value > 0;
}

function isoOrNull(value: string | null) {
  if (value === null) return true;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function normalizeLocale(value: string) {
  const locale = String(value ?? "").trim();
  return LANGUAGE_TAG.test(locale) ? locale : null;
}

function stableTurnKey(input: {
  sessionId: string;
  conversationId: string;
  actorId: string;
  generation: number;
  turnId: string;
}) {
  return [
    "voxy-voice-turn",
    "v1",
    input.sessionId,
    input.conversationId,
    input.actorId,
    String(input.generation),
    input.turnId,
  ]
    .map((part) => encodeURIComponent(part))
    .join(":");
}

function turnBinding(session: VoxyRealtimeSession): VoxyRealtimeTurnBinding {
  return {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    actorId: session.actorId,
    generation: session.generation,
  };
}

export function createVoxyRealtimeSession(
  input: CreateVoxyRealtimeSessionInput,
): VoxyRealtimeSessionDecision {
  const reasons: string[] = [];
  if (!stableId(input.sessionId)) reasons.push("session_id_invalid");
  if (!stableId(input.actorId)) reasons.push("actor_id_invalid");
  const locale = normalizeLocale(input.locale);
  if (!locale) reasons.push("locale_invalid");

  const capabilities = resolveSharedConversationCapabilities({
    conversation: input.conversation,
    actor: {
      actorId: input.actorId,
      actorKnown: true,
      directMessagingAllowed: input.directMessagingAllowed,
    },
  });
  if (!capabilities.canRead) reasons.push("conversation_read_not_allowed");
  if (!capabilities.canPost) reasons.push("conversation_post_not_allowed");

  const audioConsent = input.audioConsent ?? {
    allowed: false,
    revision: 1,
    acknowledgedAt: null,
  };
  if (!validRevision(audioConsent.revision)) reasons.push("audio_consent_revision_invalid");
  if (!isoOrNull(audioConsent.acknowledgedAt)) reasons.push("audio_consent_timestamp_invalid");
  if (audioConsent.allowed && !audioConsent.acknowledgedAt) {
    reasons.push("audio_consent_acknowledgement_required");
  }

  if (reasons.length > 0 || !locale) {
    return { accepted: false, session: null, reasonCodes: reasons };
  }

  return {
    accepted: true,
    session: {
      schemaVersion: VOXY_REALTIME_VOICE_SCHEMA_VERSION,
      sessionId: input.sessionId,
      conversationId: input.conversation.conversationId,
      actorId: input.actorId,
      locale,
      state: "connecting",
      generation: 1,
      lastAcceptedFinalTurnKey: null,
      currentOutputId: null,
      audioConsent,
      privacy: {
        rawAudioPersistenceAllowed: false,
        rawTranscriptPersistenceAllowed: false,
        captionsAvailable: true,
        textFallbackAvailable: true,
      },
      guardrails: VOXY_REALTIME_VOICE_GUARDRAILS,
    },
    reasonCodes: ["shared_conversation_actor_bound"],
  };
}

export function transitionVoxyRealtimeSession(input: {
  session: VoxyRealtimeSession;
  nextState: VoxyRealtimeSessionState;
  currentOutputId?: string | null;
}): VoxyRealtimeSessionDecision {
  if (!ALLOWED_TRANSITIONS[input.session.state].includes(input.nextState)) {
    return {
      accepted: false,
      session: null,
      reasonCodes: [`invalid_state_transition:${input.session.state}->${input.nextState}`],
    };
  }
  if (input.nextState === "listening" && !input.session.audioConsent.allowed) {
    return { accepted: false, session: null, reasonCodes: ["audio_consent_required"] };
  }
  const output = input.currentOutputId ?? null;
  if (input.nextState === "speaking" && !output) {
    return { accepted: false, session: null, reasonCodes: ["speaking_output_id_required"] };
  }
  if (output && !stableId(output)) {
    return { accepted: false, session: null, reasonCodes: ["output_id_invalid"] };
  }
  return {
    accepted: true,
    session: {
      ...input.session,
      state: input.nextState,
      currentOutputId: input.nextState === "speaking" ? output : null,
    },
    reasonCodes: ["state_transition_allowed"],
  };
}

export function applyVoxyRealtimeBargeIn(
  session: VoxyRealtimeSession,
): VoxyRealtimeSessionDecision {
  if (!["listening", "thinking", "speaking"].includes(session.state)) {
    return { accepted: false, session: null, reasonCodes: ["barge_in_not_applicable"] };
  }
  return {
    accepted: true,
    session: {
      ...session,
      state: "interrupted",
      generation: session.generation + 1,
      currentOutputId: null,
    },
    reasonCodes: ["barge_in_invalidated_prior_generation"],
  };
}

export function revokeVoxyRealtimeAudioConsent(input: {
  session: VoxyRealtimeSession;
  revision: number;
}): VoxyRealtimeSessionDecision {
  if (!validRevision(input.revision) || input.revision <= input.session.audioConsent.revision) {
    return { accepted: false, session: null, reasonCodes: ["stale_audio_consent_revision"] };
  }
  return {
    accepted: true,
    session: {
      ...input.session,
      state: input.session.state === "closed" ? "closed" : "ready",
      generation: input.session.generation + 1,
      currentOutputId: null,
      audioConsent: {
        allowed: false,
        revision: input.revision,
        acknowledgedAt: null,
      },
    },
    reasonCodes: ["audio_consent_revoked"],
  };
}

export function resolveVoxyRealtimeTurn(input: VoxyRealtimeTurnInput): VoxyRealtimeTurnDecision {
  const reasons: string[] = [];
  if (!stableId(input.turnId)) reasons.push("turn_id_invalid");
  if (input.conversationId !== input.session.conversationId) reasons.push("conversation_mismatch");
  if (input.actorId !== input.session.actorId) reasons.push("actor_mismatch");
  if (input.generation !== input.session.generation) reasons.push("stale_generation");
  if (!normalizeLocale(input.language)) reasons.push("language_invalid");
  const text = String(input.transientText ?? "").trim();
  if (!text) reasons.push("transcript_empty");
  if (text.length > 20_000) reasons.push("transcript_too_large");
  if (input.modality === "audio" && !input.session.audioConsent.allowed) {
    reasons.push("audio_consent_required");
  }
  if (!["ready", "listening"].includes(input.session.state)) {
    reasons.push("session_not_accepting_turns");
  }

  if (reasons.length > 0) {
    return {
      accepted: false,
      binding: null,
      duplicateFinalTurn: false,
      turnKey: null,
      transcriptState: input.transcriptState,
      persistRawTranscript: false,
      persistRawAudio: false,
      intentCandidate: null,
      reasonCodes: reasons,
    };
  }

  const turnKey = stableTurnKey({
    sessionId: input.session.sessionId,
    conversationId: input.conversationId,
    actorId: input.actorId,
    generation: input.generation,
    turnId: input.turnId,
  });
  const binding = turnBinding(input.session);
  if (input.transcriptState === "interim") {
    return {
      accepted: true,
      binding,
      duplicateFinalTurn: false,
      turnKey,
      transcriptState: "interim",
      persistRawTranscript: false,
      persistRawAudio: false,
      intentCandidate: null,
      reasonCodes: ["interim_transcript_no_intent_handoff"],
    };
  }

  const duplicate = input.session.lastAcceptedFinalTurnKey === turnKey;
  return {
    accepted: true,
    binding,
    duplicateFinalTurn: duplicate,
    turnKey,
    transcriptState: "final",
    persistRawTranscript: false,
    persistRawAudio: false,
    intentCandidate: duplicate
      ? null
      : {
          candidateId: `intent:${turnKey}`,
          sessionId: input.session.sessionId,
          turnKey,
          conversationId: input.session.conversationId,
          actorId: input.session.actorId,
          generation: input.session.generation,
          language: input.language,
          ephemeralText: text,
          persistence: "forbidden",
          requiresVoxyToolCapabilityGate: true,
          requiresAlpha2ActionGate: true,
          directExecutionAllowed: false,
        },
    reasonCodes: duplicate ? ["duplicate_final_turn_suppressed"] : ["final_turn_intent_candidate_ready"],
  };
}

export function acceptVoxyRealtimeFinalTurn(input: {
  session: VoxyRealtimeSession;
  decision: VoxyRealtimeTurnDecision;
}): VoxyRealtimeSessionDecision {
  if (!input.decision.accepted || input.decision.transcriptState !== "final" || !input.decision.turnKey) {
    return { accepted: false, session: null, reasonCodes: ["final_turn_required"] };
  }
  const binding = input.decision.binding;
  if (
    binding.sessionId !== input.session.sessionId ||
    binding.conversationId !== input.session.conversationId ||
    binding.actorId !== input.session.actorId ||
    binding.generation !== input.session.generation
  ) {
    return { accepted: false, session: null, reasonCodes: ["final_turn_binding_stale"] };
  }
  if (input.decision.duplicateFinalTurn) {
    return { accepted: true, session: input.session, reasonCodes: ["duplicate_final_turn_noop"] };
  }
  return {
    accepted: true,
    session: {
      ...input.session,
      state: "thinking",
      lastAcceptedFinalTurnKey: input.decision.turnKey,
    },
    reasonCodes: ["final_turn_committed_to_session_cursor"],
  };
}

export function canExecuteVoxyRealtimeIntentCandidate(input: {
  session: VoxyRealtimeSession;
  candidate: VoxyRealtimeIntentCandidate;
}) {
  const reasonCodes: string[] = [];
  if (input.candidate.sessionId !== input.session.sessionId) reasonCodes.push("session_mismatch");
  if (input.candidate.conversationId !== input.session.conversationId) reasonCodes.push("conversation_mismatch");
  if (input.candidate.actorId !== input.session.actorId) reasonCodes.push("actor_mismatch");
  if (input.candidate.generation !== input.session.generation) reasonCodes.push("stale_generation");
  if (input.candidate.directExecutionAllowed) reasonCodes.push("direct_execution_forbidden");
  if (!input.candidate.requiresVoxyToolCapabilityGate) reasonCodes.push("tool_capability_gate_required");
  if (!input.candidate.requiresAlpha2ActionGate) reasonCodes.push("alpha2_action_gate_required");
  if (input.session.state !== "thinking") {
    reasonCodes.push("session_state_blocks_execution");
  }
  if (input.session.lastAcceptedFinalTurnKey !== input.candidate.turnKey) {
    reasonCodes.push("final_turn_not_committed");
  }
  return {
    allowed: reasonCodes.length === 0,
    reasonCodes,
    requiresVoxyToolCapabilityGate: true as const,
    requiresAlpha2ActionGate: true as const,
    directExecutionAllowed: false as const,
  };
}

export function buildVoxyRealtimeSafeTrace(input: {
  session: VoxyRealtimeSession;
  providerRef?: string | null;
  modelRef?: string | null;
  correlationRef?: string | null;
  latencyMs?: number | null;
  errorClass?: string | null;
}): VoxyRealtimeSafeTrace {
  const latency = input.latencyMs;
  return {
    schemaVersion: VOXY_REALTIME_VOICE_SCHEMA_VERSION,
    sessionId: input.session.sessionId,
    conversationId: input.session.conversationId,
    actorId: input.session.actorId,
    generation: input.session.generation,
    state: input.session.state,
    providerRef: input.providerRef?.trim() || null,
    modelRef: input.modelRef?.trim() || null,
    correlationRef: input.correlationRef?.trim() || null,
    latencyMs: typeof latency === "number" && Number.isFinite(latency) && latency >= 0 ? latency : null,
    errorClass: input.errorClass?.trim() || null,
    containsRawTranscript: false,
    containsRawAudio: false,
    containsPrompt: false,
    containsSecret: false,
    containsChainOfThought: false,
  };
}
