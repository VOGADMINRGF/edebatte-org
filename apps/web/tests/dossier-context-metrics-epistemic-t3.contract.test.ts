import { describe, expect, it } from "vitest";

import {
  evaluateContextEvidenceBundle,
  t3CanConvertValueConflictIntoFact,
  t3CanPublishOrActivate,
  type DossierContextEvidenceBundle,
} from "@features/dossier/contextMetricsEpistemicContract";

const verifiedResolution = {
  canonicalOwner: "AtomicClaim/EvidenceAssessment" as const,
  publicationClassification: "publishable_as_externally_verified_fact" as const,
  evidenceReference: "evidence-metric-1",
  relationStatus: "resolved" as const,
  assessmentStatus: "supported" as const,
  reviewStatus: "verified" as const,
  freshnessStatus: "verified_fresh" as const,
  conflictStatus: "none" as const,
  revision: "evidence-r1",
  resolutionReceiptReference: "receipt-r1",
};

const review = {
  status: "reviewed" as const,
  reviewerRef: "reviewer-1",
  revision: "review-r1",
  reviewedAt: "2026-09-17T08:30:00+02:00",
};

const baseBundle = (): DossierContextEvidenceBundle => ({
  dossierId: "dossier-pension",
  revision: "context-r1",
  baseline: {
    referencePeriod: "2026",
    summary: "Current statutory retirement system and financing baseline.",
    institutionRefs: ["institution-pension-fund"],
    legalBasisRefs: ["law-pension-code"],
    financingRefs: ["finance-contribution", "finance-tax"],
    affectedGroupRefs: ["contributors", "pensioners", "future-generations"],
    evidenceRefs: ["evidence-baseline-1"],
    revision: "baseline-r1",
    freshness: "current",
  },
  events: [
    {
      id: "history-1",
      kind: "history",
      period: "1957",
      summary: "Major historical reform milestone.",
      evidenceRefs: ["evidence-history-1"],
      revision: "history-r1",
    },
    {
      id: "reform-1",
      kind: "reform",
      period: "2001",
      summary: "Later reform affecting financing and benefits.",
      evidenceRefs: ["evidence-reform-1"],
      revision: "reform-r1",
    },
  ],
  causes: [
    {
      id: "cause-demography",
      statement: "Age structure changes the contributor-to-beneficiary relationship.",
      level: "structural_cause",
      evidenceRefs: ["evidence-demography"],
      causalStatus: "supported_mechanism",
      review,
    },
  ],
  noChange: {
    id: "no-change-1",
    baselineRevision: "baseline-r1",
    horizon: "2045",
    category: "PROJECTION",
    provenance: {
      modelReference: "projection-model-1",
      basisPeriod: "2026",
      assumptions: ["current law continues", "central demographic path"],
      revision: "model-r1",
    },
    evidenceRefs: ["evidence-no-change"],
    revision: "no-change-r1",
    freshness: "current",
  },
  metrics: [
    {
      id: "metric-contribution-rate",
      definition: {
        metricKey: "contribution_rate",
        numerator: "contribution payments",
        denominator: "insured earnings base",
        population: "statutory insured population",
        jurisdictionScope: "Germany",
        timeBasis: "annual",
        unit: "%",
        methodology: "statutory contribution rate",
      },
      epistemicCategory: "MEASURED_VALUE",
      provenance: {
        sourceReference: "source-official-statistics",
        evidenceReference: "evidence-metric-1",
        metricDefinitionReference: "metric-definition-contribution-rate",
        period: "2026",
        populationScope: "statutory insured population",
        unit: "%",
        denominator: "insured earnings base",
      },
      evidenceResolution: verifiedResolution,
      revision: "metric-r1",
      freshness: "current",
    },
  ],
  projections: [
    {
      id: "projection-demography",
      category: "PROJECTION",
      provenance: {
        modelReference: "demography-model-1",
        basisPeriod: "2026",
        assumptions: ["fertility path", "migration path", "life expectancy path"],
        revision: "projection-model-r1",
      },
      assumptionRefs: ["assumption-fertility", "assumption-migration"],
      uncertainty: "Alternative demographic variants are material.",
      sensitivityNotes: ["higher net migration", "higher longevity"],
      evidenceRefs: ["evidence-projection-1"],
      revision: "projection-r1",
      freshness: "current",
    },
  ],
  conflicts: [
    {
      id: "value-conflict-1",
      kind: "value_conflict",
      refIds: ["goal-adequacy", "goal-intergenerational-burden"],
      status: "reviewed_visible",
      reviewRef: "review-value-conflict-1",
    },
  ],
  languageChecks: [
    {
      sourceRef: "source-oecd-comparator",
      originalLanguage: "en",
      readingLanguage: "de",
      terminologyEquivalence: "verified",
      translationFidelity: "verified",
      reviewRef: "translation-review-1",
    },
  ],
  supersededRefs: [],
  requirements: {
    history: true,
    causes: true,
    noChange: true,
    metrics: true,
    projections: true,
    crossLanguageQuality: true,
  },
  review,
});

