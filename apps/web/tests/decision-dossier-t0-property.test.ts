import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ATOMIC_CLAIM_TYPES,
  PUBLICATION_CLASSIFICATIONS,
  resolvePublicationClassification,
  type AtomicClaim,
  type EvidenceAssessment,
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
  type CanonicalMaterialityReviewResolution,
  type DecisionBindingSnapshot,
  type MaterialDimension,
  type MaterialityDecision,
  type MetricCompatibility,
  type MetricDefinition,
  type OwnerEntry,
  type SourceIndependenceResolution,
  type SourceLineage,
} from "@features/dossier/decisionDossierArchitectureContract";

/** Fixed LCG seed: reproducible adversarial cases without a property-test dependency. */
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

const createPrng = (seed = PROPERTY_SEED) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
};

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

const materiality = (suffix = "base"): MaterialityDecision => ({
  classification: "material",
  rationale: `Material for decision ${suffix}`,
  basisReference: null,
  reviewStatus: "reviewed",
  reviewedBy: `reviewer-${suffix}`,
  revision: `materiality-revision-${suffix}`,
});

const canonicalNonMateriality = (suffix = "base"): MaterialityDecision => ({
  classification: "non_material",
  rationale: `Canonically excluded ${suffix}`,
  basisReference: `materiality-basis-${suffix}`,
  reviewStatus: "reviewed",
  reviewedBy: `reviewer-${suffix}`,
  revision: `materiality-revision-${suffix}`,
  canonicalReviewResolution: {
    canonicalOwner: "Dossier/Atomic evidence context",
    reviewStatus: "verified",
    basisStatus: "verified",
    revision: `materiality-resolution-${suffix}`,
    receiptReference: `materiality-receipt-${suffix}`,
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
  reviewStatus: "reviewed",
  gap: null,
  freshness: "fresh",
  revision: `dimension-revision-${suffix}`,
});

const completeDimensions = (suffix = "base"): MaterialDimension[] =>
  REQUIRED_DECISION_DIMENSIONS.map((key, index) =>
    completeDimension(key, `${suffix}-${index}`),
  );

const canonicalNonMaterialDimension = (
  value: MaterialDimension,
  suffix: string,
  materialityPatch: Partial<MaterialityDecision> = {},
  reviewPatch: Partial<CanonicalMaterialityReviewResolution> = {},
): MaterialDimension => {
  const reviewedNonMateriality = canonicalNonMateriality(suffix);
  return {
    ...value,
    materiality: {
      ...reviewedNonMateriality,
      ...materialityPatch,
      canonicalReviewResolution: {
        ...reviewedNonMateriality.canonicalReviewResolution!,
        ...reviewPatch,
      },
    },
    status: "unknown",
    evidenceReferences: [],
    evidenceResolution: undefined,
    freshness: "unknown",
    revision: null,
    gap: "reviewed non-material exclusion",
  };
};

const replaceDimension = (
  values: readonly MaterialDimension[],
  index: number,
  replace: (value: MaterialDimension) => MaterialDimension,
): MaterialDimension[] => {
  const target = values[index % values.length]?.key;
  return values.map((value) => (value.key === target ? replace(value) : value));
};

const withResolution = (
  value: MaterialDimension,
  patch: Partial<CanonicalEvidenceResolution>,
): MaterialDimension => {
  if (!value.evidenceResolution) throw new Error("property fixture requires evidence resolution");
  return { ...value, evidenceResolution: { ...value.evidenceResolution, ...patch } };
};

type LineageExpectation =
  | { kind: "invalid" }
  | { kind: "unknown"; structuralRoots: number }
  | { kind: "verified"; structuralRoots: number; independentFamilies: number };

type GeneratedLineageCase = Readonly<{
  lineage: readonly SourceLineage[];
  resolutions: readonly SourceIndependenceResolution[];
  expected: LineageExpectation;
}>;

const verifiedRoot = (sourceFamilyId: string): SourceIndependenceResolution => ({
  sourceFamilyId,
  independence: "verified_independent_root",
  resolutionReceiptReference: `independence-receipt-${sourceFamilyId}`,
});

const generateLineageCase = (
  index: number,
  next: () => number,
): GeneratedLineageCase => {
  const salt = next().toString(36);
  const root = `root-${index}-${salt}`;
  const child = `child-${index}-${salt}`;
  const grandchild = `repost-${index}-${salt}`;

  switch (index % 13) {
    case 0:
      return {
        lineage: [
          { id: root, parentId: null },
          { id: child, parentId: root },
          { id: grandchild, parentId: child },
        ],
        resolutions: [verifiedRoot(root)],
        expected: { kind: "verified", structuralRoots: 1, independentFamilies: 1 },
      };
    case 1: {
      const secondRoot = `second-root-${index}-${salt}`;
      return {
        lineage: [
          { id: root, parentId: null },
          { id: child, parentId: root },
          { id: secondRoot, parentId: null },
        ],
        resolutions: [verifiedRoot(root), verifiedRoot(secondRoot)],
        expected: { kind: "verified", structuralRoots: 2, independentFamilies: 2 },
      };
    }
    case 2:
      return {
        lineage: [{ id: root, parentId: null }, { id: child, parentId: root }],
        resolutions: [
          {
            sourceFamilyId: root,
            independence: "independence_unknown",
            resolutionReceiptReference: null,
          },
        ],
        expected: { kind: "unknown", structuralRoots: 1 },
      };
    case 3:
      return {
        lineage: [
          { id: root, parentId: null },
          { id: `translation-${index}-${salt}`, parentId: root },
          { id: grandchild, parentId: `translation-${index}-${salt}` },
        ],
        resolutions: [
          verifiedRoot(root),
          {
            sourceFamilyId: `translation-${index}-${salt}`,
            independence: "known_derived",
            resolutionReceiptReference: `derived-receipt-${index}`,
          },
        ],
        expected: { kind: "verified", structuralRoots: 1, independentFamilies: 1 },
      };
    case 4:
      return {
        lineage: [{ id: root, parentId: null }, { id: child, parentId: root }],
        resolutions: [
          {
            sourceFamilyId: root,
            independence: "known_derived",
            resolutionReceiptReference: `derived-receipt-${index}`,
          },
        ],
        expected: { kind: "unknown", structuralRoots: 1 },
      };
    case 5:
      return {
        lineage: [{ id: root, parentId: null }, { id: child, parentId: root }],
        resolutions: [
          {
            sourceFamilyId: root,
            independence: "verified_independent_root",
            resolutionReceiptReference: index % 2 === 0 ? null : "",
          },
        ],
        expected: { kind: "unknown", structuralRoots: 1 },
      };
    case 6:
      return {
        lineage: [{ id: child, parentId: `missing-${index}` }],
        resolutions: [],
        expected: { kind: "invalid" },
      };
    case 7:
      return {
        lineage: [{ id: root, parentId: root }],
        resolutions: [],
        expected: { kind: "invalid" },
      };
    case 8:
      return {
        lineage: [
          { id: root, parentId: child },
          { id: child, parentId: grandchild },
          { id: grandchild, parentId: root },
        ],
        resolutions: [],
        expected: { kind: "invalid" },
      };
    case 9:
      return {
        lineage: [{ id: root, parentId: null }, { id: root, parentId: null }],
        resolutions: [],
        expected: { kind: "invalid" },
      };
    case 10:
      return {
        lineage: [{ id: "", parentId: null }],
        resolutions: [],
        expected: { kind: "invalid" },
      };
    case 11: {
      const length = 32 + (next() % 64);
      const lineage = Array.from({ length }, (_, chainIndex) => ({
        id: `long-${index}-${salt}-${chainIndex}`,
        parentId:
          chainIndex === 0 ? null : `long-${index}-${salt}-${chainIndex - 1}`,
      }));
      return {
        lineage,
        resolutions: [verifiedRoot(lineage[0]!.id)],
        expected: { kind: "verified", structuralRoots: 1, independentFamilies: 1 },
      };
    }
    default: {
      const secondRoot = `unordered-root-${index}-${salt}`;
      const ordered = [
        { id: root, parentId: null },
        { id: child, parentId: root },
        { id: secondRoot, parentId: null },
        { id: grandchild, parentId: secondRoot },
      ];
      const split = 1 + (next() % (ordered.length - 1));
      return {
        lineage: [...ordered.slice(split), ...ordered.slice(0, split)],
        resolutions: [verifiedRoot(root), verifiedRoot(secondRoot)],
        expected: { kind: "verified", structuralRoots: 2, independentFamilies: 2 },
      };
    }
  }
};

const METRIC_FIELDS: readonly (keyof MetricDefinition)[] = [
  "numerator",
  "denominator",
  "population",
  "jurisdictionScope",
  "timeBasis",
  "unit",
  "methodology",
];

const metricBase = (index: number, salt: number): MetricDefinition => ({
  metricKey: `replacement_rate_${index % 17}`,
  numerator: `statutory pension ${salt % 11}`,
  denominator: `net income ${index % 13}`,
  population: `insured people ${index % 7}`,
  jurisdictionScope: `Germany ${index % 5}`,
  timeBasis: `period-${index % 9}`,
  unit: "%",
  methodology: `net replacement rate ${index % 19}`,
});

const generateMetricCase = (
  index: number,
  next: () => number,
): Readonly<{ left: MetricDefinition; right: MetricDefinition; expected: MetricCompatibility }> => {
  const left = metricBase(index, next());
  const field = METRIC_FIELDS[index % METRIC_FIELDS.length]!;

  switch (index % 13) {
    case 0:
      return {
        left,
        right: { ...left, metricKey: `  ${left.metricKey.toUpperCase()}  ` },
        expected: "compatible",
      };
    case 1:
      return {
        left,
        right: {
          ...left,
          numerator: `\u00a0${left.numerator.replace(" ", "\u2009\u2009")}\u00a0`,
        },
        expected: "compatible",
      };
    case 2:
      return {
        left,
        right: { ...left, denominator: `  ${left.denominator.replace(" ", "   ")}  ` },
        expected: "compatible",
      };
    case 3:
      return {
        left,
        right: { ...left, [field]: `${left[field]} changed-${index}` },
        expected: "requires_harmonization",
      };
    case 4:
      return {
        left,
        right: { ...left, [field]: "" },
        expected: "unknown",
      };
    case 5:
      return {
        left,
        right: { ...left, metricKey: `different_metric_key_${index}` },
        expected: "incompatible",
      };
    case 6:
      return {
        left,
        right: { ...left, unit: "percentage points" },
        expected: "requires_harmonization",
      };
    case 7:
      return {
        left,
        right: { ...left, methodology: `Nettoersatzrate ${index}` },
        expected: "requires_harmonization",
      };
    case 8:
      return {
        left,
        right: { ...left, denominator: `different denominator ${index}` },
        expected: "requires_harmonization",
      };
    case 9:
      return {
        left,
        right: { ...left, population: `different population ${index}` },
        expected: "requires_harmonization",
      };
    case 10:
      return {
        left,
        right: { ...left, timeBasis: `different period ${index}` },
        expected: "requires_harmonization",
      };
    case 11:
      return {
        left,
        right: { ...left, methodology: `same label, different definition ${index}` },
        expected: "requires_harmonization",
      };
    default:
      return {
        left,
        right: { ...left, metricKey: `translated-label-without-inference-${index}` },
        expected: "incompatible",
      };
  }
};

const cloneOwners = (): OwnerEntry[] =>
  DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => ({
    ...entry,
    allowedReferences: [...entry.allowedReferences],
  }));

