export const DOSSIER_LIFECYCLE_STATES = [
  "draft",
  "in_review",
  "published",
  "material_change_detected",
  "re_review_required",
  "archived",
] as const;

export type DossierLifecycleState = (typeof DOSSIER_LIFECYCLE_STATES)[number];

export const DOSSIER_COVERAGE_STATES = [
  "covered",
  "partial",
  "missing",
  "conflicting",
  "stale",
  "not_applicable",
  "not_researched",
] as const;

export type DossierCoverageState = (typeof DOSSIER_COVERAGE_STATES)[number];

export const DOSSIER_FINDING_SEVERITIES = ["hard_blocker", "relevant_gap", "note"] as const;
export type DossierFindingSeverity = (typeof DOSSIER_FINDING_SEVERITIES)[number];

export type DossierCoverageDimension = {
  id: string;
  label: string;
  state: DossierCoverageState;
  material: boolean;
  sourceSegmentIds: string[];
  claimIds: string[];
  note: string | null;
};

export type DossierSectionLedgerEntry = {
  sourceArtifactId: string;
  sourceSegmentId: string;
  locator: string;
  processed: boolean;
  relevant: boolean;
  inclusionStatus: "included" | "excluded_with_reason" | "pending_review";
  rationale: string | null;
};

export type DossierClaimLedgerEntry = {
  claimId: string;
  sourceSegmentIds: string[];
  status: "included" | "excluded_with_reason" | "pending_review";
  targetDimensionIds: string[];
  rationale: string | null;
};

export type DossierActorPositionConflict = {
  actorId: string;
  jurisdiction: string;
  sourcePositionIds: string[];
  status: "consistent" | "partially_conflicting" | "conflicting" | "unclear";
  summary: string | null;
  requiresReview: boolean;
};

export type DossierSourceChallenge = {
  id: string;
  challengerActorId: string | null;
  sourceArtifactId: string;
  sourceSegmentId: string | null;
  reason: "stale" | "misquoted" | "misinterpreted" | "wrong_scope" | "other";
  statement: string;
  status: "open" | "under_review" | "accepted" | "rejected";
  autoOverwriteAllowed: false;
};

export type TranslationEquivalenceCheck = {
  canonicalLocale: string;
  targetLocale: string;
  sourceRevision: string;
  translationRevision: string;
  semanticEquivalent: boolean;
  scopePreserved: boolean;
  uncertaintyPreserved: boolean;
  quantificationPreserved: boolean;
  normativeStrengthPreserved: boolean;
  requiresReview: boolean;
};

export type DecisionContextSnapshot = {
  decisionId: string;
  dossierId: string;
  dossierRevision: string;
  scenarioSetRevision: string;
  scenarioRevisionIds: string[];
  evidenceRevision: string;
  actorPositionRevisionIds: string[];
  translationRevision: string | null;
  capturedAt: string;
};

export type DossierQualityFinding = {
  id: string;
  severity: DossierFindingSeverity;
  code: string;
  message: string;
  material: boolean;
};

export type DossierReadinessInput = {
  lifecycleState: DossierLifecycleState;
  coverage: DossierCoverageDimension[];
  sourceLedger: DossierSectionLedgerEntry[];
  claimLedger: DossierClaimLedgerEntry[];
  findings: DossierQualityFinding[];
  translationChecks: TranslationEquivalenceCheck[];
  independentReReviewCompleted: boolean;
  humanReviewRevision: string | null;
  humanOverride?: {
    approved: boolean;
    reason: string;
    materialRiskAccepted: boolean;
  } | null;
};

export type DossierReadinessResult = {
  publishReady: boolean;
  decisionReady: boolean;
  hardBlockers: string[];
  relevantGaps: string[];
  notes: string[];
  overrideUsed: boolean;
};

const ALLOWED_TRANSITIONS: Record<DossierLifecycleState, readonly DossierLifecycleState[]> = {
  draft: ["in_review", "archived"],
  in_review: ["draft", "published", "archived"],
  published: ["material_change_detected", "archived"],
  material_change_detected: ["re_review_required", "archived"],
  re_review_required: ["in_review", "archived"],
  archived: [],
};

