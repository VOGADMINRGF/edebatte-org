import { describe, expect, it } from "vitest";

import {
  adaptCreateExternalSourceToCanonicalEvidence,
  type CreateExternalSourceCanonicalAdapterSuccess,
} from "@/features/create/externalSourceCanonicalAdapter";
import type { CreateExternalSource } from "@/features/create/externalSourceIntake";
import {
  countIndependentSupportFamilies,
  relationCountsAsIndependentSupport,
  type ClaimSourceRelation,
  type SourceLineageRelation,
} from "@features/analyze/atomicClaimSourceRelationContract";

function buildSource(
  overrides: Partial<CreateExternalSource> = {},
): CreateExternalSource {
  return {
    sourceKind: "html",
    text: "Das ist der geladene Originaltext der Quelle.",
    pageCount: null,
    contentType: "text/html",
    documentType: "article",
    documentTitle: "Quellentitel",
    httpStatus: 200,
    finalUrl: "https://example.test/source",
    contentHash: "a".repeat(64),
    sourceLocale: "de",
    transcriptSegmentCount: null,
    ...overrides,
  };
}

function expectSuccess(
  result: ReturnType<typeof adaptCreateExternalSourceToCanonicalEvidence>,
): CreateExternalSourceCanonicalAdapterSuccess {
  if (!result.ok) {
    throw new Error(`expected adapter success, received ${result.error}`);
  }
  return result;
}

function supportingRelation(input: {
  id: string;
  sourceSegmentId: string;
  sourceFamilyId: string;
  sourceIndependence: ClaimSourceRelation["sourceIndependence"];
  translationOnly?: boolean;
}): ClaimSourceRelation {
  return {
    id: input.id,
    claimId: "claim-1",
    sourceSegmentId: input.sourceSegmentId,
    sourceFamilyId: input.sourceFamilyId,
    relationType: "supports_exactly",
    sourceIndependence: input.sourceIndependence,
    segmentRefStatus: "bound",
    translationOnly: input.translationOnly ?? false,
    reviewStatus: "reviewed",
  };
}

