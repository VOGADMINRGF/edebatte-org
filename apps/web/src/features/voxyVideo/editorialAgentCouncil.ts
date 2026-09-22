import { stableHash } from "@core/utils/hash";
import type { Alpha2RoleId } from "@/features/agenticRuntime/alpha2AgentFleetContract";

export const VOXY_EDITORIAL_COUNCIL_VERSION = "voxy-editorial-council-v1" as const;
export const VOXY_EDITORIAL_AUTONOMY_MODES = ["human", "shadow", "hybrid", "autonomous"] as const;
export type VoxyEditorialAutonomyMode = (typeof VOXY_EDITORIAL_AUTONOMY_MODES)[number];

export const VOXY_EDITORIAL_QUALITY_LEVELS = ["standard", "high", "maximum"] as const;
export type VoxyEditorialQualityLevel = (typeof VOXY_EDITORIAL_QUALITY_LEVELS)[number];

export const VOXY_EDITORIAL_COUNCIL_STAGES = [
  "dossier",
  "editorial",
  "translation",
  "voiceAv",
  "distributionQa",
] as const;
export type VoxyEditorialCouncilStage = (typeof VOXY_EDITORIAL_COUNCIL_STAGES)[number];

export const VOXY_EDITORIAL_COUNCIL_ROLE_IDS = [
  "evidence_prosecutor",
  "claim_auditor",
  "counter_evidence_researcher",
  "dossier_critic",
  "editorial_critic",
  "neutrality_red_team",
  "marketing_critic",
  "social_critic",
  "language_critic",
  "voice_av_critic",
  "brand_trust_critic",
  "risk_governor",
  "defense_advocate",
  "chief_judge",
  "knowledge_curator",
] as const;
export type VoxyEditorialCouncilRoleId = (typeof VOXY_EDITORIAL_COUNCIL_ROLE_IDS)[number];

export const VOXY_EDITORIAL_OBJECTION_SEVERITIES = ["info", "warning", "blocker", "critical"] as const;
export type VoxyEditorialObjectionSeverity = (typeof VOXY_EDITORIAL_OBJECTION_SEVERITIES)[number];

export const VOXY_EDITORIAL_OBJECTION_STATES = [
  "open",
  "defended",
  "resolved",
  "disputed",
  "escalated",
] as const;
export type VoxyEditorialObjectionState = (typeof VOXY_EDITORIAL_OBJECTION_STATES)[number];

export const VOXY_EDITORIAL_CRITICAL_RISK_FLAGS = [
  "election_or_voting_procedure",
  "credible_imminent_harm",
  "sensitive_personal_data",
  "legal_or_regulatory_high_stakes",
  "unresolved_core_source_conflict",
  "credible_defamation_or_identity_harm",
  "child_safety",
] as const;
export type VoxyEditorialCriticalRiskFlag = (typeof VOXY_EDITORIAL_CRITICAL_RISK_FLAGS)[number];

export type VoxyEditorialCouncilRoleDefinition = {
  id: VoxyEditorialCouncilRoleId;
  alpha2RoleId: Alpha2RoleId;
  mission: string;
  adversarialQuestion: string;
  mayApprove: boolean;
  requiredAtQuality: VoxyEditorialQualityLevel[];
  stages: VoxyEditorialCouncilStage[];
};

const ALL_REVIEW_STAGES: VoxyEditorialCouncilStage[] = [
  "dossier",
  "editorial",
  "translation",
  "voiceAv",
  "distributionQa",
];