describe("T3 dossier context, metrics and epistemic contract", () => {
  it("accepts a fully reviewed current context bundle", () => {
    const result = evaluateContextEvidenceBundle(baseBundle());
    expect(result.complete).toBe(true);
    expect(result.visibleValueConflicts).toBe(1);
    expect(result.unresolvedFactModelConflicts).toBe(0);
  });

  it("requires a current evidenced baseline with institutions and affected groups", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, baseline: null }).reasons).toContain("baseline_missing");
    expect(evaluateContextEvidenceBundle({ ...bundle, baseline: { ...bundle.baseline!, freshness: "stale" } }).reasons).toContain("baseline_not_current");
    expect(evaluateContextEvidenceBundle({ ...bundle, baseline: { ...bundle.baseline!, evidenceRefs: [] } }).reasons).toContain("baseline_evidence_missing");
    expect(evaluateContextEvidenceBundle({ ...bundle, baseline: { ...bundle.baseline!, affectedGroupRefs: [] } }).reasons).toContain("baseline_affected_groups_missing");
  });

  it("does not mistake symptoms for reviewed root causes", () => {
    const bundle = baseBundle();
    const symptomOnly = bundle.causes.map((cause) => ({ ...cause, level: "symptom" as const }));
    expect(evaluateContextEvidenceBundle({ ...bundle, causes: symptomOnly }).reasons).toContain("symptom_without_root_cause");
    const unknownCause = bundle.causes.map((cause) => ({ ...cause, causalStatus: "unknown" as const }));
    expect(evaluateContextEvidenceBundle({ ...bundle, causes: unknownCause }).reasons).toContain("material_causal_status_unknown");
  });

  it("requires a material no-change counterfactual with provenance and freshness", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, noChange: null }).reasons).toContain("material_no_change_missing");
    expect(evaluateContextEvidenceBundle({ ...bundle, noChange: { ...bundle.noChange!, provenance: {} } }).reasons).toContain("no_change_provenance_incomplete");
    expect(evaluateContextEvidenceBundle({ ...bundle, noChange: { ...bundle.noChange!, freshness: "stale" } }).reasons).toContain("no_change_not_current");
  });

  it("requires verified measured values and complete metric definitions", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, metrics: bundle.metrics.map((metric) => ({ ...metric, evidenceResolution: null })) }).reasons).toContain("measurement_not_verified");
    expect(evaluateContextEvidenceBundle({ ...bundle, metrics: bundle.metrics.map((metric) => ({ ...metric, provenance: { ...metric.provenance, denominator: "" } })) }).reasons).toContain("measurement_not_verified");
    expect(evaluateContextEvidenceBundle({ ...bundle, metrics: bundle.metrics.map((metric) => ({ ...metric, definition: { ...metric.definition, population: "" } })) }).reasons).toContain("metric_definition_incomplete");
  });

  it("keeps projections separate from measurements and exposes assumptions and uncertainty", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, projections: bundle.projections.map((projection) => ({ ...projection, assumptionRefs: [] })) }).reasons).toContain("projection_incomplete");
    expect(evaluateContextEvidenceBundle({ ...bundle, projections: bundle.projections.map((projection) => ({ ...projection, provenance: {} })) }).reasons).toContain("projection_provenance_incomplete");
    expect(evaluateContextEvidenceBundle({ ...bundle, projections: bundle.projections.map((projection) => ({ ...projection, uncertainty: "" })) }).reasons).toContain("projection_incomplete");
  });

  it("blocks open fact/model conflicts but preserves reviewed value conflicts visibly", () => {
    const bundle = baseBundle();
    const withFactConflict = {
      ...bundle,
      conflicts: [
        ...bundle.conflicts,
        {
          id: "fact-conflict-1",
          kind: "fact_or_model_conflict" as const,
          refIds: ["projection-a", "projection-b"],
          status: "open" as const,
          reviewRef: null,
        },
      ],
    };
    const result = evaluateContextEvidenceBundle(withFactConflict);
    expect(result.complete).toBe(false);
    expect(result.reasons).toContain("fact_or_model_conflict_open");
    expect(result.visibleValueConflicts).toBe(1);
    expect(t3CanConvertValueConflictIntoFact()).toBe(false);
  });

  it("requires verified translation and terminology equivalence when cross-language evidence is material", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, languageChecks: [] }).reasons).toContain("cross_language_quality_missing");
    expect(evaluateContextEvidenceBundle({ ...bundle, languageChecks: bundle.languageChecks.map((check) => ({ ...check, translationFidelity: "review_required" as const })) }).reasons).toContain("cross_language_quality_unverified");
  });

  it("fails closed for superseded material and an incomplete human review", () => {
    const bundle = baseBundle();
    expect(evaluateContextEvidenceBundle({ ...bundle, supersededRefs: ["projection-old-r1"] }).reasons).toContain("superseded_material_present");
    expect(evaluateContextEvidenceBundle({ ...bundle, review: { status: "pending", reviewerRef: null, revision: null, reviewedAt: null } }).reasons).toContain("context_review_incomplete");
  });

  it("does not publish or activate decisions", () => {
    expect(t3CanPublishOrActivate()).toBe(false);
  });
});