describe("C13 Create external source canonical adapter", () => {
  it("maps loaded HTML into one existing artifact and segment without inventing a snapshot", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource(),
        accessedAt: "2026-09-21T10:00:00.000Z",
        snapshotRef: "snapshot:source-1:v3:fixture",
        contentRef: "content:sha256:fixture",
      }),
    );

    expect(result.artifact).toMatchObject({
      canonicalRef: "https://example.test/source",
      sourceType: "user_provided_material",
      originalLocale: "de",
      contentHashOrRevision: "a".repeat(64),
      accessedAt: "2026-09-21T10:00:00.000Z",
      rightsStatus: "unknown",
      retentionStatus: "limited",
      accessStatus: "public",
      snapshotRef: "snapshot:source-1:v3:fixture",
      contentRef: "content:sha256:fixture",
      media: {
        mediumKind: "article",
        availability: { status: "available" },
      },
    });
    expect(result.segments).toEqual([
      expect.objectContaining({
        sourceArtifactId: result.artifact.id,
        locator: "html:document",
        originalText: "Das ist der geladene Originaltext der Quelle.",
        readingView: null,
        speaker: null,
        transcriptionStatus: "not_applicable",
        translationStatus: "original",
        segmentRefStatus: "bound",
      }),
    ]);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.noTruthPromotion).toBe(true);
    expect(result.noAutoPublish).toBe(true);
  });

  it("maps loaded PDF material to a deterministic document segment without a fictional page or speaker", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({
          sourceKind: "pdf",
          contentType: "application/pdf",
          documentType: "report",
          pageCount: 12,
          finalUrl: "https://example.test/report.pdf",
          contentHash: "b".repeat(64),
          sourceLocale: "fr",
        }),
      }),
    );

    expect(result.artifact.media?.mediumKind).toBe("document");
    expect(result.artifact.originalLocale).toBe("fr");
    expect(result.segments[0]).toMatchObject({
      locator: "pdf:document",
      speaker: null,
      speakerRole: null,
      transcriptionStatus: "not_applicable",
    });
    expect(result.artifact.snapshotRef).toBeNull();
    expect(result.artifact.contentRef).toBeNull();
  });

  it("keeps a foreign-language original and its reading view on one segment", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({
          text: "Le taux est de 60 pour cent.",
          sourceLocale: "fr",
          contentHash: "c".repeat(64),
        }),
        segments: [
          {
            originalText: "Le taux est de 60 pour cent.",
            readingView: "Der Anteil beträgt 60 Prozent.",
            translationStatus: "human_reviewed_reading_view",
          },
        ],
      }),
    );

    expect(result.artifact.originalLocale).toBe("fr");
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0]).toMatchObject({
      sourceArtifactId: result.artifact.id,
      originalText: "Le taux est de 60 pour cent.",
      readingView: "Der Anteil beträgt 60 Prozent.",
      translationStatus: "human_reviewed_reading_view",
    });
    expect(
      relationCountsAsIndependentSupport(
        supportingRelation({
          id: "translation-only",
          sourceSegmentId: result.segments[0].id,
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "independent",
          translationOnly: true,
        }),
      ),
    ).toBe(false);
  });

  it("keeps talkshow speakers segment-bound and lets an explicit reviewed attribution pass the adapter gate", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({
          sourceKind: "youtube_transcript",
          contentType: "text/plain; source=youtube-transcript",
          documentType: "unknown",
          documentTitle: "Panel zur Mobilität",
          contentHash: "d".repeat(64),
          sourceLocale: "de",
          transcriptSegmentCount: 4,
        }),
        media: {
          mediumKind: "tv",
          programmeRef: "panel-mobilitaet",
        },
        segments: [
          {
            locator: "00:12:14-00:12:48",
            originalText: "Die Gastperson erläutert ihre Position.",
            speaker: "Person A",
            speakerRole: "guest",
            attributionStatus: "explicit",
            transcriptionStatus: "human_reviewed",
          },
        ],
      }),
    );

    expect(result.segments[0]).toMatchObject({
      locator: "00:12:14-00:12:48",
      speaker: "Person A",
      speakerRole: "guest",
      attributionStatus: "explicit",
    });
    expect(result.attributionReviewRequired).toBe(false);
  });

  it("keeps missing, inferred, and ambiguous talkshow attribution review-required", () => {
    const source = buildSource({
      sourceKind: "youtube_transcript",
      contentHash: "e".repeat(64),
      transcriptSegmentCount: 4,
    });
    const missing = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source,
        segments: [
          {
            locator: "00:02:00",
            speaker: null,
            attributionStatus: "unknown",
            transcriptionStatus: "human_reviewed",
          },
        ],
      }),
    );
    const inferred = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ ...source, contentHash: "f".repeat(64) }),
        segments: [
          {
            locator: "00:02:00",
            speaker: "Person A",
            attributionStatus: "inferred",
            transcriptionStatus: "human_reviewed",
          },
        ],
      }),
    );
    const ambiguous = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ ...source, contentHash: "1".repeat(64) }),
        segments: [
          {
            locator: "00:02:00",
            speaker: "Person A oder Person B",
            attributionStatus: "ambiguous",
            transcriptionStatus: "human_reviewed",
          },
        ],
      }),
    );

    expect(missing.segments[0].speaker).toBeNull();
    expect(missing.attributionReviewRequired).toBe(true);
    expect(inferred.attributionReviewRequired).toBe(true);
    expect(ambiguous.attributionReviewRequired).toBe(true);
  });

  it("keeps expired and unavailable media historically referencable but review-required without mirroring", () => {
    const expired = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ contentHash: "2".repeat(64) }),
        media: {
          mediumKind: "video",
          availability: {
            status: "expired",
            availableUntil: "2026-09-20T20:00:00.000Z",
          },
        },
      }),
    );
    const unavailable = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ contentHash: "3".repeat(64) }),
        media: {
          mediumKind: "video",
          availability: { status: "unavailable" },
        },
      }),
    );

    expect(expired.artifact.media?.availability.status).toBe("expired");
    expect(unavailable.artifact.media?.availability.status).toBe("unavailable");
    expect(expired.availabilityReviewRequired).toBe(true);
    expect(unavailable.availabilityReviewRequired).toBe(true);
    expect(expired.artifact).not.toHaveProperty("originalContent");
    expect(unavailable.artifact).not.toHaveProperty("originalContent");
  });

  it("keeps satire and factcheck lineage as reviewed research material without truth promotion", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ contentHash: "4".repeat(64) }),
        artifactId: "factcheck-1",
        sourceFamilyId: "satire-family",
        sourceType: "secondary_source",
        sourceRole: "evidence",
        media: {
          mediumKind: "fact_check",
          availability: { status: "available" },
        },
        knownSourceArtifacts: [{ id: "satire-original-1" }],
        lineage: [
          {
            id: "factcheck-cites-satire",
            sourceArtifactId: "factcheck-1",
            upstreamSourceArtifactId: "satire-original-1",
            relationType: "cites",
            reviewStatus: "reviewed",
          },
        ],
      }),
    );

    expect(result.artifact.media?.mediumKind).toBe("fact_check");
    expect(result.lineage).toEqual([
      expect.objectContaining({ relationType: "cites" }),
    ]);
    expect(result.noTruthPromotion).toBe(true);
    expect(result.noAutoPublish).toBe(true);
    expect(
      countIndependentSupportFamilies([
        supportingRelation({
          id: "satire-original",
          sourceSegmentId: "satire-segment",
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "independent",
        }),
        supportingRelation({
          id: "factcheck",
          sourceSegmentId: result.segments[0].id,
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "same_family",
        }),
      ]),
    ).toBe(1);
  });

  it("rejects dangling lineage refs and lineage cycles before producing canonical candidates", () => {
    const dangling = adaptCreateExternalSourceToCanonicalEvidence({
      source: buildSource({ contentHash: "5".repeat(64) }),
      artifactId: "factcheck-1",
      lineage: [
        {
          id: "dangling",
          sourceArtifactId: "factcheck-1",
          upstreamSourceArtifactId: "missing-original",
          relationType: "cites",
          reviewStatus: "reviewed",
        },
      ],
    });
    const cycle: SourceLineageRelation[] = [
      {
        id: "factcheck-study",
        sourceArtifactId: "factcheck-1",
        upstreamSourceArtifactId: "study-1",
        relationType: "uses_study",
        reviewStatus: "reviewed",
      },
      {
        id: "study-media",
        sourceArtifactId: "study-1",
        upstreamSourceArtifactId: "media-1",
        relationType: "cites",
        reviewStatus: "reviewed",
      },
      {
        id: "media-factcheck",
        sourceArtifactId: "media-1",
        upstreamSourceArtifactId: "factcheck-1",
        relationType: "cites",
        reviewStatus: "reviewed",
      },
    ];
    const cyclic = adaptCreateExternalSourceToCanonicalEvidence({
      source: buildSource({ contentHash: "6".repeat(64) }),
      artifactId: "factcheck-1",
      knownSourceArtifacts: [{ id: "study-1" }, { id: "media-1" }],
      lineage: cycle,
    });

    expect(dangling).toMatchObject({
      ok: false,
      error: "dangling_source_lineage",
      noTruthPromotion: true,
    });
    expect(cyclic).toMatchObject({
      ok: false,
      error: "source_lineage_cycle",
      noTruthPromotion: true,
    });
  });

  it("keeps syndication and derived provenance from becoming independent support", () => {
    const result = expectSuccess(
      adaptCreateExternalSourceToCanonicalEvidence({
        source: buildSource({ contentHash: "7".repeat(64) }),
        artifactId: "syndication-1",
        sourceFamilyId: "agency-family",
        knownSourceArtifacts: [{ id: "original-1" }, { id: "derived-1" }],
        lineage: [
          {
            id: "syndication-original",
            sourceArtifactId: "syndication-1",
            upstreamSourceArtifactId: "original-1",
            relationType: "syndicates",
            reviewStatus: "reviewed",
          },
          {
            id: "derived-original",
            sourceArtifactId: "derived-1",
            upstreamSourceArtifactId: "original-1",
            relationType: "derived_from",
            reviewStatus: "reviewed",
          },
        ],
      }),
    );

    expect(result.lineage.map((relation) => relation.relationType)).toEqual([
      "syndicates",
      "derived_from",
    ]);
    expect(
      countIndependentSupportFamilies([
        supportingRelation({
          id: "original",
          sourceSegmentId: "original-segment",
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "independent",
        }),
        supportingRelation({
          id: "syndication",
          sourceSegmentId: result.segments[0].id,
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "same_family",
        }),
        supportingRelation({
          id: "derived",
          sourceSegmentId: "derived-segment",
          sourceFamilyId: result.artifact.sourceFamilyId,
          sourceIndependence: "same_family",
        }),
      ]),
    ).toBe(1);
  });
});
