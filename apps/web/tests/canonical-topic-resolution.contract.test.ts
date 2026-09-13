import { describe, expect, it } from "vitest";
import {
  resolveCanonicalTopic,
  type CanonicalTopic,
  type ExternalParticipationSignal,
  type JurisdictionContext,
} from "@/features/create/canonicalTopicResolutionContract";

const topic: CanonicalTopic = {
  id: "topic-mobility",
  key: "mobility",
  canonicalTitle: "Mobilität",
  status: "active",
  reviewState: "verified",
  dossierRefs: ["dossier-mobility"],
  anlassraumRefs: ["room-mobility"],
  decisionQuestionRefs: ["dq-bike-lane"],
};

const berlin: JurisdictionContext = {
  level: "municipality",
  id: "berlin",
  label: "Berlin",
};

const hamburg: JurisdictionContext = {
  level: "municipality",
  id: "hamburg",
  label: "Hamburg",
};

const petition: ExternalParticipationSignal = {
  id: "signal-petition-1",
  sourceUrl: "https://example.org/petition",
  signalType: "petition",
  initiator: "Externe Initiative",
  jurisdiction: berlin,
  publishedOrPlannedAt: "2026-08-01",
  freshness: "current",
  sourceTrust: "verified",
  topicRelation: "supported",
  decisionQuestionRelation: "candidate",
  reviewState: "verified",
};

function candidate(score = 0.91) {
  return { topic, score, legacyMatchType: "related_claim" as const };
}

describe("canonical topic resolution contract", () => {
  it("keeps the same topic across different jurisdictions", () => {
    const berlinResult = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
    });
    const hamburgResult = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: hamburg,
      sourceState: "ok",
    });

    expect(berlinResult.outcome).toBe("existing_topic");
    expect(hamburgResult.outcome).toBe("existing_topic");
    if (berlinResult.outcome === "existing_topic" && hamburgResult.outcome === "existing_topic") {
      expect(berlinResult.topic.id).toBe(hamburgResult.topic.id);
      expect(berlinResult.jurisdiction.id).not.toBe(hamburgResult.jurisdiction.id);
    }
  });

  it("classifies a new concrete decision as an extension under the existing topic", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      requestedDecisionQuestion: "Soll die Friedrichstraße dauerhaft autofrei werden?",
    });

    expect(result.outcome).toBe("create_extension_required");
    if (result.outcome === "create_extension_required") {
      expect(result.candidateTopic?.id).toBe(topic.id);
      expect(result.decisionQuestionCandidate?.topicId).toBe(topic.id);
      expect(result.questionGuard).toMatchObject({
        releaseState: "review_required",
        outcome: "actor_extraction_review_required",
      });
      expect(result.requiresHumanReview).toBe(true);
    }
  });

  it("does not create a decision-question candidate from blocked safety input", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      requestedDecisionQuestion: "Sollen wir diese Gruppe verprügeln?",
    });

    expect(result.outcome).toBe("create_extension_required");
    if (result.outcome === "create_extension_required") {
      expect(result.decisionQuestionCandidate).toBeNull();
      expect(result.questionGuard?.outcome).toBe("safety_blocked");
      expect(result.requiresHumanReview).toBe(true);
    }
  });

  it("reuses an existing decision question before proposing another one", () => {
    const question = {
      id: "dq-bike-lane",
      topicId: topic.id,
      jurisdiction: berlin,
      question: "Soll die Friedrichstraße dauerhaft autofrei werden?",
      kind: "decision" as const,
    };
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      decisionQuestions: [question],
      requestedDecisionQuestion: "  Soll die Friedrichstraße dauerhaft autofrei werden? ",
    });

    expect(result.outcome).toBe("existing_decision_question");
    if (result.outcome === "existing_decision_question") {
      expect(result.decisionQuestion.id).toBe(question.id);
    }
  });

  it("keeps an external petition as a signal under an existing topic", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      externalSignals: [petition],
    });

    expect(result.outcome).toBe("existing_topic");
    if (result.outcome === "existing_topic") {
      expect(result.externalSignals).toEqual([petition]);
      expect(result.topic.id).toBe(topic.id);
    }
  });

  it("routes duplicate risk to review instead of creation", () => {
    const result = resolveCanonicalTopic({
      candidates: [{ ...candidate(), legacyMatchType: "duplicate_risk" }],
      jurisdiction: berlin,
      sourceState: "ok",
    });

    expect(result.outcome).toBe("review_required");
    expect(result.reasons).toContain("duplicate_risk_requires_review");
  });

  it("returns ambiguous candidates instead of fusing two plausible topics", () => {
    const secondTopic = { ...topic, id: "topic-streets", key: "streets", canonicalTitle: "Straßenraum" };
    const result = resolveCanonicalTopic({
      candidates: [candidate(0.82), { topic: secondTopic, score: 0.78, legacyMatchType: "related_dossier" }],
      jurisdiction: berlin,
      sourceState: "ok",
    });

    expect(result.outcome).toBe("ambiguous_candidates");
    if (result.outcome === "ambiguous_candidates") {
      expect(result.candidates).toHaveLength(2);
    }
  });

  it("requires review when jurisdiction is missing", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      sourceState: "ok",
    });

    expect(result.outcome).toBe("review_required");
    expect(result.reasons).toContain("jurisdiction_missing");
  });

  it("requires review for cross-language uncertainty", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      languageUncertain: true,
    });

    expect(result.outcome).toBe("review_required");
    expect(result.reasons).toContain("cross_language_uncertain");
  });

  it("fails closed when the match source is degraded", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "degraded",
    });

    expect(result.outcome).toBe("review_required");
    expect(result.reasons).toContain("match_source_degraded");
  });

  it("does not let financial support preference alter ranking or matching", () => {
    const baseline = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
    });
    const funded = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      fundingPreference: { amount: 50000, preferred: true },
    });

    expect(funded).toEqual(baseline);
  });

  it("does not downgrade or claim ownership of an external initiative", () => {
    const result = resolveCanonicalTopic({
      candidates: [candidate()],
      jurisdiction: berlin,
      sourceState: "ok",
      externalSignals: [petition],
    });

    expect(result.outcome).toBe("existing_topic");
    if (result.outcome === "existing_topic") {
      expect(result.externalSignals[0].initiator).toBe("Externe Initiative");
      expect(result.externalSignals[0].sourceUrl).toBe("https://example.org/petition");
    }
  });

  it("requires a create extension when no reliable existing topic is present", () => {
    const result = resolveCanonicalTopic({
      candidates: [{ ...candidate(0.3), legacyMatchType: "no_match" }],
      jurisdiction: berlin,
      sourceState: "ok",
    });

    expect(result.outcome).toBe("create_extension_required");
    if (result.outcome === "create_extension_required") {
      expect(result.candidateTopic).toBeNull();
    }
  });

  it("accepts legacy match result labels without changing their semantics", () => {
    for (const legacyMatchType of [
      "exact_claim",
      "related_claim",
      "same_anlassraum",
      "related_dossier",
    ] as const) {
      const result = resolveCanonicalTopic({
        candidates: [{ topic, score: 0.9, legacyMatchType }],
        jurisdiction: berlin,
        sourceState: "ok",
      });
      expect(result.outcome).toBe("existing_topic");
    }
  });
});
