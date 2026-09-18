import { describe, expect, it } from "vitest";

import {
  T0_FINAL_QUALITY_CONTRACT_KEYS,
  T0_FINAL_QUALITY_REFERENCE_MAPPINGS,
  T0_REQUIRED_ACTOR_CONFLICT_STATES,
  T0_REQUIRED_DECISION_CONTEXT_BINDINGS,
  T0_REQUIRED_DOSSIER_LIFECYCLE_STATES,
  T0_REQUIRED_EXPLAINABILITY_SHORT_LEVEL,
  T0_REQUIRED_SOURCE_CHALLENGE_STATES,
  validateT0FinalQualityReferenceMappings,
  type T0FinalQualityReferenceMapping,
} from "@features/dossier/decisionDossierT0QualityReferenceMap";

const cloneMappings = (): T0FinalQualityReferenceMapping[] =>
  T0_FINAL_QUALITY_REFERENCE_MAPPINGS.map((entry) => ({
    ...entry,
    architectureConcepts: [...entry.architectureConcepts],
    canonicalReferences: [...entry.canonicalReferences],
    laterTaskOwners: [...entry.laterTaskOwners],
  }));

describe("decision dossier T0 final quality reference map", () => {
  it("accepts only the exact canonical reference-only mapping", () => {
    expect(validateT0FinalQualityReferenceMappings(T0_FINAL_QUALITY_REFERENCE_MAPPINGS)).toBe(true);
    expect(validateT0FinalQualityReferenceMappings(T0_FINAL_QUALITY_REFERENCE_MAPPINGS.slice(1))).toBe(false);

    const duplicate = cloneMappings();
    duplicate[1] = { ...duplicate[1]!, key: duplicate[0]!.key };
    expect(validateT0FinalQualityReferenceMappings(duplicate)).toBe(false);
  });

  it("fails closed when owner-boundary references or downstream task ownership drift", () => {
    const referenceDrift = cloneMappings();
    referenceDrift[0] = {
      ...referenceDrift[0]!,
      canonicalReferences: [...referenceDrift[0]!.canonicalReferences, "ParallelTruth"],
    };
    expect(validateT0FinalQualityReferenceMappings(referenceDrift)).toBe(false);

    const architectureDrift = cloneMappings();
    architectureDrift[0] = {
      ...architectureDrift[0]!,
      architectureConcepts: ["Metric"],
    };
    expect(validateT0FinalQualityReferenceMappings(architectureDrift)).toBe(false);

    const taskOwnerDrift = cloneMappings();
    taskOwnerDrift[0] = {
      ...taskOwnerDrift[0]!,
      laterTaskOwners: ["T1"],
    };
    expect(validateT0FinalQualityReferenceMappings(taskOwnerDrift)).toBe(false);
  });

  it("rejects blank and duplicate canonical references instead of normalizing a second truth", () => {
    const blank = cloneMappings();
    blank[0] = { ...blank[0]!, canonicalReferences: ["Dossier", "   "] };
    expect(validateT0FinalQualityReferenceMappings(blank)).toBe(false);

    const duplicate = cloneMappings();
    duplicate[0] = { ...duplicate[0]!, canonicalReferences: ["Dossier", "Dossier"] };
    expect(validateT0FinalQualityReferenceMappings(duplicate)).toBe(false);
  });

  it("keeps every final-quality mapping reference-only and leaves missing-question scope review to T1", () => {
    expect(T0_FINAL_QUALITY_CONTRACT_KEYS).toEqual([
      "dossier_lifecycle",
      "decision_context_snapshot",
      "intra_actor_conflict",
      "source_challenge",
      "explainability_acceptance",
    ]);
    expect(T0_FINAL_QUALITY_CONTRACT_KEYS).not.toContain("missing_question_scope_review");
    expect(T0_FINAL_QUALITY_REFERENCE_MAPPINGS.every((entry) => entry.t0Responsibility === "reference_only")).toBe(true);
  });

  it("locks the final quality addendum vocabularies without silent shrinkage", () => {
    expect(T0_REQUIRED_DOSSIER_LIFECYCLE_STATES).toEqual([
      "draft",
      "in_review",
      "approved",
      "published",
      "materially_changed",
      "re_review_required",
      "superseded",
      "archived",
    ]);
    expect(T0_REQUIRED_ACTOR_CONFLICT_STATES).toEqual([
      "consistent",
      "partially_conflicting",
      "conflicting",
      "superseded",
      "unclear",
    ]);
    expect(T0_REQUIRED_SOURCE_CHALLENGE_STATES).toEqual([
      "open",
      "under_review",
      "resolved",
      "rejected",
      "accepted_correction",
    ]);
    expect(T0_REQUIRED_DECISION_CONTEXT_BINDINGS).toEqual([
      "dossier_revision",
      "scenario_revision",
      "evidence_source_revisions",
      "material_gaps_and_uncertainties",
      "actor_position_revision",
      "language_translation_revision",
      "review_receipt",
    ]);
    expect(T0_REQUIRED_EXPLAINABILITY_SHORT_LEVEL).toEqual([
      "neutral_core_question",
      "realistic_alternatives",
      "material_tradeoffs_and_affected_groups",
      "evidence_conflict_uncertainty_state",
      "source_detail_and_open_gap_navigation",
    ]);
  });
});
