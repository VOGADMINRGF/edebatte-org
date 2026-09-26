import { z } from "zod";
import {
  ALPHA2_PROVIDER_IDS,
  Alpha2RoleIdSchema,
  type Alpha2ProviderId,
  type Alpha2RoleId,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";

export const ALPHA2_EVAL_OUTCOMES = ["success", "partial", "failure", "policy_blocked"] as const;
export type Alpha2EvalOutcome = (typeof ALPHA2_EVAL_OUTCOMES)[number];
const Alpha2ProviderIdSchema = z.enum(ALPHA2_PROVIDER_IDS);
const Alpha2EvalOutcomeSchema = z.enum(ALPHA2_EVAL_OUTCOMES);

export const ALPHA2_EVAL_GUARDRAILS = Object.freeze({
  insufficientSamplesMayReroute: false,
  policyViolatingProviderMayPromote: false,
  speedOrCostAloneMayPromote: false,
  automaticPolicyRewriteAllowed: false,
  automaticPromptRewriteAllowed: false,
  automaticGovernanceRewriteAllowed: false,
  politicalProfilingAllowed: false,
  politicalPersuasionAllowed: false,
  truthStatusMayChange: false,
  evidenceWeightingMayChange: false,
});

export const Alpha2EvalRecordSchema = z.object({
  schemaVersion: z.literal("alpha2.eval.v1"),
  evalId: z.string().min(1), runId: z.string().min(1), taskId: z.string().min(1),
  capability: z.string().min(1), roleId: Alpha2RoleIdSchema, providerId: Alpha2ProviderIdSchema,
  modelId: z.string().min(1).optional(), promptVersion: z.string().min(1).optional(), toolchainVersion: z.string().min(1).optional(),
  outcome: Alpha2EvalOutcomeSchema, taskSuccess: z.boolean(),
  regressionCount: z.number().int().nonnegative(), reviewerDefectCount: z.number().int().nonnegative(),
  policyViolationCount: z.number().int().nonnegative(), evidenceFidelity: z.number().min(0).max(1),
  policyCompliance: z.number().min(0).max(1), latencyMs: z.number().int().nonnegative(),
  estimatedCostEur: z.number().nonnegative().optional(), humanInterventions: z.number().int().nonnegative(),
  evidenceRefs: z.array(z.string().min(1)).default([]), createdAt: z.string().datetime(),
}).strict().superRefine((record, ctx) => {
  if (record.outcome === "success" && !record.taskSuccess) ctx.addIssue({ code: "custom", message: "alpha2_eval_success_requires_task_success" });
  if (record.policyViolationCount > 0 && record.policyCompliance === 1) ctx.addIssue({ code: "custom", message: "alpha2_eval_policy_violation_cannot_be_full_compliance" });
  if (record.outcome === "policy_blocked" && record.policyViolationCount > 0) ctx.addIssue({ code: "custom", message: "alpha2_eval_policy_block_is_not_a_policy_violation" });
});

export type Alpha2EvalRecord = z.infer<typeof Alpha2EvalRecordSchema>;
export type Alpha2ProviderPerformance = { capability:string; providerId:Alpha2ProviderId; sampleSize:number; successRate:number; partialRate:number; policyViolationRate:number; averageEvidenceFidelity:number; averagePolicyCompliance:number; averageReviewerDefects:number; averageRegressions:number; averageLatencyMs:number; averageEstimatedCostEur:number|null; averageHumanInterventions:number; qualityScore:number };
const mean=(v:readonly number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));

