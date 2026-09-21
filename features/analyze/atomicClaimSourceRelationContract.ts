export const ATOMIC_CLAIM_TYPES = [
  "reported_speech",
  "personal_experience",
  "factual_claim",
  "quantified_claim",
  "causal_claim",
  "system_hypothesis",
  "mechanism_hypothesis",
  "interpretation",
  "normative_position",
  "prediction",
  "non_checkable_opinion",
] as const;

export type AtomicClaimType = (typeof ATOMIC_CLAIM_TYPES)[number];

export const CLAIM_SOURCE_RELATION_TYPES = [
  "supports_exactly",
  "supports_partially",
  "reported_by_source",
  "example_only",
  "mechanism_only",
  "context_only",
  "thematically_related_only",
  "corroborates_same_claim",
  "contradicts_same_claim",
  "counterexample",
  "exception_or_boundary_case",
  "alternative_explanation",
  "normative_counterposition",
  "irrelevant",
  "unclear_requires_review",
] as const;

export type ClaimSourceRelationType = (typeof CLAIM_SOURCE_RELATION_TYPES)[number];

export const PUBLICATION_CLASSIFICATIONS = [
  "publishable_as_quote",
  "publishable_as_personal_experience",
  "publishable_as_shared_perception",
  "publishable_as_open_hypothesis",
  "publishable_as_externally_verified_fact",
  "review_required",
  "blocked_insufficient_evidence",
  "blocked_source_integrity",
] as const;

export type PublicationClassification = (typeof PUBLICATION_CLASSIFICATIONS)[number];

export const SOURCE_ARTIFACT_TYPES = [
  "primary_document",
  "official_record",
  "dataset",
  "study",
  "interview",
  "media_report",
  "secondary_source",
  "user_provided_material",
  "model_output",
] as const;

export type SourceArtifactType = (typeof SOURCE_ARTIFACT_TYPES)[number];

export const SOURCE_ROLES = [
  "origin",
  "evidence",
  "counter_evidence",
  "context",
] as const;

export type SourceRole = (typeof SOURCE_ROLES)[number];

export const SOURCE_MEDIUM_KINDS = [
  "document",
  "article",
  "dataset",
  "tv",
  "streaming",
  "podcast",
  "radio",
  "video",
  "press_conference",
  "parliamentary_debate",
  "public_meeting",
  "fact_check",
  "other",
] as const;

export type SourceMediumKind = (typeof SOURCE_MEDIUM_KINDS)[number];

export const SOURCE_AVAILABILITY_STATUSES = [
  "available",
  "unavailable",
  "expired",
  "unknown",
] as const;

export type SourceAvailabilityStatus =
  (typeof SOURCE_AVAILABILITY_STATUSES)[number];

export const SOURCE_SUPPLEMENTAL_REF_TYPES = [
  "fact_check",
  "transcript",
  "show_notes",
  "source_list",
  "document",
] as const;

export type SourceSupplementalRefType =
  (typeof SOURCE_SUPPLEMENTAL_REF_TYPES)[number];

export type SourceSupplementalRef = {
  kind: SourceSupplementalRefType;
  ref: string;
};

export type SourceMediaMetadata = {
  mediumKind: SourceMediumKind;
  programmeRef?: string | null;
  episodeRef?: string | null;
  episodeTitle?: string | null;
  episodeDate?: string | null;
  publicOriginalMediaUrl?: string | null;
  durationSeconds?: number | null;
  availability: {
    status: SourceAvailabilityStatus;
    availableUntil?: string | null;
    lastCheckedAt?: string | null;
  };
  subtitleAvailable?: boolean | null;
  transcriptAvailable?: boolean | null;
  supplementalRefs?: SourceSupplementalRef[];
};

export const SOURCE_LINEAGE_RELATION_TYPES = [
  "cites",
  "quotes",
  "summarizes",
  "derived_from",
  "syndicates",
  "uses_dataset",
  "uses_study",
  "uses_interview",
] as const;

