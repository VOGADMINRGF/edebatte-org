import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARCHITECTURE_CONCEPTS, DECISION_DOSSIER_ARCHITECTURE_OWNERS, EPISTEMIC_CATEGORIES, EPISTEMIC_CLAIM_FORM_COMPATIBILITY_MATRIX, REQUIRED_DECISION_DIMENSIONS, canPresentAsVerifiedFact, canPresentAsVerifiedMeasurement, canRenderClaimForm, compareMetricDefinitions, countStructuralLineageRoots, countVerifiedIndependentEvidenceFamilies, decisionReady, evaluateComparator, hasCanonicalVerifiedEvidence, hasRequiredProvenance, isBindingStale, mapCanonicalAtomicClaimType, readyForHumanDeliberation, t0Allows, t0CanReleasePublicCandidate, validateArchitectureOwners, type CanonicalEvidenceResolution, type EpistemicCategory, type MaterialDimension, type MetricDefinition, type OwnerEntry, type StructuredProvenance } from "@features/dossier/decisionDossierArchitectureContract";

const reviewed = { classification: "material" as const, rationale: "Required by the reviewed system question.", basisReference: null, reviewStatus: "reviewed" as const, reviewedBy: "architecture-review", revision: "materiality-r1" };
const resolution: CanonicalEvidenceResolution = { canonicalOwner: "AtomicClaim/EvidenceAssessment", publicationClassification: "publishable_as_externally_verified_fact", evidenceReference: "evidence-1", relationStatus: "resolved", assessmentStatus: "supported", reviewStatus: "verified", freshnessStatus: "verified_fresh", conflictStatus: "none", revision: "evidence-r1", resolutionReceiptReference: "receipt-1" };
const complete = (key: MaterialDimension["key"]): MaterialDimension => ({ key, materiality: reviewed, status: "complete", evidenceReferences: ["evidence-1"], evidenceResolution: resolution, reviewStatus: "reviewed", gap: null, freshness: "fresh", revision: "revision-1" });
const completeSet = () => REQUIRED_DECISION_DIMENSIONS.map(complete);

