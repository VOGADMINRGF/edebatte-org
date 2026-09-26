import { z } from "zod";
import {
  ALPHA2_PROVIDER_IDS,
  Alpha2RoleIdSchema,
  type Alpha2ProviderId,
  type Alpha2RoleId,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";

export const ALPHA2_EVAL_OUTCOMES = [
  "success",
  "partial",
  "failure",
  "policy_blocked",
] as const;

export type Alpha2EvalOutcome = (typeof ALPHA2_EVAL_OUTCOMES)[number];

const Alpha2ProviderIdSchema = z.enum(ALPHA2_PROVIDER_IDS);
const Alpha2EvalOutcomeSchema = z.enum(ALPHA2_EVAL_OUTCOMES);

export const Alpha2EvalRecordSchema = z
  .object({
    schemaVersion: z.literal("alpha2.eval.v1"),
    evalId: z.string().min(1),
    runId: z.string().min(1),
    taskId: z.string().min(1),
    capability: z.string().min(1),
    roleId: Alpha2RoleIdSchema,
    providerId: Alpha2ProviderIdSchema,
    modelId: z.string().min(1).optional(),
    promptVersion: z.string().min(1).optional(),
    toolchainVersion: z.string().min(1).optional(),
    outcome: Alpha2EvalOutcomeSchema,
    taskSuccess: z.boolean(),
    regressionCount: z.number().int().nonnegative(),
    reviewerDefectCount: z.number().int().nonnegative(),
    policyViolationCount: z.number().int().nonnegative(),
    evidenceFidelity: z.number().min(0).max(1),
    policyCompliance: z.number().min(0).max(1),
    latencyMs: z.number().int().nonnegative(),
    estimatedCostEur: z.number().nonnegative().optional(),
    humanInterventions: z.number().int().nonnegative(),
    evidenceRefs: z.array(z.string().min(1)).default([]),
    createdAt: z.string().datetime(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (record.outcome === "success" && !record.taskSuccess) {
      ctx.addIssue({ code: "custom", message: "alpha2_eval_success_requires_task_success" });
    }
    if (record.policyViolationCount > 0 && record.policyCompliance === 1) {
      ctx.addIssue({ code: "custom", message: "alpha2_eval_policy_violation_cannot_be_full_compliance" });
    }
    if (record.outcome === "policy_blocked" && record.policyViolationCount > 0) {
      ctx.addIssue({
        code: "custom",
        message: "alpha2_eval_policy_block_is_not_a_policy_violation",
      });
    }
  });

export type Alpha2EvalRecord = z.infer<typeof Alpha2EvalRecordSchema>;

export type Alpha2ProviderPerformance = {
  capability: string;
  providerId: Alpha2ProviderId;
  sampleSize: number;
  successRate: number;
  partialRate: number;
  policyViolationRate: number;
  averageEvidenceFidelity: number;
  averagePolicyCompliance: number;
  averageReviewerDefects: number;
  averageRegressions: number;
  averageLatencyMs: number;
  averageEstimatedCostEur: number | null;
  averageHumanInterventions: number;
  qualityScore: number;
};

function mean(values: readonly number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function summarizeAlpha2ProviderPerformance(
  records: readonly Alpha2EvalRecord[],
): Alpha2ProviderPerformance[] {
  const groups = new Map<string, Alpha2EvalRecord[]>();
  for (const raw of records) {
    const record = Alpha2EvalRecordSchema.parse(raw);
    const key = `${record.capability}\u0000${record.providerId}`;
    const group = groups.get(key) ?? [];
    group.push(record);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    const first = group[0]!;
    const sampleSize = group.length;
    const successRate = group.filter((entry) => entry.taskSuccess).length / sampleSize;
    const partialRate = group.filter((entry) => entry.outcome === "partial").length / sampleSize;
    const policyViolationRate =
      group.filter((entry) => entry.policyViolationCount > 0).length / sampleSize;
    const averageEvidenceFidelity = mean(group.map((entry) => entry.evidenceFidelity));
    const averagePolicyCompliance = mean(group.map((entry) => entry.policyCompliance));
    const averageReviewerDefects = mean(group.map((entry) => entry.reviewerDefectCount));
    const averageRegressions = mean(group.map((entry) => entry.regressionCount));
    const averageLatencyMs = mean(group.map((entry) => entry.latencyMs));
    const withCost = group
      .map((entry) => entry.estimatedCostEur)
      .filter((value): value is number => typeof value === "number");
    const averageEstimatedCostEur = withCost.length > 0 ? mean(withCost) : null;
    const averageHumanInterventions = mean(group.map((entry) => entry.humanInterventions));

    const defectPenalty = clamp01((averageReviewerDefects + averageRegressions) / 4);
    const humanPenalty = clamp01(averageHumanInterventions / 3);
    const qualityScore =
      successRate * 0.35 +
      averageEvidenceFidelity * 0.2 +
      averagePolicyCompliance * 0.25 +
      (1 - defectPenalty) * 0.15 +
      (1 - humanPenalty) * 0.05;

    return {
      capability: first.capability,
      providerId: first.providerId,
      sampleSize,
      successRate,
      partialRate,
      policyViolationRate,
      averageEvidenceFidelity,
      averagePolicyCompliance,
      averageReviewerDefects,
      averageRegressions,
      averageLatencyMs,
      averageEstimatedCostEur,
      averageHumanInterventions,
      qualityScore,
    };
  });
}

export type Alpha2EmpiricalRouteDecision = {
  providerId: Alpha2ProviderId;
  reason: "empirical_quality" | "insufficient_samples";
  performance: Alpha2ProviderPerformance | null;
};

export function selectAlpha2ProviderByEvals(input: {
  capability: string;
  allowedProviders: readonly Alpha2ProviderId[];
  defaultProvider: Alpha2ProviderId;
  records: readonly Alpha2EvalRecord[];
  minSamples?: number;
}): Alpha2EmpiricalRouteDecision {
  const minSamples = Math.max(1, input.minSamples ?? 5);
  if (!input.allowedProviders.includes(input.defaultProvider)) {
    throw new Error("alpha2_eval_default_provider_not_allowed");
  }

  const performance = summarizeAlpha2ProviderPerformance(input.records).filter(
    (entry) =>
      entry.capability === input.capability && input.allowedProviders.includes(entry.providerId),
  );

  const qualified = performance
    .filter((entry) => entry.sampleSize >= minSamples)
    .filter((entry) => entry.policyViolationRate === 0)
    .filter((entry) => entry.averagePolicyCompliance >= 0.95)
    .sort((a, b) => {
      if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      if (a.averageReviewerDefects !== b.averageReviewerDefects) {
        return a.averageReviewerDefects - b.averageReviewerDefects;
      }
      return a.averageLatencyMs - b.averageLatencyMs;
    });

  if (qualified.length === 0) {
    return {
      providerId: input.defaultProvider,
      reason: "insufficient_samples",
      performance:
        performance.find((entry) => entry.providerId === input.defaultProvider) ?? null,
    };
  }

  return {
    providerId: qualified[0]!.providerId,
    reason: "empirical_quality",
    performance: qualified[0]!,
  };
}

export function buildAlpha2EvalRecord(input: {
  evalId: string;
  runId: string;
  taskId: string;
  capability: string;
  roleId: Alpha2RoleId;
  providerId: Alpha2ProviderId;
  modelId?: string;
  promptVersion?: string;
  toolchainVersion?: string;
  outcome: Alpha2EvalOutcome;
  taskSuccess: boolean;
  regressionCount?: number;
  reviewerDefectCount?: number;
  policyViolationCount?: number;
  evidenceFidelity: number;
  policyCompliance: number;
  latencyMs: number;
  estimatedCostEur?: number;
  humanInterventions?: number;
  evidenceRefs?: string[];
  createdAt?: string;
}): Alpha2EvalRecord {
  return Alpha2EvalRecordSchema.parse({
    schemaVersion: "alpha2.eval.v1",
    ...input,
    regressionCount: input.regressionCount ?? 0,
    reviewerDefectCount: input.reviewerDefectCount ?? 0,
    policyViolationCount: input.policyViolationCount ?? 0,
    humanInterventions: input.humanInterventions ?? 0,
    evidenceRefs: input.evidenceRefs ?? [],
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
