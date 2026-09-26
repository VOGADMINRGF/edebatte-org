import {
  getAlpha2ControlPlaneLimits,
  loadAlpha2AgentFleetRegistry,
} from "@/features/agenticRuntime/alpha2AgentFleetContract";
import {
  summarizeAlpha2ProviderPerformance,
  type Alpha2ProviderPerformance,
} from "@/features/agenticRuntime/alpha2EvalContract";
import {
  ALPHA2_RUN_STATUSES,
  Alpha2RunRecordSchema,
  type Alpha2RunRecord,
  type Alpha2RunStatus,
} from "@/features/agenticRuntime/alpha2RunLifecycleContract";

export const ALPHA2_MISSION_CONTROL_GUARDRAILS = Object.freeze({
  readOnly: true,
  directRunMutationAllowed: false,
  directQueueMutationAllowed: false,
  directProviderMutationAllowed: false,
  credentialExposureAllowed: false,
  promptExposureAllowed: false,
  chainOfThoughtExposureAllowed: false,
  humanGateDowngradeAllowed: false,
  autoMergeAllowed: false,
  autoDeployAllowed: false,
  autoPublishAllowed: false,
});

export type Alpha2MissionControlRecentRun = Pick<
  Alpha2RunRecord,
  | "runId" | "taskId" | "kind" | "status" | "primaryRole" | "riskClass"
  | "updatedAt" | "resumeAt" | "attempt" | "lastErrorCode"
> & { version: number; leaseOwner: string | null; leaseExpiresAt: string | null };

export type Alpha2MissionControlSnapshot = {
  generatedAt: string;
  runtime: {
    available: boolean;
    state: "connected" | "unavailable";
    errorCode: string | null;
    totalRuns: number;
    statusCounts: Record<Alpha2RunStatus, number>;
    activeRuns: number;
    humanInbox: number;
    failedRuns: number;
    scheduledRuns: number;
    leasedRuns: number;
    recentRuns: Alpha2MissionControlRecentRun[];
  };
  fleet: {
    organizationRoleCount: number;
    providerCount: number;
    enabledProviderIds: string[];
    maxParallelWorkers: number;
    workerSliceMaxTasks: number;
  };
  learning: {
    acceptedLessonCount: number;
    evalSampleCount: number;
    providerPerformance: Alpha2ProviderPerformance[];
  };
  guardrails: typeof ALPHA2_MISSION_CONTROL_GUARDRAILS;
};

function emptyStatusCounts(): Record<Alpha2RunStatus, number> {
  return Object.fromEntries(ALPHA2_RUN_STATUSES.map((status) => [status, 0])) as Record<Alpha2RunStatus, number>;
}
function safeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) return String((error as { code?: unknown }).code ?? "alpha2_mission_control_unavailable");
  return "alpha2_mission_control_unavailable";
}
function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function summarizeAlpha2MissionRuns(input: { totalRuns:number; statusRows:Array<{_id:Alpha2RunStatus;count:number}>; recentRows:any[]; now:string }) {
  const statusCounts = emptyStatusCounts();
  for (const row of input.statusRows) if (row._id in statusCounts) statusCounts[row._id] = Number(row.count ?? 0);
  const recentRuns: Alpha2MissionControlRecentRun[] = input.recentRows.flatMap((row) => {
    const parsed = Alpha2RunRecordSchema.safeParse(row.payload);
    if (!parsed.success) return [];
    const run = parsed.data;
    return [{ runId:run.runId, taskId:run.taskId, kind:run.kind, status:run.status, primaryRole:run.primaryRole, riskClass:run.riskClass, updatedAt:run.updatedAt, resumeAt:run.resumeAt, attempt:run.attempt, lastErrorCode:run.lastErrorCode, version:Number(row.version ?? 0), leaseOwner:row.leaseOwner ? String(row.leaseOwner) : null, leaseExpiresAt:toIso(row.leaseExpiresAt) }];
  });
  const activeRuns = statusCounts.queued + statusCounts.running + statusCounts.waiting;
  const humanInbox = statusCounts.review + statusCounts.human_gate;
  const scheduledRuns = recentRuns.filter((run) => run.resumeAt && Date.parse(run.resumeAt) > Date.parse(input.now)).length;
  const leasedRuns = recentRuns.filter((run) => run.leaseExpiresAt && Date.parse(run.leaseExpiresAt) > Date.parse(input.now)).length;
  return { totalRuns:input.totalRuns, statusCounts, activeRuns, humanInbox, failedRuns:statusCounts.failed, scheduledRuns, leasedRuns, recentRuns };
}

export async function buildAlpha2MissionControlSnapshot(input:{recentLimit?:number;evalLimit?:number;lessonLimit?:number;now?:string}={}):Promise<Alpha2MissionControlSnapshot>{
  const now=input.now??new Date().toISOString();
  const fleet=loadAlpha2AgentFleetRegistry();
  const limits=getAlpha2ControlPlaneLimits();
  const enabledProviderIds=fleet.providers.filter((provider)=>provider.enabledByDefault).map((provider)=>provider.id);
  const base:Alpha2MissionControlSnapshot={generatedAt:now,runtime:{available:false,state:"unavailable",errorCode:null,totalRuns:0,statusCounts:emptyStatusCounts(),activeRuns:0,humanInbox:0,failedRuns:0,scheduledRuns:0,leasedRuns:0,recentRuns:[]},fleet:{organizationRoleCount:fleet.organizationRoles.length,providerCount:fleet.providers.length,enabledProviderIds,maxParallelWorkers:limits.maxParallelWorkers,workerSliceMaxTasks:limits.workerSliceMaxTasks},learning:{acceptedLessonCount:0,evalSampleCount:0,providerPerformance:[]},guardrails:ALPHA2_MISSION_CONTROL_GUARDRAILS};
  try {
    const [{mongo,mongoose},{getAlpha2MongoLearningStore}]=await Promise.all([import("@core/db/mongoose"),import("@/features/agenticRuntime/alpha2MongoLearningStore")]);
    await mongo();
    const collection=mongoose.connection.collection("alpha2_runs");
    const [totalRuns,statusRows,recentRows]=await Promise.all([
      collection.countDocuments({}),
      collection.aggregate<{_id:Alpha2RunStatus;count:number}>([{$group:{_id:"$status",count:{$sum:1}}}]).toArray(),
      collection.find({},{projection:{payload:1,version:1,leaseOwner:1,leaseExpiresAt:1}}).sort({updatedAt:-1}).limit(Math.max(1,Math.min(input.recentLimit??30,100))).toArray(),
    ]);
    const runtimeSummary=summarizeAlpha2MissionRuns({totalRuns,statusRows,recentRows,now});
    const learningStore=getAlpha2MongoLearningStore();
    const [evals,lessons]=await Promise.all([learningStore.listEvals({limit:input.evalLimit??500}),learningStore.listAcceptedLessons({limit:input.lessonLimit??100})]);
    return {...base,runtime:{available:true,state:"connected",errorCode:null,...runtimeSummary},learning:{acceptedLessonCount:lessons.length,evalSampleCount:evals.length,providerPerformance:summarizeAlpha2ProviderPerformance(evals)}};
  } catch(error) {
    return {...base,runtime:{...base.runtime,errorCode:safeErrorCode(error)}};
  }
}
