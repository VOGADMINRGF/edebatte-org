import { describe, expect, it } from "vitest";
import {
  SHARED_CONVERSATION_CONTRACT_VERSION,
  type SharedConversation,
} from "@features/conversation/sharedConversationContract";
import {
  VOXY_REALTIME_VOICE_GUARDRAILS,
  acceptVoxyRealtimeFinalTurn,
  applyVoxyRealtimeBargeIn,
  buildVoxyRealtimeSafeTrace,
  canExecuteVoxyRealtimeIntentCandidate,
  createVoxyRealtimeSession,
  resolveVoxyRealtimeTurn,
  revokeVoxyRealtimeAudioConsent,
  transitionVoxyRealtimeSession,
  type VoxyRealtimeSession,
} from "@/features/agenticRuntime/voxyRealtimeConversationVoiceContract";

function conversation(scope: "direct" | "group" = "group"): SharedConversation {
  return {
    contractVersion: SHARED_CONVERSATION_CONTRACT_VERSION,
    conversationId: `conversation:${scope}:voice-1`,
    scope,
    origin: {
      kind: scope === "direct" ? "direct_pair" : "group",
      refId: `origin:${scope}:voice-1`,
    },
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
  };
}

function session(overrides: { direct?: boolean; audioAllowed?: boolean } = {}): VoxyRealtimeSession {
  const created = createVoxyRealtimeSession({
    sessionId: "voice-session:1",
    conversation: conversation(overrides.direct ? "direct" : "group"),
    actorId: "actor:a",
    directMessagingAllowed: overrides.direct ? true : undefined,
    locale: "de-DE",
    audioConsent: overrides.audioAllowed
      ? {
          allowed: true,
          revision: 2,
          acknowledgedAt: "2026-09-26T05:00:00.000Z",
        }
      : {
          allowed: false,
          revision: 2,
          acknowledgedAt: null,
        },
  });
  expect(created.accepted).toBe(true);
  if (!created.accepted) throw new Error(created.reasonCodes.join(","));
  return created.session;
}

function transition(current: VoxyRealtimeSession, nextState: Parameters<typeof transitionVoxyRealtimeSession>[0]["nextState"], output?: string) {
  const result = transitionVoxyRealtimeSession({
    session: current,
    nextState,
    currentOutputId: output,
  });
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(result.reasonCodes.join(","));
  return result.session;
}