describe("decision dossier T0 architecture contract", () => {
  it("validates every exact owner/reference pairing and fails closed", () => {
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS)).toBe(true);
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.slice(1))).toBe(false);
    expect(validateArchitectureOwners([...DECISION_DOSSIER_ARCHITECTURE_OWNERS, DECISION_DOSSIER_ARCHITECTURE_OWNERS[0]])).toBe(false);
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => entry.concept === "Metric" ? { ...entry, canonicalOwner: "wrong owner" } : entry))).toBe(false);
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => entry.concept === "Metric" ? { ...entry, canonicalReference: "" } : entry))).toBe(false);
    expect(ARCHITECTURE_CONCEPTS).toHaveLength(13);
  });

  it("fails closed when any canonical owner field changes, while reference order is harmless", () => {
    const mutateMetricOwner = (change: Partial<OwnerEntry>) => DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => entry.concept === "Metric" ? { ...entry, ...change } : entry);

    expect(validateArchitectureOwners(mutateMetricOwner({ canonicalOwner: "other owner" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ canonicalReference: "other reference" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ t0Responsibility: "other responsibility" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ laterTaskOwner: "T7" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ allowedReferences: ["other reference"] }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ forbiddenOwnershipDuplication: "other duplicate owner" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ revisionSensitive: false }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ readinessRelevant: false }))).toBe(false);

    expect(validateArchitectureOwners(mutateMetricOwner({ canonicalOwner: "" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ canonicalReference: "" }))).toBe(false);
    expect(validateArchitectureOwners(mutateMetricOwner({ concept: "RuntimeUnknownConcept" as unknown as OwnerEntry["concept"] }))).toBe(false);
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((entry) => entry.concept === "Metric" ? { ...entry, allowedReferences: [...entry.allowedReferences].reverse() } : entry))).toBe(true);
  });

  it("uses an exhaustive matrix with no permissive fallback", () => {
    expect(Object.keys(EPISTEMIC_CLAIM_FORM_COMPATIBILITY_MATRIX).sort()).toEqual([...EPISTEMIC_CATEGORIES].sort());
    for (const category of EPISTEMIC_CATEGORIES) expect(canRenderClaimForm(category, "factual_claim")).toBe(category === "FACT");
    expect(canRenderClaimForm("PROJECTION", "measurement")).toBe(false); expect(canRenderClaimForm("MODEL_RESULT", "measurement")).toBe(false); expect(canRenderClaimForm("ESTIMATE", "measurement")).toBe(false);
    expect(canRenderClaimForm("NORMATIVE_JUDGMENT", "factual_claim")).toBe(false); expect(canRenderClaimForm("OPINION", "factual_claim")).toBe(false); expect(canRenderClaimForm("OPINION", "evidence")).toBe(false);
    expect(canRenderClaimForm("UNKNOWN", "factual_claim")).toBe(false); expect(canRenderClaimForm("UNKNOWN", "measurement")).toBe(false); expect(canRenderClaimForm("UNKNOWN", "evidence")).toBe(false);
  });
  it("separates factual claim form from verified public presentation", () => {
    expect(canRenderClaimForm("FACT", "factual_claim")).toBe(true);
    expect(mapCanonicalAtomicClaimType("factual_claim")).toBe("FACT");
    expect(canPresentAsVerifiedFact("FACT", undefined)).toBe(false);
    expect(canPresentAsVerifiedFact("FACT", { ...resolution, relationStatus: "unresolved" })).toBe(false);
    expect(canPresentAsVerifiedFact("FACT", { ...resolution, conflictStatus: "open" })).toBe(false);
    expect(canPresentAsVerifiedFact("FACT", resolution)).toBe(true);
    expect(canPresentAsVerifiedFact("OPINION", resolution)).toBe(false);
    expect(canPresentAsVerifiedMeasurement("MEASURED_VALUE", resolution)).toBe(true);
    expect(hasCanonicalVerifiedEvidence({ ...resolution, resolutionReceiptReference: "" })).toBe(false);
  });
  it("fails closed across 2,500 adversarial resolution mutations", () => {
    for (let index = 0; index < 2500; index += 1) {
      const poisoned = index % 5 === 0 ? { ...resolution, relationStatus: "unresolved" as const } : index % 5 === 1 ? { ...resolution, assessmentStatus: "contested" as const } : index % 5 === 2 ? { ...resolution, reviewStatus: "pending" as const } : index % 5 === 3 ? { ...resolution, freshnessStatus: "stale" as const } : { ...resolution, resolutionReceiptReference: null };
      expect(canPresentAsVerifiedFact("FACT", poisoned)).toBe(false);
    }
  });

  it("requires structured category-specific provenance", () => {
    expect(hasRequiredProvenance("MEASURED_VALUE", {})).toBe(false);
    expect(hasRequiredProvenance("MEASURED_VALUE", { sourceReference: "s", evidenceReference: "e", metricDefinitionReference: "m", period: "2025", populationScope: "insured people", unit: "%", denominator: "net income" })).toBe(true);
    expect(hasRequiredProvenance("ESTIMATE", { sourceReference: "s", method: "survey", uncertainty: "CI" })).toBe(true);
    expect(hasRequiredProvenance("PROJECTION", { modelReference: "model", basisPeriod: "2025", assumptions: ["a"], revision: "r2" })).toBe(true);
    expect(hasRequiredProvenance("MODEL_RESULT", { modelReference: "model", modelVersion: "v2" })).toBe(true);
  });

  it("requires explicit provenance for every epistemic category", () => {
    const positiveCases: Partial<Record<EpistemicCategory, StructuredProvenance>> = {
      FACT: { sourceReference: "source", evidenceReference: "evidence", populationScope: "insured people" },
      MEASURED_VALUE: { sourceReference: "source", evidenceReference: "evidence", metricDefinitionReference: "metric", period: "2025", populationScope: "insured people", unit: "%", denominator: "net income" },
      ESTIMATE: { sourceReference: "source", method: "survey", uncertainty: "95% confidence interval" },
      PROJECTION: { modelReference: "model", basisPeriod: "2025", assumptions: ["stable employment"], revision: "r2" },
      MODEL_RESULT: { modelReference: "model", modelVersion: "v2" },
      ASSUMPTION: { sourceReference: "source", revision: "r2" },
      INTERPRETATION: { sourceReference: "source", evidenceReference: "evidence", populationScope: "insured people" },
    };

    for (const category of EPISTEMIC_CATEGORIES) {
      const provenance = positiveCases[category];
      if (provenance) {
        expect(hasRequiredProvenance(category, provenance), category).toBe(true);
        expect(hasRequiredProvenance(category, {}), category).toBe(false);
      } else {
        expect(hasRequiredProvenance(category, { sourceReference: "source", evidenceReference: "evidence", revision: "r2" }), category).toBe(false);
      }
    }
  });

  it("fails closed for empty, incomplete, unreviewed, stale, and revisionless readiness", () => {
    expect(decisionReady([])).toBe(false);
    expect(decisionReady([complete("metric")])).toBe(false);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, revision: null } : value))).toBe(false);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, materiality: { ...reviewed, classification: "non_material", reviewStatus: "pending", reviewedBy: null, rationale: "", revision: null }, status: "unknown", evidenceReferences: [], freshness: "unknown", gap: "unreviewed" } : value))).toBe(false);
    expect(readyForHumanDeliberation(completeSet().map((value) => value.key === "metric" ? { ...value, status: "gap", gap: "open" } : value))).toBe(true);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, status: "gap", gap: "open" } : value))).toBe(false);
  });

  it("permits only reviewed, justified non-materiality and complete material dimensions", () => {
    const nonMaterial = { classification: "non_material" as const, rationale: "Not relevant to this reviewed system question.", basisReference: "review-basis-1", reviewStatus: "reviewed" as const, reviewedBy: "architecture-review", revision: "materiality-r2", canonicalReviewResolution: { canonicalOwner: "Dossier/Atomic evidence context" as const, reviewStatus: "verified" as const, basisStatus: "verified" as const, revision: "materiality-r2", receiptReference: "materiality-receipt" } };
    const replaceMetric = (change: Partial<MaterialDimension>) => completeSet().map((value) => value.key === "metric" ? { ...value, ...change } : value);

    expect(decisionReady(replaceMetric({ materiality: nonMaterial, status: "unknown", evidenceReferences: [], reviewStatus: "reviewed", freshness: "unknown", revision: null, gap: "reviewed non-material" }))).toBe(true);
    expect(decisionReady(replaceMetric({ materiality: { ...nonMaterial, basisReference: null } }))).toBe(false);
    expect(decisionReady(replaceMetric({ materiality: { ...nonMaterial, reviewStatus: "pending", reviewedBy: null } }))).toBe(false);
    expect(decisionReady(replaceMetric({ materiality: { ...nonMaterial, reviewStatus: "rejected" } }))).toBe(false);
    expect(decisionReady(completeSet())).toBe(true);
    expect(decisionReady(replaceMetric({ evidenceResolution: undefined }))).toBe(false);
    expect(decisionReady(replaceMetric({ freshness: "stale" }))).toBe(false);
    expect(decisionReady(replaceMetric({ revision: null }))).toBe(false);
  });

  it("compares all material dependency snapshots, including additions and deletions", () => {
    const bound = { boundRevision: "dossier-r1", materialRevisions: { dossier: "dossier-r1", projection: "projection-r1", scenario: "scenario-r1" } };
    expect(isBindingStale(bound, { ...bound, boundRevision: "dossier-r2" })).toBe(true);
    expect(isBindingStale(bound, { ...bound, materialRevisions: { ...bound.materialRevisions, projection: "projection-r2" } })).toBe(true);
    expect(isBindingStale(bound, { ...bound, materialRevisions: { ...bound.materialRevisions, comparator: "comparator-r1" } })).toBe(true);
    expect(isBindingStale(bound, { ...bound, materialRevisions: { dossier: "dossier-r1", projection: "projection-r1" } })).toBe(true);
    expect(isBindingStale(bound, bound)).toBe(false);
  });

  it("derives Sweden as referenceable but not automatically transferable to Germany", () => {
    const result = evaluateComparator({ jurisdiction: "Sweden", targetJurisdiction: "Germany", institutions: ["income pension", "premium pension"], contributionDefinition: "income-related contribution", benefitDefinition: "income and premium pension", originalLanguage: "sv", readingLanguage: "de" });
    expect(result).toEqual({ referenceable: true, transferability: "requires_review" });
  });

  it("never infers comparator transferability from matching jurisdiction or incomplete context", () => {
    const sweden = { jurisdiction: "Sweden", targetJurisdiction: "Germany", institutions: ["income pension"], contributionDefinition: "income-related contribution", benefitDefinition: "income pension", originalLanguage: "sv", readingLanguage: "de" };
    expect(evaluateComparator(sweden)).toEqual({ referenceable: true, transferability: "requires_review" });
    expect(evaluateComparator({ ...sweden, jurisdiction: "Germany" })).toEqual({ referenceable: true, transferability: "requires_review" });
    expect(evaluateComparator({ ...sweden, institutions: [] })).toEqual({ referenceable: false, transferability: "not_assessed" });
    expect(evaluateComparator({ ...sweden, originalLanguage: "" })).toEqual({ referenceable: false, transferability: "not_assessed" });
    expect(evaluateComparator({ ...sweden, readingLanguage: "" })).toEqual({ referenceable: false, transferability: "not_assessed" });
    expect(evaluateComparator({ ...sweden, jurisdiction: "Germany", benefitDefinition: "different statutory benefit definition" })).toEqual({ referenceable: true, transferability: "requires_review" });
    expect(evaluateComparator({ ...sweden, benefitDefinition: "apparently similar benefit definition" })).toEqual({ referenceable: true, transferability: "requires_review" });
  });

  it("keeps low-data uncertainty material and blocks a decision", () => {
    const lowData = completeSet().map((value) => value.key === "comparator" ? { ...value, status: "unknown" as const, evidenceReferences: [], freshness: "unknown" as const, gap: "robust baseline and comparator missing" } : value);
    expect(decisionReady(lowData)).toBe(false);
  });

  it("derives measurement harmonization and operationalization differences", () => {
    expect(compareMetricDefinitions({ metricKey: "replacement_rate", numerator: "statutory pension", denominator: "previous earnings", population: "statutory insured", jurisdictionScope: "Germany", timeBasis: "retirement", unit: "%", methodology: "Rentenniveau" }, { metricKey: "replacement_rate", numerator: "all pension pillars", denominator: "net disposable income", population: "all retirees", jurisdictionScope: "Germany", timeBasis: "retirement", unit: "%", methodology: "cross-pillar" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions({ metricKey: "school_supply", numerator: "covered lessons", denominator: "planned lessons", population: "schools", jurisdictionScope: "Saxony-Anhalt", timeBasis: "term", unit: "%", methodology: "coverage" }, { metricKey: "school_supply", numerator: "cancelled lessons", denominator: "planned lessons", population: "schools", jurisdictionScope: "Saxony-Anhalt", timeBasis: "term", unit: "%", methodology: "cancellation" })).toBe("requires_harmonization");
  });

  it("normalizes metric text only and abstains from semantic equivalence", () => {
    const replacementRate: MetricDefinition = { metricKey: "replacement_rate", numerator: "statutory pension", denominator: "net income", population: "insured people", jurisdictionScope: "Germany", timeBasis: "retirement", unit: "%", methodology: "net replacement rate" };
    // NORMALIZATION != SEMANTIC EQUIVALENCE
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, metricKey: " REPLACEMENT_RATE " })).toBe("compatible");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, jurisdictionScope: " germany " })).toBe("compatible");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, unit: " % " })).toBe("compatible");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, numerator: "  statutory   pension  " })).toBe("compatible");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, denominator: "gross income" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, population: "all retirees" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, methodology: "different methodology" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, methodology: "Nettoersatzrate" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, metricKey: "school_supply" })).toBe("incompatible");
    expect(compareMetricDefinitions(replacementRate, { ...replacementRate, unit: "" })).toBe("unknown");
  });

  it("derives one source family and separates fact from value", () => {
    expect(countStructuralLineageRoots([{ id: "study", parentId: null }, { id: "agency", parentId: "study" }, { id: "repost", parentId: "agency" }])).toEqual({ status: "ok", structuralRoots: 1 });
  });
  it("never treats absent lineage as verified independent corroboration", () => {
    const roots = [{ id: "study-a", parentId: null }, { id: "study-b", parentId: null }];
    expect(countVerifiedIndependentEvidenceFamilies(roots, [])).toEqual({ status: "unknown_independence" });
    expect(countVerifiedIndependentEvidenceFamilies(roots, [{ sourceFamilyId: "study-a", independence: "verified_independent_root", resolutionReceiptReference: "receipt-a" }, { sourceFamilyId: "study-b", independence: "verified_independent_root", resolutionReceiptReference: "receipt-b" }])).toEqual({ status: "ok", independentFamilies: 2 });
  });

  it("keeps T0 and the public guard fail-closed", () => {
    for (const action of ["generate_scenario", "generate_recommendation", "claim_research_success", "activate_decision", "publish", "release_public_candidate"]) expect(t0Allows(action)).toBe(false);
    expect(t0CanReleasePublicCandidate()).toBe(false);
  });
  it("fails closed for all malformed lineages and accepts deterministic chains", () => {
    expect(countStructuralLineageRoots([{ id: "a", parentId: null }, { id: "b", parentId: null }])).toEqual({ status: "ok", structuralRoots: 2 });
    expect(countStructuralLineageRoots([{ id: "a", parentId: "missing" }])).toEqual({ status: "invalid", reason: "missing_parent" });
    expect(countStructuralLineageRoots([{ id: "a", parentId: "a" }])).toEqual({ status: "invalid", reason: "self_parent" });
    expect(countStructuralLineageRoots([{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }])).toEqual({ status: "invalid", reason: "cycle" });
    expect(countStructuralLineageRoots([{ id: "a", parentId: null }, { id: "a", parentId: null }])).toEqual({ status: "invalid", reason: "duplicate_id" });
    expect(countStructuralLineageRoots([{ id: "", parentId: null }])).toEqual({ status: "invalid", reason: "empty_id" });
    const chain = Array.from({ length: 512 }, (_, index) => ({ id: `source-${index}`, parentId: index === 0 ? null : `source-${index - 1}` }));
    expect(countStructuralLineageRoots(chain)).toEqual({ status: "ok", structuralRoots: 1 });
  });
  it("maps canonical semantics without inspecting German, English, or French text", () => {
    expect(["Der Beitragssatz beträgt 18,6 %.", "The contribution rate is 18.6%.", "Le taux est de 18,6 %."].map(() => mapCanonicalAtomicClaimType("quantified_claim"))).toEqual(["FACT", "FACT", "FACT"]);
    expect(mapCanonicalAtomicClaimType("normative_position")).toBe("NORMATIVE_JUDGMENT"); expect(mapCanonicalAtomicClaimType("prediction")).toBe("PROJECTION");
  });
  it("tests every owner field and semantic reference ordering", () => {
    const base = DECISION_DOSSIER_ARCHITECTURE_OWNERS[0]; const mutate = (patch: object) => expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((x, i) => i ? x : { ...x, ...patch }))).toBe(false);
    mutate({ canonicalOwner: "x" }); mutate({ canonicalReference: "x" }); mutate({ t0Responsibility: "x" }); mutate({ laterTaskOwner: "T2" }); mutate({ allowedReferences: ["x"] }); mutate({ forbiddenOwnershipDuplication: "x" }); mutate({ revisionSensitive: false }); mutate({ readinessRelevant: false });
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((x, i) => i ? x : { ...base, allowedReferences: [...base.allowedReferences].reverse() }))).toBe(true);
    expect(validateArchitectureOwners(DECISION_DOSSIER_ARCHITECTURE_OWNERS.map((x, i) => i ? x : { ...base, concept: "unknown" as never }))).toBe(false);
  });
  it("covers non-material basis, comparator boundaries, and metric normalization", () => {
    const nonMaterial = completeSet().map(x => x.key === "metric" ? { ...x, materiality: { ...reviewed, classification: "non_material" as const, basisReference: "review-1", canonicalReviewResolution: { canonicalOwner: "Dossier/Atomic evidence context" as const, reviewStatus: "verified" as const, basisStatus: "verified" as const, revision: "m1", receiptReference: "receipt" } }, status: "unknown" as const, evidenceReferences: [], freshness: "unknown" as const, gap: "not material" } : x);
    expect(decisionReady(nonMaterial)).toBe(true); expect(decisionReady(nonMaterial.map(x => x.key === "metric" ? { ...x, materiality: { ...x.materiality, basisReference: null } } : x))).toBe(false);
    expect(evaluateComparator({ jurisdiction: "Germany", targetJurisdiction: "Germany", institutions: ["a"], contributionDefinition: "a", benefitDefinition: "a", originalLanguage: "de", readingLanguage: "de" }).transferability).toBe("requires_review");
    const metric = { metricKey: "replacement_rate", numerator: "income", denominator: "income", population: "people", jurisdictionScope: "Germany", timeBasis: "2025", unit: "%", methodology: "standard" };
    expect(compareMetricDefinitions(metric, { ...metric, metricKey: " REPLACEMENT_RATE ", jurisdictionScope: " germany ", unit: " % " })).toBe("compatible");
  });

  it("is a pure contract without runtime imports", () => {
    const source = readFileSync(path.resolve(process.cwd(), "../../features/dossier/decisionDossierArchitectureContract.ts"), "utf8");
    expect(source).toMatch(/^import type \{/m); expect(source).not.toMatch(/^import(?! type )/m); expect(source).not.toMatch(/(?:prisma|mongo|redis|fetch\(|axios|queue|next\/|process\.env)/i);
  });
});
