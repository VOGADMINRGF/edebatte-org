import { describe, expect, it } from "vitest";

import {
  REQUIRED_DECISION_DIMENSIONS,
  canPresentAsVerifiedMeasurement,
  countStructuralLineageRoots,
  countVerifiedIndependentEvidenceFamilies,
  decisionReady,
  evaluateComparator,
  type CanonicalEvidenceResolution,
  type MaterialDimension,
  type StructuredProvenance,
} from "@features/dossier/decisionDossierArchitectureContract";

const resolution: CanonicalEvidenceResolution = {
  canonicalOwner: "AtomicClaim/EvidenceAssessment",
  publicationClassification: "publishable_as_externally_verified_fact",
  evidenceReference: "evidence-1",
  relationStatus: "resolved",
  assessmentStatus: "supported",
  reviewStatus: "verified",
  freshnessStatus: "verified_fresh",
  conflictStatus: "none",
  revision: "evidence-r1",
  resolutionReceiptReference: "receipt-1",
};

const metricProvenance: StructuredProvenance = {
  sourceReference: "source-1",
  evidenceReference: "evidence-1",
  metricDefinitionReference: "metric-definition-1",
  period: "2025",
  populationScope: "resident population",
  unit: "%",
  denominator: "resident population",
};

const reviewedMateriality = {
  classification: "material" as const,
  rationale: "Required by the reviewed system question.",
  basisReference: null,
  reviewStatus: "reviewed" as const,
  reviewedBy: "architecture-review",
  revision: "materiality-r1",
};

const completeDimension = (key: MaterialDimension["key"]): MaterialDimension => ({
  key,
  materiality: reviewedMateriality,
  status: "complete",
  evidenceReferences: ["evidence-1"],
  evidenceResolution: resolution,
  provenance: key === "metric" ? metricProvenance : undefined,
  reviewStatus: "reviewed",
  gap: null,
  freshness: "fresh",
  revision: `revision-${key}`,
});

const completeSet = () => REQUIRED_DECISION_DIMENSIONS.map(completeDimension);

const replaceMetric = (patch: Partial<MaterialDimension>): MaterialDimension[] =>
  completeSet().map((dimension) =>
    dimension.key === "metric" ? { ...dimension, ...patch } : dimension,
  );

describe("decision dossier T0 final semantic edge hardening", () => {
  it("requires complete metric provenance before a measured value can be presented as verified", () => {
    expect(canPresentAsVerifiedMeasurement("MEASURED_VALUE", resolution, metricProvenance)).toBe(true);
    expect(canPresentAsVerifiedMeasurement("MEASURED_VALUE", resolution, undefined)).toBe(false);
    expect(canPresentAsVerifiedMeasurement("MEASURED_VALUE", resolution, { ...metricProvenance, denominator: "" })).toBe(false);
    expect(canPresentAsVerifiedMeasurement("FACT", resolution, metricProvenance)).toBe(false);
  });

  it("requires metric provenance for material metric decision readiness", () => {
    expect(decisionReady(completeSet())).toBe(true);
    expect(decisionReady(replaceMetric({ provenance: undefined }))).toBe(false);

    for (const key of [
      "sourceReference",
      "evidenceReference",
      "metricDefinitionReference",
      "period",
      "populationScope",
      "unit",
      "denominator",
    ] as const) {
      expect(
        decisionReady(
          replaceMetric({ provenance: { ...metricProvenance, [key]: "" } }),
        ),
        key,
      ).toBe(false);
    }
  });

  it("rejects whitespace-only lineage ids and parent ids", () => {
    expect(countStructuralLineageRoots([{ id: "   ", parentId: null }])).toEqual({
      status: "invalid",
      reason: "empty_id",
    });
    expect(countStructuralLineageRoots([{ id: "a", parentId: "   " }])).toEqual({
      status: "invalid",
      reason: "empty_parent_id",
    });
  });

  it("rejects duplicate independence resolutions independent of input order", () => {
    const lineage = [{ id: "root", parentId: null }] as const;
    const verified = {
      sourceFamilyId: "root",
      independence: "verified_independent_root" as const,
      resolutionReceiptReference: "receipt-a",
    };
    const unknown = {
      sourceFamilyId: "root",
      independence: "independence_unknown" as const,
      resolutionReceiptReference: null,
    };

    expect(countVerifiedIndependentEvidenceFamilies(lineage, [verified, unknown])).toEqual({
      status: "invalid",
      reason: "duplicate_resolution",
    });
    expect(countVerifiedIndependentEvidenceFamilies(lineage, [unknown, verified])).toEqual({
      status: "invalid",
      reason: "duplicate_resolution",
    });
    expect(
      countVerifiedIndependentEvidenceFamilies(lineage, [
        verified,
        { ...verified, resolutionReceiptReference: "receipt-b" },
      ]),
    ).toEqual({ status: "invalid", reason: "duplicate_resolution" });
  });

  it("rejects blank resolution family ids", () => {
    expect(
      countVerifiedIndependentEvidenceFamilies([{ id: "root", parentId: null }], [
        {
          sourceFamilyId: "   ",
          independence: "verified_independent_root",
          resolutionReceiptReference: "receipt",
        },
      ]),
    ).toEqual({ status: "invalid", reason: "empty_resolution_id" });
  });

  it("requires explicit source and target comparator context", () => {
    const comparator = {
      jurisdiction: "Sweden",
      targetJurisdiction: "Germany",
      institutions: ["income pension"],
      contributionDefinition: "income-related contribution",
      benefitDefinition: "income pension",
      originalLanguage: "sv",
      readingLanguage: "de",
    };

    expect(evaluateComparator(comparator)).toEqual({
      referenceable: true,
      transferability: "requires_review",
    });
    expect(evaluateComparator({ ...comparator, jurisdiction: "   " })).toEqual({
      referenceable: false,
      transferability: "not_assessed",
    });
    expect(evaluateComparator({ ...comparator, targetJurisdiction: "" })).toEqual({
      referenceable: false,
      transferability: "not_assessed",
    });
    expect(evaluateComparator({ ...comparator, institutions: [""] })).toEqual({
      referenceable: false,
      transferability: "not_assessed",
    });
    expect(evaluateComparator({ ...comparator, institutions: ["   "] })).toEqual({
      referenceable: false,
      transferability: "not_assessed",
    });
    expect(evaluateComparator({ ...comparator, jurisdiction: "Germany" }).transferability).toBe(
      "requires_review",
    );
  });
});
