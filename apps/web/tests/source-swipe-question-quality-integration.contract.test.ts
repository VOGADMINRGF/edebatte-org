import { describe, expect, it } from "vitest";

import {
  decisionFrameSignature,
  type DecisionFrame,
  type SourceVoteCandidatePackage,
} from "@features/themenradar/sourceVoteReadinessContract";
import {
  evaluateSourceVoteCandidateSetWithSwipeQuality,
  evaluateSourceVoteReadinessWithSwipeQuality,
  type SourceSwipeQuestionDraft,
} from "@features/themenradar/sourceSwipeQuestionQualityBridge";
import {
  evaluateTopicQualificationSystemQuestion,
  type TopicQualificationSystemQuestionInput,
} from "@features/topic/topicQualificationSystemQuestionContract";

function t1Input(
  overrides: Partial<TopicQualificationSystemQuestionInput> = {},
): TopicQualificationSystemQuestionInput {
  return {
    qualificationId: "qualification:mobility:berlin",
    canonicalTopic: { id: "topic:mobility:berlin" },
    canonicalDecisionQuestion: null,
    jurisdiction: { level: "state", id: "DE:BE", label: "Berlin" },
    classification: "policy_question",
    rationale: "Die Frage betrifft eine politisch steuerbare Verkehrsentscheidung.",
    neutralSystemQuestion:
      "Soll Berlin zusätzliche Busspuren bis 2030 einrichten, sofern der Haushaltsbeschluss die Finanzierung vorsieht?",
    primaryGoal: "Zuverlässigkeit des Busverkehrs verbessern",
    goalIsMeasure: false,
    scope: {
      currentProblem: "Busse verlieren auf belasteten Strecken regelmäßig Zeit im Mischverkehr.",
      jurisdictionState: "resolved",
      symptomCauseState: "resolved",
      expansionState: "bounded",
      statusQuoResearchNeed: "recorded",
    },
    horizon: "bis 2030",
    controllableLevers: ["Straßenraumaufteilung", "Umsetzungszeitplan"],
    explicitExclusions: ["Bundesweite Straßenverkehrsregeln"],
    affectedGroups: ["Fahrgäste", "Anwohner:innen", "übriger Straßenverkehr"],
    signalRefs: ["signal:poll:4242"],
    evidenceRefs: ["evidence:snapshot:4242", "evidence:budget:berlin"],
    signalEvidenceBoundary: "separated",
    missingQuestionScopeReview: {
      scopeComplete: true,
      falseBinaryState: "none",
      missingMaterialQuestions: [],
    },
    publicQuestionGuardState: "draft_allowed",
    duplicateTopicRisk: false,
    crossLanguageUncertainty: false,
    factualPreferenceCategoryError: false,
    normativeChoiceFramedAsFactSettled: false,
    factValueSeparation: "separated",
    revision: 3,
    reviewedRevision: 3,
    providerConfidence: 0.95,
    ...overrides,
  };
}

function decisionFrame(): DecisionFrame {
  return {
    authorityId: "DE:BE",
    action: "zusätzliche Busspuren einrichten",
    object: "Busspuren auf belasteten Berliner Strecken",
    scope: ["Berlin"],
    conditions: ["Haushaltsbeschluss sieht Finanzierung vor"],
    timeframe: "bis 2030",
    optionKeys: ["ja", "nein"],
  };
}

function packageFixture(
  overrides: Partial<SourceVoteCandidatePackage> = {},
): SourceVoteCandidatePackage {
  const qualification = evaluateTopicQualificationSystemQuestion(t1Input());
  const frame = decisionFrame();
  const signature = decisionFrameSignature(frame);
  return {
    candidateId: "vote-candidate:mobility:berlin",
    canonicalTopicId: "topic:mobility:berlin",
    topicDisposition: "existing_topic",
    eventClusterIds: ["cluster:mobility:berlin"],
    signalRefs: ["signal:poll:4242"],
    evidenceRefs: ["evidence:snapshot:4242", "evidence:budget:berlin"],
    provenanceRefs: ["snapshot:abgeordnetenwatch:4242"],
    evidence: {
      provenanceState: "complete",
      evidenceState: "sufficient",
      evidenceGapState: "none",
      conflictState: "none",
      jurisdictionState: "resolved",
      sourceTruthSeparation: "separated",
    },
    qualification,
    decisionFrame: frame,
    questions: {
      standard: {
        language: "standard_de",
        text: qualification.neutralSystemQuestion,
        decisionFrameSignature: signature,
      },
      plain: {
        language: "leichte_sprache_de",
        text:
          "Soll Berlin bis 2030 mehr Busspuren machen? Das gilt nur, wenn der Haushalt dafür Geld vorsieht.",
        decisionFrameSignature: signature,
      },
    },
    neutrality: { status: "pass", issues: [] },
    swipeCandidates: [
      {
        id: "swipe:mobility:source",
        kind: "summary",
        evidenceRefs: ["evidence:snapshot:4242"],
      },
    ],
    reviewState: "pending",
    release: {
      authority: "canonical_vote_release",
      status: "not_released",
      releaseId: null,
    },
    ...overrides,
  };
}

