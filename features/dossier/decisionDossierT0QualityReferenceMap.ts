/**
 * T0 reference-only mapping for the T-Track Final Quality Addendum.
 *
 * This file creates no runtime owner, store, lifecycle engine, snapshot store,
 * challenge workflow or publication path. It only binds the addendum contracts
 * to already-canonical domain IDs/revisions so later T tasks cannot create a
 * parallel truth.
 */
import type { ArchitectureConcept } from "./decisionDossierArchitectureContract";

export const T0_FINAL_QUALITY_CONTRACT_KEYS = [
  "dossier_lifecycle",
  "decision_context_snapshot",
  "intra_actor_conflict",
  "source_challenge",
  "explainability_acceptance",
] as const;

export type T0FinalQualityContractKey =
  (typeof T0_FINAL_QUALITY_CONTRACT_KEYS)[number];

export type T0FinalQualityReferenceMapping = Readonly<{
  key: T0FinalQualityContractKey;
  architectureConcepts: readonly ArchitectureConcept[];
  canonicalReferences: readonly string[];
  laterTaskOwners: readonly ("T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "T8")[];
  t0Responsibility: "reference_only";
  forbiddenOwnershipDuplication: string;
  knownLaterGap: string | null;
}>;

const mapping = (value: T0FinalQualityReferenceMapping) => value;

export const T0_FINAL_QUALITY_REFERENCE_MAPPINGS = Object.freeze([
  mapping({
    key: "dossier_lifecycle",
    architectureConcepts: ["ResearchObject", "ContextEvent", "DecisionBinding"],
    canonicalReferences: [
      "Dossier",
      "DossierRevision",
      "Poll",
      "TopicRound",
    ],
    laterTaskOwners: ["T6", "T7", "T8"],
    t0Responsibility: "reference_only",
    forbiddenOwnershipDuplication:
      "T0 lifecycle store or a second dossier/publication status truth",
    knownLaterGap:
      "T7/T8 must realize materially_changed and re-review/stale propagation without replacing the existing Dossier/DossierRevision owner.",
  }),
  mapping({
    key: "decision_context_snapshot",
    architectureConcepts: [
      "DecisionBinding",
      "ScenarioSet",
      "Scenario",
      "ContextEvent",
      "Metric",
    ],
    canonicalReferences: [
      "Poll",
      "TopicRound",
      "DossierRevision",
      "ScenarioSet",
      "Scenario",
      "AtomicClaim",
      "EvidenceAssessment",
      "SourceArtifact",
      "SourceSegment",
      "SourceArtifact.contentHashOrRevision",
      "SourceSegment.translationStatus",
      "SynthesisReceipt.humanReviewRevision",
    ],
    laterTaskOwners: ["T6", "T7", "T8"],
    t0Responsibility: "reference_only",
    forbiddenOwnershipDuplication:
      "snapshot copies becoming a second dossier, evidence, scenario, translation or decision truth",
    knownLaterGap:
      "T6 must persist/reconstruct the historical binding from canonical IDs/revisions; T0 does not add snapshot persistence.",
  }),
  mapping({
    key: "intra_actor_conflict",
    architectureConcepts: ["ContextEvent", "Tradeoff"],
    canonicalReferences: [
      "OrganizationRegistry",
      "OrganizationRelation",
      "AtomicClaim",
      "SourceArtifact",
      "SourceSegment",
      "DossierRevision",
    ],
    laterTaskOwners: ["T2", "T3", "T7", "T8"],
    t0Responsibility: "reference_only",
    forbiddenOwnershipDuplication:
      "flattened actor position or an actor identity graph outside the canonical organization registry",
    knownLaterGap:
      "T2/T3 must make official intra-actor conflicts reviewable while preserving parent/child organization identity and source revisions.",
  }),
  mapping({
    key: "source_challenge",
    architectureConcepts: ["ResearchObject", "ContextEvent"],
    canonicalReferences: [
      "DossierDispute",
      "AtomicClaim",
      "SourceArtifact",
      "SourceSegment",
      "DossierRevision",
    ],
    laterTaskOwners: ["T2", "T3", "T7", "T8"],
    t0Responsibility: "reference_only",
    forbiddenOwnershipDuplication:
      "challenge auto-overrides evidence or creates a second claim/source truth",
    knownLaterGap:
      "The existing dispute/review vocabulary is narrower than the final challenge workflow; T2/T3 must extend the canonical review domain instead of T0 creating a second store.",
  }),
  mapping({
    key: "explainability_acceptance",
    architectureConcepts: [
      "SystemQuestion",
      "Impact",
      "Tradeoff",
      "Comparator",
      "DecisionBinding",
    ],
    canonicalReferences: [
      "DossierRevision",
      "AtomicClaim",
      "EvidenceAssessment",
      "ScenarioSet",
      "Scenario",
      "SynthesisReceipt",
    ],
    laterTaskOwners: ["T7", "T8"],
    t0Responsibility: "reference_only",
    forbiddenOwnershipDuplication:
      "summary/explainer content becoming an independent semantic truth",
    knownLaterGap:
      "T7/T8 must prove semantic compression fidelity against the bound canonical revision; T0 does not generate summaries.",
  }),
] as const);

export const T0_REQUIRED_DOSSIER_LIFECYCLE_STATES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "materially_changed",
  "re_review_required",
  "superseded",
  "archived",
] as const;

