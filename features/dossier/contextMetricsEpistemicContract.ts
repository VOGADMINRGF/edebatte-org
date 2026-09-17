import {
  canPresentAsVerifiedMeasurement,
  hasRequiredProvenance,
  type CanonicalEvidenceResolution,
  type EpistemicCategory,
  type MetricDefinition,
  type StructuredProvenance,
} from "./decisionDossierArchitectureContract";

/** T3 only projects/reviews canonical Dossier/Claim/Evidence truth. */
export type ContextReview = Readonly<{
  status: "reviewed" | "pending" | "rejected";
  reviewerRef: string | null;
  revision: string | null;
  reviewedAt: string | null;
}>;

export type ContextEvent = Readonly<{
  id: string;
  kind: "history" | "current_state" | "reform" | "institutional_change";
  period: string;
  summary: string;
  evidenceRefs: readonly string[];
  revision: string;
}>;

export type CurrentSystemBaseline = Readonly<{
  referencePeriod: string;
  summary: string;
  institutionRefs: readonly string[];
  legalBasisRefs: readonly string[];
  financingRefs: readonly string[];
  affectedGroupRefs: readonly string[];
  evidenceRefs: readonly string[];
  revision: string;
  freshness: "current" | "stale" | "unknown";
}>;

export type CauseRecord = Readonly<{
  id: string;
  statement: string;
  level: "symptom" | "immediate_cause" | "systemic_cause" | "structural_cause";
  evidenceRefs: readonly string[];
  causalStatus: "causal_evidence" | "supported_mechanism" | "association_only" | "unknown";
  review: ContextReview;
}>;

export type NoChangeTrajectory = Readonly<{
  id: string;
  baselineRevision: string;
  horizon: string;
  category: "ESTIMATE" | "PROJECTION" | "MODEL_RESULT";
  provenance: StructuredProvenance;
  evidenceRefs: readonly string[];
  revision: string;
  freshness: "current" | "stale" | "unknown";
}>;

export type DossierMetricProjection = Readonly<{
  id: string;
  definition: MetricDefinition;
  epistemicCategory: "MEASURED_VALUE" | "ESTIMATE";
  provenance: StructuredProvenance;
  evidenceResolution: CanonicalEvidenceResolution | null;
  revision: string;
  freshness: "current" | "stale" | "unknown";
}>;

export type DossierProjectionModel = Readonly<{
  id: string;
  category: "PROJECTION" | "MODEL_RESULT";
  provenance: StructuredProvenance;
  assumptionRefs: readonly string[];
  uncertainty: string;
  sensitivityNotes: readonly string[];
  evidenceRefs: readonly string[];
  revision: string;
  freshness: "current" | "stale" | "unknown";
}>;

export type EpistemicConflict = Readonly<{
  id: string;
  kind: "fact_or_model_conflict" | "value_conflict";
  refIds: readonly string[];
  status: "open" | "reviewed_visible" | "resolved";
  reviewRef: string | null;
}>;

export type CrossLanguageEvidenceCheck = Readonly<{
  sourceRef: string;
  originalLanguage: string;
  readingLanguage: string;
  terminologyEquivalence: "verified" | "review_required" | "unknown";
  translationFidelity: "verified" | "review_required" | "unknown";
  reviewRef: string | null;
}>;

export type T3MaterialRequirements = Readonly<{
  history: boolean;
  causes: boolean;
  noChange: boolean;
  metrics: boolean;
  projections: boolean;
  crossLanguageQuality: boolean;
}>;

export type DossierContextEvidenceBundle = Readonly<{
  dossierId: string;
  revision: string;
  baseline: CurrentSystemBaseline | null;
  events: readonly ContextEvent[];
  causes: readonly CauseRecord[];
  noChange: NoChangeTrajectory | null;
  metrics: readonly DossierMetricProjection[];
  projections: readonly DossierProjectionModel[];
  conflicts: readonly EpistemicConflict[];
  languageChecks: readonly CrossLanguageEvidenceCheck[];
  supersededRefs: readonly string[];
  requirements: T3MaterialRequirements;
  review: ContextReview;
}>;

export type T3Evaluation = Readonly<{
  complete: boolean;
  reasons: readonly string[];
  visibleValueConflicts: number;
  unresolvedFactModelConflicts: number;
}>;

const present = (value: string | null | undefined): value is string => Boolean(value?.trim());
const validRefs = (refs: readonly string[], requireOne = false) =>
  (!requireOne || refs.length > 0) && refs.every((ref) => present(ref));
const reviewed = (review: ContextReview) =>
  review.status === "reviewed" && present(review.reviewerRef) && present(review.revision) && present(review.reviewedAt);

const metricDefinitionComplete = (definition: MetricDefinition) =>
  Object.values(definition).every((value) => present(value));

const projectionProvenanceComplete = (
  category: DossierProjectionModel["category"],
  provenance: StructuredProvenance,
) => hasRequiredProvenance(category, provenance);

