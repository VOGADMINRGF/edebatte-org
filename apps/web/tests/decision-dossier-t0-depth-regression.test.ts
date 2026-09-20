import { describe, expect, it } from "vitest";

import {
  DECISION_DOSSIER_ARCHITECTURE_OWNERS,
  REQUIRED_DECISION_DIMENSIONS,
  canPresentAsVerifiedFact,
  canPresentAsVerifiedMeasurement,
  compareMetricDefinitions,
  countStructuralLineageRoots,
  countVerifiedIndependentEvidenceFamilies,
  decisionReady,
  evaluateComparator,
  isBindingStale,
  validateArchitectureOwners,
  type CanonicalEvidenceResolution,
  type MaterialDimension,
  type MaterialityDecision,
  type MetricDefinition,
  type OwnerEntry,
  type SourceIndependenceResolution,
  type StructuredProvenance,
} from "@features/dossier/decisionDossierArchitectureContract";

const DEPTH_SEED = 0x7a0d2026;
const DEPTH_CASE_COUNTS = {
  lineage: 200,
  metric: 200,
  owner: 200,
  readiness: 300,
  binding: 200,
  crossDomain: 100,
} as const;
const TOTAL_DEPTH_CASES = 1200;

const createPrng = (seed = DEPTH_SEED) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
};

const resolution = (suffix: string): CanonicalEvidenceResolution => ({
  canonicalOwner: "AtomicClaim/EvidenceAssessment",
  publicationClassification: "publishable_as_externally_verified_fact",
  evidenceReference: `evidence-${suffix}`,
  relationStatus: "resolved",
  assessmentStatus: "supported",
  reviewStatus: "verified",
  freshnessStatus: "verified_fresh",
  conflictStatus: "none",
  revision: `evidence-r-${suffix}`,
  resolutionReceiptReference: `receipt-${suffix}`,
});

const metricProvenance = (suffix: string): StructuredProvenance => ({
  sourceReference: `source-${suffix}`,
  evidenceReference: `evidence-${suffix}`,
  metricDefinitionReference: `metric-definition-${suffix}`,
  period: "2025",
  populationScope: "insured people",
  unit: "%",
  denominator: "net income",
});

const materiality = (suffix: string): MaterialityDecision => ({
  classification: "material",
  rationale: `Material ${suffix}`,
  basisReference: null,
  reviewStatus: "reviewed",
  reviewedBy: `reviewer-${suffix}`,
  revision: `materiality-r-${suffix}`,
});

const completeDimension = (key: MaterialDimension["key"], suffix: string): MaterialDimension => ({
  key,
  materiality: materiality(suffix),
  status: "complete",
  evidenceReferences: [`evidence-${suffix}`],
  evidenceResolution: resolution(suffix),
  provenance: key === "metric" ? metricProvenance(suffix) : undefined,
  reviewStatus: "reviewed",
  gap: null,
  freshness: "fresh",
  revision: `dimension-r-${suffix}`,
});

const completeSet = (suffix: string): MaterialDimension[] =>
  REQUIRED_DECISION_DIMENSIONS.map((key, index) => completeDimension(key, `${suffix}-${index}`));

const replaceKey = (
  values: readonly MaterialDimension[],
  key: MaterialDimension["key"],
  mutate: (value: MaterialDimension) => MaterialDimension,
): MaterialDimension[] => values.map((value) => (value.key === key ? mutate(value) : value));

const verifiedRoot = (sourceFamilyId: string): SourceIndependenceResolution => ({
  sourceFamilyId,
  independence: "verified_independent_root",
  resolutionReceiptReference: `independence-${sourceFamilyId}`,
});

const metricBase = (index: number, salt: number): MetricDefinition => ({
  metricKey: `replacement_rate_${index % 19}`,
  numerator: `statutory pension ${salt % 17}`,
  denominator: `net income ${index % 13}`,
  population: `insured people ${index % 11}`,
  jurisdictionScope: `jurisdiction ${index % 7}`,
  timeBasis: `period ${index % 9}`,
  unit: "%",
  methodology: `method ${index % 23}`,
});

