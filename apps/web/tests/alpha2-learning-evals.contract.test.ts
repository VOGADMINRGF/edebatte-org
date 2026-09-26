import { describe, expect, it } from "vitest";
import {
  buildAlpha2EvalRecord,
  selectAlpha2ProviderByEvals,
  summarizeAlpha2ProviderPerformance,
} from "@/features/agenticRuntime/alpha2EvalContract";
import {
  decideAlpha2Lesson,
  isAlpha2LessonOperationallyReusable,
  moveAlpha2LessonToIndependentCheck,
  proposeAlpha2Lesson,
  selectReusableAlpha2Lessons,
} from "@/features/agenticRuntime/alpha2LearningContract";

function evalRecord(input: {
  evalId: string;
  providerId: "openai" | "codex" | "oss" | "anthropic";
  taskSuccess: boolean;
  evidenceFidelity?: number;
  policyCompliance?: number;
  reviewerDefectCount?: number;
  regressionCount?: number;
  latencyMs?: number;
  policyViolationCount?: number;
}) {
  return buildAlpha2EvalRecord({
    evalId: input.evalId,
    runId: `run-${input.evalId}`,
    taskId: `task-${input.evalId}`,
    capability: "engineering",
    roleId: "engineering_agent",
    providerId: input.providerId,
    outcome: input.taskSuccess ? "success" : "failure",
    taskSuccess: input.taskSuccess,
    evidenceFidelity: input.evidenceFidelity ?? 1,
    policyCompliance: input.policyCompliance ?? 1,
    reviewerDefectCount: input.reviewerDefectCount ?? 0,
    regressionCount: input.regressionCount ?? 0,
    policyViolationCount: input.policyViolationCount ?? 0,
    latencyMs: input.latencyMs ?? 1_000,
    humanInterventions: 0,
    createdAt: "2026-08-23T21:00:00.000Z",
  });
}

describe("Alpha-Foxtrott 2 learning and evaluations", () => {
  it("uses the default provider until enough reviewed evidence exists", () => {
    const records = [
      evalRecord({ evalId: "o1", providerId: "openai", taskSuccess: true }),
      evalRecord({ evalId: "c1", providerId: "codex", taskSuccess: true }),
    ];

    expect(
      selectAlpha2ProviderByEvals({
        capability: "engineering",
        allowedProviders: ["codex", "openai", "oss"],
        defaultProvider: "codex",
        records,
        minSamples: 5,
      }),
    ).toMatchObject({ providerId: "codex", reason: "insufficient_samples" });
  });

  it("routes empirically only after minimum samples and policy-compliant evidence", () => {
    const records = [
      ...Array.from({ length: 5 }, (_, index) =>
        evalRecord({
          evalId: `openai-${index}`,
          providerId: "openai",
          taskSuccess: true,
          reviewerDefectCount: 0,
          latencyMs: 900,
        }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        evalRecord({
          evalId: `codex-${index}`,
          providerId: "codex",
          taskSuccess: index !== 0,
          reviewerDefectCount: index === 1 ? 1 : 0,
          latencyMs: 700,
        }),
      ),
    ];

    const performance = summarizeAlpha2ProviderPerformance(records);
    expect(performance.find((entry) => entry.providerId === "openai")?.sampleSize).toBe(5);

    const selected = selectAlpha2ProviderByEvals({
      capability: "engineering",
      allowedProviders: ["codex", "openai"],
      defaultProvider: "codex",
      records,
      minSamples: 5,
    });

    expect(selected).toMatchObject({ providerId: "openai", reason: "empirical_quality" });
  });

  it("never promotes a provider with observed policy violations", () => {
    const records = Array.from({ length: 5 }, (_, index) =>
      evalRecord({
        evalId: `oss-${index}`,
        providerId: "oss",
        taskSuccess: true,
        policyCompliance: index === 0 ? 0.8 : 1,
        policyViolationCount: index === 0 ? 1 : 0,
      }),
    );

    const selected = selectAlpha2ProviderByEvals({
      capability: "engineering",
      allowedProviders: ["codex", "oss"],
      defaultProvider: "codex",
      records,
      minSamples: 5,
    });

    expect(selected.providerId).toBe("codex");
    expect(selected.reason).toBe("insufficient_samples");
  });

  it("requires independent evidence review before a lesson becomes shared memory", () => {
    const candidate = proposeAlpha2Lesson({
      lessonId: "lesson-1",
      kind: "engineering",
      title: "Exact-head evidence before merge",
      statement: "Review evidence must refer to the current exact head.",
      scopeKeys: ["github", "ci", "engineering"],
      proposedByRole: "engineering_agent",
      sourceRunIds: ["run-1"],
      evidenceRefs: ["pr:123", "ci:456"],
      confidence: 0.9,
      now: "2026-08-23T21:00:00.000Z",
    });

    expect(isAlpha2LessonOperationallyReusable(candidate)).toBe(false);
    const checking = moveAlpha2LessonToIndependentCheck(
      candidate,
      "2026-08-23T21:05:00.000Z",
    );

    expect(() =>
      decideAlpha2Lesson(checking, {
        reviewerRole: "engineering_agent",
        reviewerRunId: "review-run-self",
        decision: "accept",
        evidenceRefs: ["ci:456"],
        rationale: "self approval",
        reviewedAt: "2026-08-23T21:10:00.000Z",
      }),
    ).toThrow("alpha2_lesson_requires_independent_reviewer_role");

    const accepted = decideAlpha2Lesson(checking, {
      reviewerRole: "review_agent",
      reviewerRunId: "review-run-2",
      decision: "accept",
      evidenceRefs: ["ci:456", "review:789"],
      rationale: "Independent check confirms exact-head requirement.",
      reviewedAt: "2026-08-23T21:10:00.000Z",
    });

    expect(isAlpha2LessonOperationallyReusable(accepted)).toBe(true);
    expect(
      selectReusableAlpha2Lessons({ lessons: [candidate, accepted], scopeKeys: ["ci"] }),
    ).toEqual([accepted]);
  });
});
