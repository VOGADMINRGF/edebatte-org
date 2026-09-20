import { describe, expect, it } from "vitest";

import {
  decisionFrameSignature,
  evaluateSourceVoteReadiness,
  sourceVoteReadinessHeadline,
  summarizeSourceVoteReadiness,
  type DecisionFrame,
  type SourceVoteCandidatePackage,
} from "@features/themenradar/sourceVoteReadinessContract";
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

function decisionFrame(
  overrides: Partial<DecisionFrame> = {},
): DecisionFrame {
  return {
    authorityId: "DE:BE",
    action: "zusätzliche Busspuren einrichten",
    object: "Busspuren auf belasteten Berliner Strecken",
    scope: ["Berlin"],
    conditions: ["Haushaltsbeschluss sieht Finanzierung vor"],
    timeframe: "bis 2030",
    optionKeys: ["ja", "nein"],
    ...overrides,
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

describe("Source Vote Readiness contract", () => {
  it("reaches review-ready only through the canonical T1 qualification boundary", () => {
    const result = evaluateSourceVoteReadiness(packageFixture());

    expect(result).toMatchObject({
      stage: "review_ready",
      blockingReasons: [],
      reviewReasons: [],
      noAutoPublish: true,
      releaseAuthority: "canonical_vote_release",
      sourcePipelineMayRelease: false,
    });
  });

  it("stops at evidence-ready while canonical topic qualification is missing", () => {
    const result = evaluateSourceVoteReadiness(
      packageFixture({
        qualification: null,
        decisionFrame: null,
        questions: null,
        swipeCandidates: [],
        reviewState: "not_queued",
      }),
    );

    expect(result.stage).toBe("evidence_ready");
    expect(result.reviewReasons).toEqual(
      expect.arrayContaining([
        "qualification_missing",
        "swipe_candidates_missing",
        "review_not_queued",
      ]),
    );
  });

  it("keeps a T1 review-required question as a vote candidate, not review-ready", () => {
    const qualification = evaluateTopicQualificationSystemQuestion(
      t1Input({ duplicateTopicRisk: true }),
    );
    const frame = decisionFrame();
    const signature = decisionFrameSignature(frame);
    const result = evaluateSourceVoteReadiness(
      packageFixture({
        qualification,
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
      }),
    );

    expect(qualification.reviewState).toBe("review_required");
    expect(result.stage).toBe("vote_candidate");
    expect(result.reviewReasons).toContain("qualification_review_required");
  });

  it("blocks review readiness when evidence, conflicts or source/truth roles are unresolved", () => {
    const result = evaluateSourceVoteReadiness(
      packageFixture({
        evidence: {
          provenanceState: "complete",
          evidenceState: "sufficient",
          evidenceGapState: "open",
          conflictState: "unresolved",
          jurisdictionState: "resolved",
          sourceTruthSeparation: "unresolved",
        },
      }),
    );

    expect(result.stage).toBe("detected");
    expect(result.blockingReasons).toEqual(
      expect.arrayContaining([
        "evidence_gap_open",
        "evidence_conflict_unresolved",
        "source_truth_separation_unresolved",
      ]),
    );
  });

  it("detects Leichte-Sprache semantic drift when a material condition disappears", () => {
    const base = packageFixture();
    const driftedFrame = decisionFrame({ conditions: [] });
    const result = evaluateSourceVoteReadiness({
      ...base,
      questions: base.questions
        ? {
            standard: base.questions.standard,
            plain: {
              ...base.questions.plain,
              text: "Soll Berlin bis 2030 mehr Busspuren machen?",
              decisionFrameSignature: decisionFrameSignature(driftedFrame),
            },
          }
        : null,
    });

    expect(result.stage).toBe("vote_candidate");
    expect(result.blockingReasons).toEqual(
      expect.arrayContaining([
        "question_frame_signature_mismatch",
        "plain_language_semantic_drift",
      ]),
    );
  });

  it("blocks loaded or presupposing wording before review-ready", () => {
    const result = evaluateSourceVoteReadiness(
      packageFixture({
        neutrality: {
          status: "blocked",
          issues: ["loaded_wording", "presupposition"],
        },
      }),
    );

    expect(result.stage).toBe("vote_candidate");
    expect(result.blockingReasons).toContain("neutrality_blocked");
  });

  it("requires every Swipe candidate to remain grounded in package evidence", () => {
    const result = evaluateSourceVoteReadiness(
      packageFixture({
        swipeCandidates: [
          {
            id: "swipe:ungrounded",
            kind: "statistic",
            evidenceRefs: ["evidence:not-in-package"],
          },
        ],
      }),
    );

    expect(result.stage).toBe("vote_candidate");
    expect(result.blockingReasons).toContain("swipe_candidate_evidence_missing");
  });

  it("never treats a live release flag as source authority without canonical approval", () => {
    const pending = evaluateSourceVoteReadiness(
      packageFixture({
        reviewState: "pending",
        release: {
          authority: "canonical_vote_release",
          status: "live",
          releaseId: "release:123",
        },
      }),
    );

    expect(pending.stage).toBe("review_ready");
    expect(pending.blockingReasons).toContain("canonical_release_without_approval");
    expect(pending.sourcePipelineMayRelease).toBe(false);

    const approved = evaluateSourceVoteReadiness(
      packageFixture({
        reviewState: "approved",
        release: {
          authority: "canonical_vote_release",
          status: "live",
          releaseId: "release:123",
        },
      }),
    );
    expect(approved.stage).toBe("voting_live");
  });

  it("derives Mission-Control outcome counts from canonical readiness records", () => {
    const reviewReady = evaluateSourceVoteReadiness(packageFixture());
    const votingLive = evaluateSourceVoteReadiness(
      packageFixture({
        candidateId: "vote-candidate:new-topic",
        canonicalTopicId: "topic:new",
        topicDisposition: "new_topic_candidate",
        reviewState: "approved",
        qualification: evaluateTopicQualificationSystemQuestion(
          t1Input({ canonicalTopic: { id: "topic:new" } }),
        ),
        release: {
          authority: "canonical_vote_release",
          status: "live",
          releaseId: "release:new",
        },
      }),
    );
    const blocked = evaluateSourceVoteReadiness(
      packageFixture({
        candidateId: "vote-candidate:blocked",
        evidence: {
          provenanceState: "incomplete",
          evidenceState: "insufficient",
          evidenceGapState: "open",
          conflictState: "unresolved",
          jurisdictionState: "uncertain",
          sourceTruthSeparation: "unresolved",
        },
      }),
    );

    const summary = summarizeSourceVoteReadiness([
      reviewReady,
      votingLive,
      blocked,
    ]);

    expect(summary).toEqual({
      detectedTopics: 3,
      matchedExistingTopics: 2,
      newTopicCandidates: 1,
      evidenceReady: 2,
      voteCandidates: 2,
      reviewReady: 2,
      reviewPending: 2,
      blocked: 1,
      votingLive: 1,
    });
    expect(sourceVoteReadinessHeadline(summary)).toBe(
      "3 Themen erkannt · 2 bestehenden Themen zugeordnet · 1 neue Themenkandidaten · 2 Abstimmungskandidaten · 2 in Prüfung · 1 blockiert · 1 aktuell zur Abstimmung freigeschaltet",
    );
  });
});