export const VOXY_EDITORIAL_COUNCIL_ROLES: readonly VoxyEditorialCouncilRoleDefinition[] = [
  {
    id: "evidence_prosecutor",
    alpha2RoleId: "evidence_agent",
    mission: "Attack the evidentiary basis of every material claim before release.",
    adversarialQuestion: "What evidence-based reasons make this claim unsafe or misleading to publish?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["dossier", "editorial"],
  },
  {
    id: "claim_auditor",
    alpha2RoleId: "claims_factcheck",
    mission: "Verify claim/source/finding alignment, numbers, dates, quotes and certainty.",
    adversarialQuestion: "Which exact claim exceeds, distorts or loses the support of its cited evidence?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["dossier", "editorial", "translation"],
  },
  {
    id: "counter_evidence_researcher",
    alpha2RoleId: "research_agent",
    mission: "Actively seek credible contradicting, qualifying or newer evidence.",
    adversarialQuestion: "What credible evidence would materially weaken or qualify this account?",
    mayApprove: false,
    requiredAtQuality: ["high", "maximum"],
    stages: ["dossier", "editorial"],
  },
  {
    id: "dossier_critic",
    alpha2RoleId: "dossier_agent",
    mission: "Find missing context, missing perspectives, unresolved questions and causal overreach.",
    adversarialQuestion: "What is missing from the dossier that could cause a reasonable reader to form a false overall picture?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["dossier", "editorial"],
  },
  {
    id: "editorial_critic",
    alpha2RoleId: "editorial_agent",
    mission: "Challenge headline, structure, framing, omissions, certainty and consequence language.",
    adversarialQuestion: "Why should an editor stop this story in its current form?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["editorial", "voiceAv", "distributionQa"],
  },
  {
    id: "neutrality_red_team",
    alpha2RoleId: "neutrality_red_team",
    mission: "Challenge asymmetry, selective skepticism, loaded framing and omitted relevant positions.",
    adversarialQuestion: "Where are comparable positions being treated by different evidentiary or editorial standards?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["dossier", "editorial", "translation", "distributionQa"],
  },
  {
    id: "marketing_critic",
    alpha2RoleId: "growth_agent",
    mission: "Challenge clarity, comprehension and accessibility without optimizing political persuasion or changing factual meaning.",
    adversarialQuestion: "Where could the presentation confuse or lose a reader without changing any claim, certainty or political framing?",
    mayApprove: false,
    requiredAtQuality: ["high", "maximum"],
    stages: ["distributionQa"],
  },
  {
    id: "social_critic",
    alpha2RoleId: "distribution_agent",
    mission: "Challenge channel fit, truncation risk, context loss and platform-specific misunderstanding without political targeting.",
    adversarialQuestion: "How could this specific social format distort or decontextualize the approved story?",
    mayApprove: false,
    requiredAtQuality: ["high", "maximum"],
    stages: ["distributionQa"],
  },
  {
    id: "language_critic",
    alpha2RoleId: "editorial_agent",
    mission: "Verify cross-language semantic, evidence and certainty parity.",
    adversarialQuestion: "Where does this language version change meaning, certainty, attribution, numbers or source scope?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["translation", "voiceAv"],
  },
  {
    id: "voice_av_critic",
    alpha2RoleId: "voxy_agent",
    mission: "Verify spoken audio, pronunciation, captions, timing and AV representation against the approved script.",
    adversarialQuestion: "What did the rendered audio/video say or imply differently from the approved script?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ["voiceAv"],
  },
  {
    id: "brand_trust_critic",
    alpha2RoleId: "brand_trust_agent",
    mission: "Challenge provenance wording and claims that overstate eDebatte certainty, authority or neutrality.",
    adversarialQuestion: "What wording could make eDebatte appear more certain, authoritative or partisan than the evidence allows?",
    mayApprove: false,
    requiredAtQuality: ["maximum"],
    stages: ["editorial", "distributionQa"],
  },
  {
    id: "risk_governor",
    alpha2RoleId: "risk_governor",
    mission: "Classify critical escalation conditions and verify policy gates.",
    adversarialQuestion: "Which policy or risk condition requires the autonomous path to stop?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ALL_REVIEW_STAGES,
  },
  {
    id: "defense_advocate",
    alpha2RoleId: "review_agent",
    mission: "Attempt to resolve each objection using only the bound evidence and explicit counter-evidence; never waive an objection by assertion.",
    adversarialQuestion: "Which objections can actually be defeated by evidence, and which remain unresolved or disputed?",
    mayApprove: false,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ALL_REVIEW_STAGES,
  },
  {
    id: "chief_judge",
    alpha2RoleId: "chief_critic",
    mission: "Judge only the evidence-backed objection record after prosecution and defense are complete.",
    adversarialQuestion: "Which unresolved objection still makes release unjustified?",
    mayApprove: true,
    requiredAtQuality: ["standard", "high", "maximum"],
    stages: ALL_REVIEW_STAGES,
  },
  {
    id: "knowledge_curator",
    alpha2RoleId: "knowledge_curator",
    mission: "Turn confirmed misses and corrections into versioned learning candidates, never silent self-modification.",
    adversarialQuestion: "What repeatable lesson should become an evaluated future rule, and what evidence supports that lesson?",
    mayApprove: false,
    requiredAtQuality: [],
    stages: ALL_REVIEW_STAGES,
  },
] as const;

