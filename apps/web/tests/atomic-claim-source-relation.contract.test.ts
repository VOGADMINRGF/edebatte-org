import { describe, expect, it } from "vitest";

import {
  CLAIM_SOURCE_RELATION_TYPES,
  SOURCE_LINEAGE_RELATION_TYPES,
  countIndependentSupportFamilies,
  haveEquivalentAtomicClaimScope,
  relationCountsAsIndependentSupport,
  relationTargetsSameAtomicClaim,
  resolvePublicationClassification,
  sourceArtifactAvailabilityRequiresReview,
  sourceArtifactEligibleAsExternalEvidence,
  sourceArtifactSnapshotBindingStatus,
  sourceLineageHasCycle,
  sourceLineageRelationsReferenceExistingArtifacts,
  sourceSegmentAttributionRequiresReview,
  validateSynthesisReceipt,
  type AtomicClaim,
  type ClaimSourceRelation,
  type EvidenceAssessment,
  type SourceArtifact,
  type SourceLineageRelation,
  type SourceSegment,
  type SynthesisReceipt,
} from "@features/analyze/atomicClaimSourceRelationContract";

const baseClaim: AtomicClaim = {
  id: "claim-1",
  type: "quantified_claim",
  text: "In der Stichprobe nennen 60 Prozent der Befragten Thema X.",
  originalLocale: "de",
  scope: {
    subject: "Befragte",
    predicate: "nennen",
    object: "Thema X",
    timeScope: "2026-Q2",
    jurisdictionScope: "Berlin",
    populationScope: "Stichprobe A",
    quantification: "60 Prozent",
  },
};

const baseSegment: SourceSegment = {
  id: "segment-1",
  sourceArtifactId: "source-1",
  locator: "S. 4",
  originalText: "60 Prozent der Befragten nennen Thema X.",
  readingView: null,
  contextBefore: "Methodik und Stichprobe werden unmittelbar davor beschrieben.",
  contextAfter: "Danach folgen Einschränkungen der Übertragbarkeit.",
  speaker: null,
  recognitionUncertainty: "none",
  segmentRefStatus: "bound",
  transcriptionStatus: "not_applicable",
  translationStatus: "original",
};

const baseRelation: ClaimSourceRelation = {
  id: "relation-1",
  claimId: baseClaim.id,
  sourceSegmentId: baseSegment.id,
  sourceFamilyId: "family-1",
  relationType: "supports_exactly",
  sourceIndependence: "independent",
  segmentRefStatus: "bound",
  translationOnly: false,
  reviewStatus: "reviewed",
};

const baseAssessment: EvidenceAssessment = {
  sourceSegmentFidelity: "high",
  speakerAttributionConfidence: "high",
  transcriptionConfidence: "not_applicable",
  claimEntailmentStrength: "strong",
  sourceReliabilityForClaim: "high",
  sourceIndependence: "verified",
  externalVerificationStatus: "verified",
  generalizabilityScope: "bounded",
  counterevidenceStatus: "none_found",
  freshnessStatus: "current",
  humanReviewStatus: "reviewed",
};

const baseArtifact: SourceArtifact = {
  id: "source-1",
  canonicalRef: "https://example.test/source",
  sourceType: "media_report",
  publisherOrAuthor: "Example",
  publishedAt: "2026-09-20T18:00:00.000Z",
  accessedAt: "2026-09-20T19:00:00.000Z",
  originalLocale: "de",
  sourceFamilyId: "family-1",
  contentHashOrRevision: "sha256:fixture",
  lineageStatus: "original",
  rightsStatus: "known",
  retentionStatus: "allowed",
  accessStatus: "public",
};

