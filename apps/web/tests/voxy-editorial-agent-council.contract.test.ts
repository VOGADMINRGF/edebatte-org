import { describe, expect, it } from "vitest";
import {
  VOXY_EDITORIAL_COUNCIL_ROLES,
  VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
  buildVoxyEditorialCouncilInputFingerprint,
  evaluateVoxyEditorialCouncil,
  listRequiredVoxyEditorialCouncilRoles,
  proposeVoxyEditorialLearningCandidate,
  type VoxyEditorialCouncilInputBinding,
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

function passingRuns(overrides?: Partial<VoxyEditorialCouncilRun>): VoxyEditorialCouncilRun[] {
  const fingerprint = buildVoxyEditorialCouncilInputFingerprint(binding);
  return listRequiredVoxyEditorialCouncilRoles("maximum").map((roleId, index) => {
    const definition = VOXY_EDITORIAL_COUNCIL_ROLES.find((entry) => entry.id === roleId)!;
    return {
      runId: `review-run-${index + 1}`,
      roleId,
      alpha2RoleId: definition.alpha2RoleId,
      inputFingerprint: fingerprint,
      creatorRunId: "creator-run-1",
      providerId: "openai",
      modelFamily: "gpt-5",
      modelId: "review-model",
      instructionVersion: "v1",
      policyRevision: 1,
      completed: true,
      publicReasonSummary: `${roleId} completed evidence-backed checks.`,
      checksPerformed: ["evidence_binding", "certainty_parity"],
      evidenceRefs: ["source-pack-1"],
      objections: [],
      verdict: "pass",
      ...overrides,
      roleId,
      alpha2RoleId: definition.alpha2RoleId,
      runId: `review-run-${index + 1}`,
    };
  });
}

describe("Voxy adversarial editorial council", () => {
  it("allows autonomous approval only after the maximum council completed on the exact input", () => {
    const decision = evaluateVoxyEditorialCouncil({
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs: passingRuns(),
    });
    expect(decision.outcome).toBe("agent_approved");
    expect(decision.reasonCodes).toEqual([]);
    expect(decision.auditComplete).toBe(true);
    expect(decision.reviewRunIds).toHaveLength(
      listRequiredVoxyEditorialCouncilRoles("maximum").length,
    );
  });

  it("fails closed on a stale input fingerprint", () => {
    const runs = passingRuns();
    runs[0] = { ...runs[0], inputFingerprint: "stale" };
    const decision = evaluateVoxyEditorialCouncil({
      binding,
      policy: VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY,
      creatorRunId: "creator-run-1",
      runs,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.reasonCodes).toContain("stale_or_foreign_input_fingerprint");
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