export type VoxyEditorialAutonomyPolicy = {
  version: typeof VOXY_EDITORIAL_COUNCIL_VERSION;
  policyRevision: number;
  qualityLevel: VoxyEditorialQualityLevel;
  modes: Record<VoxyEditorialCouncilStage, VoxyEditorialAutonomyMode>;
  jobOverridesAllowed: true;
  learningMode: "propose_validate_promote";
  requireExactInputFingerprint: true;
  requireCreatorReviewerSeparation: true;
  requireObjectionDefense: true;
  requireCriticalHumanEscalation: true;
  minIndependentReviewRuns: number;
  requiredDistinctModelFamilies: number;
  maxUnresolvedWarningsForAutonomy: number;
};

export const VOXY_EDITORIAL_MAXIMUM_AUTONOMY_POLICY: VoxyEditorialAutonomyPolicy = {
  version: VOXY_EDITORIAL_COUNCIL_VERSION,
  policyRevision: 1,
  qualityLevel: "maximum",
  modes: {
    dossier: "autonomous",
    editorial: "autonomous",
    translation: "autonomous",
    voiceAv: "autonomous",
    distributionQa: "autonomous",
  },
  jobOverridesAllowed: true,
  learningMode: "propose_validate_promote",
  requireExactInputFingerprint: true,
  requireCreatorReviewerSeparation: true,
  requireObjectionDefense: true,
  requireCriticalHumanEscalation: true,
  minIndependentReviewRuns: 12,
  requiredDistinctModelFamilies: 2,
  maxUnresolvedWarningsForAutonomy: 0,
};

export type VoxyEditorialCouncilInputBinding = {
  studioDraftId: string;
  studioDraftRevision: number;
  storyPlanId: string;
  storyPlanRevision: number;
  evidenceSourcePackId: string;
  evidenceFingerprint: string;
  locale: string;
  renderOutputSha256: string | null;
};

export type VoxyEditorialObjection = {
  objectionId: string;
  raisedByRole: VoxyEditorialCouncilRoleId;
  severity: VoxyEditorialObjectionSeverity;
  category: string;
  publicReasonSummary: string;
  evidenceRefs: string[];
  affectedClaimIds: string[];
  affectedSourceIds: string[];
  state: VoxyEditorialObjectionState;
  defenseSummary: string | null;
  defenseEvidenceRefs: string[];
  resolutionSummary: string | null;
};

export type VoxyEditorialCouncilRun = {
  runId: string;
  roleId: VoxyEditorialCouncilRoleId;
  alpha2RoleId: Alpha2RoleId;
  reviewerActorId: string;
  inputFingerprint: string;
  creatorRunId: string | null;
  providerId: string;
  modelFamily: string;
  modelId: string;
  instructionVersion: string;
  policyRevision: number;
  completed: boolean;
  publicReasonSummary: string;
  checksPerformed: string[];
  evidenceRefs: string[];
  objections: VoxyEditorialObjection[];
  verdict: "pass" | "pass_with_warnings" | "fail" | "escalate";
};

export type VoxyEditorialCouncilDecision = {
  decisionId: string;
  stage: VoxyEditorialCouncilStage;
  inputFingerprint: string;
  policyRevision: number;
  outcome: "agent_approved" | "blocked" | "human_required" | "shadow_pass";
  reasonCodes: string[];
  publicDecisionSummary: string;
  unresolvedObjectionIds: string[];
  criticalRiskFlags: VoxyEditorialCriticalRiskFlag[];
  reviewRunIds: string[];
  modelFamilies: string[];
  auditComplete: boolean;
};