export type SourceLineageRelationType =
  (typeof SOURCE_LINEAGE_RELATION_TYPES)[number];

export type SourceLineageRelation = {
  id: string;
  sourceArtifactId: string;
  upstreamSourceArtifactId: string;
  relationType: SourceLineageRelationType;
  reviewStatus: "unreviewed" | "reviewed";
};

export type SourceArtifact = {
  id: string;
  canonicalRef: string;
  sourceType: SourceArtifactType;
  publisherOrAuthor: string | null;
  publishedAt: string | null;
  accessedAt: string | null;
  originalLocale: string;
  sourceFamilyId: string;
  contentHashOrRevision: string | null;
  /** Optional observation binding to the existing DurableSourceSnapshot owner. */
  snapshotRef?: string | null;
  /** Optional immutable content binding to the existing DurableSourceSnapshot owner. */
  contentRef?: string | null;
  sourceRole?: SourceRole;
  media?: SourceMediaMetadata | null;
  lineageStatus:
    | "original"
    | "copy"
    | "syndication"
    | "secondary_quote"
    | "translation_view"
    | "model_derivative";
  rightsStatus: "known" | "unknown" | "restricted";
  retentionStatus: "allowed" | "limited" | "prohibited";
  accessStatus: "public" | "restricted" | "internal";
};

export type SourceSegment = {
  id: string;
  sourceArtifactId: string;
  locator: string;
  originalText: string | null;
  readingView: string | null;
  contextBefore: string | null;
  contextAfter: string | null;
  speaker: string | null;
  speakerRole?:
    | "speaker"
    | "host"
    | "guest"
    | "moderator"
    | "panelist"
    | "reporter"
    | "narrator"
    | "unknown"
    | null;
  attributionStatus?: "explicit" | "inferred" | "ambiguous" | "unknown";
  recognitionUncertainty: "none" | "low" | "medium" | "high" | "unknown";
  segmentRefStatus: "bound" | "missing";
  transcriptionStatus:
    | "not_applicable"
    | "automatic_unreviewed"
    | "human_reviewed";
  translationStatus:
    | "original"
    | "machine_reading_view"
    | "human_reviewed_reading_view";
};

export type AtomicClaimScope = {
  subject: string | null;
  predicate: string | null;
  object: string | null;
  timeScope: string | null;
  jurisdictionScope: string | null;
  populationScope: string | null;
  quantification: string | null;
};

export type AtomicClaim = {
  id: string;
  type: AtomicClaimType;
  text: string;
  originalLocale: string;
  scope: AtomicClaimScope;
};

export type SourceFamily = {
  id: string;
  originRef: string;
  familyKind:
    | "same_publication"
    | "syndication"
    | "same_agency_dispatch"
    | "same_study_or_dataset"
    | "same_interview"
    | "same_editorial_series"
    | "same_speaker"
    | "secondary_quote_chain"
    | "independent_primary_sources";
};

export type ClaimSourceRelation = {
  id: string;
  claimId: string;
  sourceSegmentId: string;
  sourceFamilyId: string;
  relationType: ClaimSourceRelationType;
  sourceIndependence: "independent" | "same_family" | "unknown";
  segmentRefStatus: "bound" | "missing";
  translationOnly: boolean;
  reviewStatus: "unreviewed" | "reviewed";
};

export type EvidenceAssessment = {
  sourceSegmentFidelity: "unknown" | "low" | "medium" | "high";
  speakerAttributionConfidence: "unknown" | "low" | "medium" | "high";
  transcriptionConfidence: "not_applicable" | "low" | "medium" | "high";
  claimEntailmentStrength: "none" | "weak" | "partial" | "strong";
  sourceReliabilityForClaim: "unknown" | "low" | "medium" | "high";
  sourceIndependence: "unknown" | "partially_verified" | "verified";
  externalVerificationStatus: "not_checked" | "open" | "verified" | "disputed";
  generalizabilityScope: "unknown" | "case_only" | "bounded" | "broad";
  counterevidenceStatus:
    | "not_checked"
    | "none_found"
    | "present_resolved"
    | "present_unresolved";
  freshnessStatus: "unknown" | "current" | "stale";
  humanReviewStatus: "unreviewed" | "reviewed";
};