const cloneOwners = (): OwnerEntry[] =>
  DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => ({
    ...entry,
    allowedReferences: [...entry.allowedReferences],
  }));

describe("decision dossier T0 depth retention regression", () => {
  it("uses the deterministic depth seed and executes 1,200 additional cases", () => {
    expect(DEPTH_SEED).toBe(0x7a0d2026);
    expect(Object.values(DEPTH_CASE_COUNTS).reduce((sum, count) => sum + count, 0)).toBe(TOTAL_DEPTH_CASES);
  });

  it("retains deep lineage, translation, order and receipt adversaries", () => {
    const next = createPrng();
    for (let index = 0; index < DEPTH_CASE_COUNTS.lineage; index += 1) {
      const salt = next().toString(36);
      const root = `root-${index}-${salt}`;
      const child = `child-${index}-${salt}`;
      switch (index % 8) {
        case 0: {
          const translation = `translation-${index}-${salt}`;
          const lineage = [
            { id: root, parentId: null },
            { id: translation, parentId: root },
            { id: child, parentId: translation },
          ];
          expect(countStructuralLineageRoots(lineage)).toEqual({ status: "ok", structuralRoots: 1 });
          expect(countVerifiedIndependentEvidenceFamilies(lineage, [verifiedRoot(root), {
            sourceFamilyId: translation,
            independence: "known_derived",
            resolutionReceiptReference: `derived-${index}`,
          }])).toEqual({ status: "ok", independentFamilies: 1 });
          break;
        }
        case 1: {
          const length = 16 + (next() % 113);
          const lineage = Array.from({ length }, (_, chainIndex) => ({
            id: `long-${index}-${salt}-${chainIndex}`,
            parentId: chainIndex === 0 ? null : `long-${index}-${salt}-${chainIndex - 1}`,
          }));
          expect(countStructuralLineageRoots(lineage)).toEqual({ status: "ok", structuralRoots: 1 });
          expect(countVerifiedIndependentEvidenceFamilies(lineage, [verifiedRoot(lineage[0]!.id)])).toEqual({ status: "ok", independentFamilies: 1 });
          break;
        }
        case 2: {
          const second = `second-${index}-${salt}`;
          const lineage = [
            { id: child, parentId: root },
            { id: second, parentId: null },
            { id: root, parentId: null },
          ];
          expect(countStructuralLineageRoots(lineage)).toEqual({ status: "ok", structuralRoots: 2 });
          expect(countVerifiedIndependentEvidenceFamilies(lineage, [verifiedRoot(root), verifiedRoot(second)])).toEqual({ status: "ok", independentFamilies: 2 });
          break;
        }
        case 3:
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [{
            ...verifiedRoot(root),
            resolutionReceiptReference: "",
          }])).toEqual({ status: "unknown_independence" });
          break;
        case 4:
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [{
            sourceFamilyId: root,
            independence: "known_derived",
            resolutionReceiptReference: `derived-${index}`,
          }])).toEqual({ status: "unknown_independence" });
          break;
        case 5:
          expect(countStructuralLineageRoots([{ id: root, parentId: child }, { id: child, parentId: root }])).toEqual({ status: "invalid", reason: "cycle" });
          break;
        case 6: {
          const a = verifiedRoot(root);
          const b = { ...a, resolutionReceiptReference: `different-${index}` };
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [a, b])).toEqual({ status: "invalid", reason: "duplicate_resolution" });
          expect(countVerifiedIndependentEvidenceFamilies([{ id: root, parentId: null }], [b, a])).toEqual({ status: "invalid", reason: "duplicate_resolution" });
          break;
        }
        default:
          expect(countStructuralLineageRoots([{ id: root, parentId: "\n\t" }])).toEqual({ status: "invalid", reason: "empty_parent_id" });
      }
    }
  });

  it("retains metric semantic-abstention depth across every definition field", () => {
    const next = createPrng();
    const fields: readonly (keyof MetricDefinition)[] = [
      "numerator",
      "denominator",
      "population",
      "jurisdictionScope",
      "timeBasis",
      "unit",
      "methodology",
    ];
    for (let index = 0; index < DEPTH_CASE_COUNTS.metric; index += 1) {
      const left = metricBase(index, next());
      const field = fields[index % fields.length]!;
      switch (index % 5) {
        case 0:
          expect(compareMetricDefinitions(left, { ...left, [field]: `${left[field]} changed-${index}` })).toBe("requires_harmonization");
          break;
        case 1:
          expect(compareMetricDefinitions(left, { ...left, [field]: "   " })).toBe("unknown");
          break;
        case 2:
          expect(compareMetricDefinitions(left, { ...left, metricKey: `different-${index}` })).toBe("incompatible");
          break;
        case 3:
          expect(compareMetricDefinitions(left, { ...left, numerator: `\u00a0${left.numerator.replaceAll(" ", "\u2009\u2009")}\u00a0` })).toBe("compatible");
          break;
        default:
          expect(compareMetricDefinitions(left, { ...left, methodology: `translated label ${index}` })).toBe("requires_harmonization");
      }
    }
  });

  it("retains owner registry depth including missing, duplicate and task-owner attacks", () => {
    for (let index = 0; index < DEPTH_CASE_COUNTS.owner; index += 1) {
      const entries = cloneOwners();
      const targetIndex = index % entries.length;
      const target = entries[targetIndex]!;
      switch (index % 8) {
        case 0:
          expect(validateArchitectureOwners(entries)).toBe(true);
          break;
        case 1:
          expect(validateArchitectureOwners(entries.slice(1))).toBe(false);
          break;
        case 2:
          entries[targetIndex] = { ...target, concept: entries[(targetIndex + 1) % entries.length]!.concept };
          expect(validateArchitectureOwners(entries)).toBe(false);
          break;
        case 3:
          entries[targetIndex] = { ...target, concept: "UnknownConcept" as never };
          expect(validateArchitectureOwners(entries)).toBe(false);
          break;
        case 4:
          entries[targetIndex] = { ...target, laterTaskOwner: target.laterTaskOwner === "T1" ? "T2" : "T1" };
          expect(validateArchitectureOwners(entries)).toBe(false);
          break;
        case 5:
          entries[targetIndex] = { ...target, allowedReferences: [...target.allowedReferences, target.allowedReferences[0]!] };
          expect(validateArchitectureOwners(entries)).toBe(false);
          break;
        case 6:
          entries[targetIndex] = { ...target, allowedReferences: [""] };
          expect(validateArchitectureOwners(entries)).toBe(false);
          break;
        default:
          entries[targetIndex] = { ...target, canonicalOwner: "parallel owner" };
          expect(validateArchitectureOwners(entries)).toBe(false);
      }
    }
  });

  it("retains readiness depth across evidence, review, materiality and metric provenance states", () => {
    const next = createPrng();
    const assessmentStatuses = ["contested", "contradicted", "insufficient", "unknown"] as const;
    const reviewStatuses = ["pending", "rejected", "unknown"] as const;
    const freshnessStatuses = ["stale", "unknown"] as const;
    for (let index = 0; index < DEPTH_CASE_COUNTS.readiness; index += 1) {
      const values = completeSet(`depth-${index}`);
      const target = REQUIRED_DECISION_DIMENSIONS[next() % REQUIRED_DECISION_DIMENSIONS.length]!;
      const metric = "metric" as const;
      switch (index % 12) {
        case 0:
          expect(decisionReady(values)).toBe(true);
          break;
        case 1:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, assessmentStatus: assessmentStatuses[index % assessmentStatuses.length]! } })))).toBe(false);
          break;
        case 2:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, reviewStatus: reviewStatuses[index % reviewStatuses.length]! } })))).toBe(false);
          break;
        case 3:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, freshnessStatus: freshnessStatuses[index % freshnessStatuses.length]! } })))).toBe(false);
          break;
        case 4:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, conflictStatus: "open" } })))).toBe(false);
          break;
        case 5:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, evidenceResolution: { ...value.evidenceResolution!, publicationClassification: "publishable_as_open_hypothesis" } })))).toBe(false);
          break;
        case 6:
          expect(decisionReady(replaceKey(values, metric, (value) => ({ ...value, provenance: { ...value.provenance!, period: "" } })))).toBe(false);
          break;
        case 7:
          expect(decisionReady(replaceKey(values, metric, (value) => ({ ...value, provenance: { ...value.provenance!, sourceReference: "" } })))).toBe(false);
          break;
        case 8:
          expect(decisionReady(values.filter((value) => value.key !== target))).toBe(false);
          break;
        case 9:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, materiality: { ...value.materiality, reviewStatus: "pending" } })))).toBe(false);
          break;
        case 10:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, revision: null })))).toBe(false);
          break;
        default:
          expect(decisionReady(replaceKey(values, target, (value) => ({ ...value, status: "unknown", gap: "unknown material state" })))).toBe(false);
      }
    }
  });

  it("retains binding depth including order-insensitivity and additions/deletions", () => {
    const next = createPrng();
    for (let index = 0; index < DEPTH_CASE_COUNTS.binding; index += 1) {
      const base = {
        boundRevision: `dossier-${index}-${next()}`,
        materialRevisions: {
          dossier: `dossier-${index}`,
          metric: `metric-${index}`,
          projection: `projection-${index}`,
        },
      };
      switch (index % 6) {
        case 0:
          expect(isBindingStale(base, { boundRevision: base.boundRevision, materialRevisions: { projection: base.materialRevisions.projection, dossier: base.materialRevisions.dossier, metric: base.materialRevisions.metric } })).toBe(false);
          break;
        case 1:
          expect(isBindingStale(base, { ...base, materialRevisions: { ...base.materialRevisions, comparator: `comparator-${index}` } })).toBe(true);
          break;
        case 2:
          expect(isBindingStale(base, { ...base, materialRevisions: { dossier: base.materialRevisions.dossier, metric: base.materialRevisions.metric } })).toBe(true);
          break;
        case 3:
          expect(isBindingStale(base, { ...base, boundRevision: "" })).toBe(true);
          break;
        case 4:
          expect(isBindingStale(base, { ...base, materialRevisions: { ...base.materialRevisions, metric: "" } })).toBe(true);
          break;
        default:
          expect(isBindingStale(base, { ...base, materialRevisions: { ...base.materialRevisions, metric: `changed-${index}` } })).toBe(true);
      }
    }
  });

  it("retains cross-domain fail-closed attacks with zero unsafe acceptances", () => {
    let unsafeAcceptances = 0;
    for (let index = 0; index < DEPTH_CASE_COUNTS.crossDomain; index += 1) {
      const suffix = `cross-${index}`;
      const canonical = resolution(suffix);
      const provenance = metricProvenance(suffix);
      const reject = (value: boolean) => {
        if (value) unsafeAcceptances += 1;
        expect(value).toBe(false);
      };
      switch (index % 5) {
        case 0:
          reject(canPresentAsVerifiedFact("FACT", { ...canonical, resolutionReceiptReference: null }));
          break;
        case 1:
          reject(canPresentAsVerifiedMeasurement("MEASURED_VALUE", canonical, { ...provenance, denominator: "" }));
          break;
        case 2:
          reject(evaluateComparator({ jurisdiction: "Sweden", targetJurisdiction: " ", institutions: ["income pension"], contributionDefinition: "contribution", benefitDefinition: "benefit", originalLanguage: "sv", readingLanguage: "de" }).referenceable);
          break;
        case 3:
          reject(decisionReady(replaceKey(completeSet(suffix), "metric", (value) => ({ ...value, provenance: undefined }))));
          break;
        default: {
          const family = `family-${index}`;
          const result = countVerifiedIndependentEvidenceFamilies([{ id: family, parentId: null }], [{ sourceFamilyId: family, independence: "independence_unknown", resolutionReceiptReference: null }]);
          if (result.status === "ok") unsafeAcceptances += 1;
          expect(result).toEqual({ status: "unknown_independence" });
        }
      }
    }
    expect(unsafeAcceptances).toBe(0);
  });
});