export function canTransitionDossierLifecycle(
  from: DossierLifecycleState,
  to: DossierLifecycleState,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function evaluateDossierReadiness(input: DossierReadinessInput): DossierReadinessResult {
  const hardBlockers = new Set<string>();
  const relevantGaps = new Set<string>();
  const notes = new Set<string>();

  if (input.lifecycleState !== "in_review" && input.lifecycleState !== "published") {
    hardBlockers.add("lifecycle_not_reviewable");
  }

  for (const dimension of input.coverage) {
    if (!dimension.material) continue;
    if (["missing", "conflicting", "stale", "not_researched"].includes(dimension.state)) {
      hardBlockers.add(`material_dimension:${dimension.id}:${dimension.state}`);
    } else if (dimension.state === "partial") {
      relevantGaps.add(`material_dimension_partial:${dimension.id}`);
    }
  }

  if (input.sourceLedger.some((entry) => entry.relevant && !entry.processed)) {
    hardBlockers.add("relevant_source_segments_unprocessed");
  }
  if (input.sourceLedger.some((entry) => entry.relevant && entry.inclusionStatus === "pending_review")) {
    hardBlockers.add("relevant_source_segments_pending_review");
  }
  if (input.claimLedger.some((entry) => entry.status === "pending_review")) {
    hardBlockers.add("claims_pending_review");
  }
  if (input.claimLedger.some((entry) => entry.status === "excluded_with_reason" && !entry.rationale?.trim())) {
    hardBlockers.add("claim_exclusion_without_rationale");
  }

  for (const finding of input.findings) {
    if (finding.severity === "hard_blocker") hardBlockers.add(finding.code);
    else if (finding.severity === "relevant_gap") relevantGaps.add(finding.code);
    else notes.add(finding.code);
  }

  for (const check of input.translationChecks) {
    if (
      !check.semanticEquivalent ||
      !check.scopePreserved ||
      !check.uncertaintyPreserved ||
      !check.quantificationPreserved ||
      !check.normativeStrengthPreserved ||
      check.requiresReview
    ) {
      hardBlockers.add(`translation_equivalence:${check.targetLocale}`);
    }
  }

  if (!input.independentReReviewCompleted) hardBlockers.add("independent_re_review_missing");
  if (!input.humanReviewRevision?.trim()) hardBlockers.add("human_review_revision_missing");

  const requestedOverride = Boolean(input.humanOverride?.approved);
  const materialRiskOverride = Boolean(input.humanOverride?.materialRiskAccepted);
  const overrideReasonPresent = Boolean(input.humanOverride?.reason?.trim());

  const hasMaterialBlockers = hardBlockers.size > 0;
  const overrideCanRelease = requestedOverride && materialRiskOverride && overrideReasonPresent;

  const publishReady = !hasMaterialBlockers || overrideCanRelease;
  const decisionReady = publishReady && input.lifecycleState === "published";

  return {
    publishReady,
    decisionReady,
    hardBlockers: [...hardBlockers],
    relevantGaps: [...relevantGaps],
    notes: [...notes],
    overrideUsed: hasMaterialBlockers && overrideCanRelease,
  };
}

export function validateDecisionContextSnapshot(snapshot: DecisionContextSnapshot): string[] {
  const errors: string[] = [];
  if (!snapshot.decisionId.trim()) errors.push("missing_decision_id");
  if (!snapshot.dossierId.trim()) errors.push("missing_dossier_id");
  if (!snapshot.dossierRevision.trim()) errors.push("missing_dossier_revision");
  if (!snapshot.scenarioSetRevision.trim()) errors.push("missing_scenario_set_revision");
  if (snapshot.scenarioRevisionIds.length === 0) errors.push("missing_scenario_revisions");
  if (!snapshot.evidenceRevision.trim()) errors.push("missing_evidence_revision");
  if (!snapshot.capturedAt.trim()) errors.push("missing_captured_at");
  return errors;
}
