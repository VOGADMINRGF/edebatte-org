import { describe, expect, it } from "vitest";
import {
  MEDIA_SOURCE_FAILURE_CLASSES,
  buildMediaSourceFailureDisposition,
  buildSafeMediaSourceTelemetry,
  isMediaSourceArtifactLoaded,
  mediaSourceArtifactMatchesCanonicalSource,
  mediaSourceEvidenceReferencesCanonicalSegments,
  validateMediaSourceArtifact,
  type MediaSourceArtifact,
} from "@features/analyze/mediaSourceArtifactContract";
import {
  canonicalVideoSourceArtifact,
  canonicalVideoSourceSegments,
  invalidLoadedWithoutEvidenceFixture,
  loadedYouTubeMediaSourceFixture,
  noTranscriptMediaSourceFixture,
  regionRestrictedMediaSourceFixture,
  rightsGatedMediaSourceFixture,
  runtimeIncompatibleMediaSourceFixture,
} from "./fixtures/mediaSourceArtifactFixtures";

describe("#644 media source artifact contract", () => {
  it("accepts a loaded timed-media artifact only with real segment and timestamp evidence", () => {
    const validation = validateMediaSourceArtifact(loadedYouTubeMediaSourceFixture);

    expect(validation).toEqual({ valid: true, errors: [] });
    expect(isMediaSourceArtifactLoaded(loadedYouTubeMediaSourceFixture)).toBe(true);
    expect(loadedYouTubeMediaSourceFixture.coverageReceipt).toEqual({
      evidencedSegmentCount: 2,
      timestampedSegmentCount: 2,
      timestampCoverageRatio: 1,
    });
    expect(
      mediaSourceArtifactMatchesCanonicalSource(
        loadedYouTubeMediaSourceFixture,
        canonicalVideoSourceArtifact,
      ),
    ).toBe(true);
    expect(
      mediaSourceEvidenceReferencesCanonicalSegments(
        loadedYouTubeMediaSourceFixture,
        canonicalVideoSourceSegments,
      ),
    ).toBe(true);
  });

  it("fails closed when a video claims loaded without segment/timestamp evidence", () => {
    const validation = validateMediaSourceArtifact(invalidLoadedWithoutEvidenceFixture);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("media_source_loaded_requires_segment_evidence");
    expect(validation.errors).toContain("media_source_loaded_requires_timestamp_evidence");
    expect(isMediaSourceArtifactLoaded(invalidLoadedWithoutEvidenceFixture)).toBe(false);
  });

  it("keeps no-transcript and runtime-incompatible failures distinct and quota-neutral", () => {
    expect(validateMediaSourceArtifact(noTranscriptMediaSourceFixture).valid).toBe(true);
    expect(validateMediaSourceArtifact(runtimeIncompatibleMediaSourceFixture).valid).toBe(true);

    expect(buildMediaSourceFailureDisposition("no_transcript")).toEqual({
      sourceLoaded: false,
      analysisState: "fetch_failed",
      degraded: true,
      degradedReason: "no_transcript",
      researchAllowanceConsumed: false,
    });
    expect(buildMediaSourceFailureDisposition("runtime_incompatible")).toEqual({
      sourceLoaded: false,
      analysisState: "fetch_failed",
      degraded: true,
      degradedReason: "runtime_incompatible",
      researchAllowanceConsumed: false,
    });
  });

  it("represents region and rights/consent gates without pretending acquisition succeeded", () => {
    expect(validateMediaSourceArtifact(regionRestrictedMediaSourceFixture)).toEqual({
      valid: true,
      errors: [],
    });
    expect(validateMediaSourceArtifact(rightsGatedMediaSourceFixture)).toEqual({
      valid: true,
      errors: [],
    });
    expect(isMediaSourceArtifactLoaded(regionRestrictedMediaSourceFixture)).toBe(false);
    expect(isMediaSourceArtifactLoaded(rightsGatedMediaSourceFixture)).toBe(false);
  });

  it("rejects timestamp evidence that is unbound or has an invalid range", () => {
    const invalid: MediaSourceArtifact = {
      ...loadedYouTubeMediaSourceFixture,
      timestampEvidence: [
        { sourceSegmentId: "missing-segment", startMs: 1000, endMs: 500 },
      ],
      coverageReceipt: {
        evidencedSegmentCount: 2,
        timestampedSegmentCount: 0,
        timestampCoverageRatio: 0,
      },
    };

    const validation = validateMediaSourceArtifact(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("media_source_timestamp_segment_unbound:missing-segment");
    expect(validation.errors).toContain("media_source_timestamp_range_invalid:missing-segment");
  });

  it("does not accept a media projection as canonical evidence when its SourceArtifact binding drifts", () => {
    expect(
      mediaSourceArtifactMatchesCanonicalSource(loadedYouTubeMediaSourceFixture, {
        ...canonicalVideoSourceArtifact,
        canonicalRef: "https://www.youtube.com/watch?v=another-fixture",
      }),
    ).toBe(false);

    expect(
      mediaSourceEvidenceReferencesCanonicalSegments(
        loadedYouTubeMediaSourceFixture,
        canonicalVideoSourceSegments.map((segment) => ({
          ...segment,
          sourceArtifactId: "another-artifact",
        })),
      ),
    ).toBe(false);
  });

  it("exposes the complete safe failure taxonomy without collapsing causes", () => {
    expect(MEDIA_SOURCE_FAILURE_CLASSES).toEqual([
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
    ]);
  });

  it("builds bounded telemetry without URL, transcript, prompt, cookie, header, token or secret fields", () => {
    const telemetry = buildSafeMediaSourceTelemetry(runtimeIncompatibleMediaSourceFixture);
    const serialized = JSON.stringify(telemetry).toLowerCase();

    expect(telemetry).toMatchObject({
      acquisitionState: "failed",
      safeFailureClass: "runtime_incompatible",
      segmentEvidenceCount: 0,
      timestampEvidenceCount: 0,
    });
    expect(telemetry).not.toHaveProperty("originalUrl");
    expect(serialized).not.toContain("transcript");
    expect(serialized).not.toContain("prompt");
    expect(serialized).not.toContain("cookie");
    expect(serialized).not.toContain("header");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("secret");
  });
});