const generateOwnerCase = (
  index: number,
): Readonly<{ entries: readonly OwnerEntry[]; expected: boolean }> => {
  const entries = cloneOwners();
  const entryIndex = index % entries.length;
  const entry = entries[entryIndex]!;
  const alternateTask = entry.laterTaskOwner === "T1" ? "T2" : "T1";

  switch (index % 15) {
    case 0: {
      const multiReferenceIndex = entries.findIndex(
        (candidate) => candidate.allowedReferences.length > 1,
      );
      const multiReferenceEntry = entries[multiReferenceIndex]!;
      entries[multiReferenceIndex] = {
        ...multiReferenceEntry,
        allowedReferences: [...multiReferenceEntry.allowedReferences].reverse(),
      };
      return { entries, expected: true };
    }
    case 1:
      return { entries: entries.slice(1), expected: false };
    case 2:
      entries[entryIndex] = {
        ...entry,
        concept: entries[(entryIndex + 1) % entries.length]!.concept,
      };
      return { entries, expected: false };
    case 3:
      entries[entryIndex] = { ...entry, concept: "UnknownConcept" as never };
      return { entries, expected: false };
    case 4:
      entries[entryIndex] = { ...entry, canonicalOwner: `mutated-owner-${index}` };
      return { entries, expected: false };
    case 5:
      entries[entryIndex] = { ...entry, canonicalReference: "" };
      return { entries, expected: false };
    case 6:
      entries[entryIndex] = {
        ...entry,
        canonicalReference: `mutated-reference-${index}`,
      };
      return { entries, expected: false };
    case 7:
      entries[entryIndex] = {
        ...entry,
        t0Responsibility: `mutated-responsibility-${index}`,
      };
      return { entries, expected: false };
    case 8:
      entries[entryIndex] = { ...entry, laterTaskOwner: alternateTask };
      return { entries, expected: false };
    case 9:
      entries[entryIndex] = {
        ...entry,
        allowedReferences: [...entry.allowedReferences, `extra-reference-${index}`],
      };
      return { entries, expected: false };
    case 10:
      entries[entryIndex] = {
        ...entry,
        allowedReferences: [...entry.allowedReferences, entry.allowedReferences[0]!],
      };
      return { entries, expected: false };
    case 11:
      entries[entryIndex] = { ...entry, allowedReferences: [""] };
      return { entries, expected: false };
    case 12:
      entries[entryIndex] = {
        ...entry,
        forbiddenOwnershipDuplication: `parallel-owner-${index}`,
      };
      return { entries, expected: false };
    case 13:
      entries[entryIndex] = { ...entry, revisionSensitive: !entry.revisionSensitive };
      return { entries, expected: false };
    default:
      entries[entryIndex] = { ...entry, readinessRelevant: !entry.readinessRelevant };
      return { entries, expected: false };
  }
};

