import { describe, expect, it } from "vitest";

import {
  ATOMIC_CLAIM_TYPES,
  PUBLICATION_CLASSIFICATIONS,
} from "@features/analyze/atomicClaimSourceRelationContract";
import {
  CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY,
  DECISION_DOSSIER_ARCHITECTURE_OWNERS,
  REQUIRED_DECISION_DIMENSIONS,
  T0_DERIVED_EPISTEMIC_CATEGORIES,
  canPresentAsVerifiedFact,
  canPresentAsVerifiedMeasurement,
  canRenderClaimForm,
  compareMetricDefinitions,
  countStructuralLineageRoots,
  countVerifiedIndependentEvidenceFamilies,
  decisionReady,
  evaluateComparator,
  isBindingStale,
  mapCanonicalAtomicClaimType,
  t0Allows,
  t0CanReleasePublicCandidate,
  validateArchitectureOwners,
  type CanonicalEvidenceResolution,
  type DecisionBindingSnapshot,
  type MaterialDimension,
  type MaterialityDecision,
  type MetricDefinition,
  type OwnerEntry,
  type SourceIndependenceResolution,
  type StructuredProvenance,
} from "@features/dossier/decisionDossierArchitectureContract";

const PROPERTY_SEED = 0xEDEB0796;
const PROPERTY_CASE_COUNTS = {
  lineage: 500,
  metric: 500,
  owner: 500,
  readiness: 500,
  binding: 500,
  crossDomain: 250,
} as const;
const TOTAL_PROPERTY_CASES = 2750;

const canonicalResolution = (suffix = "base"): CanonicalEvidenceResolution => ({
  canonicalOwner: "AtomicClaim/EvidenceAssessment",
  publicationClassification: "publishable_as_externally_verified_fact",
  evidenceReference: `evidence-${suffix}`,
  relationStatus: "resolved",
  assessmentStatus: "supported",
  reviewStatus: "verified",
  freshnessStatus: "verified_fresh",
  conflictStatus: "none",
  revision: `evidence-revision-${suffix}`,
  resolutionReceiptReference: `evidence-receipt-${suffix}`,
});

const metricProvenance = (suffix = "base"): StructuredProvenance => ({
  sourceReference: `source-${suffix}`,
  evidenceReference: `evidence-${suffix}`,
  metricDefinitionReference: `metric-definition-${suffix}`,
  period: "2025",
  populationScope: "insured people",
  unit: "%",
  denominator: "net income",
});

const materiality = (suffix = "base"): MaterialityDecision => ({
  classification: "material",
  rationale: `Material for decision ${suffix}`,
  basisReference: null,
  reviewStatus: "reviewed",
  reviewedBy: `reviewer-${suffix}`,
  revision: `materiality-revision-${suffix}`,
});

const nonMateriality = (suffix = "base"): MaterialityDecision => ({
  classification: "non_material",
  rationale: `Reviewed non-material ${suffix}`,
  basisReference: `basis-${suffix}`,
  reviewStatus: "reviewed",
  reviewedBy: `reviewer-${suffix}`,
  revision: `materiality-revision-${suffix}`,
  canonicalReviewResolution: {
    canonicalOwner: "Dossier/Atomic evidence context",
    reviewStatus: "verified",
    basisStatus: "verified",
    revision: `review-resolution-${suffix}`,
    receiptReference: `review-receipt-${suffix}`,
  },
});

const completeDimension = (
  key: MaterialDimension["key"],
  suffix: string,
): MaterialDimension => ({
  key,
  materiality: materiality(suffix),
  status: "complete",
  evidenceReferences: [`evidence-${suffix}`],
  evidenceResolution: canonicalResolution(suffix),
  provenance: key === "metric" ? metricProvenance(suffix) : undefined,
  reviewStatus: "reviewed",
  gap: null,
  freshness: "fresh",
  revision: `dimension-revision-${suffix}`,
});

const completeDimensions = (suffix = "base"): MaterialDimension[] =>
  REQUIRED_DECISION_DIMENSIONS.map((key, index) =>
    completeDimension(key, `${suffix}-${index}`),
  );

const replaceDimension = (
  values: readonly MaterialDimension[],
  index: number,
  replace: (value: MaterialDimension) => MaterialDimension,
): MaterialDimension[] => {
  const key = values[index % values.length]!.key;
  return values.map((value) => (value.key === key ? replace(value) : value));
};