function swipeQuestion(
  overrides: Partial<SourceSwipeQuestionDraft> = {},
): SourceSwipeQuestionDraft {
  return {
    candidateId: "vote-candidate:mobility:berlin",
    humanContext:
      "Auf belasteten Berliner Strecken verlieren Busse im Mischverkehr regelmäßig Zeit; zugleich teilen sich mehrere Verkehrsarten denselben Straßenraum.",
    tradeoff:
      "Eigene Busspuren können den Busverkehr priorisieren, beanspruchen aber Straßenraum, der dann anderen Nutzungen nicht in gleicher Weise zur Verfügung steht.",
    decisionConsequences: {
      agree: [
        {
          title: "Busfahrzeiten können auf betroffenen Strecken planbarer werden",
          evidenceStatus: "supported",
          evidenceRefs: [{ id: "evidence:snapshot:4242" }],
        },
      ],
      disagree: [
        {
          title: "Der vorhandene Straßenraum kann flexibler zwischen Verkehrsarten aufgeteilt bleiben",
          evidenceStatus: "hypothesis",
        },
      ],
    },
    ...overrides,
  };
}

describe("Source → Swipe question-quality convergence", () => {
  it("downgrades source review-ready when structured Swipe question output is missing", () => {
    const result = evaluateSourceVoteReadinessWithSwipeQuality(packageFixture());

    expect(result.sourceReadiness.stage).toBe("review_ready");
    expect(result.effectiveStage).toBe("vote_candidate");
    expect(result.questionQualityReady).toBe(false);
    expect(result.qualityBlockingReasons).toEqual(
      expect.arrayContaining([
        "swipe_question_output_missing",
        "swipe_question_quality_failed",
      ]),
    );
    expect(result.noAutoPublish).toBe(true);
    expect(result.sourcePipelineMayRelease).toBe(false);
  });

  it("keeps source review-ready when the canonical question passes Swipe quality and evidence grounding", () => {
    const result = evaluateSourceVoteReadinessWithSwipeQuality(
      packageFixture(),
      swipeQuestion(),
    );

    expect(result.sourceReadiness.stage).toBe("review_ready");
    expect(result.effectiveStage).toBe("review_ready");
    expect(result.questionQualityReady).toBe(true);
    expect(result.qualityBlockingReasons).toEqual([]);
    expect(result.requiresHumanReview).toBe(true);
  });

  it("rejects consequence evidence that is in the package but not grounded by a Source Swipe candidate", () => {
    const draft = swipeQuestion({
      decisionConsequences: {
        agree: [
          {
            title: "Die Finanzierung kann planbarer werden",
            evidenceStatus: "supported",
            evidenceRefs: [{ id: "evidence:budget:berlin" }],
          },
        ],
        disagree: [
          {
            title: "Die bisherige Aufteilung kann bestehen bleiben",
            evidenceStatus: "hypothesis",
          },
        ],
      },
    });
    const result = evaluateSourceVoteReadinessWithSwipeQuality(
      packageFixture(),
      draft,
    );

    expect(result.sourceReadiness.stage).toBe("review_ready");
    expect(result.effectiveStage).toBe("vote_candidate");
    expect(result.qualityBlockingReasons).toContain(
      "swipe_question_evidence_outside_source_candidate",
    );
  });

  it("never lets a canonical live flag bypass missing Swipe question quality", () => {
    const livePackage = packageFixture({
      reviewState: "approved",
      release: {
        authority: "canonical_vote_release",
        status: "live",
        releaseId: "release:mobility:berlin",
      },
    });
    const result = evaluateSourceVoteReadinessWithSwipeQuality(livePackage);

    expect(result.sourceReadiness.stage).toBe("voting_live");
    expect(result.effectiveStage).toBe("vote_candidate");
    expect(result.qualityBlockingReasons).toContain(
      "canonical_release_without_swipe_quality",
    );
    expect(result.sourcePipelineMayRelease).toBe(false);
  });

  it("applies deck-level repetition review across otherwise source-ready candidates", () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      candidatePackage: packageFixture({
        candidateId: `vote-candidate:mobility:berlin:${index}`,
      }),
      swipeQuestion: swipeQuestion({
        candidateId: `vote-candidate:mobility:berlin:${index}`,
      }),
    }));
    const result = evaluateSourceVoteCandidateSetWithSwipeQuality(entries);

    expect(result.participationFinalization.questionQualityAssessment.deck.ready).toBe(false);
    expect(
      result.results.every((entry) =>
        entry.qualityBlockingReasons.includes(
          "swipe_question_deck_quality_failed",
        ),
      ),
    ).toBe(true);
    expect(result.results.every((entry) => entry.effectiveStage === "vote_candidate")).toBe(true);
    expect(result.noAutoPublish).toBe(true);
    expect(result.humanReviewRequiredBeforePublicFinalization).toBe(true);
  });
});
