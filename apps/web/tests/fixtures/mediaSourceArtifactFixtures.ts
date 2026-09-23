import type {
  SourceArtifact,
  SourceSegment,
} from "@features/analyze/atomicClaimSourceRelationContract";
import {
  MEDIA_SOURCE_ARTIFACT_CONTRACT_VERSION,
  buildMediaSourceCoverageReceipt,
  type MediaSourceArtifact,
} from "@features/analyze/mediaSourceArtifactContract";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

export const canonicalVideoSourceArtifact: SourceArtifact = {
  id: "source-artifact-youtube-fixture-1",
  canonicalRef: "https://www.youtube.com/watch?v=fixture-video-1",
  sourceType: "user_provided_material",
  publisherOrAuthor: null,
  publishedAt: null,
  accessedAt: "2026-09-23T19:40:00.000Z",
  originalLocale: "en",
  sourceFamilyId: "source-family-youtube-fixture-1",
  contentHashOrRevision: HASH_A,
  sourceRole: "origin",
  media: {
    mediumKind: "video",
    publicOriginalMediaUrl: "https://www.youtube.com/watch?v=fixture-video-1",
    durationSeconds: 12,
    availability: { status: "available", lastCheckedAt: "2026-09-23T19:40:00.000Z" },
    subtitleAvailable: true,
    transcriptAvailable: true,
    supplementalRefs: [],
  },
  lineageStatus: "original",
  rightsStatus: "unknown",
  retentionStatus: "limited",
  accessStatus: "public",
};

export const canonicalVideoSourceSegments: SourceSegment[] = [
  {
    id: "source-segment-youtube-fixture-1-001",
    sourceArtifactId: canonicalVideoSourceArtifact.id,
    locator: "t=0-6000ms",
    originalText: null,
    readingView: null,
    contextBefore: null,
    contextAfter: null,
    speaker: null,
    recognitionUncertainty: "unknown",
    segmentRefStatus: "bound",
    transcriptionStatus: "automatic_unreviewed",
    translationStatus: "original",
  },
  {
    id: "source-segment-youtube-fixture-1-002",
    sourceArtifactId: canonicalVideoSourceArtifact.id,
    locator: "t=6000-12000ms",
    originalText: null,
    readingView: null,
    contextBefore: null,
    contextAfter: null,
    speaker: null,
    recognitionUncertainty: "unknown",
    segmentRefStatus: "bound",
    transcriptionStatus: "automatic_unreviewed",
    translationStatus: "original",
  },
];

function artifact(
  input: Omit<MediaSourceArtifact, "contractVersion" | "coverageReceipt">,
): MediaSourceArtifact {
  return {
    contractVersion: MEDIA_SOURCE_ARTIFACT_CONTRACT_VERSION,
    ...input,
    coverageReceipt: buildMediaSourceCoverageReceipt({
      segmentEvidence: input.segmentEvidence,
      timestampEvidence: input.timestampEvidence,
    }),
  };
}

export const loadedYouTubeMediaSourceFixture = artifact({
  sourceArtifactId: canonicalVideoSourceArtifact.id,
  sourceType: canonicalVideoSourceArtifact.sourceType,
  originalUrl: canonicalVideoSourceArtifact.canonicalRef,
  sourceId: "fixture-video-1",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "loaded",
  segmentEvidence: [
    {
      sourceSegmentId: canonicalVideoSourceSegments[0].id,
      locator: canonicalVideoSourceSegments[0].locator,
      evidenceHash: HASH_B,
    },
    {
      sourceSegmentId: canonicalVideoSourceSegments[1].id,
      locator: canonicalVideoSourceSegments[1].locator,
      evidenceHash: HASH_C,
    },
  ],
  timestampEvidence: [
    { sourceSegmentId: canonicalVideoSourceSegments[0].id, startMs: 0, endMs: 6000 },
    { sourceSegmentId: canonicalVideoSourceSegments[1].id, startMs: 6000, endMs: 12000 },
  ],
  extractionLimitations: ["fixture_only_no_live_provider_call"],
  rightsReviewState: "not_reviewed",
  consentRequirement: "unknown",
  regionAvailabilityState: "available",
  providerRequirement: "none",
  contentHash: HASH_A,
  safeFailureClass: null,
});

export const noTranscriptMediaSourceFixture = artifact({
  sourceArtifactId: "source-artifact-youtube-no-transcript",
  sourceType: "user_provided_material",
  originalUrl: "https://www.youtube.com/watch?v=fixture-no-transcript",
  sourceId: "fixture-no-transcript",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "failed",
  segmentEvidence: [],
  timestampEvidence: [],
  extractionLimitations: ["caption_track_absent"],
  rightsReviewState: "not_reviewed",
  consentRequirement: "unknown",
  regionAvailabilityState: "available",
  providerRequirement: "none",
  contentHash: null,
  safeFailureClass: "no_transcript",
});

export const runtimeIncompatibleMediaSourceFixture = artifact({
  sourceArtifactId: "source-artifact-youtube-runtime-incompatible",
  sourceType: "user_provided_material",
  originalUrl: "https://www.youtube.com/watch?v=fixture-runtime-incompatible",
  sourceId: "fixture-runtime-incompatible",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "failed",
  segmentEvidence: [],
  timestampEvidence: [],
  extractionLimitations: ["upstream_login_required", "watch_fallback_challenged"],
  rightsReviewState: "not_reviewed",
  consentRequirement: "unknown",
  regionAvailabilityState: "unknown",
  providerRequirement: "official_provider",
  contentHash: null,
  safeFailureClass: "runtime_incompatible",
});

export const regionRestrictedMediaSourceFixture = artifact({
  sourceArtifactId: "source-artifact-youtube-region-restricted",
  sourceType: "user_provided_material",
  originalUrl: "https://www.youtube.com/watch?v=fixture-region-restricted",
  sourceId: "fixture-region-restricted",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "failed",
  segmentEvidence: [],
  timestampEvidence: [],
  extractionLimitations: ["source_not_available_in_execution_region"],
  rightsReviewState: "not_reviewed",
  consentRequirement: "unknown",
  regionAvailabilityState: "restricted",
  providerRequirement: "none",
  contentHash: null,
  safeFailureClass: "region_restricted",
});

export const rightsGatedMediaSourceFixture = artifact({
  sourceArtifactId: "source-artifact-youtube-rights-gated",
  sourceType: "user_provided_material",
  originalUrl: "https://www.youtube.com/watch?v=fixture-rights-gated",
  sourceId: "fixture-rights-gated",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "manual_required",
  segmentEvidence: [],
  timestampEvidence: [],
  extractionLimitations: ["rights_review_required_before_acquisition"],
  rightsReviewState: "restricted",
  consentRequirement: "rights_confirmation",
  regionAvailabilityState: "available",
  providerRequirement: "manual",
  contentHash: null,
  safeFailureClass: "rights_or_consent_required",
});

export const invalidLoadedWithoutEvidenceFixture = artifact({
  sourceArtifactId: "source-artifact-youtube-invalid-empty",
  sourceType: "user_provided_material",
  originalUrl: "https://www.youtube.com/watch?v=fixture-invalid-empty",
  sourceId: "fixture-invalid-empty",
  modality: "video",
  acquisitionMethod: "fixture",
  acquisitionState: "loaded",
  segmentEvidence: [],
  timestampEvidence: [],
  extractionLimitations: [],
  rightsReviewState: "not_reviewed",
  consentRequirement: "unknown",
  regionAvailabilityState: "available",
  providerRequirement: "none",
  contentHash: HASH_A,
  safeFailureClass: null,
});
