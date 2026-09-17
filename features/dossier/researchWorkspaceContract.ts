/**
 * T2 Dossier Research Workspace contract.
 *
 * Owns the research plan/checkpoint semantics only. Dossier, SourceArtifact,
 * AtomicClaim and EvidenceAssessment remain owned by their canonical domains.
 */

export const RESEARCH_WORK_ITEM_STATUSES = [
  "planned",
  "running",
  "blocked",
  "complete",
  "failed",
] as const;
export type ResearchWorkItemStatus = (typeof RESEARCH_WORK_ITEM_STATUSES)[number];

export type ResearchWorkItem = Readonly<{
  id: string;
  question: string;
  material: boolean;
  status: ResearchWorkItemStatus;
  attempt: number;
  maxAttempts: number;
  artifactRefs: readonly string[];
  checkpointRef: string | null;
  failureCode: string | null;
}>;

export type ResearchSourceProjection = Readonly<{
  sourceArtifactId: string;
  canonicalAssessmentRef: string;
  assessmentRevision: string;
  researchRole: "primary" | "secondary";
  independence: "verified_independent" | "known_derived" | "unknown";
  freshness: "current" | "stale" | "unknown";
  contradiction: "none" | "reviewed" | "open";
  inclusion: "included" | "excluded";
  inclusionRationale: string;
}>;

export type ResearchBudget = Readonly<{
  maxWorkItems: number;
  maxAttemptsTotal: number;
  maxCostUnits: number;
  usedCostUnits: number;
}>;

export type ResearchHumanGate = Readonly<{
  status: "reviewed" | "pending" | "rejected";
  reviewerRef: string | null;
  revision: string | null;
  reviewedAt: string | null;
}>;

export type DossierResearchPlan = Readonly<{
  dossierId: string;
  qualificationRevision: string;
  planRevision: string;
  questions: readonly string[];
  inclusionCriteria: readonly string[];
  exclusionCriteria: readonly string[];
  workItems: readonly ResearchWorkItem[];
  sources: readonly ResearchSourceProjection[];
  sourceGapRefs: readonly string[];
  budget: ResearchBudget;
  humanGate: ResearchHumanGate;
}>;

export type ResearchWorkspaceEvaluation = Readonly<{
  complete: boolean;
  reasons: readonly string[];
  completedMaterialWorkItems: number;
  materialWorkItems: number;
  includedSources: number;
  verifiedIndependentSources: number;
  hasPrimary: boolean;
  hasSecondary: boolean;
}>;

const present = (value: string | null | undefined): value is string => Boolean(value?.trim());
const stringsValid = (values: readonly string[], requireOne = false) =>
  (!requireOne || values.length > 0) && values.every((value) => present(value));

const reviewed = (gate: ResearchHumanGate) =>
  gate.status === "reviewed" &&
  present(gate.reviewerRef) &&
  present(gate.revision) &&
  present(gate.reviewedAt);

export function evaluateResearchWorkspace(plan: DossierResearchPlan): ResearchWorkspaceEvaluation {
  const reasons: string[] = [];

  if (!present(plan.dossierId)) reasons.push("dossier_reference_missing");
  if (!present(plan.qualificationRevision)) reasons.push("qualification_revision_missing");
  if (!present(plan.planRevision)) reasons.push("plan_revision_missing");
  if (!stringsValid(plan.questions, true)) reasons.push("research_questions_missing_or_invalid");
  if (!stringsValid(plan.inclusionCriteria, true)) reasons.push("inclusion_criteria_missing_or_invalid");
  if (!stringsValid(plan.exclusionCriteria)) reasons.push("exclusion_criteria_invalid");
  if (!stringsValid(plan.sourceGapRefs)) reasons.push("source_gap_reference_invalid");

  const workIds = new Set<string>();
  let attemptsTotal = 0;
  for (const item of plan.workItems) {
    if (!present(item.id) || workIds.has(item.id)) reasons.push("work_item_identity_invalid");
    workIds.add(item.id);
    if (!present(item.question)) reasons.push("work_item_question_missing");
    if (item.attempt < 0 || item.maxAttempts < 1 || item.attempt > item.maxAttempts) {
      reasons.push("work_item_retry_contract_invalid");
    }
    if (!stringsValid(item.artifactRefs)) reasons.push("work_item_artifact_reference_invalid");
    attemptsTotal += item.attempt;
    if (item.material && item.status !== "complete") reasons.push("material_work_item_incomplete");
    if (item.status === "complete" && item.artifactRefs.length === 0) {
      reasons.push("completed_work_item_without_artifact");
    }
    if ((item.status === "running" || item.status === "blocked") && !present(item.checkpointRef)) {
      reasons.push("recoverable_work_item_without_checkpoint");
    }
    if (item.status === "failed" && !present(item.failureCode)) reasons.push("failed_work_item_without_code");
  }

  if (plan.workItems.length === 0) reasons.push("work_items_missing");
  if (plan.workItems.length > plan.budget.maxWorkItems) reasons.push("work_item_budget_exceeded");
  if (attemptsTotal > plan.budget.maxAttemptsTotal) reasons.push("attempt_budget_exceeded");
  if (plan.budget.maxCostUnits < 0 || plan.budget.usedCostUnits < 0 || plan.budget.usedCostUnits > plan.budget.maxCostUnits) {
    reasons.push("cost_budget_exceeded_or_invalid");
  }

  const included = plan.sources.filter((source) => source.inclusion === "included");
  const sourceIds = new Set<string>();
  for (const source of plan.sources) {
    if (!present(source.sourceArtifactId) || sourceIds.has(source.sourceArtifactId)) reasons.push("source_projection_identity_invalid");
    sourceIds.add(source.sourceArtifactId);
    if (!present(source.canonicalAssessmentRef) || !present(source.assessmentRevision)) reasons.push("canonical_source_assessment_missing");
    if (!present(source.inclusionRationale)) reasons.push("source_inclusion_rationale_missing");
    if (source.inclusion === "included" && source.freshness !== "current") reasons.push("included_source_not_current");
    if (source.inclusion === "included" && source.contradiction === "open") reasons.push("included_source_open_contradiction");
  }

  const hasPrimary = included.some((source) => source.researchRole === "primary");
  const hasSecondary = included.some((source) => source.researchRole === "secondary");
  const verifiedIndependentSources = included.filter(
    (source) => source.independence === "verified_independent",
  ).length;

  if (!hasPrimary) reasons.push("primary_source_missing");
  if (!hasSecondary) reasons.push("secondary_source_missing");
  if (verifiedIndependentSources < 1) reasons.push("verified_independent_source_missing");
  if (plan.sourceGapRefs.length > 0) reasons.push("material_source_gaps_open");
  if (!reviewed(plan.humanGate)) reasons.push(plan.humanGate.status === "rejected" ? "human_gate_rejected" : "human_gate_incomplete");

  const materialWorkItems = plan.workItems.filter((item) => item.material);
  const completedMaterialWorkItems = materialWorkItems.filter((item) => item.status === "complete");

  return {
    complete: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
    completedMaterialWorkItems: completedMaterialWorkItems.length,
    materialWorkItems: materialWorkItems.length,
    includedSources: included.length,
    verifiedIndependentSources,
    hasPrimary,
    hasSecondary,
  };
}

export function canRetryResearchWorkItem(item: ResearchWorkItem): boolean {
  return item.status === "failed" && item.attempt < item.maxAttempts;
}

export function t2CanCreateSecondDossier(): false {
  return false;
}

export function t2CanPublishOrActivate(): false {
  return false;
}
