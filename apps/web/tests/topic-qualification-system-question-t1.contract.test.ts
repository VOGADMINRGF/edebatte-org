import { describe, expect, it } from "vitest";

import {
  resolveTopicQualification,
  t1CanCreateCanonicalTopic,
  t1CanPublishOrActivate,
  t1CanTreatSignalsAsEvidence,
  validateTopicQualificationRecord,
  type TopicQualificationRecord,
} from "@features/dossier/topicQualificationSystemQuestionContract";

const reviewed = {
  status: "reviewed" as const,
  reviewerRef: "reviewer-1",
  revision: "qualification-r1",
  reviewedAt: "2026-09-17T08:00:00+02:00",
};

const pension: TopicQualificationRecord = {
  canonicalTopicId: "topic-pension",
  decisionQuestionId: null,
  jurisdictionContextId: "DE:federal",
  kind: "long_term_societal_choice",
  rationale: "Financing, demography and intergenerational effects require a system-level decision frame.",
  goal: "Secure an adequate and sustainably financed retirement system over the long term.",
  scope: {
    included: ["statutory pension", "financing", "demography", "transition"],
    excluded: ["individual retirement advice"],
    affectedGroups: ["contributors", "pensioners", "future generations"],
    controllableLevers: ["contribution rules", "retirement rules", "tax financing", "coverage"],
    horizon: "multi_generational",
  },
  signalIds: ["signal-pension-1"],
  candidateMeasureLabels: ["contribution reform"],
  review: reviewed,
};

const education: TopicQualificationRecord = {
  canonicalTopicId: "topic-education-st",
  decisionQuestionId: "decision-education-st-1",
  jurisdictionContextId: "DE:ST",
  kind: "structural_system_question",
  rationale: "The regional trigger depends on federal structures, state responsibilities and long-term system capacity.",
  goal: "Improve reliable educational provision and outcomes in Saxony-Anhalt.",
  scope: {
    included: ["teacher capacity", "school system", "state responsibilities", "comparative outcomes"],
    excluded: ["individual school disciplinary cases"],
    affectedGroups: ["students", "families", "teachers", "municipalities"],
    controllableLevers: ["staffing", "training", "school organization", "state policy"],
    horizon: "long_term",
  },
  signalIds: ["signal-education-1", "signal-education-2"],
  review: reviewed,
};

describe("T1 topic qualification / system question contract", () => {
  it("routes the pension golden case into systematic research", () => {
    expect(resolveTopicQualification(pension)).toMatchObject({
      disposition: "research_candidate",
      systemQuestionEligible: true,
      canonicalTopicId: "topic-pension",
      jurisdictionContextId: "DE:federal",
      signalsAreEvidence: false,
    });
  });

  it("routes the Saxony-Anhalt education golden case into systematic research", () => {
    expect(resolveTopicQualification(education)).toMatchObject({
      disposition: "research_candidate",
      systemQuestionEligible: true,
      decisionQuestionId: "decision-education-st-1",
      jurisdictionContextId: "DE:ST",
    });
  });

  it("keeps transient events as signals until explicitly requalified", () => {
    const result = resolveTopicQualification({ ...education, kind: "transient_event" });
    expect(result.disposition).toBe("signal_only");
    expect(result.systemQuestionEligible).toBe(false);
  });

  it("keeps factual clarification separate from a decision dossier", () => {
    const result = resolveTopicQualification({ ...education, kind: "factual_clarification" });
    expect(result.disposition).toBe("clarification_only");
    expect(result.systemQuestionEligible).toBe(false);
  });

  it("fails closed when goal, scope, groups, levers, jurisdiction or review are incomplete", () => {
    const cases: TopicQualificationRecord[] = [
      { ...education, goal: "" },
      { ...education, jurisdictionContextId: "" },
      { ...education, scope: { ...education.scope, included: [] } },
      { ...education, scope: { ...education.scope, affectedGroups: [] } },
      { ...education, scope: { ...education.scope, controllableLevers: [] } },
      { ...education, review: { ...reviewed, status: "pending", reviewerRef: null } },
      { ...education, review: { ...reviewed, status: "rejected" } },
    ];

    for (const candidate of cases) {
      expect(resolveTopicQualification(candidate).disposition).toBe("review_required");
      expect(resolveTopicQualification(candidate).systemQuestionEligible).toBe(false);
    }
  });

  it("does not let a proposed measure substitute for a missing goal", () => {
    const candidate = { ...pension, goal: "", candidateMeasureLabels: ["raise retirement age"] };
    expect(validateTopicQualificationRecord(candidate)).toContain("goal_missing");
    expect(resolveTopicQualification(candidate).disposition).toBe("review_required");
  });

  it("preserves signal references without promoting them to evidence", () => {
    const result = resolveTopicQualification({
      ...education,
      signalIds: ["reddit-thread-1", "social-post-2", "news-tip-3"],
    });
    expect(result.signalIds).toEqual(["reddit-thread-1", "social-post-2", "news-tip-3"]);
    expect(result.signalsAreEvidence).toBe(false);
    expect(t1CanTreatSignalsAsEvidence()).toBe(false);
  });

  it("is language-independent because routing consumes reviewed structure, not keywords", () => {
    const goals = [
      "Improve reliable public education.",
      "Zuverlässige öffentliche Bildung verbessern.",
      "Améliorer la fiabilité de l'éducation publique.",
    ];
    expect(goals.map((goal) => resolveTopicQualification({ ...education, goal }).disposition)).toEqual([
      "research_candidate",
      "research_candidate",
      "research_candidate",
    ]);
  });

  it("rejects blank IDs inside arrays rather than silently filtering them", () => {
    expect(validateTopicQualificationRecord({ ...education, signalIds: ["signal-1", "   "] })).toContain("signal_id_invalid");
    expect(validateTopicQualificationRecord({ ...education, scope: { ...education.scope, excluded: ["   "] } })).toContain("scope_excluded_invalid");
  });

  it("never becomes a second topic owner, evidence owner, publish owner or decision owner", () => {
    expect(t1CanCreateCanonicalTopic()).toBe(false);
    expect(t1CanTreatSignalsAsEvidence()).toBe(false);
    expect(t1CanPublishOrActivate()).toBe(false);
  });
});