export const T0_REQUIRED_ACTOR_CONFLICT_STATES = [
  "consistent",
  "partially_conflicting",
  "conflicting",
  "superseded",
  "unclear",
] as const;

export const T0_REQUIRED_SOURCE_CHALLENGE_STATES = [
  "open",
  "under_review",
  "resolved",
  "rejected",
  "accepted_correction",
] as const;

export const T0_REQUIRED_DECISION_CONTEXT_BINDINGS = [
  "dossier_revision",
  "scenario_revision",
  "evidence_source_revisions",
  "material_gaps_and_uncertainties",
  "actor_position_revision",
  "language_translation_revision",
  "review_receipt",
] as const;

export const T0_REQUIRED_EXPLAINABILITY_SHORT_LEVEL = [
  "neutral_core_question",
  "realistic_alternatives",
  "material_tradeoffs_and_affected_groups",
  "evidence_conflict_uncertainty_state",
  "source_detail_and_open_gap_navigation",
] as const;

const nonBlankUnique = (values: readonly string[]) => {
  const normalized = values.map((value) => value.trim());
  return (
    normalized.every(Boolean) &&
    new Set(normalized).size === normalized.length
  );
};

/**
 * Exact-map validator: mutation of a mapping, missing contracts, duplicates,
 * blank references or an attempt to change T0 from reference-only fails closed.
 */
export function validateT0FinalQualityReferenceMappings(
  entries: readonly T0FinalQualityReferenceMapping[],
): boolean {
  if (entries.length !== T0_FINAL_QUALITY_REFERENCE_MAPPINGS.length) return false;
  const expected = new Map(
    T0_FINAL_QUALITY_REFERENCE_MAPPINGS.map((entry) => [entry.key, entry]),
  );
  const seen = new Set<T0FinalQualityContractKey>();

  return entries.every((entry) => {
    const canonical = expected.get(entry.key);
    if (
      !canonical ||
      seen.has(entry.key) ||
      entry.t0Responsibility !== "reference_only" ||
      !entry.forbiddenOwnershipDuplication.trim() ||
      !nonBlankUnique(entry.architectureConcepts) ||
      !nonBlankUnique(entry.canonicalReferences) ||
      !nonBlankUnique(entry.laterTaskOwners)
    ) {
      return false;
    }
    seen.add(entry.key);

    const sameSet = (left: readonly string[], right: readonly string[]) =>
      left.length === right.length &&
      [...left].sort().every((value, index) => value === [...right].sort()[index]);

    return (
      sameSet(entry.architectureConcepts, canonical.architectureConcepts) &&
      sameSet(entry.canonicalReferences, canonical.canonicalReferences) &&
      sameSet(entry.laterTaskOwners, canonical.laterTaskOwners) &&
      entry.forbiddenOwnershipDuplication === canonical.forbiddenOwnershipDuplication &&
      entry.knownLaterGap === canonical.knownLaterGap
    );
  });
}
