import type {
  SourceArtifact,
  SourceArtifactType,
  SourceSegment,
} from "./atomicClaimSourceRelationContract";

export const MEDIA_SOURCE_ARTIFACT_CONTRACT_VERSION = "media-source-artifact.v1" as const;

export const MEDIA_SOURCE_MODALITIES = ["video", "audio", "stream", "document"] as const;
export type MediaSourceModality = (typeof MEDIA_SOURCE_MODALITIES)[number];

export const MEDIA_SOURCE_ACQUISITION_METHODS = [
  "fixture",
  "official_api",
  "contractual_adapter",
  "manual",
] as const;
export type MediaSourceAcquisitionMethod =
  (typeof MEDIA_SOURCE_ACQUISITION_METHODS)[number];

export const MEDIA_SOURCE_ACQUISITION_STATES = [
  "loaded",
  "failed",
  "manual_required",
] as const;
export type MediaSourceAcquisitionState =
  (typeof MEDIA_SOURCE_ACQUISITION_STATES)[number];

export const MEDIA_SOURCE_FAILURE_CLASSES = [
  "source_unavailable",
  "no_transcript",
  "runtime_incompatible",
  "region_restricted",
  "rights_or_consent_required",
  "provider_not_configured",
  "provider_quota_exhausted",
  "provider_upstream_failure",
  "invalid_source_artifact",
  "unsupported_media",
] as const;
export type MediaSourceFailureClass =
  (typeof MEDIA_SOURCE_FAILURE_CLASSES)[number];

export const MEDIA_SOURCE_RIGHTS_REVIEW_STATES = [
  "not_reviewed",
  "approved",
  "restricted",
  "manual_review_required",
] as const;
export type MediaSourceRightsReviewState =
  (typeof MEDIA_SOURCE_RIGHTS_REVIEW_STATES)[number];

export const MEDIA_SOURCE_CONSENT_REQUIREMENTS = [
  "none",
  "oauth",
  "rights_confirmation",
  "manual_review",
  "unknown",
] as const;
export type MediaSourceConsentRequirement =
  (typeof MEDIA_SOURCE_CONSENT_REQUIREMENTS)[number];

export const MEDIA_SOURCE_REGION_AVAILABILITY_STATES = [
  "available",
  "restricted",
  "unknown",
] as const;
export type MediaSourceRegionAvailabilityState =
  (typeof MEDIA_SOURCE_REGION_AVAILABILITY_STATES)[number];

export const MEDIA_SOURCE_PROVIDER_REQUIREMENTS = [
  "none",
  "official_provider",
  "oauth",
  "manual",
] as const;
export type MediaSourceProviderRequirement =
  (typeof MEDIA_SOURCE_PROVIDER_REQUIREMENTS)[number];

export type MediaSourceSegmentEvidence = Readonly<{
  /** Must reference the existing canonical SourceSegment owner. */
  sourceSegmentId: SourceSegment["id"];
  locator: SourceSegment["locator"];
  /** SHA-256 over the bounded segment evidence, never the segment text itself. */
  evidenceHash: string;
}>;

export type MediaSourceTimestampEvidence = Readonly<{
  /** Must reference an entry in segmentEvidence. */
  sourceSegmentId: SourceSegment["id"];
  startMs: number;
  endMs: number;
}>;

export type MediaSourceCoverageReceipt = Readonly<{
  evidencedSegmentCount: number;
  timestampedSegmentCount: number;
  timestampCoverageRatio: number;
}>;

/**
 * Typed acquisition projection over the existing SourceArtifact / SourceSegment truth.
 * This contract owns no second source store: sourceArtifactId and every sourceSegmentId
 * must resolve to the canonical evidence contracts before downstream composition.
 */
export type MediaSourceArtifact = Readonly<{
  contractVersion: typeof MEDIA_SOURCE_ARTIFACT_CONTRACT_VERSION;
  sourceArtifactId: SourceArtifact["id"];
  sourceType: SourceArtifactType;
  originalUrl: SourceArtifact["canonicalRef"];
  /** Provider/platform identifier such as a public video id; not a credential. */
  sourceId: string;
  modality: MediaSourceModality;
  acquisitionMethod: MediaSourceAcquisitionMethod;
  acquisitionState: MediaSourceAcquisitionState;
  segmentEvidence: readonly MediaSourceSegmentEvidence[];
  timestampEvidence: readonly MediaSourceTimestampEvidence[];
  coverageReceipt: MediaSourceCoverageReceipt;
  extractionLimitations: readonly string[];
  rightsReviewState: MediaSourceRightsReviewState;
  consentRequirement: MediaSourceConsentRequirement;
  regionAvailabilityState: MediaSourceRegionAvailabilityState;
  providerRequirement: MediaSourceProviderRequirement;
  /** SHA-256 over the bounded acquired artifact representation; null on acquisition failure. */
  contentHash: string | null;
  safeFailureClass: MediaSourceFailureClass | null;
}>;