const verifiedRoot = (sourceFamilyId: string): SourceIndependenceResolution => ({
  sourceFamilyId,
  independence: "verified_independent_root",
  resolutionReceiptReference: `independence-receipt-${sourceFamilyId}`,
});

const metricBase = (index: number): MetricDefinition => ({
  metricKey: `replacement_rate_${index % 17}`,
  numerator: `statutory pension ${index % 11}`,
  denominator: `net income ${index % 13}`,
  population: `insured people ${index % 7}`,
  jurisdictionScope: `Germany ${index % 5}`,
  timeBasis: `period-${index % 9}`,
  unit: "%",
  methodology: `net replacement rate ${index % 19}`,
});

const bindingBase = (suffix: string): DecisionBindingSnapshot => ({
  boundRevision: `dossier-${suffix}`,
  materialRevisions: {
    dossier: `dossier-${suffix}`,
    metric: `metric-${suffix}`,
    projection: `projection-${suffix}`,
  },
});

const cloneOwners = (): OwnerEntry[] =>
  DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => ({
    ...entry,
    allowedReferences: [...entry.allowedReferences],
  }));

describe("decision dossier T0 permanent deterministic property hardening", () => {
  it("keeps the fixed seed and all 2,750 permanent generated cases", () => {
    expect(PROPERTY_SEED).toBe(0xEDEB0796);
    expect(Object.values(PROPERTY_CASE_COUNTS).reduce((sum, value) => sum + value, 0)).toBe(
      TOTAL_PROPERTY_CASES,
    );
  });

  it("covers 500 lineage and independence mutations without source laundering", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.lineage; index += 1) {
      const root = `root-${index}`;
      const child = `child-${index}`;
      switch (index % 10) {
        case 0:
          expect(countStructuralLineageRoots([{ id: root, parentId: null }, { id: child, parentId: root }])).toEqual({ status: "ok", structuralRoots: 1 });
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }, { id: child, parentId: root }], [verifiedRoot(root)])).toEqual({ status: "ok", independentFamilies: 1 });
          break;
        case 1:
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [])).toEqual({ status: "unknown_independence" });
          break;
        case 2:
          expect(countStructuralLineageRoots([{ id: child, parentId: `missing-${index}` }])).toEqual({ status: "invalid", reason: "missing_parent" });
          break;
        case 3:
          expect(countStructuralLineageRoots([{ id: root, parentId: root }])).toEqual({ status: "invalid", reason: "self_parent" });
          break;
        case 4:
          expect(countStructuralLineageRoots([{ id: root, parentId: child }, { id: child, parentId: root }])).toEqual({ status: "invalid", reason: "cycle" });
          break;
        case 5:
          expect(countStructuralLineageRoots([{ id: root, parentId: null }, { id: root, parentId: null }])).toEqual({ status: "invalid", reason: "duplicate_id" });
          break;
        case 6:
          expect(countStructuralLineageRoots([{ id: "   ", parentId: null }])).toEqual({ status: "invalid", reason: "empty_id" });
          break;
        case 7:
          expect(countStructuralLineageRoots([{ id: root, parentId: "\t" }])).toEqual({ status: "invalid", reason: "empty_parent_id" });
          break;
        case 8: {
          const a = verifiedRoot(root);
          const b = { ...a, independence: "independence_unknown" as const, resolutionReceiptReference: null };
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [a, b])).toEqual({ status: "invalid", reason: "duplicate_resolution" });
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [b, a])).toEqual({ status: "invalid", reason: "duplicate_resolution" });
          break;
        }
        default:
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [{ sourceFamilyId: "   ", independence: "verified_independent_root", resolutionReceiptReference: "receipt" }])).toEqual({ status: "invalid", reason: "empty_resolution_id" });
      }
    }
  });

  it("covers 500 metric definition mutations without semantic guessing", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.metric; index += 1) {
      const left = metricBase(index);
      switch (index % 6) {
        case 0:
          expect(compareMetricDefinitions(left, { ...left, metricKey: `  ${left.metricKey.toUpperCase()}  ` })).toBe("compatible");
          break;
        case 1:
          expect(compareMetricDefinitions(left, { ...left, denominator: `  ${left.denominator.replace(" ", "   ")}  ` })).toBe("compatible");
          break;
        case 2:
          expect(compareMetricDefinitions(left, { ...left, unit: "" })).toBe("unknown");
          break;
        case 3:
          expect(compareMetricDefinitions(left, { ...left, metricKey: `different-${index}` })).toBe("incompatible");
          break;
        case 4:
          expect(compareMetricDefinitions(left, { ...left, denominator: `gross income ${index}` })).toBe("requires_harmonization");
          break;
        default:
          expect(compareMetricDefinitions(left, { ...left, methodology: `different methodology ${index}` })).toBe("requires_harmonization");
      }
    }
  });

  it("covers 500 owner mutations without permitting parallel ownership", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.owner; index += 1) {
      const entries = cloneOwners();
      const targetIndex = index % entries.length;
      const target = entries[targetIndex]!;
      if (index % 8 === 0) {
        const withMultiple = entries.findIndex((entry) => entry.allowedReferences.length > 1);
        entries[withMultiple] = { ...entries[withMultiple]!, allowedReferences: [...entries[withMultiple]!.allowedReferences].reverse() };
        expect(validateArchitectureOwners(entries)).toBe(true);
        continue;
      }
      switch (index % 8) {
        case 1:
          entries[targetIndex] = { ...target, canonicalOwner: `parallel-${index}` };
          break;
        case 2:
          entries[targetIndex] = { ...target, canonicalReference: "" };
          break;
        case 3:
          entries[targetIndex] = { ...target, t0Responsibility: `mutated-${index}` };
          break;
        case 4:
          entries[targetIndex] = { ...target, allowedReferences: [...target.allowedReferences, `extra-${index}`] };
          break;
        case 5:
          entries[targetIndex] = { ...target, forbiddenOwnershipDuplication: `duplicate-${index}` };
          break;
        case 6:
          entries[targetIndex] = { ...target, revisionSensitive: !target.revisionSensitive };
          break;
        default:
          entries[targetIndex] = { ...target, readinessRelevant: !target.readinessRelevant };
      }
      expect(validateArchitectureOwners(entries)).toBe(false);
    }
  });

  it("covers 500 readiness mutations including mandatory metric provenance", () => {
    let validCases = 0;
    for (let index = 0; index < PROPERTY_CASE_COUNTS.readiness; index += 1) {
      const values = completeDimensions(`ready-${index}`);
      const metricIndex = values.findIndex((value) => value.key === "metric");
      let expected = false;
      let candidate: readonly MaterialDimension[] = values;

      switch (index % 12) {
        case 0:
          expected = true;
          validCases += 1;
          break;
        case 1:
          candidate = values.slice(1);
          break;
        case 2:
          candidate = replaceDimension(values, index, (value) => ({ ...value, evidenceResolution: undefined }));
          break;
        case 3:
          candidate = replaceDimension(values, index, (value) => ({ ...value, freshness: "stale" }));
          break;
        case 4:
          candidate = replaceDimension(values, index, (value) => ({ ...value, revision: null }));
          break;
        case 5:
          candidate = replaceDimension(values, index, (value) => ({ ...value, status: "gap", gap: "material gap" }));
          break;
        case 6:
          candidate = replaceDimension(values, index, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, conflictStatus: "unresolved" } }));
          break;
        case 7:
          candidate = replaceDimension(values, metricIndex, (value) => ({ ...value, provenance: undefined }));
          break;
        case 8:
          candidate = replaceDimension(values, metricIndex, (value) => ({ ...value, provenance: { ...value.provenance!, denominator: "" } }));
          break;
        case 9:
          candidate = replaceDimension(values, metricIndex, (value) => ({ ...value, provenance: { ...value.provenance!, populationScope: "" } }));
          break;
        case 10:
          candidate = replaceDimension(values, metricIndex, (value) => ({ ...value, provenance: { ...value.provenance!, unit: "" } }));
          break;
        default:
          candidate = replaceDimension(values, metricIndex, (value) => ({ ...value, provenance: { ...value.provenance!, metricDefinitionReference: "" } }));
      }
      expect(decisionReady(candidate)).toBe(expected);
    }
    expect(validCases).toBeGreaterThan(0);
  });

  it("covers 500 binding mutations and fails closed for malformed revisions", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.binding; index += 1) {
      const binding = bindingBase(`binding-${index}`);
      switch (index % 8) {
        case 0:
          expect(isBindingStale(binding, bindingBase(`binding-${index}`))).toBe(false);
          break;
        case 1:
          expect(isBindingStale(binding, { ...binding, boundRevision: `changed-${index}` })).toBe(true);
          break;
        case 2:
          expect(isBindingStale(binding, { ...binding, materialRevisions: { ...binding.materialRevisions, metric: `changed-${index}` } })).toBe(true);
          break;
        case 3:
          expect(isBindingStale(binding, { ...binding, materialRevisions: { ...binding.materialRevisions, comparator: `added-${index}` } })).toBe(true);
          break;
        case 4:
          expect(isBindingStale(binding, { ...binding, materialRevisions: { dossier: binding.materialRevisions.dossier!, metric: binding.materialRevisions.metric! } })).toBe(true);
          break;
        case 5:
          expect(isBindingStale({ ...binding, boundRevision: "" }, binding)).toBe(true);
          break;
        case 6:
          expect(isBindingStale(binding, { ...binding, materialRevisions: { ...binding.materialRevisions, metric: "" } })).toBe(true);
          break;
        default:
          expect(isBindingStale({ ...binding, materialRevisions: { ...binding.materialRevisions, "": `revision-${index}` } }, binding)).toBe(true);
      }
    }
  });

  it("covers 250 cross-domain attacks with zero unsafe acceptances", () => {
    let unsafeAcceptances = 0;
    const reject = (value: boolean) => {
      if (value) unsafeAcceptances += 1;
      expect(value).toBe(false);
    };

    for (let index = 0; index < PROPERTY_CASE_COUNTS.crossDomain; index += 1) {
      switch (index % 10) {
        case 0:
          reject(canPresentAsVerifiedFact("NORMATIVE_JUDGMENT", canonicalResolution(`normative-${index}`)));
          break;
        case 1:
          reject(canRenderClaimForm("UNKNOWN", "factual_claim"));
          break;
        case 2:
          reject(canPresentAsVerifiedFact("FACT", { ...canonicalResolution(`stale-${index}`), freshnessStatus: "stale" }));
          break;
        case 3:
          reject(canPresentAsVerifiedMeasurement("MEASURED_VALUE", canonicalResolution(`measurement-${index}`), undefined));
          break;
        case 4:
          reject(canPresentAsVerifiedMeasurement("MEASURED_VALUE", canonicalResolution(`measurement-${index}`), { ...metricProvenance(`measurement-${index}`), period: "" }));
          break;
        case 5:
          reject(evaluateComparator({ jurisdiction: "Sweden", targetJurisdiction: "", institutions: ["income pension"], contributionDefinition: "contribution", benefitDefinition: "benefit", originalLanguage: "sv", readingLanguage: "de" }).referenceable);
          break;
        case 6:
          reject(evaluateComparator({ jurisdiction: "Sweden", targetJurisdiction: "Germany", institutions: ["   "], contributionDefinition: "contribution", benefitDefinition: "benefit", originalLanguage: "sv", readingLanguage: "de" }).referenceable);
          break;
        case 7:
          reject(t0Allows("publish"));
          break;
        case 8:
          reject(t0Allows("activate_decision"));
          break;
        default:
          reject(t0CanReleasePublicCandidate());
      }
    }
    expect(unsafeAcceptances).toBe(0);
  });

  it("guards the canonical AtomicClaim vocabulary and publication truth boundary", () => {
    expect(Object.keys(CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY).sort()).toEqual([...ATOMIC_CLAIM_TYPES].sort());
    for (const type of ATOMIC_CLAIM_TYPES) {
      expect(mapCanonicalAtomicClaimType(type)).toBe(CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY[type]);
    }
    for (const category of T0_DERIVED_EPISTEMIC_CATEGORIES) {
      expect(ATOMIC_CLAIM_TYPES.includes(category as never)).toBe(false);
    }
    for (const classification of PUBLICATION_CLASSIFICATIONS) {
      expect(canPresentAsVerifiedFact("FACT", { ...canonicalResolution(`publication-${classification}`), publicationClassification: classification })).toBe(classification === "publishable_as_externally_verified_fact");
    }
  });
});