const generateReadinessCase = (
  index: number,
): Readonly<{ values: readonly MaterialDimension[]; expected: boolean }> => {
  const values = completeDimensions(`readiness-${index}`);
  const targetIndex = index % values.length;
  const replace = (mutate: (value: MaterialDimension) => MaterialDimension) =>
    replaceDimension(values, targetIndex, mutate);

  switch (index % 37) {
    case 0:
      return { values, expected: true };
    case 1:
      return { values: replace((value) => withResolution(value, { relationStatus: "unresolved" })), expected: false };
    case 2:
      return { values: replace((value) => withResolution(value, { relationStatus: "invalid" })), expected: false };
    case 3:
      return { values: replace((value) => withResolution(value, { assessmentStatus: "contested" })), expected: false };
    case 4:
      return { values: replace((value) => withResolution(value, { assessmentStatus: "contradicted" })), expected: false };
    case 5:
      return { values: replace((value) => withResolution(value, { assessmentStatus: "insufficient" })), expected: false };
    case 6:
      return { values: replace((value) => withResolution(value, { assessmentStatus: "unknown" })), expected: false };
    case 7:
      return { values: replace((value) => withResolution(value, { reviewStatus: "pending" })), expected: false };
    case 8:
      return { values: replace((value) => withResolution(value, { reviewStatus: "rejected" })), expected: false };
    case 9:
      return { values: replace((value) => withResolution(value, { reviewStatus: "unknown" })), expected: false };
    case 10:
      return { values: replace((value) => withResolution(value, { freshnessStatus: "stale" })), expected: false };
    case 11:
      return { values: replace((value) => withResolution(value, { freshnessStatus: "unknown" })), expected: false };
    case 12:
      return { values: replace((value) => withResolution(value, { conflictStatus: "open" })), expected: false };
    case 13:
      return { values: replace((value) => withResolution(value, { conflictStatus: "unresolved" })), expected: false };
    case 14:
      return { values: replace((value) => withResolution(value, { resolutionReceiptReference: null })), expected: false };
    case 15:
      return { values: replace((value) => ({ ...value, revision: null })), expected: false };
    case 16:
      return { values: replace((value) => ({ ...value, status: "gap", gap: "material gap" })), expected: false };
    case 17:
      return { values: replace((value) => ({ ...value, status: "unknown", gap: "unknown material state" })), expected: false };
    case 18:
      return {
        values: replace((value) => ({
          ...value,
          evidenceReferences: [`raw-evidence-${index}`],
          evidenceResolution: undefined,
        })),
        expected: false,
      };
    case 19:
      return {
        values: replace((value) => ({
          ...value,
          materiality: {
            classification: "non_material",
            rationale: "raw reviewed string only",
            basisReference: `raw-basis-${index}`,
            reviewStatus: "reviewed",
            reviewedBy: `raw-reviewer-${index}`,
            revision: `raw-review-${index}`,
            canonicalReviewResolution: null,
          },
          status: "unknown",
          evidenceReferences: [],
          evidenceResolution: undefined,
          freshness: "fresh",
          gap: "raw reviewer string",
        })),
        expected: false,
      };
    case 20:
      return {
        values: replace((value) => ({
          ...withResolution(value, { freshnessStatus: "stale" }),
          freshness: "fresh",
        })),
        expected: false,
      };
    case 21:
      return { values: values.filter((_, dimensionIndex) => dimensionIndex !== targetIndex), expected: false };
    case 22: {
      const duplicateKey = values[(targetIndex + 1) % values.length]!.key;
      return {
        values: values.map((value, dimensionIndex) =>
          dimensionIndex === targetIndex ? { ...value, key: duplicateKey } : value,
        ),
        expected: false,
      };
    }
    case 23:
      return {
        values: replace((value) => ({
          ...value,
          materiality: {
            ...canonicalNonMateriality(`unverified-${index}`),
            canonicalReviewResolution: {
              canonicalOwner: "Dossier/Atomic evidence context",
              reviewStatus: "pending",
              basisStatus: "verified",
              revision: `unverified-materiality-${index}`,
              receiptReference: `unverified-receipt-${index}`,
            },
          },
          status: "unknown",
          evidenceReferences: [],
          evidenceResolution: undefined,
          freshness: "unknown",
          revision: null,
          gap: "unverified non-material exclusion",
        })),
        expected: false,
      };
    case 24:
      return {
        values: replace((value) =>
          withResolution(value, {
            publicationClassification: "publishable_as_open_hypothesis",
          }),
        ),
        expected: false,
      };
    case 25:
      return { values: replace((value) => ({ ...value, reviewStatus: "pending" })), expected: false };
    case 26:
      return { values: replace((value) => ({ ...value, reviewStatus: "rejected" })), expected: false };
    case 27:
      return {
        values: replace((value) => ({
          ...value,
          materiality: { ...value.materiality, reviewStatus: "pending" },
        })),
        expected: false,
      };
    case 28:
      return {
        values: replace((value) => ({
          ...value,
          materiality: { ...value.materiality, reviewStatus: "rejected" },
        })),
        expected: false,
      };
    case 29:
      return {
        values: replace((value) => ({
          ...value,
          materiality: { ...value.materiality, revision: null },
        })),
        expected: false,
      };
    case 30:
      return { values: replace((value) => withResolution(value, { revision: null })), expected: false };
    case 31:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `wrong-owner-${index}`, {}, {
            canonicalOwner: "parallel materiality owner" as never,
          }),
        ),
        expected: false,
      };
    case 32:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `pending-review-${index}`, {}, {
            reviewStatus: "pending",
          }),
        ),
        expected: false,
      };
    case 33:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `unresolved-basis-${index}`, {}, {
            basisStatus: "unresolved",
          }),
        ),
        expected: false,
      };
    case 34:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `revisionless-review-${index}`, {}, {
            revision: null,
          }),
        ),
        expected: false,
      };
    case 35:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `receiptless-review-${index}`, {}, {
            receiptReference: null,
          }),
        ),
        expected: false,
      };
    default:
      return {
        values: replace((value) =>
          canonicalNonMaterialDimension(value, `valid-non-material-${index}`),
        ),
        expected: true,
      };
  }
};