export type VoxyEditorialLearningCandidate = {
  lessonId: string;
  sourceDecisionId: string;
  sourceRunIds: string[];
  category: string;
  observedFailure: string;
  proposedRuleChange: string;
  evidenceRefs: string[];
  status: "proposed" | "validated" | "promoted" | "rejected" | "rolled_back";
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildVoxyEditorialCouncilInputFingerprint(
  binding: VoxyEditorialCouncilInputBinding,
): string {
  return stableHash({ version: VOXY_EDITORIAL_COUNCIL_VERSION, binding });
}

export function listRequiredVoxyEditorialCouncilRoles(
  qualityLevel: VoxyEditorialQualityLevel,
  stage: VoxyEditorialCouncilStage = "editorial",
): VoxyEditorialCouncilRoleId[] {
  return VOXY_EDITORIAL_COUNCIL_ROLES
    .filter(
      (role) =>
        role.stages.includes(stage) && role.requiredAtQuality.includes(qualityLevel),
    )
    .map((role) => role.id);
}

export function evaluateVoxyEditorialCouncil(input: {
  stage?: VoxyEditorialCouncilStage;
  binding: VoxyEditorialCouncilInputBinding;
  policy: VoxyEditorialAutonomyPolicy;
  creatorRunId: string | null;
  creatorActorId?: string | null;
  runs: VoxyEditorialCouncilRun[];
  criticalRiskFlags?: VoxyEditorialCriticalRiskFlag[];
}): VoxyEditorialCouncilDecision {
  const stage = input.stage ?? "editorial";
  const inputFingerprint = buildVoxyEditorialCouncilInputFingerprint(input.binding);
  const reasonCodes: string[] = [];
  const requiredRoles = listRequiredVoxyEditorialCouncilRoles(input.policy.qualityLevel, stage);
  const criticalRiskFlags = unique(input.criticalRiskFlags ?? []) as VoxyEditorialCriticalRiskFlag[];
  const completedRuns = input.runs.filter((run) => run.completed);
  const runIds = completedRuns.map((run) => run.runId);
  const roleSet = new Set(completedRuns.map((run) => run.roleId));
  const modelFamilies = unique(completedRuns.map((run) => run.modelFamily));
  const creatorRunId = input.creatorRunId?.trim() || null;
  const creatorActorId = input.creatorActorId?.trim() || null;

  for (const roleId of requiredRoles) {
    if (!roleSet.has(roleId)) reasonCodes.push(`required_role_missing:${roleId}`);
  }
  if (new Set(runIds).size !== runIds.length) reasonCodes.push("duplicate_review_run_id");
  if (completedRuns.length < input.policy.minIndependentReviewRuns) {
    reasonCodes.push("independent_review_run_floor_not_met");
  }
  if (modelFamilies.length < input.policy.requiredDistinctModelFamilies) {
    reasonCodes.push("model_family_diversity_floor_not_met");
  }
  if (
    input.policy.requireExactInputFingerprint &&
    completedRuns.some((run) => run.inputFingerprint !== inputFingerprint)
  ) {
    reasonCodes.push("stale_or_foreign_input_fingerprint");
  }
  if (input.policy.requireCreatorReviewerSeparation && !creatorRunId && !creatorActorId) {
    reasonCodes.push("creator_lineage_missing");
  }
  if (input.policy.requireCreatorReviewerSeparation && creatorRunId) {
    if (completedRuns.some((run) => run.runId === creatorRunId)) {
      reasonCodes.push("creator_reviewer_separation_broken");
    }
    if (completedRuns.some((run) => run.creatorRunId !== creatorRunId)) {
      reasonCodes.push("creator_lineage_mismatch");
    }
  }
  if (
    input.policy.requireCreatorReviewerSeparation &&
    creatorActorId &&
    completedRuns.some((run) => run.reviewerActorId === creatorActorId)
  ) {
    reasonCodes.push("creator_reviewer_actor_separation_broken");
  }
  if (completedRuns.some((run) => run.policyRevision !== input.policy.policyRevision)) {
    reasonCodes.push("mixed_policy_revision");
  }

  const objections = completedRuns.flatMap((run) => run.objections);
  const unresolved = objections.filter((objection) =>
    ["open", "defended", "disputed", "escalated"].includes(objection.state),
  );
  const unresolvedBlocking = unresolved.filter((objection) =>
    ["blocker", "critical"].includes(objection.severity),
  );
  const unresolvedWarnings = unresolved.filter((objection) => objection.severity === "warning");
  if (unresolvedBlocking.length) reasonCodes.push("unresolved_blocking_objection");
  if (unresolvedWarnings.length > input.policy.maxUnresolvedWarningsForAutonomy) {
    reasonCodes.push("unresolved_warning_budget_exceeded");
  }
  if (
    input.policy.requireObjectionDefense &&
    objections.some(
      (objection) =>
        ["resolved", "defended"].includes(objection.state) &&
        (!objection.defenseSummary || objection.defenseEvidenceRefs.length === 0),
    )
  ) {
    reasonCodes.push("objection_resolution_missing_defense_evidence");
  }

  const judgeRuns = completedRuns.filter((run) => run.roleId === "chief_judge");
  const judge = judgeRuns.at(-1) ?? null;
  if (!judge) reasonCodes.push("chief_judge_missing");
  else if (judge.verdict === "fail") reasonCodes.push("chief_judge_rejected");
  else if (judge.verdict === "escalate") reasonCodes.push("chief_judge_escalated");
  else if (judge.verdict === "pass_with_warnings") reasonCodes.push("chief_judge_not_clean_pass");

  const criticalHumanRequired =
    input.policy.requireCriticalHumanEscalation && criticalRiskFlags.length > 0;
  if (criticalHumanRequired) reasonCodes.push("critical_human_escalation_required");

  const hardFailureCodes = reasonCodes.filter(
    (code) => code !== "critical_human_escalation_required",
  );
  const auditComplete = hardFailureCodes.length === 0;
  const mode = input.policy.modes[stage];

  let outcome: VoxyEditorialCouncilDecision["outcome"];
  if (criticalHumanRequired || mode === "human") {
    outcome = "human_required";
  } else if (hardFailureCodes.length > 0 || !judge || judge.verdict !== "pass") {
    outcome = "blocked";
  } else if (mode === "shadow") {
    outcome = "shadow_pass";
  } else {
    outcome = "agent_approved";
  }

  const publicDecisionSummary =
    outcome === "agent_approved"
      ? "All required adversarial reviews completed on the exact revision; every material objection was resolved with bound evidence and the independent chief judge approved the record."
      : outcome === "human_required"
        ? "The council stopped autonomous release because a configured critical-risk or human-review gate requires human judgment."
        : outcome === "shadow_pass"
          ? "The council passed in shadow mode; its decision is informative and does not authorize release."
          : "The council blocked release because one or more required reviews, evidence bindings or objections remain unresolved.";

  return {
    decisionId: `voxy-council-${stableHash({ stage, inputFingerprint, policyRevision: input.policy.policyRevision, creatorRunId, creatorActorId, runIds, outcome, reasonCodes }).slice(0, 32)}`,
    stage,
    inputFingerprint,
    policyRevision: input.policy.policyRevision,
    outcome,
    reasonCodes: unique(reasonCodes),
    publicDecisionSummary,
    unresolvedObjectionIds: unique(unresolved.map((objection) => objection.objectionId)),
    criticalRiskFlags,
    reviewRunIds: unique(runIds),
    modelFamilies,
    auditComplete,
  };
}

export function proposeVoxyEditorialLearningCandidate(input: {
  decision: VoxyEditorialCouncilDecision;
  category: string;
  observedFailure: string;
  proposedRuleChange: string;
  evidenceRefs: string[];
}): VoxyEditorialLearningCandidate {
  const evidenceRefs = unique(input.evidenceRefs);
  if (!input.observedFailure.trim() || !input.proposedRuleChange.trim() || evidenceRefs.length === 0) {
    throw new Error("voxy_editorial_learning_candidate_incomplete");
  }
  return {
    lessonId: `voxy-lesson-${stableHash({ decisionId: input.decision.decisionId, category: input.category, observedFailure: input.observedFailure, proposedRuleChange: input.proposedRuleChange, evidenceRefs }).slice(0, 32)}`,
    sourceDecisionId: input.decision.decisionId,
    sourceRunIds: [...input.decision.reviewRunIds],
    category: input.category.trim(),
    observedFailure: input.observedFailure.trim(),
    proposedRuleChange: input.proposedRuleChange.trim(),
    evidenceRefs,
    status: "proposed",
  };
}
