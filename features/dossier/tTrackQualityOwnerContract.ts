/**
 * T0 quality-owner mapping for the T-Track Final Quality Addendum.
 *
 * This file deliberately creates no runtime, persistence model or second SSOT.
 * It records which existing canonical domains later T stages must reference.
 */

export const T_TRACK_QUALITY_CONCEPTS = [
  "dossier_lifecycle",
  "decision_context_snapshot",
  "actor_position_conflict",
  "source_challenge",
  "public_explainability",
  "partner_neutral_projection",
] as const;
export type TTrackQualityConcept = (typeof T_TRACK_QUALITY_CONCEPTS)[number];

export type TTrackQualityOwnerReference = Readonly<{
  concept: TTrackQualityConcept;
  canonicalOwner: string;
  canonicalReferences: readonly string[];
  t0Responsibility: "reference_only";
  laterStage: "T3" | "T6" | "T7" | "T8";
  forbiddenDuplicateTruth: string;
}>;

export const T_TRACK_QUALITY_OWNER_REFERENCES: readonly TTrackQualityOwnerReference[] = Object.freeze([
  {
    concept: "dossier_lifecycle",
    canonicalOwner: "Dossier status + DossierRevision",
    canonicalReferences: ["Dossier", "DossierRevision"],
    t0Responsibility: "reference_only",
    laterStage: "T7",
    forbiddenDuplicateTruth: "second dossier lifecycle store",
  },
  {
    concept: "decision_context_snapshot",
    canonicalOwner: "Poll/TopicRound + revision references",
    canonicalReferences: ["Poll", "TopicRound", "DossierRevision", "ScenarioSet", "Scenario"],
    t0Responsibility: "reference_only",
    laterStage: "T6",
    forbiddenDuplicateTruth: "second decision snapshot owner",
  },
  {
    concept: "actor_position_conflict",
    canonicalOwner: "AtomicClaim/SourceSegment + organization source context",
    canonicalReferences: ["AtomicClaim", "SourceSegment", "SourceArtifact", "Organization"],
    t0Responsibility: "reference_only",
    laterStage: "T3",
    forbiddenDuplicateTruth: "flattened or parallel actor-position truth",
  },
  {
    concept: "source_challenge",
    canonicalOwner: "Dossier review/correction + AtomicClaim/SourceSegment",
    canonicalReferences: ["Dossier", "AtomicClaim", "SourceSegment", "SourceArtifact", "DossierRevision"],
    t0Responsibility: "reference_only",
    laterStage: "T3",
    forbiddenDuplicateTruth: "challenge auto-overrides evidence truth",
  },
  {
    concept: "public_explainability",
    canonicalOwner: "Public Dossier readmodel",
    canonicalReferences: ["Dossier", "DossierRevision", "EvidenceAssessment", "ScenarioSet", "Scenario"],
    t0Responsibility: "reference_only",
    laterStage: "T7",
    forbiddenDuplicateTruth: "simplified public truth divergent from canonical dossier",
  },
  {
    concept: "partner_neutral_projection",
    canonicalOwner: "Canonical Dossier revision + public readmodel",
    canonicalReferences: ["Dossier", "DossierRevision", "CanonicalTopic"],
    t0Responsibility: "reference_only",
    laterStage: "T8",
    forbiddenDuplicateTruth: "partner-specific evidence, ranking or readiness truth",
  },
]);

const present = (value: string) => Boolean(value.trim());

export function validateTTrackQualityOwnerReferences(
  entries: readonly TTrackQualityOwnerReference[],
): boolean {
  if (entries.length !== T_TRACK_QUALITY_CONCEPTS.length) return false;
  const expected = new Map(T_TRACK_QUALITY_OWNER_REFERENCES.map((entry) => [entry.concept, entry]));
  const seen = new Set<TTrackQualityConcept>();

  return entries.every((entry) => {
    const canonical = expected.get(entry.concept);
    if (!canonical || seen.has(entry.concept)) return false;
    seen.add(entry.concept);
    if (!present(entry.canonicalOwner) || !present(entry.forbiddenDuplicateTruth)) return false;
    if (entry.canonicalReferences.length === 0 || entry.canonicalReferences.some((ref) => !present(ref))) return false;
    return (
      entry.canonicalOwner === canonical.canonicalOwner &&
      entry.t0Responsibility === "reference_only" &&
      entry.laterStage === canonical.laterStage &&
      entry.forbiddenDuplicateTruth === canonical.forbiddenDuplicateTruth &&
      entry.canonicalReferences.length === canonical.canonicalReferences.length &&
      [...entry.canonicalReferences].sort().every(
        (reference, index) => reference === [...canonical.canonicalReferences].sort()[index],
      )
    );
  });
}

export function t0QualityMappingCreatesRuntimeOwner(): false {
  return false;
}

export function t0QualityMappingCanOverrideCanonicalTruth(): false {
  return false;
}