export function summarizeAlpha2ProviderPerformance(records: readonly Alpha2EvalRecord[]): Alpha2ProviderPerformance[] {
  const groups=new Map<string,Alpha2EvalRecord[]>();
  for(const raw of records){ const r=Alpha2EvalRecordSchema.parse(raw); const key=`${r.capability}\u0000${r.providerId}`; const g=groups.get(key)??[]; g.push(r); groups.set(key,g); }
  return [...groups.values()].map(group=>{ const first=group[0]!; const sampleSize=group.length; const successRate=group.filter(e=>e.taskSuccess).length/sampleSize; const partialRate=group.filter(e=>e.outcome==="partial").length/sampleSize; const policyViolationRate=group.filter(e=>e.policyViolationCount>0).length/sampleSize; const averageEvidenceFidelity=mean(group.map(e=>e.evidenceFidelity)); const averagePolicyCompliance=mean(group.map(e=>e.policyCompliance)); const averageReviewerDefects=mean(group.map(e=>e.reviewerDefectCount)); const averageRegressions=mean(group.map(e=>e.regressionCount)); const averageLatencyMs=mean(group.map(e=>e.latencyMs)); const costs=group.map(e=>e.estimatedCostEur).filter((v):v is number=>typeof v==="number"); const averageEstimatedCostEur=costs.length?mean(costs):null; const averageHumanInterventions=mean(group.map(e=>e.humanInterventions)); const defectPenalty=clamp01((averageReviewerDefects+averageRegressions)/4); const humanPenalty=clamp01(averageHumanInterventions/3); const qualityScore=successRate*.35+averageEvidenceFidelity*.2+averagePolicyCompliance*.25+(1-defectPenalty)*.15+(1-humanPenalty)*.05; return {capability:first.capability,providerId:first.providerId,sampleSize,successRate,partialRate,policyViolationRate,averageEvidenceFidelity,averagePolicyCompliance,averageReviewerDefects,averageRegressions,averageLatencyMs,averageEstimatedCostEur,averageHumanInterventions,qualityScore}; });
}

export type Alpha2EmpiricalRouteDecision={providerId:Alpha2ProviderId;reason:"empirical_quality"|"insufficient_samples";performance:Alpha2ProviderPerformance|null};
export function selectAlpha2ProviderByEvals(input:{capability:string;allowedProviders:readonly Alpha2ProviderId[];defaultProvider:Alpha2ProviderId;records:readonly Alpha2EvalRecord[];minSamples?:number}):Alpha2EmpiricalRouteDecision{
  const minSamples=Math.max(1,input.minSamples??5); if(!input.allowedProviders.includes(input.defaultProvider)) throw new Error("alpha2_eval_default_provider_not_allowed");
  const perf=summarizeAlpha2ProviderPerformance(input.records).filter(e=>e.capability===input.capability&&input.allowedProviders.includes(e.providerId));
  const qualified=perf.filter(e=>e.sampleSize>=minSamples).filter(e=>e.policyViolationRate===0).filter(e=>e.averagePolicyCompliance>=.95).sort((a,b)=>b.qualityScore-a.qualityScore||b.successRate-a.successRate||a.averageReviewerDefects-b.averageReviewerDefects||a.averageLatencyMs-b.averageLatencyMs);
  if(!qualified.length) return {providerId:input.defaultProvider,reason:"insufficient_samples",performance:perf.find(e=>e.providerId===input.defaultProvider)??null};
  return {providerId:qualified[0]!.providerId,reason:"empirical_quality",performance:qualified[0]!};
}

export function buildAlpha2EvalRecord(input:{evalId:string;runId:string;taskId:string;capability:string;roleId:Alpha2RoleId;providerId:Alpha2ProviderId;modelId?:string;promptVersion?:string;toolchainVersion?:string;outcome:Alpha2EvalOutcome;taskSuccess:boolean;regressionCount?:number;reviewerDefectCount?:number;policyViolationCount?:number;evidenceFidelity:number;policyCompliance:number;latencyMs:number;estimatedCostEur?:number;humanInterventions?:number;evidenceRefs?:string[];createdAt?:string}):Alpha2EvalRecord{
  return Alpha2EvalRecordSchema.parse({schemaVersion:"alpha2.eval.v1",...input,regressionCount:input.regressionCount??0,reviewerDefectCount:input.reviewerDefectCount??0,policyViolationCount:input.policyViolationCount??0,humanInterventions:input.humanInterventions??0,evidenceRefs:input.evidenceRefs??[],createdAt:input.createdAt??new Date().toISOString()});
}
