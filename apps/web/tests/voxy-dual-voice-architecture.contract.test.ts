import { describe, expect, it } from "vitest";

import {
  EDITORIAL_VOICE,
  VOXY_CANONICAL_NARRATION_ARCHITECTURE,
  VOXY_CANONICAL_INFORMATION_FLOW,
  VOXY_DUAL_VOICE_ACCEPTANCE,
  VOXY_DIRECT_ADDRESS_GREETING,
  VOXY_DUAL_VOICE_PILOT_CONTRACT,
  VOXY_DUAL_VOICE_PILOT_SEGMENTS,
  VOXY_DYNAMIC_EVIDENCE_MEMORY,
  VOXY_EDITORIAL_INTENTS,
  VOXY_FUTURE_FORMAT_FAMILY,
  VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION,
  VOXY_NARRATIVE_CHART_BEHAVIOR,
  VOXY_NARRATION_AB_EVIDENCE,
  VOXY_NEWS_VISUAL_STATES,
  VOXY_SIGNATURE,
  VOXY_SOURCE_FIRST_GUARDRAILS,
  VOXY_SOURCE_FIRST_PRIORITY,
  VOXY_SPEAKER_ROLE_RULES,
  resolveVoxyNarrationBinding,
  validateVoxyDualVoiceArchitecture,
} from "@/features/voxyVideo/dualVoiceArchitecture";

