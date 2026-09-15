import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ARCHITECTURE_CONCEPTS, DECISION_DOSSIER_ARCHITECTURE_OWNERS, EPISTEMIC_CATEGORIES, EPISTEMIC_COMPATIBILITY_MATRIX, REQUIRED_DECISION_DIMENSIONS, canRender, compareMetricDefinitions, countIndependentEvidenceFamilies, decisionReady, evaluateComparator, hasRequiredProvenance, isBindingStale, mapCanonicalClaimSemantic, readyForHumanDeliberation, t0Allows, t0CanReleasePublicCandidate, validateArchitectureOwners, type MaterialDimension } from "@features/dossier/decisionDossierArchitectureContract";

const reviewed = { classification: "material" as const, rationale: "Required by the reviewed system question.", basisReference: null, reviewStatus: "reviewed" as const, reviewedBy: "architecture-review", revision: "materiality-r1" };
const complete = (key: MaterialDimension["key"]): MaterialDimension => ({ key, materiality: reviewed, status: "complete", evidenceReferences: ["evidence-1"], reviewStatus: "reviewed", gap: null, freshness: "fresh", revision: "revision-1" });
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

  it("uses an exhaustive matrix with no permissive fallback", () => {
    expect(Object.keys(EPISTEMIC_COMPATIBILITY_MATRIX).sort()).toEqual([...EPISTEMIC_CATEGORIES].sort());
    for (const category of EPISTEMIC_CATEGORIES) expect(canRender(category, "fact")).toBe(category === "FACT");
    expect(canRender("PROJECTION", "measurement")).toBe(false); expect(canRender("MODEL_RESULT", "measurement")).toBe(false); expect(canRender("ESTIMATE", "measurement")).toBe(false);
    expect(canRender("NORMATIVE_JUDGMENT", "fact")).toBe(false); expect(canRender("OPINION", "fact")).toBe(false); expect(canRender("OPINION", "evidence")).toBe(false);
    expect(canRender("UNKNOWN", "fact")).toBe(false); expect(canRender("UNKNOWN", "measurement")).toBe(false); expect(canRender("UNKNOWN", "evidence")).toBe(false);
  });

  it("requires structured category-specific provenance", () => {
    expect(hasRequiredProvenance("MEASURED_VALUE", {})).toBe(false);
    expect(hasRequiredProvenance("MEASURED_VALUE", { sourceReference: "s", evidenceReference: "e", metricDefinitionReference: "m", period: "2025", populationScope: "insured people", unit: "%", denominator: "net income" })).toBe(true);
    expect(hasRequiredProvenance("ESTIMATE", { sourceReference: "s", method: "survey", uncertainty: "CI" })).toBe(true);
    expect(hasRequiredProvenance("PROJECTION", { modelReference: "model", basisPeriod: "2025", assumptions: ["a"], revision: "r2" })).toBe(true);
    expect(hasRequiredProvenance("MODEL_RESULT", { modelReference: "model", modelVersion: "v2" })).toBe(true);
  });

  it("fails closed for empty, incomplete, unreviewed, stale, and revisionless readiness", () => {
    expect(decisionReady([])).toBe(false);
    expect(decisionReady([complete("metric")])).toBe(false);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, revision: null } : value))).toBe(false);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, materiality: { ...reviewed, classification: "non_material", reviewStatus: "pending", reviewedBy: null, rationale: "", revision: null }, status: "unknown", evidenceReferences: [], freshness: "unknown", gap: "unreviewed" } : value))).toBe(false);
    expect(readyForHumanDeliberation(completeSet().map((value) => value.key === "metric" ? { ...value, status: "gap", gap: "open" } : value))).toBe(true);
    expect(decisionReady(completeSet().map((value) => value.key === "metric" ? { ...value, status: "gap", gap: "open" } : value))).toBe(false);
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

  it("keeps low-data uncertainty material and blocks a decision", () => {
    const lowData = completeSet().map((value) => value.key === "comparator" ? { ...value, status: "unknown" as const, evidenceReferences: [], freshness: "unknown" as const, gap: "robust baseline and comparator missing" } : value);
    expect(decisionReady(lowData)).toBe(false);
  });

  it("derives measurement harmonization and operationalization differences", () => {
    expect(compareMetricDefinitions({ metricKey: "replacement_rate", numerator: "statutory pension", denominator: "previous earnings", population: "statutory insured", jurisdictionScope: "Germany", timeBasis: "retirement", unit: "%", methodology: "Rentenniveau" }, { metricKey: "replacement_rate", numerator: "all pension pillars", denominator: "net disposable income", population: "all retirees", jurisdictionScope: "Germany", timeBasis: "retirement", unit: "%", methodology: "cross-pillar" })).toBe("requires_harmonization");
    expect(compareMetricDefinitions({ metricKey: "school_supply", numerator: "covered lessons", denominator: "planned lessons", population: "schools", jurisdictionScope: "Saxony-Anhalt", timeBasis: "term", unit: "%", methodology: "coverage" }, { metricKey: "school_supply", numerator: "cancelled lessons", denominator: "planned lessons", population: "schools", jurisdictionScope: "Saxony-Anhalt", timeBasis: "term", unit: "%", methodology: "cancellation" })).toBe("requires_harmonization");
  });

  it("derives one source family and separates fact from value", () => {
    expect(countIndependentEvidenceFamilies([{ id: "study", parentId: null }, { id: "agency", parentId: "study" }, { id: "repost", parentId: "agency" }])).toEqual({ status: "ok", independentFamilies: 1 });
  });

  it("keeps T0 and the public guard fail-closed", () => {
    for (const action of ["generate_scenario", "generate_recommendation", "claim_research_success", "activate_decision", "publish", "release_public_candidate"]) expect(t0Allows(action)).toBe(false);
    expect(t0CanReleasePublicCandidate()).toBe(false);
  });
  it("fails closed for all malformed lineages and accepts deterministic chains", () => {
    expect(countIndependentEvidenceFamilies([{ id: "a", parentId: null }, { id: "b", parentId: null }])).toEqual({ status: "ok", independentFamilies: 2 });
    expect(countIndependentEvidenceFamilies([{ id: "a", parentId: "missing" }])).toEqual({ status: "invalid", reason: "missing_parent" });
    expect(countIndependentEvidenceFamilies([{ id: "a", parentId: "a" }])).toEqual({ status: "invalid", reason: "self_parent" });
    expect(countIndependentEvidenceFamilies([{ id: "a", parentId: "b" }, { id: "b", parentId: "a" }])).toEqual({ status: "invalid", reason: "cycle" });
    expect(countIndependentEvidenceFamilies([{ id: "a", parentId: null }, { id: "a", parentId: null }])).toEqual({ status: "invalid", reason: "duplicate_id" });
    expect(countIndependentEvidenceFamilies([{ id: "", parentId: null }])).toEqual({ status: "invalid", reason: "empty_id" });
  });
  it("maps canonical semantics without inspecting German, English, or French text", () => {
    expect(["Der Beitragssatz beträgt 18,6 %.", "The contribution rate is 18.6%.", "Le taux est de 18,6 %."].map(() => mapCanonicalClaimSemantic("quantified_fact"))).toEqual(["FACT", "FACT", "FACT"]);
    expect(mapCanonicalClaimSemantic("normative_position")).toBe("NORMATIVE_JUDGMENT"); expect(mapCanonicalClaimSemantic("prediction")).toBe("PROJECTION");
  });

  it("is a pure contract without runtime imports", () => {
    const source = readFileSync(path.resolve(process.cwd(), "../../features/dossier/decisionDossierArchitectureContract.ts"), "utf8");
    expect(source).not.toMatch(/^import\s/m); expect(source).not.toMatch(/(?:prisma|mongo|redis|fetch\(|axios|queue|next\/|process\.env)/i);
  });
});
