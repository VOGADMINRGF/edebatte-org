// @repository-integrity-classification: adapter
import {
  sourceArtifactAvailabilityRequiresReview,
  sourceLineageHasCycle,
  sourceLineageRelationsReferenceExistingArtifacts,
  sourceSegmentAttributionRequiresReview,
} from "@features/analyze/atomicClaimSourceRelationContract";
import type * as sourceEvidenceContract from "@features/analyze/atomicClaimSourceRelationContract";
import type { CreateExternalSource } from "@/features/create/externalSourceIntake";

type CanonicalSourceArtifact = sourceEvidenceContract.SourceArtifact;
type CanonicalSourceLineageRelation = sourceEvidenceContract.SourceLineageRelation;
type CanonicalSourceSegment = sourceEvidenceContract.SourceSegment;
type SourceMediaMetadata = NonNullable<CanonicalSourceArtifact["media"]>;

export type CreateExternalSourceCanonicalSegmentInput = {
  id?: string | null;
  locator?: string | null;
  originalText?: string | null;
  readingView?: string | null;
  speaker?: string | null;
  speakerRole?: CanonicalSourceSegment["speakerRole"];
  attributionStatus?: CanonicalSourceSegment["attributionStatus"];
  recognitionUncertainty?: CanonicalSourceSegment["recognitionUncertainty"];
  transcriptionStatus?: CanonicalSourceSegment["transcriptionStatus"];
  translationStatus?: CanonicalSourceSegment["translationStatus"];
};

export type CreateExternalSourceCanonicalMediaInput =
  Partial<Omit<SourceMediaMetadata, "mediumKind" | "availability">> & {
    mediumKind?: SourceMediaMetadata["mediumKind"] | null;
    availability?: SourceMediaMetadata["availability"] | null;
  };

export type CreateExternalSourceCanonicalAdapterInput = {
  source: CreateExternalSource;
  canonicalRef?: string | null;
  accessedAt?: string | null;
  artifactId?: string | null;
  sourceFamilyId?: string | null;
  sourceType?: CanonicalSourceArtifact["sourceType"];
  publisherOrAuthor?: string | null;
  publishedAt?: string | null;
  sourceRole?: CanonicalSourceArtifact["sourceRole"];
  rightsStatus?: CanonicalSourceArtifact["rightsStatus"];
  retentionStatus?: CanonicalSourceArtifact["retentionStatus"];
  accessStatus?: CanonicalSourceArtifact["accessStatus"];
  lineageStatus?: CanonicalSourceArtifact["lineageStatus"];
  snapshotRef?: string | null;
  contentRef?: string | null;
  media?: CreateExternalSourceCanonicalMediaInput;
  segments?: readonly CreateExternalSourceCanonicalSegmentInput[];
  lineage?: readonly CanonicalSourceLineageRelation[];
  knownSourceArtifacts?: readonly Pick<CanonicalSourceArtifact, "id">[];
};

export type CreateExternalSourceCanonicalAdapterFailure = {
  ok: false;
  error:
    | "missing_canonical_ref"
    | "missing_content_hash"
    | "dangling_source_lineage"
    | "source_lineage_cycle";
  requiresHumanReview: true;
  noTruthPromotion: true;
  noAutoPublish: true;
};

export type CreateExternalSourceCanonicalAdapterSuccess = {
  ok: true;
  artifact: CanonicalSourceArtifact;
  segments: CanonicalSourceSegment[];
  lineage: CanonicalSourceLineageRelation[];
  attributionReviewRequired: boolean;
  availabilityReviewRequired: boolean;
  requiresHumanReview: true;
  noTruthPromotion: true;
  noAutoPublish: true;
};

export type CreateExternalSourceCanonicalAdapterResult =
  | CreateExternalSourceCanonicalAdapterFailure
  | CreateExternalSourceCanonicalAdapterSuccess;