describe("Voxy canonical narration and evidence-first visual contract", () => {
  it("freezes the final human-accepted D1 and W1 voice pipelines", () => {
    expect(VOXY_DUAL_VOICE_ACCEPTANCE).toMatchObject({
      canonicalNarrationArchitecture: "single_voice_default",
      humanNarrationArchitectureAcceptance: "accepted",
      humanSingleVsDualPreference: "single_voice",
      humanSingleVsDualPreferenceAcceptance: "accepted",
      technicalVoiceMappingGate: "passed",
      technicalDualVoiceTest: "passed",
      technicalSingleVoiceTest: "passed",
      humanVoiceIdentityAcceptance: "accepted",
      humanVoxyVoiceAcceptance: "accepted",
      humanEditorialVoiceAcceptance: "accepted",
      humanPilotAcceptance: "pending",
      canonicalVoxyVoice: "D1 Conversational Dynamic",
      canonicalEditorialVoice: "W1 Natural Editorial",
      genderLabelsAllowed: false,
      videoRenderingAllowed: true,
      videoRenderingScope: "private_pilot_v1.3_only",
      productionEligible: false,
      autoPublish: false,
    });
    expect(VOXY_SIGNATURE).toMatchObject({
      speakerRole: "voxy",
      candidateId: "D1",
      humanIdentityStatus: "accepted",
      voiceId: "voxy-d1-conversational-dynamic-pr621",
      selectedVariantId: "d1-conversational-dynamic",
      provenance: {
        privateHumanReviewEvidenceSha256:
          "0cbbacefd3f19332fdc879deae4b683a86a586a431b81d4ce668b4880a52da48",
        canonicalReference: {
          id: "reference-02",
          segmentId: "reference-02-segment-b",
          segmentSha256:
            "72e1b6ce77bad94da04babd1d66c3c7401f89b42fe7ff8df2076ac076b713f09",
        },
        synthesis: {
          seed: 62122,
          exaggeration: 0.47,
          cfgWeight: 0.32,
          pauseScale: 0.92,
          timeStretch: false,
          mastering: VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION,
        },
      },
    });
    expect(EDITORIAL_VOICE).toMatchObject({
      speakerRole: "editorial",
      candidateId: "W1",
      humanIdentityStatus: "accepted",
      voiceId: "de_DE/m-ailabs_low#ramona_deininger",
      provenance: {
        privateHumanReviewEvidenceSha256:
          "773e7cf521a1760e463d50a3d27be25247ebaba06025c582985c1a45a00d3f90",
        modelRevision: "b239a9084e21fbaa7ac78ea6e31f5de1c31c8f42",
        synthesis: {
          deterministic: true,
          noiseScale: 0,
          noiseWidthScale: 0,
          lengthScale: 1.12,
          timeCompression: false,
          mastering: VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION,
        },
      },
    });
    expect(VOXY_SIGNATURE).not.toHaveProperty("gender");
    expect(EDITORIAL_VOICE).not.toHaveProperty("gender");
    expect(EDITORIAL_VOICE.voiceId).not.toBe(VOXY_SIGNATURE.voiceId);
    expect(VOXY_HUMAN_ACCEPTED_VOICE_PRESERVATION).toEqual({
      principle: "human_accepted_voice_preservation",
      allowedPath: "voice_synthesis_to_necessary_resampling_to_transparent_pcm_assembly",
      outputSampleRate: 48_000,
      outputChannels: 1,
      outputCodec: "pcm_s16le",
      dynamicNormalization: false,
      compression: false,
      pitchChanged: false,
      tempoChanged: false,
      timeStretch: false,
      eqApplied: false,
      staticGainPolicy: {
        mode: "per_segment_relative_to_human_accepted_role_evidence",
        blanketRoleGainForbidden: true,
        zeroGainToleranceLu: 0.5,
        gainPrecisionDb: 0.1,
        maximumOutputTruePeakDbfs: -1,
        abstractLufsTargetForbidden: true,
      },
      peakProtectionApplied: false,
      peakProtectionRule: "minimal_transparent_protection_only_after_measured_clipping",
    });
  });

  it("defaults every visual state to D1 and allows W1 only with explicit editorial intent", () => {
    expect(VOXY_CANONICAL_NARRATION_ARCHITECTURE).toMatchObject({
      canonicalNarrationArchitecture: "single_voice_default",
      productPrinciple: "one_host_multiple_information_states",
      defaultNarrationVoice: VOXY_SIGNATURE.voiceId,
      defaultNarrationCandidate: "D1",
      defaultSpeakerRole: "voxy",
      visualStateAndSpeakerRoleIndependent: true,
      automaticSpeakerRoutingByVisualState: false,
      editorialLayer: {
        status: "accepted_optional_explicit_only",
        voiceId: EDITORIAL_VOICE.voiceId,
        candidateId: "W1",
        explicitEditorialIntentRequired: true,
      },
    });
    for (const visualState of ["host", "focus", "explain", "dock", "synthesis"] as const) {
      expect(resolveVoxyNarrationBinding({ visualState })).toEqual({
        speakerRole: "voxy",
        voiceId: VOXY_SIGNATURE.voiceId,
        candidateId: "D1",
        editorialIntent: null,
      });
    }
    expect(resolveVoxyNarrationBinding({
      visualState: "explain",
      requestedSpeakerRole: "editorial",
    })).toMatchObject({
      speakerRole: "voxy",
      voiceId: VOXY_SIGNATURE.voiceId,
      editorialIntent: null,
    });
    expect(resolveVoxyNarrationBinding({
      visualState: "explain",
      editorialIntent: "cross_information",
    })).toEqual({
      speakerRole: "editorial",
      voiceId: EDITORIAL_VOICE.voiceId,
      candidateId: "W1",
      editorialIntent: "cross_information",
    });
    expect(() => resolveVoxyNarrationBinding({
      visualState: "synthesis",
      editorialIntent: "automatic_summary",
    })).toThrow("editorial_intent_invalid:automatic_summary");
    expect(VOXY_EDITORIAL_INTENTS).toContain("cross_information");
    expect(VOXY_NARRATION_AB_EVIDENCE).toMatchObject({
      technicalDualVoiceTest: "passed",
      technicalSingleVoiceTest: "passed",
      humanSingleVsDualPreference: "single_voice",
      humanSingleVsDualPreferenceAcceptance: "accepted",
      evidencePreserved: true,
    });
    expect(EDITORIAL_VOICE.humanIdentityStatus).toBe("accepted");
  });

  it("preserves every spoken block of dual-voice evidence A as explicit and role-safe", () => {
    expect(VOXY_DUAL_VOICE_PILOT_SEGMENTS).toHaveLength(9);
    expect(VOXY_DUAL_VOICE_PILOT_SEGMENTS.map(({ speakerRole }) => speakerRole)).toEqual([
      "voxy",
      "voxy",
      "editorial",
      "editorial",
      "voxy",
      "editorial",
      "editorial",
      "voxy",
      "voxy",
    ]);
    for (const segment of VOXY_DUAL_VOICE_PILOT_SEGMENTS) {
      expect(segment.voiceId).toBe(
        segment.speakerRole === "voxy" ? VOXY_SIGNATURE.voiceId : EDITORIAL_VOICE.voiceId,
      );
      expect(segment.text.trim()).not.toBe("");
    }
    expect(VOXY_SPEAKER_ROLE_RULES.editorial.voxyMouth).toBe(
      "neutral_or_closed_no_editorial_lip_sync",
    );
    expect(VOXY_SPEAKER_ROLE_RULES.waveform).toMatchObject({
      count: 1,
      reactsToActiveVoice: true,
      speakerChangeCreatesSecondWaveform: false,
    });
  });

  it("opens direct Voxy address exactly once with the canonical greeting", () => {
    expect(VOXY_DIRECT_ADDRESS_GREETING).toEqual({
      text: "Hallo Nachbar,",
      speakerRole: "voxy",
      placement: "once_at_start_of_connected_direct_address_video",
      editorialUsesGreeting: false,
      repeatBeforeEachVoxySegment: false,
      repeatForShortInsertTransitionOrNonDirectInformation: false,
      brandNarrativeException: false,
    });
    expect(VOXY_DUAL_VOICE_PILOT_SEGMENTS[0].text).toContain(`Hallo Nachbar.

Wir wählen.
Wir diskutieren.
Wir streiten.`);
    expect(
      VOXY_DUAL_VOICE_PILOT_SEGMENTS.flatMap(({ text }) =>
        text.match(/Hallo Nachbar\./g) ?? [],
      ),
    ).toHaveLength(1);
    expect(
      VOXY_DUAL_VOICE_PILOT_SEGMENTS.filter(
        ({ speakerRole, text }) => speakerRole === "editorial" && text.includes("Hallo Nachbar."),
      ),
    ).toEqual([]);
  });

  it("defines the complete evidence-first state machine and dynamic evidence memory", () => {
    expect(VOXY_NEWS_VISUAL_STATES.map(({ id }) => id)).toEqual([
      "host",
      "focus",
      "explain",
      "dock",
      "synthesis",
    ]);
    expect(VOXY_CANONICAL_INFORMATION_FLOW.map(({ state }) => state)).toEqual([
      "host",
      "focus",
      "explain",
      "dock",
      "host",
      "focus",
      "explain",
      "dock",
      "synthesis",
      "host",
    ]);
    expect(VOXY_CANONICAL_INFORMATION_FLOW.every(({ speakerRole }) => speakerRole === "voxy")).toBe(true);
    expect(VOXY_DYNAMIC_EVIDENCE_MEMORY).toMatchObject({
      staticSidebar: false,
      previouslyDockedObjectsMayReturnToFocus: true,
      provenanceRemainsTraceable: true,
    });
    expect(VOXY_DYNAMIC_EVIDENCE_MEMORY.stores).toContain("uncertainty");
    expect(VOXY_DYNAMIC_EVIDENCE_MEMORY.stores).toContain("vote_result");
  });

  it("keeps source-first evidence and narration-driven charts non-decorative", () => {
    expect(VOXY_SOURCE_FIRST_PRIORITY).toEqual([
      "original_source_or_original_data",
      "traceably_derived_visualization",
      "clearly_labeled_editorial_summary",
    ]);
    expect(VOXY_SOURCE_FIRST_GUARDRAILS).toMatchObject({
      showOrigin: true,
      showRelevantPart: true,
      showDerivation: true,
      inventedCharts: false,
      decorativeFakeData: false,
      sourceOnlyAsFinePrint: false,
    });
    expect(VOXY_NARRATIVE_CHART_BEHAVIOR).toMatchObject({
      narrationDrivesAnimation: true,
      fullComplexChartRequiredAtStart: false,
      decorativeAnimationWithoutInformationValue: false,
    });
    expect(VOXY_NARRATIVE_CHART_BEHAVIOR.allowedSequence).toEqual([
      "axis_first",
      "relevant_series",
      "time_range_focus",
      "comparison_value",
      "relevant_point",
      "full_context",
      "dock",
    ]);
  });

  it("binds the implemented private pilot without releasing it", () => {
    expect(VOXY_DUAL_VOICE_PILOT_CONTRACT).toMatchObject({
      taskId: "VOXY-DUAL-VOICE-EXPLAINER-PILOT-01",
      status: "review",
      implementationInCurrentPass: true,
      canonicalNarrationArchitecture: "single_voice_default",
      defaultNarrationVoice: VOXY_SIGNATURE.voiceId,
      defaultSpeakerRole: "voxy",
      optionalEditorialLayer: {
        voiceId: EDITORIAL_VOICE.voiceId,
        status: "accepted",
        explicitEditorialIntentRequired: true,
      },
      privateHumanReviewEvidence: true,
      format: {
        width: 1920,
        height: 1080,
        fps: 24,
        durationSeconds: { min: 45, max: 90 },
      },
      requiredVisualSequence: ["host", "focus", "explain", "dock", "host"],
      finalSynthesisRequired: true,
      autonomousNewsProductionImplemented: false,
      productionEligible: false,
      autoPublish: false,
    });
    expect(VOXY_DUAL_VOICE_PILOT_CONTRACT.speakerTimelineFields).toEqual([
      "start",
      "end",
      "speakerRole",
      "voiceId",
      "text",
    ]);
    expect(VOXY_DUAL_VOICE_PILOT_CONTRACT.requiredOutputs).toContain(
      "visual-state-timeline.json",
    );
    expect(VOXY_FUTURE_FORMAT_FAMILY).toEqual([
      "VOXY_NEWS",
      "VOXY_EXPLAINER",
      "VOXY_DOSSIER",
      "VOXY_BALLOT",
      "VOXY_SOCIAL_SHORT",
    ]);
    expect(validateVoxyDualVoiceArchitecture()).toEqual([]);
  });
});
