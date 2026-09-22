import { describe, expect, it } from "vitest";
import {
  VOXY_EDITORIAL_COUNCIL_ROLES,
  VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
  buildVoxyEditorialCouncilInputFingerprint,
  evaluateVoxyEditorialCouncil,
  listRequiredVoxyEditorialCouncilRoles,
  proposeVoxyEditorialLearningCandidate,
  type VoxyEditorialCouncilInputBinding,
  type VoxyEditorialCouncilRoleId,
  type VoxyEditorialCouncilRun,
} from "@/features/voxyVideo/editorialAgentCouncil";

const binding: VoxyEditorialCouncilInputBinding = {
  studioDraftId: "draft-1",
  studioDraftRevision: 7,
  storyPlanId: "story-1",
  storyPlanRevision: 4,
  evidenceSourcePackId: "source-pack-1",
  evidenceFingerprint: "evidence-fingerprint-1",
  locale: "de",
  renderOutputSha256: null,
};

function runForRole(roleId: VoxyEditorialCouncilRoleId, index: number): VoxyEditorialCouncilRun {
  const fingerprint = buildVoxyEditorialCouncilInputFingerprint(binding);
  const definition = VOXY_EDITORIAL_COUNCIL_ROLES.find((entry) => entry.id === roleId)!;
  const provider = index % 2 === 0 ? "openai" : "anthropic";
  return {
    runId: `review-run-${index + 1}`,
    roleId,
    alpha2RoleId: definition.alpha2RoleId,
    reviewerActorId: `agent:review:${roleId}:${index + 1}`,
    inputFingerprint: fingerprint,
    creatorRunId: "creator-run-1",
    providerId: provider,
    modelFamily: provider,
    modelId: `${provider}-review-model`,
    instructionVersion: "v1",
    policyRevision: 1,
    completed: true,
    publicReasonSummary: `${roleId} completed evidence-backed checks.`,
    checksPerformed: ["evidence_binding", "certainty_parity"],
    evidenceRefs: ["source-pack-1"],
    objections: [],
    verdict: "pass",
  };
}

function passingRuns(): VoxyEditorialCouncilRun[] {
  const roles = listRequiredVoxyEditorialCouncilRoles("maximum", "editorial");
  const runs = roles.map((roleId, index) => runForRole(roleId, index));
  const repeatable = roles.filter(
    (roleId) => !["chief_judge", "defense_advocate"].includes(roleId),
  );
  let repeatIndex = 0;
  while (runs.length < VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY.minIndependentReviewRuns) {
    const roleId = repeatable[repeatIndex % repeatable.length];
    runs.push(runForRole(roleId, runs.length));
    repeatIndex += 1;
  }
  return runs;
}

describe("Voxy adversarial editorial council", () => {
  it("scopes reviewers to the active review stage", () => {
    const editorial = listRequiredVoxyEditorialCouncilRoles("maximum", "editorial");
    expect(editorial).toContain("evidence_prosecutor");
    expect(editorial).toContain("defense_advocate");
    expect(editorial).toContain("chief_judge");
    expect(editorial).not.toContain("voice_av_critic");
    expect(editorial).not.toContain("social_critic");

    const translation = listRequiredVoxyEditorialCouncilRoles("maximum", "translation");
    expect(translation).toContain("language_critic");
    expect(translation).not.toContain("voice_av_critic");
  });

  it("allows autonomous approval only after the maximum council completed on the exact input", () => {
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      creatorActorId: "agent:creator",
      runs: passingRuns(),
    });
    expect(decision.outcome).toBe("agent_approved");
    expect(decision.reasonCodes).toEqual([]);
    expect(decision.auditComplete).toBe(true);
    expect(decision.reviewRunIds.length).toBeGreaterThanOrEqual(12);
    expect(decision.modelFamilies).toEqual(expect.arrayContaining(["openai", "anthropic"]));
  });

  it("fails closed when authoritative creator lineage is absent", () => {
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: null,
      creatorActorId: null,
      runs: passingRuns(),
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.auditComplete).toBe(false);
    expect(decision.reasonCodes).toContain("creator_lineage_missing");
  });

  it("binds the decision identity to the authoritative creator actor", () => {
    const first = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: null,
      creatorActorId: "admin-author-a",
      runs: passingRuns().map((run) => ({ ...run, creatorRunId: null })),
    });
    const second = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: null,
      creatorActorId: "admin-author-b",
      runs: passingRuns().map((run) => ({ ...run, creatorRunId: null })),
    });
    expect(first.outcome).toBe("agent_approved");
    expect(second.outcome).toBe("agent_approved");
    expect(first.decisionId).not.toBe(second.decisionId);
  });

  it("fails closed on a stale input fingerprint", () => {
    const runs = passingRuns();
    runs[0] = { ...runs[0], inputFingerprint: "stale" };
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.reasonCodes).toContain("stale_or_foreign_input_fingerprint");
  });

  it("fails closed when reviewer lineage does not match the creator revision", () => {
    const runs = passingRuns();
    runs[0] = { ...runs[0], creatorRunId: "another-creator-run" };
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.reasonCodes).toContain("creator_lineage_mismatch");
  });

  it("blocks an unresolved adversarial objection even if the judge otherwise passes", () => {
    const runs = passingRuns();
    runs[0] = {
      ...runs[0],
      objections: [
        {
          objectionId: "obj-1",
          raisedByRole: "evidence_prosecutor",
          severity: "blocker",
          category: "temporal_scope",
          publicReasonSummary: "The narration claims present validity while the cited source only covers 2024.",
          evidenceRefs: ["source-2024"],
          affectedClaimIds: ["claim-1"],
          affectedSourceIds: ["source-2024"],
          state: "open",
          defenseSummary: null,
          defenseEvidenceRefs: [],
          resolutionSummary: null,
        },
      ],
    };
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.reasonCodes).toContain("unresolved_blocking_objection");
    expect(decision.unresolvedObjectionIds).toContain("obj-1");
  });

  it("requires evidence-backed defense before an objection may count as resolved", () => {
    const runs = passingRuns();
    runs[0] = {
      ...runs[0],
      objections: [
        {
          objectionId: "obj-2",
          raisedByRole: "claim_auditor",
          severity: "blocker",
          category: "number_mismatch",
          publicReasonSummary: "A percentage requires verification.",
          evidenceRefs: ["source-1"],
          affectedClaimIds: ["claim-2"],
          affectedSourceIds: ["source-1"],
          state: "resolved",
          defenseSummary: "The source table confirms the value.",
          defenseEvidenceRefs: [],
          resolutionSummary: "Resolved after source check.",
        },
      ],
    };
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.reasonCodes).toContain("objection_resolution_missing_defense_evidence");
  });

  it("forces a human gate only for explicit critical-risk flags", () => {
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs: passingRuns(),
      criticalRiskFlags: ["unresolved_core_source_conflict"],
    });
    expect(decision.outcome).toBe("human_required");
    expect(decision.reasonCodes).toContain("critical_human_escalation_required");
  });

  it("does not allow learning feedback to silently mutate the active policy", () => {
    const decision = evaluateVoxyEditorialCouncil({
      stage: "editorial",
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs: passingRuns(),
    });
    const lesson = proposeVoxyEditorialLearningCandidate({
      decision,
      category: "temporal_scope",
      observedFailure: "A historical statistic was phrased as current.",
      proposedRuleChange: "Always compare the claim tense with the cited source period.",
      evidenceRefs: ["correction-17"],
    });
    expect(lesson.status).toBe("proposed");
    expect(lesson.sourceDecisionId).toBe(decision.decisionId);
  });
});