const bindingBase = (suffix = "base"): DecisionBindingSnapshot => ({
  boundRevision: `dossier-${suffix}`,
  materialRevisions: {
    dossier: `dossier-${suffix}`,
    metric: `metric-${suffix}`,
    projection: `projection-${suffix}`,
  },
});

const generateBindingCase = (
  index: number,
): Readonly<{ binding: DecisionBindingSnapshot; current: DecisionBindingSnapshot; expected: boolean }> => {
  const binding = bindingBase(`binding-${index}`);
  const reordered: DecisionBindingSnapshot = {
    boundRevision: binding.boundRevision,
    materialRevisions: {
      projection: binding.materialRevisions.projection!,
      dossier: binding.materialRevisions.dossier!,
      metric: binding.materialRevisions.metric!,
    },
  };

  switch (index % 11) {
    case 0:
      return { binding, current: bindingBase(`binding-${index}`), expected: false };
    case 1:
      return { binding, current: reordered, expected: false };
    case 2:
      return { binding, current: { ...binding, boundRevision: `changed-${index}` }, expected: true };
    case 3:
      return {
        binding,
        current: {
          ...binding,
          materialRevisions: { ...binding.materialRevisions, metric: `changed-${index}` },
        },
        expected: true,
      };
    case 4:
      return {
        binding,
        current: {
          ...binding,
          materialRevisions: { ...binding.materialRevisions, comparator: `added-${index}` },
        },
        expected: true,
      };
    case 5:
      return {
        binding,
        current: {
          ...binding,
          materialRevisions: {
            dossier: binding.materialRevisions.dossier!,
            metric: binding.materialRevisions.metric!,
          },
        },
        expected: true,
      };
    case 6:
      return { binding: { ...binding, boundRevision: "" }, current: binding, expected: true };
    case 7:
      return { binding, current: { ...binding, boundRevision: "" }, expected: true };
    case 8:
      return {
        binding: {
          ...binding,
          materialRevisions: { ...binding.materialRevisions, "": `empty-key-${index}` },
        },
        current: binding,
        expected: true,
      };
    case 9:
      return {
        binding,
        current: {
          ...binding,
          materialRevisions: { ...binding.materialRevisions, metric: "" },
        },
        expected: true,
      };
    default:
      return {
        binding,
        current: {
          ...binding,
          materialRevisions: { ...binding.materialRevisions, [`changed-key-${index}`]: `value-${index}` },
        },
        expected: true,
      };
  }
};

