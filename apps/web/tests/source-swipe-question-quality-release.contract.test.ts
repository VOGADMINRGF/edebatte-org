import { describe, expect, it } from "vitest";
import {
  evaluateSourceVoteCandidateSetWithSwipeQuality,
  type SourceSwipeQuestionDraft,
} from "@features/themenradar/sourceSwipeQuestionQualityBridge";
import type { SourceVoteCandidatePackage } from "@features/themenradar/sourceVoteReadinessContract";

function minimalBlockedPackage(id: string): SourceVoteCandidatePackage {
  return {
    candidateId: id,
    canonicalTopicId: null,
    topicDisposition: "new_topic_candidate",
    eventClusterIds: [],
    signalRefs: [],
    evidenceRefs: [],
    provenanceRefs: [],
    evidence: {
      provenanceState: "incomplete",
      evidenceState: "insufficient",
      evidenceGapState: "open",
      conflictState: "unresolved",
      jurisdictionState: "uncertain",
      sourceTruthSeparation: "unresolved",
    },
    qualification: null,
    decisionFrame: null,
    questions: null,
    neutrality: { status: "review_required", issues: [] },
    swipeCandidates: [],
    reviewState: "not_queued",
    release: {
      authority: "canonical_vote_release",
      status: "not_released",
      releaseId: null,
    },
  };
}

describe("Source Swipe convergence release authority", () => {
  it("cannot manufacture readiness from a high-quality Swipe draft when Source truth is not ready", () => {
    const draft: SourceSwipeQuestionDraft = {
      candidateId: "candidate:blocked",
      humanContext: "Ein nachvollziehbarer Alltagseffekt ist beschrieben.",
      tradeoff: "Zwei legitime Ziele stehen in einem nachvollziehbaren Spannungsverhältnis.",
      decisionConsequences: {
        agree: [{ title: "Eine mögliche Folge", evidenceStatus: "hypothesis" }],
        disagree: [{ title: "Eine andere mögliche Folge", evidenceStatus: "hypothesis" }],
      },
    };
    const result = evaluateSourceVoteCandidateSetWithSwipeQuality([
      {
        candidatePackage: minimalBlockedPackage("candidate:blocked"),
        swipeQuestion: draft,
      },
    ]);

    expect(result.results[0].sourceReadiness.stage).toBe("detected");
    expect(result.results[0].effectiveStage).toBe("detected");
    expect(result.noAutoPublish).toBe(true);
    expect(result.sourcePipelineMayRelease).toBe(false);
  });
});
