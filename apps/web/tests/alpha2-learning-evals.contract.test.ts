import { describe, expect, it } from "vitest";
import {
  ALPHA2_EVAL_GUARDRAILS,
  buildAlpha2EvalRecord,
  selectAlpha2ProviderByEvals,
  summarizeAlpha2ProviderPerformance,
} from "@/features/agenticRuntime/alpha2EvalContract";
import {
  ALPHA2_LEARNING_GUARDRAILS,
  decideAlpha2Lesson,
  isAlpha2LessonOperationallyReusable,
  moveAlpha2LessonToIndependentCheck,
  proposeAlpha2Lesson,
  selectReusableAlpha2Lessons,
} from "@/features/agenticRuntime/alpha2LearningContract";

function evalRecord(input:{evalId:string;providerId:"openai"|"codex"|"oss"|"anthropic";taskSuccess:boolean;evidenceFidelity?:number;policyCompliance?:number;reviewerDefectCount?:number;regressionCount?:number;latencyMs?:number;policyViolationCount?:number}){
  return buildAlpha2EvalRecord({evalId:input.evalId,runId:`run-${input.evalId}`,taskId:`task-${input.evalId}`,capability:"engineering",roleId:"engineering_agent",providerId:input.providerId,outcome:input.taskSuccess?"success":"failure",taskSuccess:input.taskSuccess,evidenceFidelity:input.evidenceFidelity??1,policyCompliance:input.policyCompliance??1,reviewerDefectCount:input.reviewerDefectCount??0,regressionCount:input.regressionCount??0,policyViolationCount:input.policyViolationCount??0,latencyMs:input.latencyMs??1000,humanInterventions:0,createdAt:"2026-09-26T17:30:00.000Z"});
}

describe("Alpha2 validated learning and empirical evals",()=>{
  it("keeps default routing until enough reviewed evidence exists",()=>{
    const records=[evalRecord({evalId:"o1",providerId:"openai",taskSuccess:true}),evalRecord({evalId:"c1",providerId:"codex",taskSuccess:true})];
    expect(selectAlpha2ProviderByEvals({capability:"engineering",allowedProviders:["codex","openai","oss"],defaultProvider:"codex",records,minSamples:5})).toMatchObject({providerId:"codex",reason:"insufficient_samples"});
  });

  it("routes empirically only after minimum policy-compliant samples",()=>{
    const records=[...Array.from({length:5},(_,i)=>evalRecord({evalId:`openai-${i}`,providerId:"openai",taskSuccess:true,latencyMs:900})),...Array.from({length:5},(_,i)=>evalRecord({evalId:`codex-${i}`,providerId:"codex",taskSuccess:i!==0,reviewerDefectCount:i===1?1:0,latencyMs:700}))];
    expect(summarizeAlpha2ProviderPerformance(records).find(e=>e.providerId==="openai")?.sampleSize).toBe(5);
    expect(selectAlpha2ProviderByEvals({capability:"engineering",allowedProviders:["codex","openai"],defaultProvider:"codex",records,minSamples:5})).toMatchObject({providerId:"openai",reason:"empirical_quality"});
  });

  it("never promotes a provider with observed policy violations",()=>{
    const records=Array.from({length:5},(_,i)=>evalRecord({evalId:`oss-${i}`,providerId:"oss",taskSuccess:true,policyCompliance:i===0?.8:1,policyViolationCount:i===0?1:0}));
    expect(selectAlpha2ProviderByEvals({capability:"engineering",allowedProviders:["codex","oss"],defaultProvider:"codex",records,minSamples:5})).toMatchObject({providerId:"codex",reason:"insufficient_samples"});
  });

  it("requires independent evidence review before a lesson becomes reusable",()=>{
    const candidate=proposeAlpha2Lesson({lessonId:"lesson-1",kind:"engineering",title:"Exact-head evidence",statement:"Review evidence must refer to the current exact head.",scopeKeys:["github","ci"],proposedByRole:"engineering_agent",sourceRunIds:["run-1"],evidenceRefs:["pr:123","ci:456"],confidence:.9,now:"2026-09-26T17:30:00.000Z"});
    expect(isAlpha2LessonOperationallyReusable(candidate)).toBe(false);
    const checking=moveAlpha2LessonToIndependentCheck(candidate,"2026-09-26T17:31:00.000Z");
    expect(()=>decideAlpha2Lesson(checking,{reviewerRole:"engineering_agent",reviewerRunId:"self",decision:"accept",evidenceRefs:["ci:456"],rationale:"self",reviewedAt:"2026-09-26T17:32:00.000Z"})).toThrow("alpha2_lesson_requires_independent_reviewer_role");
    const accepted=decideAlpha2Lesson(checking,{reviewerRole:"review_agent",reviewerRunId:"review-2",decision:"accept",evidenceRefs:["ci:456","review:789"],rationale:"independent evidence confirms lesson",reviewedAt:"2026-09-26T17:32:00.000Z"});
    expect(selectReusableAlpha2Lessons({lessons:[candidate,accepted],scopeKeys:["ci"]})).toEqual([accepted]);
  });

  it("keeps learning/evals outside political profiling, truth mutation and autonomous governance",()=>{
    expect(ALPHA2_LEARNING_GUARDRAILS).toMatchObject({rawChatMayBecomeSharedMemory:false,selfApprovalAllowed:false,automaticPolicyRewriteAllowed:false,automaticPromptRewriteAllowed:false,automaticGovernanceRewriteAllowed:false,politicalProfilingAllowed:false,politicalPersuasionAllowed:false,truthStatusMayChange:false,evidenceWeightingMayChange:false,autoPublishAllowed:false,autoMergeAllowed:false,autoDeployAllowed:false});
    expect(ALPHA2_EVAL_GUARDRAILS).toMatchObject({insufficientSamplesMayReroute:false,policyViolatingProviderMayPromote:false,speedOrCostAloneMayPromote:false,automaticPolicyRewriteAllowed:false,politicalProfilingAllowed:false,politicalPersuasionAllowed:false,truthStatusMayChange:false,evidenceWeightingMayChange:false});
  });
});
