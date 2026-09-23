export const MEDIA_SOURCE_ARTIFACT_VERSION = "media-source-artifact-v1" as const;

export type MediaSourceKind = "youtube_transcript";

export type MediaSourceSegment = {
  segmentId: string;
  text: string;
  startMs: number;
  durationMs: number;
};

export type MediaSourceCoverageReceipt = {
  segmentCount: number;
  timestampedSegmentCount: number;
  timestampCoverage: number;
};

export type MediaSourceArtifact = {
  contractVersion: typeof MEDIA_SOURCE_ARTIFACT_VERSION;
  sourceKind: MediaSourceKind;
  sourceUrl: string;
  mediaId: string;
  sourceLocale: string;
  segments: MediaSourceSegment[];
  text: string;
  extractionLimitations: string[];
  coverage: MediaSourceCoverageReceipt;
};

type RawMediaSourceSegment = {
  text: unknown;
  offset: unknown;
  duration: unknown;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function finiteNonNegative(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function buildYoutubeMediaSourceArtifact(input: {
  sourceUrl: string;
  mediaId: string;
  sourceLocale: string | null;
  segments: RawMediaSourceSegment[];
}): MediaSourceArtifact {
  const mediaId = normalizeText(input.mediaId);
  const sourceUrl = normalizeText(input.sourceUrl);
  if (!mediaId || !sourceUrl) throw new Error("media_source_identity_missing");

  let ignoredEmpty = 0;
  let ignoredTimestamp = 0;
  const segments: MediaSourceSegment[] = [];

  for (let index = 0; index < input.segments.length; index += 1) {
    const raw = input.segments[index];
    const text = normalizeText(raw?.text);
    if (!text) {
      ignoredEmpty += 1;
      continue;
    }
    const offsetSeconds = finiteNonNegative(raw?.offset);
    const durationSeconds = finiteNonNegative(raw?.duration);
    if (offsetSeconds === null || durationSeconds === null) {
      ignoredTimestamp += 1;
      continue;
    }
    segments.push({
      segmentId: `${mediaId}:segment:${index + 1}`,
      text,
      startMs: Math.round(offsetSeconds * 1_000),
      durationMs: Math.round(durationSeconds * 1_000),
    });
  }

  if (segments.length === 0) {
    throw new Error("media_source_segment_evidence_missing");
  }

  const limitations: string[] = [];
  if (ignoredEmpty > 0) limitations.push("empty_segments_ignored");
  if (ignoredTimestamp > 0) limitations.push("segments_without_timestamps_ignored");

  return {
    contractVersion: MEDIA_SOURCE_ARTIFACT_VERSION,
    sourceKind: "youtube_transcript",
    sourceUrl,
    mediaId,
    sourceLocale: normalizeText(input.sourceLocale).toLowerCase() || "und",
    segments,
    text: segments.map((segment) => segment.text).join(" "),
    extractionLimitations: limitations,
    coverage: {
      segmentCount: segments.length,
      timestampedSegmentCount: segments.length,
      timestampCoverage: 1,
    },
  };
}