export type SynthesisReceipt = {
  caseId: string;
  caseRevision: string;
  claimIds: string[];
  sourceSegmentIds: string[];
  relationIds: string[];
  sourceFamilies: Array<{
    sourceFamilyId: string;
    independenceStatus: "independent" | "same_family" | "unknown";
  }>;
  counterevidenceIds: string[];
  alternativeExplanationIds: string[];
  omittedCounterevidenceIds: string[];
  openEvidenceGaps: string[];
  allowedPublicationClassification: PublicationClassification;
  requestedPublicationClassification: PublicationClassification;
  modelVersion: string | null;
  promptVersion: string | null;
  policyVersion: string;
  humanReviewRevision: string | null;
  introducedClaimIds: string[];
  promotedRelationIds: string[];
  translationEvidenceSegmentIds: string[];
};

export type SynthesisReceiptValidation = {
  valid: boolean;
  reasons: string[];
};

const DIRECT_SAME_CLAIM_RELATIONS = new Set<ClaimSourceRelationType>([
  "supports_exactly",
  "supports_partially",
  "corroborates_same_claim",
  "contradicts_same_claim",
]);

const SUPPORTING_RELATIONS = new Set<ClaimSourceRelationType>([
  "supports_exactly",
  "supports_partially",
  "corroborates_same_claim",
]);

const EXTERNAL_FACT_SUPPORT_RELATIONS = new Set<ClaimSourceRelationType>([
  "supports_exactly",
  "corroborates_same_claim",
]);