function buildReceipt(
  overrides: Partial<SynthesisReceipt> = {},
): SynthesisReceipt {
  return {
    caseId: "case-1",
    caseRevision: "rev-1",
    claimIds: [baseClaim.id],
    sourceSegmentIds: [baseSegment.id],
    relationIds: [baseRelation.id],
    sourceFamilies: [
      {
        sourceFamilyId: baseRelation.sourceFamilyId,
        independenceStatus: "independent",
      },
    ],
    counterevidenceIds: [],
    alternativeExplanationIds: [],
    omittedCounterevidenceIds: [],
    openEvidenceGaps: [],
    allowedPublicationClassification: "publishable_as_open_hypothesis",
    requestedPublicationClassification: "publishable_as_open_hypothesis",
    modelVersion: "fixture-model",
    promptVersion: "fixture-prompt",
    policyVersion: "atomic-claim-source-relation-v1",
    humanReviewRevision: "review-1",
    introducedClaimIds: [],
    promotedRelationIds: [],
    translationEvidenceSegmentIds: [],
    ...overrides,
  };
}

describe("atomic claim/source relation contract", () => {
  it("does not treat thematic similarity as support for the same atomic claim", () => {
    expect(relationTargetsSameAtomicClaim("thematically_related_only")).toBe(false);
    expect(
      relationCountsAsIndependentSupport({
        ...baseRelation,
        relationType: "thematically_related_only",
      }),
    ).toBe(false);
  });

  it("counts multiple agent runs on the same source family only once", () => {
    const relations: ClaimSourceRelation[] = [
      baseRelation,
      {
        ...baseRelation,
        id: "relation-2",
        sourceSegmentId: "segment-2",
      },
    ];

    expect(countIndependentSupportFamilies(relations)).toBe(1);
  });

  it("does not count a syndicated agency copy as a second independent family", () => {
    const relations: ClaimSourceRelation[] = [
      baseRelation,
      {
        ...baseRelation,
        id: "relation-2",
        sourceSegmentId: "segment-2",
        sourceFamilyId: "agency-family-1",
        sourceIndependence: "same_family",
      },
      {
        ...baseRelation,
        id: "relation-3",
        sourceSegmentId: "segment-3",
        sourceFamilyId: "agency-family-1",
        sourceIndependence: "same_family",
      },
    ];

    expect(countIndependentSupportFamilies(relations)).toBe(1);
  });

  it("never treats a model output or model derivative as primary external evidence", () => {
    const artifact: SourceArtifact = {
      id: "source-model-1",
      canonicalRef: "internal:model-output:fixture",
      sourceType: "model_output",
      publisherOrAuthor: "fixture-model",
      publishedAt: null,
      accessedAt: "2026-08-07T00:00:00.000Z",
      originalLocale: "de",
      sourceFamilyId: "family-model-1",
      contentHashOrRevision: "fixture-revision",
      lineageStatus: "model_derivative",
      rightsStatus: "known",
      retentionStatus: "allowed",
      accessStatus: "internal",
    };

    expect(sourceArtifactEligibleAsExternalEvidence(artifact)).toBe(false);
  });

  it("binds replayable artifacts to existing snapshot and content identities without inventing a new observation", () => {
    const artifact: SourceArtifact = {
      ...baseArtifact,
      snapshotRef: "snapshot:source-1:v3:fixture",
      contentRef: "content:sha256:fixture",
    };

    expect(sourceArtifactSnapshotBindingStatus(artifact)).toBe("bound");
    expect(artifact.snapshotRef).toContain("snapshot:");
    expect(artifact.contentRef).toContain("content:sha256:");
  });

  it("allows non-replayable media to remain honestly unbound instead of inventing a snapshot", () => {
    const artifact: SourceArtifact = {
      ...baseArtifact,
      retentionStatus: "prohibited",
      snapshotRef: null,
      contentRef: null,
      media: {
        mediumKind: "video",
        publicOriginalMediaUrl: "https://example.test/video",
        availability: { status: "available" },
      },
    };

    expect(sourceArtifactSnapshotBindingStatus(artifact)).toBe("unbound");
    expect(sourceArtifactEligibleAsExternalEvidence(artifact)).toBe(false);
  });

  it("rejects partial snapshot bindings because observation and immutable content refs travel together", () => {
    expect(
      sourceArtifactSnapshotBindingStatus({
        snapshotRef: "snapshot:source-1:v1:fixture",
        contentRef: null,
      }),
    ).toBe("invalid");
  });

  it("keeps expired media as historical evidence metadata but requires current availability review", () => {
    const artifact: SourceArtifact = {
      ...baseArtifact,
      media: {
        mediumKind: "video",
        episodeRef: "episode-7",
        publicOriginalMediaUrl: "https://example.test/video/7",
        availability: {
          status: "expired",
          availableUntil: "2026-09-20T20:00:00.000Z",
          lastCheckedAt: "2026-09-21T00:00:00.000Z",
        },
      },
    };

    expect(sourceArtifactEligibleAsExternalEvidence(artifact)).toBe(true);
    expect(sourceArtifactAvailabilityRequiresReview(artifact)).toBe(true);
    expect(
      sourceArtifactEligibleAsExternalEvidence({
        ...artifact,
        rightsStatus: "restricted",
      }),
    ).toBe(false);

    const unavailableArtifact: SourceArtifact = {
      ...artifact,
      media: {
        mediumKind: "video",
        episodeRef: "episode-7",
        availability: { status: "unavailable" },
      },
    };
    expect(sourceArtifactEligibleAsExternalEvidence(unavailableArtifact)).toBe(true);
    expect(sourceArtifactAvailabilityRequiresReview(unavailableArtifact)).toBe(true);
  });

  it("keeps timecode in the canonical segment locator while media metadata stays on the artifact", () => {
    const artifact: SourceArtifact = {
      ...baseArtifact,
      media: {
        mediumKind: "video",
        episodeTitle: "Interview",
        durationSeconds: 1800,
        availability: { status: "available" },
      },
    };
    const segment: SourceSegment = {
      ...baseSegment,
      locator: "00:12:14-00:12:48",
      speaker: "Person A",
      speakerRole: "guest",
      attributionStatus: "explicit",
      transcriptionStatus: "human_reviewed",
    };

    expect(artifact.media?.mediumKind).toBe("video");
    expect(segment.locator).toBe("00:12:14-00:12:48");
    expect(sourceSegmentAttributionRequiresReview(segment)).toBe(false);
  });

  it("fails closed on missing or unclear speaker attribution in talkshow material", () => {
    const claim: AtomicClaim = {
      ...baseClaim,
      type: "reported_speech",
      text: "Die Person sagte X.",
    };
    const relation: ClaimSourceRelation = {
      ...baseRelation,
      claimId: claim.id,
      relationType: "reported_by_source",
    };
    const missingSpeaker: SourceSegment = {
      ...baseSegment,
      locator: "00:08:04",
      speaker: null,
      transcriptionStatus: "human_reviewed",
    };
    const emptySpeaker: SourceSegment = {
      ...missingSpeaker,
      speaker: " ",
    };
    const inferredSpeaker: SourceSegment = {
      ...baseSegment,
      locator: "00:08:04",
      speaker: "Person A",
      speakerRole: "panelist",
      attributionStatus: "inferred",
      transcriptionStatus: "human_reviewed",
    };
    const ambiguousSpeaker: SourceSegment = {
      ...baseSegment,
      locator: "00:08:04",
      speaker: "Person A oder Person B",
      speakerRole: "panelist",
      attributionStatus: "ambiguous",
      transcriptionStatus: "human_reviewed",
    };
    const explicitSpeaker: SourceSegment = {
      ...baseSegment,
      locator: "00:08:04",
      speaker: "Person A",
      speakerRole: "panelist",
      attributionStatus: "explicit",
      transcriptionStatus: "human_reviewed",
    };

    for (const segment of [missingSpeaker, emptySpeaker, inferredSpeaker, ambiguousSpeaker]) {
      expect(sourceSegmentAttributionRequiresReview(segment)).toBe(true);
    }
    expect(sourceSegmentAttributionRequiresReview(explicitSpeaker)).toBe(false);

    for (const segment of [missingSpeaker, inferredSpeaker, ambiguousSpeaker]) {
      expect(
        resolvePublicationClassification({
          claim,
          relations: [relation],
          sourceSegments: [segment],
          assessment: { ...baseAssessment, transcriptionConfidence: "high" },
        }),
      ).toBe("review_required");
    }
    expect(
      resolvePublicationClassification({
        claim,
        relations: [relation],
        sourceSegments: [explicitSpeaker],
        assessment: { ...baseAssessment, transcriptionConfidence: "high" },
      }),
    ).toBe("publishable_as_quote");
  });

  it("represents factcheck-of-factcheck lineage on existing source artifact ids and detects cycles", () => {
    expect(SOURCE_LINEAGE_RELATION_TYPES).toEqual([
      "cites",
      "quotes",
      "summarizes",
      "derived_from",
      "syndicates",
      "uses_dataset",
      "uses_study",
      "uses_interview",
    ]);

    const acyclic: SourceLineageRelation[] = [
      {
        id: "lineage-1",
        sourceArtifactId: "factcheck-1",
        upstreamSourceArtifactId: "study-1",
        relationType: "uses_study",
        reviewStatus: "reviewed",
      },
      {
        id: "lineage-2",
        sourceArtifactId: "media-1",
        upstreamSourceArtifactId: "factcheck-1",
        relationType: "cites",
        reviewStatus: "reviewed",
      },
    ];

    expect(sourceLineageHasCycle(acyclic)).toBe(false);
    expect(
      sourceLineageHasCycle([
        ...acyclic,
        {
          id: "lineage-3",
          sourceArtifactId: "study-1",
          upstreamSourceArtifactId: "media-1",
          relationType: "cites",
          reviewStatus: "reviewed",
        },
      ]),
    ).toBe(true);
  });

  it("rejects dangling source lineage references while accepting existing artifacts", () => {
    const artifacts: SourceArtifact[] = [
      { ...baseArtifact, id: "factcheck-1", sourceFamilyId: "original-family" },
      { ...baseArtifact, id: "original-1", sourceFamilyId: "original-family" },
    ];
    const relation: SourceLineageRelation = {
      id: "lineage-factcheck-original",
      sourceArtifactId: "factcheck-1",
      upstreamSourceArtifactId: "original-1",
      relationType: "cites",
      reviewStatus: "reviewed",
    };

    expect(sourceLineageRelationsReferenceExistingArtifacts(artifacts, [relation])).toBe(true);
    expect(
      sourceLineageRelationsReferenceExistingArtifacts(artifacts, [
        { ...relation, sourceArtifactId: "missing-factcheck" },
      ]),
    ).toBe(false);
    expect(
      sourceLineageRelationsReferenceExistingArtifacts(artifacts, [
        { ...relation, upstreamSourceArtifactId: "" },
      ]),
    ).toBe(false);
  });

  it("keeps factcheck lineage explicit without inferring a second independent source", () => {
    const artifacts: SourceArtifact[] = [
      { ...baseArtifact, id: "original-1", sourceFamilyId: "original-family" },
      { ...baseArtifact, id: "factcheck-1", sourceFamilyId: "original-family" },
    ];
    const lineage: SourceLineageRelation[] = [
      {
        id: "lineage-factcheck-original",
        sourceArtifactId: "factcheck-1",
        upstreamSourceArtifactId: "original-1",
        relationType: "cites",
        reviewStatus: "reviewed",
      },
    ];

    expect(sourceLineageRelationsReferenceExistingArtifacts(artifacts, lineage)).toBe(true);
    expect(
      countIndependentSupportFamilies([
        {
          ...baseRelation,
          id: "relation-original",
          sourceSegmentId: "segment-original",
          sourceFamilyId: "original-family",
        },
        {
          ...baseRelation,
          id: "relation-factcheck",
          sourceSegmentId: "segment-factcheck",
          sourceFamilyId: "original-family",
          sourceIndependence: "same_family",
        },
      ]),
    ).toBe(1);
  });

  it("keeps syndication and derived provenance from creating artificial independence", () => {
    const artifacts: SourceArtifact[] = [
      { ...baseArtifact, id: "original-1", sourceFamilyId: "agency-family" },
      { ...baseArtifact, id: "syndication-1", sourceFamilyId: "agency-family" },
      { ...baseArtifact, id: "derived-1", sourceFamilyId: "agency-family" },
    ];
    const lineage: SourceLineageRelation[] = [
      {
        id: "lineage-syndication",
        sourceArtifactId: "syndication-1",
        upstreamSourceArtifactId: "original-1",
        relationType: "syndicates",
        reviewStatus: "reviewed",
      },
      {
        id: "lineage-derived",
        sourceArtifactId: "derived-1",
        upstreamSourceArtifactId: "original-1",
        relationType: "derived_from",
        reviewStatus: "reviewed",
      },
    ];

    expect(sourceLineageRelationsReferenceExistingArtifacts(artifacts, lineage)).toBe(true);
    expect(
      countIndependentSupportFamilies([
        { ...baseRelation, sourceFamilyId: "agency-family" },
        {
          ...baseRelation,
          id: "relation-syndication",
          sourceSegmentId: "segment-syndication",
          sourceFamilyId: "agency-family",
          sourceIndependence: "same_family",
        },
        {
          ...baseRelation,
          id: "relation-derived",
          sourceSegmentId: "segment-derived",
          sourceFamilyId: "agency-family",
          sourceIndependence: "same_family",
        },
      ]),
    ).toBe(1);
  });

  it("keeps a foreign-language original and its reading view on one evidence segment", () => {
    const claim: AtomicClaim = {
      ...baseClaim,
      originalLocale: "fr",
      text: "Le taux est de 60 pour cent.",
    };
    const segment: SourceSegment = {
      ...baseSegment,
      originalText: "Le taux est de 60 pour cent.",
      readingView: "Der Anteil beträgt 60 Prozent.",
      translationStatus: "machine_reading_view",
    };

    expect(claim.originalLocale).toBe("fr");
    expect(segment.originalText).toContain("60 pour cent");
    expect(segment.readingView).toContain("60 Prozent");
    expect(
      relationCountsAsIndependentSupport({
        ...baseRelation,
        translationOnly: true,
      }),
    ).toBe(false);
  });

  it("keeps personal experience publishable only as personal experience", () => {
    const claim: AtomicClaim = {
      ...baseClaim,
      type: "personal_experience",
      text: "Ich habe diesen Ablauf so erlebt.",
    };

    expect(
      resolvePublicationClassification({
        claim,
        relations: [{ ...baseRelation, claimId: claim.id }],
        sourceSegments: [baseSegment],
        assessment: baseAssessment,
      }),
    ).toBe("publishable_as_personal_experience");
  });

  it("keeps contradiction, counterexample, boundary case and alternative explanation distinct", () => {
    const required = [
      "contradicts_same_claim",
      "counterexample",
      "exception_or_boundary_case",
      "alternative_explanation",
    ];

    expect(new Set(required).size).toBe(4);
    for (const relationType of required) {
      expect(CLAIM_SOURCE_RELATION_TYPES).toContain(relationType);
    }
  });

  it("blocks an unreviewed automatic transcript from becoming a verified quote", () => {
    const claim: AtomicClaim = {
      ...baseClaim,
      type: "reported_speech",
      text: "Die Person sagte X.",
    };
    const segment: SourceSegment = {
      ...baseSegment,
      speaker: "Person A",
      recognitionUncertainty: "medium",
      transcriptionStatus: "automatic_unreviewed",
    };

    expect(
      resolvePublicationClassification({
        claim,
        relations: [
          {
            ...baseRelation,
            claimId: claim.id,
            relationType: "reported_by_source",
          },
        ],
        sourceSegments: [segment],
        assessment: {
          ...baseAssessment,
          transcriptionConfidence: "medium",
        },
      }),
    ).toBe("review_required");
  });

  it("rejects synthesis that promotes an open hypothesis to externally verified fact", () => {
    const result = validateSynthesisReceipt(
      buildReceipt({
        requestedPublicationClassification: "publishable_as_externally_verified_fact",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.reasons).toContain("publication_classification_promotion_or_drift");
  });

  it("keeps counterevidence and alternative explanations explicitly visible in the receipt", () => {
    const receipt = buildReceipt({
      counterevidenceIds: ["counter-1"],
      alternativeExplanationIds: ["alternative-1"],
      omittedCounterevidenceIds: ["counter-2"],
      openEvidenceGaps: ["independent replication missing"],
    });

    expect(receipt.counterevidenceIds).toEqual(["counter-1"]);
    expect(receipt.alternativeExplanationIds).toEqual(["alternative-1"]);
    expect(receipt.omittedCounterevidenceIds).toEqual(["counter-2"]);
    expect(receipt.openEvidenceGaps).toEqual(["independent replication missing"]);
  });

  it("prevents corroboration when quantification differs", () => {
    const other: AtomicClaim = {
      ...baseClaim,
      id: "claim-2",
      scope: {
        ...baseClaim.scope,
        quantification: "80 Prozent",
      },
    };

    expect(haveEquivalentAtomicClaimScope(baseClaim, other)).toBe(false);
  });

  it("prevents exact support when subject, time or jurisdiction scope differs", () => {
    const changedClaims: AtomicClaim[] = [
      {
        ...baseClaim,
        id: "claim-subject",
        scope: { ...baseClaim.scope, subject: "Abgeordnete" },
      },
      {
        ...baseClaim,
        id: "claim-time",
        scope: { ...baseClaim.scope, timeScope: "2025-Q2" },
      },
      {
        ...baseClaim,
        id: "claim-jurisdiction",
        scope: { ...baseClaim.scope, jurisdictionScope: "Brandenburg" },
      },
    ];

    for (const claim of changedClaims) {
      expect(haveEquivalentAtomicClaimScope(baseClaim, claim)).toBe(false);
    }
  });

  it("never counts a translated reading view as evidence", () => {
    expect(
      relationCountsAsIndependentSupport({
        ...baseRelation,
        translationOnly: true,
      }),
    ).toBe(false);

    expect(
      resolvePublicationClassification({
        claim: baseClaim,
        relations: [{ ...baseRelation, translationOnly: true }],
        sourceSegments: [
          {
            ...baseSegment,
            readingView: "Translated reading view",
            translationStatus: "machine_reading_view",
          },
        ],
        assessment: baseAssessment,
      }),
    ).toBe("review_required");
  });

  it("fails closed when the source segment reference is missing", () => {
    expect(
      resolvePublicationClassification({
        claim: baseClaim,
        relations: [
          {
            ...baseRelation,
            segmentRefStatus: "missing",
          },
        ],
        sourceSegments: [baseSegment],
        assessment: baseAssessment,
      }),
    ).toBe("blocked_source_integrity");
  });

  it("allows externally verified fact wording only with reviewed exact independent support", () => {
    expect(
      resolvePublicationClassification({
        claim: baseClaim,
        relations: [baseRelation],
        sourceSegments: [baseSegment],
        assessment: baseAssessment,
      }),
    ).toBe("publishable_as_externally_verified_fact");

    expect(
      resolvePublicationClassification({
        claim: baseClaim,
        relations: [{ ...baseRelation, sourceIndependence: "unknown" }],
        sourceSegments: [baseSegment],
        assessment: baseAssessment,
      }),
    ).toBe("publishable_as_open_hypothesis");
  });

  it("rejects receipts that introduce claims, promote relations or use translation as evidence", () => {
    const result = validateSynthesisReceipt(
      buildReceipt({
        introducedClaimIds: ["invented-claim"],
        promotedRelationIds: ["relation-promoted"],
        translationEvidenceSegmentIds: ["translation-view-1"],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "synthesis_introduced_new_claims",
        "synthesis_promoted_relations",
        "translation_used_as_evidence",
      ]),
    );
  });
});
