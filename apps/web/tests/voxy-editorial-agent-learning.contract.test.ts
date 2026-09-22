import { beforeEach, describe, expect, it } from "vitest";
import {
  getVoxyAgentLearningRepository,
  promoteVoxyAgentLearning,
  proposeVoxyAgentLearning,
  rejectOrRollbackVoxyAgentLearning,
  setVoxyAgentLearningRepositoryForTests,
  validateVoxyAgentLearning,
  type VoxyAgentLearningAuditEvent,
  type VoxyAgentLearningRecord,
  type VoxyAgentLearningRepository,
} from "@/features/voxyVideo/editorialAgentLearningStore";

function memoryRepository(): VoxyAgentLearningRepository {
  const records = new Map<string, VoxyAgentLearningRecord>();
  const audit = new Map<string, VoxyAgentLearningAuditEvent>();
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    async create(record) {
      const existing = records.get(record.lessonId);
      if (existing) return clone(existing);
      records.set(record.lessonId, clone(record));
      return clone(record);
    },
    async get(lessonId) {
      const value = records.get(lessonId);
      return value ? clone(value) : null;
    },
    async list(input = {}) {
      return Array.from(records.values())
        .filter((record) => !input.roleId || record.roleId === input.roleId)
        .filter((record) => !input.status || record.status === input.status)
        .map(clone);
    },
    async replaceIfRevision({ lessonId, expectedRevision, next }) {
      const current = records.get(lessonId);
      if (!current || current.revision !== expectedRevision) return false;
      records.set(lessonId, clone(next));
      return true;
    },
    async appendAudit(event) {
      audit.set(event.eventId, clone(event));
    },
    async listAudit(lessonId) {
      return Array.from(audit.values()).filter((event) => event.lessonId === lessonId).map(clone);
    },
    getPersistenceState() {
      return { mode: "in_memory_fallback", productionTruth: false, storeKind: "in_memory" };
    },
  };
}