function normalizeDimension(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function sourceArtifactSnapshotBindingStatus(
  artifact: Pick<SourceArtifact, "snapshotRef" | "contentRef">,
): "unbound" | "bound" | "invalid" {
  const snapshotRef = artifact.snapshotRef?.trim() ?? "";
  const contentRef = artifact.contentRef?.trim() ?? "";
  if (!snapshotRef && !contentRef) return "unbound";
  return snapshotRef && contentRef ? "bound" : "invalid";
}

export function sourceArtifactAvailabilityRequiresReview(
  artifact: Pick<SourceArtifact, "media">,
): boolean {
  const status = artifact.media?.availability.status;
  return Boolean(status && status !== "available");
}

export function sourceSegmentAttributionRequiresReview(
  segment: Pick<SourceSegment, "speaker" | "attributionStatus">,
): boolean {
  if (!segment.speaker?.trim()) return true;
  return (
    segment.attributionStatus === "inferred" ||
    segment.attributionStatus === "ambiguous" ||
    segment.attributionStatus === "unknown"
  );
}

export function sourceLineageRelationsReferenceExistingArtifacts(
  sourceArtifacts: readonly Pick<SourceArtifact, "id">[],
  relations: readonly SourceLineageRelation[],
): boolean {
  const artifactIds = new Set(
    sourceArtifacts
      .map((artifact) => artifact.id.trim())
      .filter((artifactId) => artifactId.length > 0),
  );

  return relations.every((relation) => {
    const sourceArtifactId = relation.sourceArtifactId.trim();
    const upstreamSourceArtifactId = relation.upstreamSourceArtifactId.trim();
    return (
      artifactIds.has(sourceArtifactId) &&
      artifactIds.has(upstreamSourceArtifactId)
    );
  });
}

export function sourceLineageHasCycle(relations: SourceLineageRelation[]): boolean {
  const upstreamBySource = new Map<string, Set<string>>();
  for (const relation of relations) {
    const sourceId = relation.sourceArtifactId.trim();
    const upstreamId = relation.upstreamSourceArtifactId.trim();
    if (!sourceId || !upstreamId) continue;
    const upstream = upstreamBySource.get(sourceId) ?? new Set<string>();
    upstream.add(upstreamId);
    upstreamBySource.set(sourceId, upstream);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (sourceId: string): boolean => {
    if (visiting.has(sourceId)) return true;
    if (visited.has(sourceId)) return false;
    visiting.add(sourceId);
    for (const upstreamId of upstreamBySource.get(sourceId) ?? []) {
      if (visit(upstreamId)) return true;
    }
    visiting.delete(sourceId);
    visited.add(sourceId);
    return false;
  };

  for (const sourceId of upstreamBySource.keys()) {
    if (visit(sourceId)) return true;
  }
  return false;
}

export function sourceArtifactEligibleAsExternalEvidence(
  artifact: SourceArtifact,
): boolean {
  return Boolean(
    artifact.sourceType !== "model_output" &&
      artifact.lineageStatus !== "model_derivative" &&
      artifact.accessStatus !== "internal" &&
      artifact.rightsStatus !== "restricted" &&
      artifact.retentionStatus !== "prohibited" &&
      artifact.canonicalRef.trim(),
  );
}

export function haveEquivalentAtomicClaimScope(
  left: Pick<AtomicClaim, "scope">,
  right: Pick<AtomicClaim, "scope">,
): boolean {
  const keys: Array<keyof AtomicClaimScope> = [
    "subject",
    "predicate",
    "object",
    "timeScope",
    "jurisdictionScope",
    "populationScope",
    "quantification",
  ];

  return keys.every(
    (key) => normalizeDimension(left.scope[key]) === normalizeDimension(right.scope[key]),
  );
}

export function relationTargetsSameAtomicClaim(
  relationType: ClaimSourceRelationType,
): boolean {
  return DIRECT_SAME_CLAIM_RELATIONS.has(relationType);
}

export function relationCountsAsIndependentSupport(
  relation: ClaimSourceRelation,
): boolean {
  return Boolean(
    SUPPORTING_RELATIONS.has(relation.relationType) &&
      relation.segmentRefStatus === "bound" &&
      relation.reviewStatus === "reviewed" &&
      relation.sourceIndependence === "independent" &&
      relation.translationOnly === false &&
      relation.sourceFamilyId.trim(),
  );
}

export function countIndependentSupportFamilies(
  relations: ClaimSourceRelation[],
): number {
  const families = new Set<string>();
  for (const relation of relations) {
    if (!relationCountsAsIndependentSupport(relation)) continue;
    families.add(relation.sourceFamilyId.trim());
  }
  return families.size;
}

function findClaimSegments(params: {
  claimId: string;
  relations: ClaimSourceRelation[];
  sourceSegments: SourceSegment[];
}): SourceSegment[] {
  const segmentMap = new Map(params.sourceSegments.map((segment) => [segment.id, segment]));
  return params.relations
    .filter((relation) => relation.claimId === params.claimId)
    .map((relation) => segmentMap.get(relation.sourceSegmentId))
    .filter((segment): segment is SourceSegment => Boolean(segment));
}

function hasSourceIntegrityFailure(params: {
  claimId: string;
  relations: ClaimSourceRelation[];
  sourceSegments: SourceSegment[];
}): boolean {
  const claimRelations = params.relations.filter((relation) => relation.claimId === params.claimId);
  if (claimRelations.length === 0) return true;
  if (claimRelations.some((relation) => relation.segmentRefStatus !== "bound")) return true;

  const segmentIds = new Set(params.sourceSegments.map((segment) => segment.id));
  if (claimRelations.some((relation) => !segmentIds.has(relation.sourceSegmentId))) return true;

  return findClaimSegments(params).some((segment) => segment.segmentRefStatus !== "bound");
}

function hasExternallyVerifiedFactSupport(params: {
  claim: AtomicClaim;
  relations: ClaimSourceRelation[];
  assessment: EvidenceAssessment;
}): boolean {
  if (params.assessment.externalVerificationStatus !== "verified") return false;
  if (params.assessment.humanReviewStatus !== "reviewed") return false;
  if (params.assessment.sourceIndependence !== "verified") return false;
  if (params.assessment.claimEntailmentStrength !== "strong") return false;
  if (params.assessment.sourceSegmentFidelity !== "high") return false;
  if (params.assessment.counterevidenceStatus === "present_unresolved") return false;

  return params.relations.some(
    (relation) =>
      relation.claimId === params.claim.id &&
      EXTERNAL_FACT_SUPPORT_RELATIONS.has(relation.relationType) &&
      relationCountsAsIndependentSupport(relation),
  );
}

export function resolvePublicationClassification(params: {
  claim: AtomicClaim;
  relations: ClaimSourceRelation[];
  sourceSegments: SourceSegment[];
  assessment: EvidenceAssessment;
}): PublicationClassification {
  if (
    hasSourceIntegrityFailure({
      claimId: params.claim.id,
      relations: params.relations,
      sourceSegments: params.sourceSegments,
    })
  ) {
    return "blocked_source_integrity";
  }

  if (params.assessment.humanReviewStatus !== "reviewed") return "review_required";

  const claimRelations = params.relations.filter(
    (relation) => relation.claimId === params.claim.id,
  );
  const claimSegments = findClaimSegments({
    claimId: params.claim.id,
    relations: params.relations,
    sourceSegments: params.sourceSegments,
  });

  if (claimRelations.every((relation) => relation.translationOnly)) {
    return "review_required";
  }

  if (params.claim.type === "reported_speech") {
    const hasQuoteRelation = claimRelations.some(
      (relation) =>
        relation.translationOnly === false &&
        (relation.relationType === "reported_by_source" ||
          relation.relationType === "supports_exactly"),
    );
    const hasUnsafeTranscript = claimSegments.some(
      (segment) => segment.transcriptionStatus === "automatic_unreviewed",
    );
    const hasAttributionRequiringReview = claimSegments.some(
      sourceSegmentAttributionRequiresReview,
    );
    const speakerAndSegmentReliable =
      params.assessment.sourceSegmentFidelity === "high" &&
      params.assessment.speakerAttributionConfidence === "high" &&
      params.assessment.transcriptionConfidence !== "low";

    return hasQuoteRelation &&
      !hasUnsafeTranscript &&
      !hasAttributionRequiringReview &&
      speakerAndSegmentReliable
      ? "publishable_as_quote"
      : "review_required";
  }

  if (params.claim.type === "personal_experience") {
    return "publishable_as_personal_experience";
  }

  if (params.claim.type === "factual_claim" || params.claim.type === "quantified_claim") {
    return hasExternallyVerifiedFactSupport(params)
      ? "publishable_as_externally_verified_fact"
      : "publishable_as_open_hypothesis";
  }

  if (
    params.claim.type === "causal_claim" ||
    params.claim.type === "system_hypothesis" ||
    params.claim.type === "mechanism_hypothesis" ||
    params.claim.type === "interpretation" ||
    params.claim.type === "prediction"
  ) {
    return "publishable_as_open_hypothesis";
  }

  return "review_required";
}

export function validateSynthesisReceipt(
  receipt: SynthesisReceipt,
): SynthesisReceiptValidation {
  const reasons: string[] = [];

  if (receipt.claimIds.length === 0) reasons.push("missing_claim_ids");
  if (receipt.sourceSegmentIds.length === 0) reasons.push("missing_source_segment_ids");
  if (receipt.relationIds.length === 0) reasons.push("missing_relation_ids");
  if (!receipt.policyVersion.trim()) reasons.push("missing_policy_version");
  if (!receipt.humanReviewRevision?.trim()) reasons.push("missing_human_review_revision");
  if (receipt.introducedClaimIds.length > 0) reasons.push("synthesis_introduced_new_claims");
  if (receipt.promotedRelationIds.length > 0) reasons.push("synthesis_promoted_relations");
  if (receipt.translationEvidenceSegmentIds.length > 0) {
    reasons.push("translation_used_as_evidence");
  }
  if (
    receipt.requestedPublicationClassification !== receipt.allowedPublicationClassification
  ) {
    reasons.push("publication_classification_promotion_or_drift");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