function clean(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function sourceMediumKind(
  source: CreateExternalSource,
): SourceMediaMetadata["mediumKind"] {
  if (source.sourceKind === "youtube_transcript") return "video";
  if (source.sourceKind === "pdf") return "document";
  return source.documentType === "article" ? "article" : "document";
}

function sourceAvailability(
  source: CreateExternalSource,
): SourceMediaMetadata["availability"] {
  return {
    status:
      source.httpStatus >= 200 && source.httpStatus < 400
        ? "available"
        : "unavailable",
  };
}

function sourceLocator(source: CreateExternalSource): string {
  if (source.sourceKind === "pdf") return "pdf:document";
  if (source.sourceKind === "youtube_transcript") return "transcript:document";
  return "html:document";
}

function isAttributionRelevant(segment: CanonicalSourceSegment): boolean {
  return Boolean(
    segment.speaker?.trim() ||
      segment.speakerRole ||
      segment.attributionStatus ||
      segment.transcriptionStatus !== "not_applicable",
  );
}

function buildArtifact(input: {
  adapterInput: CreateExternalSourceCanonicalAdapterInput;
  canonicalRef: string;
  contentHash: string;
}): CanonicalSourceArtifact {
  const { adapterInput, canonicalRef, contentHash } = input;
  const source = adapterInput.source;
  const mediaInput = adapterInput.media;
  const key = `${encodeURIComponent(canonicalRef)}:${contentHash}`;
  const artifactId = clean(adapterInput.artifactId) ?? `create-external:${key}`;
  const sourceFamilyId =
    clean(adapterInput.sourceFamilyId) ??
    `create-external-family:${encodeURIComponent(canonicalRef)}`;
  const explicitAvailability = mediaInput?.availability;

  return {
    id: artifactId,
    canonicalRef,
    sourceType: adapterInput.sourceType ?? "user_provided_material",
    publisherOrAuthor: clean(adapterInput.publisherOrAuthor),
    publishedAt: clean(adapterInput.publishedAt),
    accessedAt: clean(adapterInput.accessedAt),
    originalLocale: clean(source.sourceLocale) ?? "und",
    sourceFamilyId,
    contentHashOrRevision: contentHash,
    snapshotRef: clean(adapterInput.snapshotRef),
    contentRef: clean(adapterInput.contentRef),
    sourceRole: adapterInput.sourceRole,
    media: {
      mediumKind: mediaInput?.mediumKind ?? sourceMediumKind(source),
      programmeRef: clean(mediaInput?.programmeRef),
      episodeRef: clean(mediaInput?.episodeRef),
      episodeTitle:
        clean(mediaInput?.episodeTitle) ??
        (source.sourceKind === "youtube_transcript"
          ? clean(source.documentTitle)
          : null),
      episodeDate: clean(mediaInput?.episodeDate),
      publicOriginalMediaUrl:
        clean(mediaInput?.publicOriginalMediaUrl) ?? canonicalRef,
      durationSeconds: mediaInput?.durationSeconds ?? null,
      availability: explicitAvailability ?? sourceAvailability(source),
      subtitleAvailable: mediaInput?.subtitleAvailable ?? null,
      transcriptAvailable: mediaInput?.transcriptAvailable ?? null,
      supplementalRefs: mediaInput?.supplementalRefs?.map((reference) => ({
        ...reference,
      })),
    },
    lineageStatus: adapterInput.lineageStatus ?? "copy",
    rightsStatus: adapterInput.rightsStatus ?? "unknown",
    retentionStatus: adapterInput.retentionStatus ?? "limited",
    accessStatus: adapterInput.accessStatus ?? "public",
  };
}

function buildSegments(input: {
  source: CreateExternalSource;
  artifactId: string;
  segmentInputs?: readonly CreateExternalSourceCanonicalSegmentInput[];
}): CanonicalSourceSegment[] {
  const segmentInputs = input.segmentInputs?.length
    ? input.segmentInputs
    : [{}];
  const sourceText = clean(input.source.text);

  return segmentInputs.map((segmentInput, index) => ({
    id:
      clean(segmentInput.id) ??
      `${input.artifactId}:segment:${index + 1}`,
    sourceArtifactId: input.artifactId,
    locator: clean(segmentInput.locator) ?? sourceLocator(input.source),
    originalText:
      segmentInput.originalText === undefined
        ? sourceText
        : clean(segmentInput.originalText),
    readingView: clean(segmentInput.readingView),
    contextBefore: null,
    contextAfter: null,
    speaker: clean(segmentInput.speaker),
    speakerRole: segmentInput.speakerRole ?? null,
    attributionStatus:
      segmentInput.attributionStatus ??
      (input.source.sourceKind === "youtube_transcript" ? "unknown" : undefined),
    recognitionUncertainty: segmentInput.recognitionUncertainty ?? "unknown",
    segmentRefStatus: "bound",
    transcriptionStatus:
      segmentInput.transcriptionStatus ??
      (input.source.sourceKind === "youtube_transcript"
        ? "automatic_unreviewed"
        : "not_applicable"),
    translationStatus: segmentInput.translationStatus ?? "original",
  }));
}

function failed(
  error: CreateExternalSourceCanonicalAdapterFailure["error"],
): CreateExternalSourceCanonicalAdapterFailure {
  return {
    ok: false,
    error,
    requiresHumanReview: true,
    noTruthPromotion: true,
    noAutoPublish: true,
  };
}

/**
 * Pure in-memory bridge from already loaded Create source material to existing
 * Analyze/Evidence contracts. It performs no fetch, persistence, AI call, or
 * claim/truth classification.
 */
export function adaptCreateExternalSourceToCanonicalEvidence(
  input: CreateExternalSourceCanonicalAdapterInput,
): CreateExternalSourceCanonicalAdapterResult {
  const canonicalRef = clean(input.canonicalRef) ?? clean(input.source.finalUrl);
  if (!canonicalRef) return failed("missing_canonical_ref");

  const contentHash = clean(input.source.contentHash)?.toLowerCase();
  if (!contentHash) return failed("missing_content_hash");

  const artifact = buildArtifact({
    adapterInput: input,
    canonicalRef,
    contentHash,
  });
  const segments = buildSegments({
    source: input.source,
    artifactId: artifact.id,
    segmentInputs: input.segments,
  });
  const lineage = (input.lineage ?? []).map((relation) => ({ ...relation }));
  const knownArtifacts = [artifact, ...(input.knownSourceArtifacts ?? [])];

  if (!sourceLineageRelationsReferenceExistingArtifacts(knownArtifacts, lineage)) {
    return failed("dangling_source_lineage");
  }
  if (sourceLineageHasCycle(lineage)) return failed("source_lineage_cycle");

  return {
    ok: true,
    artifact,
    segments,
    lineage,
    attributionReviewRequired: segments.some(
      (segment) =>
        isAttributionRelevant(segment) &&
        sourceSegmentAttributionRequiresReview(segment),
    ),
    availabilityReviewRequired: sourceArtifactAvailabilityRequiresReview(artifact),
    requiresHumanReview: true,
    noTruthPromotion: true,
    noAutoPublish: true,
  };
}