describe("Voxy realtime conversation voice contract", () => {
  it("reuses Shared Conversation membership and direct-message permission instead of creating a voice membership", () => {
    const blocked = createVoxyRealtimeSession({
      sessionId: "voice-session:direct",
      conversation: conversation("direct"),
      actorId: "actor:a",
      directMessagingAllowed: false,
      locale: "de-DE",
    });
    expect(blocked.accepted).toBe(false);
    expect(blocked.reasonCodes).toContain("conversation_post_not_allowed");

    const allowed = createVoxyRealtimeSession({
      sessionId: "voice-session:direct",
      conversation: conversation("direct"),
      actorId: "actor:a",
      directMessagingAllowed: true,
      locale: "de-DE",
    });
    expect(allowed.accepted).toBe(true);
    if (allowed.accepted) {
      expect(allowed.session.conversationId).toBe("conversation:direct:voice-1");
      expect(allowed.session.actorId).toBe("actor:a");
      expect(allowed.session.privacy).toEqual({
        rawAudioPersistenceAllowed: false,
        rawTranscriptPersistenceAllowed: false,
        captionsAvailable: true,
        textFallbackAvailable: true,
      });
    }
  });

  it("enforces legal lifecycle transitions, audio consent and explicit speaking output identity", () => {
    const withoutAudio = transition(session(), "ready");
    const listeningBlocked = transitionVoxyRealtimeSession({
      session: withoutAudio,
      nextState: "listening",
    });
    expect(listeningBlocked).toEqual({
      accepted: false,
      session: null,
      reasonCodes: ["audio_consent_required"],
    });

    const withAudio = transition(session({ audioAllowed: true }), "ready");
    const listening = transition(withAudio, "listening");
    const thinking = transition(listening, "thinking");

    const missingOutput = transitionVoxyRealtimeSession({ session: thinking, nextState: "speaking" });
    expect(missingOutput.accepted).toBe(false);
    expect(missingOutput.reasonCodes).toContain("speaking_output_id_required");

    const speaking = transition(thinking, "speaking", "output:42");
    expect(speaking.currentOutputId).toBe("output:42");
    const readyAgain = transition(speaking, "ready");
    expect(readyAgain.currentOutputId).toBeNull();

    const illegal = transitionVoxyRealtimeSession({ session: readyAgain, nextState: "speaking" });
    expect(illegal.accepted).toBe(false);
  });

  it("never turns an interim transcript into an intent or tool candidate", () => {
    const listening = transition(transition(session({ audioAllowed: true }), "ready"), "listening");
    const interim = resolveVoxyRealtimeTurn({
      session: listening,
      turnId: "turn:1",
      conversationId: listening.conversationId,
      actorId: listening.actorId,
      generation: listening.generation,
      modality: "audio",
      transcriptState: "interim",
      transientText: "Mach schon mal einen Termin ...",
      language: "de-DE",
    });

    expect(interim.accepted).toBe(true);
    if (interim.accepted) {
      expect(interim.intentCandidate).toBeNull();
      expect(interim.persistRawTranscript).toBe(false);
      expect(interim.persistRawAudio).toBe(false);
      expect(interim.reasonCodes).toContain("interim_transcript_no_intent_handoff");
    }
  });

  it("allows only a final actor/conversation/generation-bound turn to become an Alpha2-gated intent candidate", () => {
    const ready = transition(session(), "ready");
    const finalTurn = resolveVoxyRealtimeTurn({
      session: ready,
      turnId: "turn:final-1",
      conversationId: ready.conversationId,
      actorId: ready.actorId,
      generation: ready.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Zeig mir meine nächsten Termine.",
      language: "de-DE",
    });

    expect(finalTurn.accepted).toBe(true);
    if (!finalTurn.accepted || !finalTurn.intentCandidate) return;
    expect(finalTurn.intentCandidate).toMatchObject({
      persistence: "forbidden",
      requiresVoxyToolCapabilityGate: true,
      requiresAlpha2ActionGate: true,
      directExecutionAllowed: false,
    });

    const committed = acceptVoxyRealtimeFinalTurn({ session: ready, decision: finalTurn });
    expect(committed.accepted).toBe(true);
    if (!committed.accepted) return;
    expect(committed.session.state).toBe("thinking");
    expect(committed.session.lastAcceptedFinalTurnKey).toBe(finalTurn.turnKey);

    expect(
      canExecuteVoxyRealtimeIntentCandidate({
        session: committed.session,
        candidate: finalTurn.intentCandidate,
      }),
    ).toMatchObject({
      allowed: true,
      requiresVoxyToolCapabilityGate: true,
      requiresAlpha2ActionGate: true,
      directExecutionAllowed: false,
    });
  });

  it("rejects final-turn commit when the session generation changed", () => {
    const ready = transition(session(), "ready");
    const finalTurn = resolveVoxyRealtimeTurn({
      session: ready,
      turnId: "turn:bound",
      conversationId: ready.conversationId,
      actorId: ready.actorId,
      generation: ready.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Öffne das Thema.",
      language: "de-DE",
    });
    expect(finalTurn.accepted).toBe(true);
    if (!finalTurn.accepted) return;

    const newer = { ...ready, generation: ready.generation + 1 };
    const committed = acceptVoxyRealtimeFinalTurn({ session: newer, decision: finalTurn });
    expect(committed).toEqual({
      accepted: false,
      session: null,
      reasonCodes: ["final_turn_binding_stale"],
    });
  });

  it("invalidates stale output and action candidates on barge-in", () => {
    const ready = transition(session(), "ready");
    const finalTurn = resolveVoxyRealtimeTurn({
      session: ready,
      turnId: "turn:barge",
      conversationId: ready.conversationId,
      actorId: ready.actorId,
      generation: ready.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Bereite eine Aktion vor.",
      language: "de-DE",
    });
    expect(finalTurn.accepted).toBe(true);
    if (!finalTurn.accepted || !finalTurn.intentCandidate) return;

    const thinking = acceptVoxyRealtimeFinalTurn({ session: ready, decision: finalTurn });
    expect(thinking.accepted).toBe(true);
    if (!thinking.accepted) return;
    const speaking = transition(thinking.session, "speaking", "output:barge");
    const interrupted = applyVoxyRealtimeBargeIn(speaking);
    expect(interrupted.accepted).toBe(true);
    if (!interrupted.accepted) return;

    expect(interrupted.session.state).toBe("interrupted");
    expect(interrupted.session.generation).toBe(speaking.generation + 1);
    expect(interrupted.session.currentOutputId).toBeNull();
    const execution = canExecuteVoxyRealtimeIntentCandidate({
      session: interrupted.session,
      candidate: finalTurn.intentCandidate,
    });
    expect(execution.allowed).toBe(false);
    expect(execution.reasonCodes).toContain("stale_generation");
    expect(execution.reasonCodes).toContain("session_state_blocks_execution");
  });

  it("deduplicates a replayed final turn after reconnect/return to ready", () => {
    const ready = transition(session(), "ready");
    const first = resolveVoxyRealtimeTurn({
      session: ready,
      turnId: "turn:replay",
      conversationId: ready.conversationId,
      actorId: ready.actorId,
      generation: ready.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Was hat sich geändert?",
      language: "de-DE",
    });
    expect(first.accepted).toBe(true);
    if (!first.accepted) return;
    const committed = acceptVoxyRealtimeFinalTurn({ session: ready, decision: first });
    expect(committed.accepted).toBe(true);
    if (!committed.accepted) return;
    const readyAgain = transition(committed.session, "ready");

    const replay = resolveVoxyRealtimeTurn({
      session: readyAgain,
      turnId: "turn:replay",
      conversationId: readyAgain.conversationId,
      actorId: readyAgain.actorId,
      generation: readyAgain.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Was hat sich geändert?",
      language: "de-DE",
    });
    expect(replay.accepted).toBe(true);
    if (replay.accepted) {
      expect(replay.turnKey).toBe(first.turnKey);
      expect(replay.duplicateFinalTurn).toBe(true);
      expect(replay.intentCandidate).toBeNull();
      expect(replay.reasonCodes).toContain("duplicate_final_turn_suppressed");
    }
  });

  it("revokes microphone use immediately while preserving text/caption fallback", () => {
    const listening = transition(transition(session({ audioAllowed: true }), "ready"), "listening");
    const revoked = revokeVoxyRealtimeAudioConsent({ session: listening, revision: 3 });
    expect(revoked.accepted).toBe(true);
    if (!revoked.accepted) return;
    expect(revoked.session.state).toBe("ready");
    expect(revoked.session.audioConsent.allowed).toBe(false);
    expect(revoked.session.privacy.textFallbackAvailable).toBe(true);
    expect(revoked.session.privacy.captionsAvailable).toBe(true);

    const audio = resolveVoxyRealtimeTurn({
      session: revoked.session,
      turnId: "turn:audio-after-revoke",
      conversationId: revoked.session.conversationId,
      actorId: revoked.session.actorId,
      generation: revoked.session.generation,
      modality: "audio",
      transcriptState: "final",
      transientText: "Audio darf nicht mehr rein.",
      language: "de-DE",
    });
    expect(audio.accepted).toBe(false);
    expect(audio.reasonCodes).toContain("audio_consent_required");

    const text = resolveVoxyRealtimeTurn({
      session: revoked.session,
      turnId: "turn:text-after-revoke",
      conversationId: revoked.session.conversationId,
      actorId: revoked.session.actorId,
      generation: revoked.session.generation,
      modality: "text",
      transcriptState: "final",
      transientText: "Text funktioniert weiterhin.",
      language: "de-DE",
    });
    expect(text.accepted).toBe(true);
  });

  it("keeps safe trace metadata free of raw transcript/audio, prompts, secrets and chain-of-thought", () => {
    const ready = transition(session(), "ready");
    const trace = buildVoxyRealtimeSafeTrace({
      session: ready,
      providerRef: "provider:fixture",
      modelRef: "model:fixture",
      correlationRef: "corr:123",
      latencyMs: 42,
      errorClass: null,
    });

    expect(trace).toMatchObject({
      containsRawTranscript: false,
      containsRawAudio: false,
      containsPrompt: false,
      containsSecret: false,
      containsChainOfThought: false,
    });
    expect(trace).not.toHaveProperty("transcript");
    expect(trace).not.toHaveProperty("audio");
    expect(trace).not.toHaveProperty("prompt");
    expect(trace).not.toHaveProperty("secret");
    expect(trace).not.toHaveProperty("chainOfThought");
  });

  it("cannot promote evidence/truth, profile or persuade politically, vote, publish or notify externally", () => {
    expect(VOXY_REALTIME_VOICE_GUARDRAILS).toMatchObject({
      evidenceWeightingMayChange: false,
      truthStatusMayChange: false,
      translationMayRaiseTrust: false,
      politicalProfilingAllowed: false,
      politicalPersuasionAllowed: false,
      autoVoteAllowed: false,
      autoPublishAllowed: false,
      externalNotificationAllowed: false,
      actionGateBypassAllowed: false,
      directToolExecutionAllowed: false,
    });
  });
});