export type MediaSourceArtifactValidation = Readonly<{
  valid: boolean;
  errors: readonly string[];
}>;

const SHA256 = /^[0-9a-f]{64}$/i;

function nonBlank(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isTimedMedia(modality: MediaSourceModality): boolean {
  return modality === "video" || modality === "audio" || modality === "stream";
}

export function buildMediaSourceCoverageReceipt(input: {
  segmentEvidence: readonly MediaSourceSegmentEvidence[];
  timestampEvidence: readonly MediaSourceTimestampEvidence[];
}): MediaSourceCoverageReceipt {
  const evidencedSegmentIds = new Set(
    input.segmentEvidence.map((entry) => entry.sourceSegmentId.trim()).filter(Boolean),
  );
  const timestampedSegmentIds = new Set(
    input.timestampEvidence
      .map((entry) => entry.sourceSegmentId.trim())
      .filter((segmentId) => evidencedSegmentIds.has(segmentId)),
  );
  const evidencedSegmentCount = evidencedSegmentIds.size;
  const timestampedSegmentCount = timestampedSegmentIds.size;
  return {
    evidencedSegmentCount,
    timestampedSegmentCount,
    timestampCoverageRatio:
      evidencedSegmentCount === 0
        ? 0
        : timestampedSegmentCount / evidencedSegmentCount,
  };
}

export function validateMediaSourceArtifact(
  artifact: MediaSourceArtifact,
): MediaSourceArtifactValidation {
  const errors: string[] = [];

  if (artifact.contractVersion !== MEDIA_SOURCE_ARTIFACT_CONTRACT_VERSION) {
    errors.push("media_source_contract_version_invalid");
  }
  if (!nonBlank(artifact.sourceArtifactId)) errors.push("media_source_artifact_id_missing");
  if (!nonBlank(artifact.sourceId)) errors.push("media_source_id_missing");
  if (!isHttpsUrl(artifact.originalUrl)) errors.push("media_source_original_url_invalid");
  if (artifact.sourceType === "model_output") errors.push("media_source_model_output_forbidden");
  if (artifact.contentHash !== null && !SHA256.test(artifact.contentHash)) {
    errors.push("media_source_content_hash_invalid");
  }

  const segmentIds = new Set<string>();
  for (const segment of artifact.segmentEvidence) {
    const segmentId = segment.sourceSegmentId.trim();
    if (!segmentId) errors.push("media_source_segment_id_missing");
    if (segmentIds.has(segmentId)) errors.push(`media_source_segment_duplicate:${segmentId}`);
    segmentIds.add(segmentId);
    if (!nonBlank(segment.locator)) errors.push(`media_source_segment_locator_missing:${segmentId}`);
    if (!SHA256.test(segment.evidenceHash)) {
      errors.push(`media_source_segment_hash_invalid:${segmentId}`);
    }
  }

  const timestampIds = new Set<string>();
  for (const timestamp of artifact.timestampEvidence) {
    const segmentId = timestamp.sourceSegmentId.trim();
    if (!segmentIds.has(segmentId)) {
      errors.push(`media_source_timestamp_segment_unbound:${segmentId}`);
    }
    if (timestampIds.has(segmentId)) {
      errors.push(`media_source_timestamp_duplicate:${segmentId}`);
    }
    timestampIds.add(segmentId);
    if (
      !Number.isInteger(timestamp.startMs) ||
      !Number.isInteger(timestamp.endMs) ||
      timestamp.startMs < 0 ||
      timestamp.endMs <= timestamp.startMs
    ) {
      errors.push(`media_source_timestamp_range_invalid:${segmentId}`);
    }
  }

  const expectedCoverage = buildMediaSourceCoverageReceipt({
    segmentEvidence: artifact.segmentEvidence,
    timestampEvidence: artifact.timestampEvidence,
  });
  if (
    artifact.coverageReceipt.evidencedSegmentCount !== expectedCoverage.evidencedSegmentCount ||
    artifact.coverageReceipt.timestampedSegmentCount !== expectedCoverage.timestampedSegmentCount ||
    Math.abs(
      artifact.coverageReceipt.timestampCoverageRatio -
        expectedCoverage.timestampCoverageRatio,
    ) > Number.EPSILON
  ) {
    errors.push("media_source_coverage_receipt_mismatch");
  }

  if (artifact.acquisitionState === "loaded") {
    if (artifact.segmentEvidence.length === 0) {
      errors.push("media_source_loaded_requires_segment_evidence");
    }
    if (isTimedMedia(artifact.modality) && artifact.timestampEvidence.length === 0) {
      errors.push("media_source_loaded_requires_timestamp_evidence");
    }
    if (!artifact.contentHash || !SHA256.test(artifact.contentHash)) {
      errors.push("media_source_loaded_requires_content_hash");
    }
    if (artifact.safeFailureClass !== null) {
      errors.push("media_source_loaded_forbids_failure_class");
    }
  } else if (artifact.safeFailureClass === null) {
    errors.push("media_source_failure_class_required");
  }

  if (
    artifact.regionAvailabilityState === "restricted" &&
    artifact.safeFailureClass !== "region_restricted"
  ) {
    errors.push("media_source_region_restriction_failure_mismatch");
  }
  if (
    artifact.rightsReviewState === "restricted" &&
    artifact.safeFailureClass !== "rights_or_consent_required"
  ) {
    errors.push("media_source_rights_restriction_failure_mismatch");
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function isMediaSourceArtifactLoaded(artifact: MediaSourceArtifact): boolean {
  return artifact.acquisitionState === "loaded" && validateMediaSourceArtifact(artifact).valid;
}

export function mediaSourceArtifactMatchesCanonicalSource(
  mediaArtifact: MediaSourceArtifact,
  sourceArtifact: Pick<
    SourceArtifact,
    "id" | "canonicalRef" | "sourceType" | "contentHashOrRevision"
  >,
): boolean {
  return Boolean(
    mediaArtifact.sourceArtifactId === sourceArtifact.id &&
      mediaArtifact.originalUrl === sourceArtifact.canonicalRef &&
      mediaArtifact.sourceType === sourceArtifact.sourceType &&
      (!sourceArtifact.contentHashOrRevision ||
        mediaArtifact.contentHash === sourceArtifact.contentHashOrRevision),
  );
}

export function mediaSourceEvidenceReferencesCanonicalSegments(
  mediaArtifact: MediaSourceArtifact,
  sourceSegments: readonly Pick<SourceSegment, "id" | "sourceArtifactId" | "locator">[],
): boolean {
  const canonicalSegments = new Map(sourceSegments.map((segment) => [segment.id, segment]));
  return mediaArtifact.segmentEvidence.every((evidence) => {
    const segment = canonicalSegments.get(evidence.sourceSegmentId);
    return Boolean(
      segment &&
        segment.sourceArtifactId === mediaArtifact.sourceArtifactId &&
        segment.locator === evidence.locator,
    );
  });
}

export function buildMediaSourceFailureDisposition(
  safeFailureClass: MediaSourceFailureClass,
): Readonly<{
  sourceLoaded: false;
  analysisState: "fetch_failed";
  degraded: true;
  degradedReason: MediaSourceFailureClass;
  researchAllowanceConsumed: false;
}> {
  return {
    sourceLoaded: false,
    analysisState: "fetch_failed",
    degraded: true,
    degradedReason: safeFailureClass,
    researchAllowanceConsumed: false,
  };
}

export function buildSafeMediaSourceTelemetry(artifact: MediaSourceArtifact) {
  return {
    contractVersion: artifact.contractVersion,
    sourceType: artifact.sourceType,
    modality: artifact.modality,
    acquisitionMethod: artifact.acquisitionMethod,
    acquisitionState: artifact.acquisitionState,
    safeFailureClass: artifact.safeFailureClass,
    segmentEvidenceCount: artifact.segmentEvidence.length,
    timestampEvidenceCount: artifact.timestampEvidence.length,
    extractionLimitationCount: artifact.extractionLimitations.length,
    rightsReviewState: artifact.rightsReviewState,
    consentRequirement: artifact.consentRequirement,
    regionAvailabilityState: artifact.regionAvailabilityState,
    providerRequirement: artifact.providerRequirement,
    contentHash: artifact.contentHash,
  } as const;
}