describe("decision dossier T0 permanent deterministic property hardening", () => {
  it("documents a fixed seed and at least 2,750 generated property cases", () => {
    expect(PROPERTY_SEED).toBe(0xEDEB0796);
    expect(Object.values(PROPERTY_CASE_COUNTS).reduce((total, count) => total + count, 0)).toBe(
      TOTAL_PROPERTY_CASES,
    );
  });

  it("covers 500 lineage mutations without turning structural roots into verified independence", () => {
    const next = createPrng();

    for (let index = 0; index < PROPERTY_CASE_COUNTS.lineage; index += 1) {
      const { lineage, resolutions, expected } = generateLineageCase(index, next);
      const structural = countStructuralLineageRoots(lineage);
      const verified = countVerifiedIndependentEvidenceFamilies(lineage, resolutions);

      if (expected.kind === "invalid") {
        expect(structural.status).toBe("invalid");
        expect(verified.status).not.toBe("ok");
      } else if (expected.kind === "unknown") {
        expect(structural).toEqual({ status: "ok", structuralRoots: expected.structuralRoots });
        expect(verified).toEqual({ status: "unknown_independence" });
      } else {
        expect(structural).toEqual({ status: "ok", structuralRoots: expected.structuralRoots });
        expect(verified).toEqual({
          status: "ok",
          independentFamilies: expected.independentFamilies,
        });
      }
    }
  });

  it("covers 500 metric-definition mutations without inferring semantic equivalence", () => {
    const next = createPrng();

    for (let index = 0; index < PROPERTY_CASE_COUNTS.metric; index += 1) {
      const generated = generateMetricCase(index, next);
      expect(compareMetricDefinitions(generated.left, generated.right)).toBe(generated.expected);
    }
  });

  it("covers 500 owner-registry mutations without permitting parallel ownership", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.owner; index += 1) {
      const generated = generateOwnerCase(index);
      expect(validateArchitectureOwners(generated.entries)).toBe(generated.expected);
    }
  });

  it("covers 500 readiness mutations and keeps valid canonical sets reachable", () => {
    let validCases = 0;

    for (let index = 0; index < PROPERTY_CASE_COUNTS.readiness; index += 1) {
      const generated = generateReadinessCase(index);
      if (generated.expected) validCases += 1;
      expect(decisionReady(generated.values)).toBe(generated.expected);
    }

    expect(validCases).toBeGreaterThan(0);
  });

  it("covers 500 binding mutations and fails closed for malformed revisions", () => {
    for (let index = 0; index < PROPERTY_CASE_COUNTS.binding; index += 1) {
      const generated = generateBindingCase(index);
      expect(isBindingStale(generated.binding, generated.current)).toBe(generated.expected);
    }
  });

  it("covers 250 cross-domain attacks with zero unsafe acceptances", () => {
    let unsafeAcceptances = 0;
    const mustReject = (value: boolean) => {
      if (value) unsafeAcceptances += 1;
      expect(value).toBe(false);
    };

    for (let index = 0; index < PROPERTY_CASE_COUNTS.crossDomain; index += 1) {
      switch (index % 8) {
        case 0: {
          const fakeResolution = {
            ...canonicalResolution(`fake-${index}`),
            evidenceReference: `raw-evidence-${index}`,
            resolutionReceiptReference: null,
          };
          mustReject(canPresentAsVerifiedFact("FACT", fakeResolution));
          mustReject(
            decisionReady(
              replaceDimension(completeDimensions(`fake-${index}`), index, (value) => ({
                ...value,
                evidenceReferences: [`raw-evidence-${index}`],
                evidenceResolution: undefined,
                reviewStatus: "reviewed",
                freshness: "fresh",
              })),
            ),
          );
          break;
        }
        case 1:
          mustReject(canRenderClaimForm("UNKNOWN", "factual_claim"));
          mustReject(
            decisionReady(
              replaceDimension(completeDimensions(`unknown-${index}`), index, (value) => ({
                ...value,
                status: "unknown",
                evidenceReferences: Array.from({ length: 10 }, (_, referenceIndex) => `raw-${referenceIndex}`),
                evidenceResolution: undefined,
                freshness: "unknown",
                gap: "unknown despite many raw references",
              })),
            ),
          );
          break;
        case 2:
          mustReject(
            canPresentAsVerifiedFact("NORMATIVE_JUDGMENT", canonicalResolution(`normative-${index}`)),
          );
          break;
        case 3: {
          const lineage = Array.from({ length: 50 }, (_, sourceIndex) => ({
            id: `repost-${index}-${sourceIndex}`,
            parentId: sourceIndex === 0 ? null : `repost-${index}-${sourceIndex - 1}`,
          }));
          expect(countStructuralLineageRoots(lineage)).toEqual({ status: "ok", structuralRoots: 1 });
          const verified = countVerifiedIndependentEvidenceFamilies(lineage, [
            {
              sourceFamilyId: lineage[0]!.id,
              independence: "independence_unknown",
              resolutionReceiptReference: null,
            },
          ]);
          if (verified.status === "ok") unsafeAcceptances += 1;
          expect(verified).toEqual({ status: "unknown_independence" });
          break;
        }
        case 4:
          mustReject(
            canPresentAsVerifiedFact("FACT", {
              ...canonicalResolution(`stale-${index}`),
              freshnessStatus: "stale",
              revision: `current-looking-revision-${index}`,
            }),
          );
          break;
        case 5:
          mustReject(
            decisionReady(
              replaceDimension(completeDimensions(`non-material-${index}`), index, (value) => ({
                ...value,
                materiality: {
                  ...canonicalNonMateriality(`fake-${index}`),
                  canonicalReviewResolution: {
                    canonicalOwner: "Dossier/Atomic evidence context",
                    reviewStatus: "pending",
                    basisStatus: "verified",
                    revision: `fake-${index}`,
                    receiptReference: null,
                  },
                },
                status: "unknown",
                evidenceReferences: [],
                evidenceResolution: undefined,
                freshness: "unknown",
                gap: "unverified non-material exclusion",
              })),
            ),
          );
          break;
        case 6:
          mustReject(
            decisionReady(
              replaceDimension(completeDimensions(`conflict-${index}`), index, (value) =>
                withResolution(value, { conflictStatus: "unresolved" }),
              ),
            ),
          );
          break;
        default:
          mustReject(
            canPresentAsVerifiedMeasurement("PROJECTION", canonicalResolution(`projection-${index}`)),
          );
      }
    }

    expect(unsafeAcceptances).toBe(0);
  });

  it("guards canonical AtomicClaim vocabulary and keeps T0-only categories non-persisted", () => {
    expect(Object.keys(CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY).sort()).toEqual(
      [...ATOMIC_CLAIM_TYPES].sort(),
    );
    for (const atomicClaimType of ATOMIC_CLAIM_TYPES) {
      expect(mapCanonicalAtomicClaimType(atomicClaimType)).toBe(
        CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY[atomicClaimType],
      );
    }
    expect(CANONICAL_ATOMIC_CLAIM_TYPE_TO_T0_CATEGORY.quantified_claim).toBe("FACT");
    for (const category of T0_DERIVED_EPISTEMIC_CATEGORIES) {
      expect(ATOMIC_CLAIM_TYPES.includes(category as never)).toBe(false);
    }
  });

  it("consumes canonical publication classification without becoming its owner", () => {
    const claim: AtomicClaim = {
      id: "publication-boundary-claim",
      type: "factual_claim",
      text: "A factual claim without canonical support.",
      originalLocale: "en",
      scope: {
        subject: "subject",
        predicate: "is",
        object: "object",
        timeScope: null,
        jurisdictionScope: "DE",
        populationScope: "people",
        quantification: null,
      },
    };
    const assessment: EvidenceAssessment = {
      sourceSegmentFidelity: "high",
      speakerAttributionConfidence: "high",
      transcriptionConfidence: "not_applicable",
      claimEntailmentStrength: "strong",
      sourceReliabilityForClaim: "high",
      sourceIndependence: "verified",
      externalVerificationStatus: "verified",
      generalizabilityScope: "bounded",
      counterevidenceStatus: "none_found",
      freshnessStatus: "current",
      humanReviewStatus: "reviewed",
    };
    const canonicalResult = resolvePublicationClassification({
      claim,
      relations: [],
      sourceSegments: [],
      assessment,
    });

    expect(canonicalResult).toBe("blocked_source_integrity");
    expect(PUBLICATION_CLASSIFICATIONS).toContain(canonicalResult);
    expect(
      canPresentAsVerifiedFact("FACT", {
        ...canonicalResolution("canonical-publication-result"),
        publicationClassification: canonicalResult,
      }),
    ).toBe(false);
    for (const classification of PUBLICATION_CLASSIFICATIONS) {
      expect(
        canPresentAsVerifiedFact("FACT", {
          ...canonicalResolution(`publication-${classification}`),
          publicationClassification: classification,
        }),
      ).toBe(classification === "publishable_as_externally_verified_fact");
    }

    const source = readFileSync(
      path.resolve(process.cwd(), "../../features/dossier/decisionDossierArchitectureContract.ts"),
      "utf8",
    );
    expect(source).toMatch(/import type[\s\S]*PublicationClassification/);
    expect(source).not.toMatch(
      /export (?:const|type|function) (?:PUBLICATION_CLASSIFICATIONS|PublicationClassification|resolvePublicationClassification)/,
    );
    expect(source.match(/publishable_as_[a-z_]+/g)).toEqual([
      "publishable_as_externally_verified_fact",
    ]);
  });

  it("keeps explicit regressions for the original T0 adversarial findings", () => {
    expect(decisionReady([])).toBe(false);
    expect(decisionReady(completeDimensions("missing").slice(1))).toBe(false);
    expect(
      decisionReady(
        replaceDimension(completeDimensions("revisionless"), 0, (value) => ({ ...value, revision: null })),
      ),
    ).toBe(false);
    expect(
      decisionReady(
        replaceDimension(completeDimensions("unknown-material"), 0, (value) => ({
          ...value,
          status: "unknown",
          evidenceResolution: undefined,
          freshness: "unknown",
          gap: "unknown material dimension",
        })),
      ),
    ).toBe(false);
    expect(canRenderClaimForm("FACT", "factual_claim")).toBe(true);
    expect(canRenderClaimForm("MEASURED_VALUE", "measurement")).toBe(true);
    expect(canPresentAsVerifiedMeasurement("MEASURED_VALUE", undefined)).toBe(false);
    expect(canPresentAsVerifiedFact("FACT", undefined)).toBe(false);
    expect(
      canPresentAsVerifiedFact("FACT", {
        ...canonicalResolution("fake-evidence"),
        evidenceReference: "fake-evidence-id",
        resolutionReceiptReference: null,
      }),
    ).toBe(false);
    expect(
      decisionReady(
        replaceDimension(completeDimensions("raw-reviewer"), 0, (value) => ({
          ...value,
          materiality: {
            classification: "non_material",
            rationale: "raw reviewer only",
            basisReference: "raw-basis",
            reviewStatus: "reviewed",
            reviewedBy: "raw-reviewer",
            revision: "raw-revision",
            canonicalReviewResolution: null,
          },
          status: "unknown",
          evidenceResolution: undefined,
          evidenceReferences: [],
          freshness: "fresh",
          gap: "raw reviewer string",
        })),
      ),
    ).toBe(false);
    expect(
      decisionReady(
        replaceDimension(completeDimensions("raw-fresh"), 0, (value) => ({
          ...withResolution(value, { freshnessStatus: "stale" }),
          freshness: "fresh",
        })),
      ),
    ).toBe(false);
    expect(
      countVerifiedIndependentEvidenceFamilies([{ id: "unknown-root", parentId: null }], []),
    ).toEqual({ status: "unknown_independence" });
    expect(
      countVerifiedIndependentEvidenceFamilies(
        [
          { id: "original", parentId: null },
          { id: "translation", parentId: "original" },
        ],
        [{ sourceFamilyId: "original", independence: "known_derived", resolutionReceiptReference: "derived" }],
      ),
    ).toEqual({ status: "unknown_independence" });
    expect(
      evaluateComparator({
        jurisdiction: "Germany",
        targetJurisdiction: "Germany",
        institutions: ["institution"],
        contributionDefinition: "definition",
        benefitDefinition: "definition",
        originalLanguage: "de",
        readingLanguage: "de",
      }).transferability,
    ).toBe("requires_review");
    expect(canRenderClaimForm("PROJECTION", "measurement")).toBe(false);
    expect(canPresentAsVerifiedMeasurement("PROJECTION", canonicalResolution("projection"))).toBe(false);
    expect(canRenderClaimForm("NORMATIVE_JUDGMENT", "factual_claim")).toBe(false);
    expect(
      decisionReady(
        replaceDimension(completeDimensions("conflict"), 0, (value) =>
          withResolution(value, { conflictStatus: "unresolved" }),
        ),
      ),
    ).toBe(false);
    for (const action of [
      "publish",
      "activate_decision",
      "claim_research_success",
      "release_public_candidate",
    ]) {
      expect(t0Allows(action)).toBe(false);
    }
    expect(t0CanReleasePublicCandidate()).toBe(false);
  });
});