export function evaluateContextEvidenceBundle(bundle: DossierContextEvidenceBundle): T3Evaluation {
  const reasons: string[] = [];
  if (!present(bundle.dossierId)) reasons.push("dossier_reference_missing");
  if (!present(bundle.revision)) reasons.push("context_revision_missing");
  if (!validRefs(bundle.supersededRefs)) reasons.push("superseded_reference_invalid");

  if (!bundle.baseline) {
    reasons.push("baseline_missing");
  } else {
    if (!present(bundle.baseline.referencePeriod) || !present(bundle.baseline.summary) || !present(bundle.baseline.revision)) reasons.push("baseline_incomplete");
    if (!validRefs(bundle.baseline.evidenceRefs, true)) reasons.push("baseline_evidence_missing");
    if (!validRefs(bundle.baseline.institutionRefs, true)) reasons.push("baseline_institution_context_missing");
    if (!validRefs(bundle.baseline.affectedGroupRefs, true)) reasons.push("baseline_affected_groups_missing");
    if (bundle.baseline.freshness !== "current") reasons.push("baseline_not_current");
  }

  if (bundle.requirements.history && bundle.events.filter((event) => event.kind === "history" || event.kind === "reform" || event.kind === "institutional_change").length === 0) reasons.push("material_history_missing");
  for (const event of bundle.events) {
    if (!present(event.id) || !present(event.period) || !present(event.summary) || !present(event.revision) || !validRefs(event.evidenceRefs, true)) reasons.push("context_event_incomplete");
  }

  if (bundle.requirements.causes && bundle.causes.length === 0) reasons.push("material_causes_missing");
  for (const cause of bundle.causes) {
    if (!present(cause.id) || !present(cause.statement) || !validRefs(cause.evidenceRefs, true) || !reviewed(cause.review)) reasons.push("cause_record_incomplete");
    if (cause.level !== "symptom" && cause.causalStatus === "unknown") reasons.push("material_causal_status_unknown");
  }
  if (bundle.requirements.causes && bundle.causes.length > 0 && bundle.causes.every((cause) => cause.level === "symptom")) reasons.push("symptom_without_root_cause");

  if (bundle.requirements.noChange && !bundle.noChange) reasons.push("material_no_change_missing");
  if (bundle.noChange) {
    if (!present(bundle.noChange.id) || !present(bundle.noChange.baselineRevision) || !present(bundle.noChange.horizon) || !present(bundle.noChange.revision) || !validRefs(bundle.noChange.evidenceRefs, true)) reasons.push("no_change_incomplete");
    if (!hasRequiredProvenance(bundle.noChange.category as EpistemicCategory, bundle.noChange.provenance)) reasons.push("no_change_provenance_incomplete");
    if (bundle.noChange.freshness !== "current") reasons.push("no_change_not_current");
  }

  if (bundle.requirements.metrics && bundle.metrics.length === 0) reasons.push("material_metrics_missing");
  for (const metric of bundle.metrics) {
    if (!present(metric.id) || !present(metric.revision) || !metricDefinitionComplete(metric.definition)) reasons.push("metric_definition_incomplete");
    if (metric.freshness !== "current") reasons.push("metric_not_current");
    if (metric.epistemicCategory === "MEASURED_VALUE") {
      if (!canPresentAsVerifiedMeasurement("MEASURED_VALUE", metric.evidenceResolution, metric.provenance)) reasons.push("measurement_not_verified");
    } else if (!hasRequiredProvenance("ESTIMATE", metric.provenance)) {
      reasons.push("estimate_provenance_incomplete");
    }
  }

  if (bundle.requirements.projections && bundle.projections.length === 0) reasons.push("material_projections_missing");
  for (const projection of bundle.projections) {
    if (!present(projection.id) || !present(projection.revision) || !present(projection.uncertainty) || !validRefs(projection.assumptionRefs, true) || !validRefs(projection.evidenceRefs, true)) reasons.push("projection_incomplete");
    if (!projectionProvenanceComplete(projection.category, projection.provenance)) reasons.push("projection_provenance_incomplete");
    if (projection.freshness !== "current") reasons.push("projection_not_current");
  }

  const unresolvedFactModelConflicts = bundle.conflicts.filter(
    (conflict) => conflict.kind === "fact_or_model_conflict" && conflict.status === "open",
  ).length;
  const visibleValueConflicts = bundle.conflicts.filter(
    (conflict) => conflict.kind === "value_conflict" && conflict.status === "reviewed_visible",
  ).length;
  for (const conflict of bundle.conflicts) {
    if (!present(conflict.id) || !validRefs(conflict.refIds, true)) reasons.push("conflict_record_incomplete");
    if (conflict.status !== "open" && !present(conflict.reviewRef)) reasons.push("conflict_review_missing");
  }
  if (unresolvedFactModelConflicts > 0) reasons.push("fact_or_model_conflict_open");

  if (bundle.requirements.crossLanguageQuality && bundle.languageChecks.length === 0) reasons.push("cross_language_quality_missing");
  for (const check of bundle.languageChecks) {
    if (!present(check.sourceRef) || !present(check.originalLanguage) || !present(check.readingLanguage)) reasons.push("language_check_incomplete");
    if (check.terminologyEquivalence !== "verified" || check.translationFidelity !== "verified" || !present(check.reviewRef)) reasons.push("cross_language_quality_unverified");
  }

  if (bundle.supersededRefs.length > 0) reasons.push("superseded_material_present");
  if (!reviewed(bundle.review)) reasons.push(bundle.review.status === "rejected" ? "context_review_rejected" : "context_review_incomplete");

  return {
    complete: reasons.length === 0,
    reasons: Object.freeze([...new Set(reasons)]),
    visibleValueConflicts,
    unresolvedFactModelConflicts,
  };
}

export function t3CanConvertValueConflictIntoFact(): false {
  return false;
}

export function t3CanPublishOrActivate(): false {
  return false;
}