describe("Voxy governed agent learning", () => {
  beforeEach(() => {
    setVoxyAgentLearningRepositoryForTests(memoryRepository());
  });

  it("keeps a new lesson proposed until evaluation evidence exists", async () => {
    const lesson = await proposeVoxyAgentLearning({
      roleId: "claim_auditor",
      category: "temporal_scope",
      sourceDecisionId: "decision-1",
      sourceRunIds: ["run-1"],
      observedFailure: "A 2024 statistic was narrated as current.",
      proposedRuleChange: "Compare every statistical claim tense with the source period.",
      evidenceRefs: ["source-1", "claim-1"],
      proposedByActorId: "agent:knowledge-curator",
      now: "2026-09-22T12:00:00.000Z",
    });
    expect(lesson.status).toBe("proposed");
    expect(lesson.promotedInstructionVersion).toBeNull();
  });

  it("requires a substantial zero-regression validation set", async () => {
    const lesson = await proposeVoxyAgentLearning({
      roleId: "claim_auditor",
      category: "numbers",
      sourceDecisionId: "decision-2",
      sourceRunIds: ["run-2"],
      observedFailure: "A denominator was omitted.",
      proposedRuleChange: "Require denominator verification for percentages.",
      evidenceRefs: ["source-2"],
      proposedByActorId: "agent:knowledge-curator",
    });

    await expect(
      validateVoxyAgentLearning({
        lessonId: lesson.lessonId,
        expectedRevision: 1,
        validation: {
          evaluationSetVersion: "eval-v1",
          historicalCases: 19,
          passedCases: 19,
          failedCases: 0,
          shadowRuns: 50,
          regressions: 0,
          criticalRegressions: 0,
          summary: "Too small.",
        },
        validatedByActorId: "evaluation-runner",
        reason: "Evaluation run",
      }),
    ).rejects.toThrow("voxy_learning_validation_evidence_insufficient");

    await expect(
      validateVoxyAgentLearning({
        lessonId: lesson.lessonId,
        expectedRevision: 1,
        validation: {
          evaluationSetVersion: "eval-v1",
          historicalCases: 20,
          passedCases: 19,
          failedCases: 1,
          shadowRuns: 50,
          regressions: 1,
          criticalRegressions: 0,
          summary: "One regression.",
        },
        validatedByActorId: "evaluation-runner",
        reason: "Evaluation run",
      }),
    ).rejects.toThrow("voxy_learning_validation_regression_detected");
  });

  it("forbids an agent from promoting its own learning proposal", async () => {
    const lesson = await proposeVoxyAgentLearning({
      roleId: "editorial_critic",
      category: "certainty",
      sourceDecisionId: "decision-3",
      sourceRunIds: ["run-3"],
      observedFailure: "Scenario language was too certain.",
      proposedRuleChange: "Require explicit scenario modality.",
      evidenceRefs: ["claim-3"],
      proposedByActorId: "agent:knowledge-curator",
    });
    const validated = await validateVoxyAgentLearning({
      lessonId: lesson.lessonId,
      expectedRevision: 1,
      validation: {
        evaluationSetVersion: "eval-v2",
        historicalCases: 20,
        passedCases: 20,
        failedCases: 0,
        shadowRuns: 50,
        regressions: 0,
        criticalRegressions: 0,
        summary: "No regressions.",
      },
      validatedByActorId: "evaluation-runner",
      reason: "Passed fixed evaluation corpus and shadow runs.",
    });

    await expect(
      promoteVoxyAgentLearning({
        lessonId: lesson.lessonId,
        expectedRevision: validated.revision,
        promotedInstructionVersion: "editorial-critic-v2",
        promotedByActorId: "agent:knowledge-curator",
        reason: "Self promotion attempt",
      }),
    ).rejects.toThrow("voxy_learning_self_promotion_forbidden");
  });

  it("supports explicit human promotion and rollback with an audit trail", async () => {
    const repository = getVoxyAgentLearningRepository();
    const lesson = await proposeVoxyAgentLearning({
      roleId: "neutrality_red_team",
      category: "selective_skepticism",
      sourceDecisionId: "decision-4",
      sourceRunIds: ["run-4"],
      observedFailure: "Comparable positions received unequal scrutiny.",
      proposedRuleChange: "Apply the same evidence threshold to comparable positions.",
      evidenceRefs: ["claim-4", "claim-5"],
      proposedByActorId: "agent:knowledge-curator",
      repository,
    });
    const validated = await validateVoxyAgentLearning({
      lessonId: lesson.lessonId,
      expectedRevision: 1,
      validation: {
        evaluationSetVersion: "eval-v3",
        historicalCases: 25,
        passedCases: 25,
        failedCases: 0,
        shadowRuns: 75,
        regressions: 0,
        criticalRegressions: 0,
        summary: "Passed historical and shadow evaluation.",
      },
      validatedByActorId: "evaluation-runner",
      reason: "Independent evaluation passed.",
      repository,
    });
    const promoted = await promoteVoxyAgentLearning({
      lessonId: lesson.lessonId,
      expectedRevision: validated.revision,
      promotedInstructionVersion: "neutrality-red-team-v2",
      promotedByActorId: "admin-1",
      reason: "Activate after zero-regression evaluation.",
      repository,
    });
    expect(promoted.status).toBe("promoted");

    const rolledBack = await rejectOrRollbackVoxyAgentLearning({
      lessonId: lesson.lessonId,
      expectedRevision: promoted.revision,
      action: "rollback",
      changedByActorId: "admin-1",
      reason: "Rollback requested after later quality review.",
      repository,
    });
    expect(rolledBack.status).toBe("rolled_back");
    const audit = await repository.listAudit(lesson.lessonId);
    expect(audit.map((event) => event.action)).toEqual(
      expect.arrayContaining(["proposed", "validated", "promoted", "rolled_back"]),
    );
  });
});
