import { createHash } from "node:crypto";

import type { SourceRef } from "./sourceRef";

export const SOURCE_SNAPSHOT_REVIEW_STATUSES = [
  "unreviewed",
  "triaged",
  "accepted",
  "rejected",
  "archived",
] as const;

export type SourceSnapshotReviewStatus =
  (typeof SOURCE_SNAPSHOT_REVIEW_STATUSES)[number];

const MAX_INLINE_SNAPSHOT_BYTES = 8 * 1024 * 1024;

export type DurableSourceSnapshot = {
  /** Observation identity. Different observations may reference identical content. */
  snapshotId: string;
  /** Immutable content identity, shared by A→B→A observations when A is byte-identical. */
  contentId: string;
  sourceId: string;
  sourceKind: SourceRef["kind"];
  canonicalUrl: string;
  retrievedAt: string;
  publishedAt: string | null;
  modifiedAt: string | null;
  mime: string | null;
  etag: string | null;
  lastModified: string | null;
  contentHash: string;
  contentLength: number;
  /** Original immutable response bytes represented as UTF-8 for offline replay. */
  originalContent: string;
  contentEncoding: "utf8";
  replayable: true;
  version: number;
  supersedes: string | null;
  rightsState: string | null;
  licence: string | null;
  licenceUrl: string | null;
  reviewStatus: SourceSnapshotReviewStatus;
  reviewRequired: true;
  autoPublishAllowed: false;
};

export type SourceFetchResponse = {
  status: number;
  body?: string | null;
  etag?: string | null;
  lastModified?: string | null;
  mime?: string | null;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  rightsState?: string | null;
  licence?: string | null;
  licenceUrl?: string | null;
};

export type SourceFetchDecision =
  | { kind: "not_modified"; reason: "http_304" | "same_content_hash" }
  | { kind: "changed"; contentHash: string; contentLength: number }
  | { kind: "failed"; status: number; reason: string };

function clean(value?: string | null): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeIso(value?: string | null): string | null {
  const normalized = clean(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function assertHttpUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalid_source_snapshot_url");
  }
  return parsed.toString();
}

export function hashSourceContent(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function buildSourceContentId(contentHash: string): string {
  return `content:sha256:${contentHash}`;
}

export function buildSourceSnapshotId(input: {
  sourceId: string;
  contentHash: string;
  retrievedAt: string;
  version: number;
}): string {
  const observationHash = createHash("sha256")
    .update(`${input.sourceId}\n${input.version}\n${input.retrievedAt}\n${input.contentHash}`, "utf8")
    .digest("hex")
    .slice(0, 32);
  return `snapshot:${input.sourceId}:v${input.version}:${observationHash}`;
}

export function buildConditionalSourceHeaders(
  previous?: Pick<DurableSourceSnapshot, "etag" | "lastModified"> | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const etag = clean(previous?.etag);
  const lastModified = clean(previous?.lastModified);
  if (etag) headers["if-none-match"] = etag;
  if (lastModified) headers["if-modified-since"] = lastModified;
  return headers;
}

export function decideSourceFetch(input: {
  response: SourceFetchResponse;
  previous?: Pick<DurableSourceSnapshot, "contentHash"> | null;
}): SourceFetchDecision {
  const status = Math.floor(input.response.status);
  if (status === 304) {
    return { kind: "not_modified", reason: "http_304" };
  }
  if (status < 200 || status >= 300) {
    return {
      kind: "failed",
      status,
      reason: `source_fetch_failed_${status}`,
    };
  }

  const body = input.response.body;
  if (typeof body !== "string") {
    return {
      kind: "failed",
      status,
      reason: "source_fetch_body_missing",
    };
  }

  const contentLength = Buffer.byteLength(body, "utf8");
  if (contentLength > MAX_INLINE_SNAPSHOT_BYTES) {
    return {
      kind: "failed",
      status,
      reason: "source_fetch_body_too_large_for_durable_snapshot",
    };
  }

  const contentHash = hashSourceContent(body);
  if (input.previous?.contentHash === contentHash) {
    return { kind: "not_modified", reason: "same_content_hash" };
  }
  return {
    kind: "changed",
    contentHash,
    contentLength,
  };
}

export function createDurableSourceSnapshot(input: {
  source: SourceRef;
  response: SourceFetchResponse;
  retrievedAt: Date;
  previous?: DurableSourceSnapshot | null;
}): DurableSourceSnapshot {
  const decision = decideSourceFetch({
    response: input.response,
    previous: input.previous,
  });
  if (decision.kind !== "changed") {
    throw new Error(`source_snapshot_not_changed:${decision.kind}`);
  }

  const body = input.response.body;
  if (typeof body !== "string") {
    throw new Error("source_snapshot_body_missing");
  }
  const canonicalUrl = assertHttpUrl(input.source.href);
  const version = (input.previous?.version ?? 0) + 1;
  const retrievedAt = input.retrievedAt.toISOString();
  const contentId = buildSourceContentId(decision.contentHash);

  return {
    snapshotId: buildSourceSnapshotId({
      sourceId: input.source.sourceId,
      contentHash: decision.contentHash,
      retrievedAt,
      version,
    }),
    contentId,
    sourceId: input.source.sourceId,
    sourceKind: input.source.kind,
    canonicalUrl,
    retrievedAt,
    publishedAt: normalizeIso(input.response.publishedAt),
    modifiedAt: normalizeIso(input.response.modifiedAt),
    mime: clean(input.response.mime),
    etag: clean(input.response.etag),
    lastModified: clean(input.response.lastModified),
    contentHash: decision.contentHash,
    contentLength: decision.contentLength,
    originalContent: body,
    contentEncoding: "utf8",
    replayable: true,
    version,
    supersedes: input.previous?.snapshotId ?? null,
    rightsState: clean(input.response.rightsState),
    licence: clean(input.response.licence),
    licenceUrl: clean(input.response.licenceUrl),
    reviewStatus: "unreviewed",
    reviewRequired: true,
    autoPublishAllowed: false,
  };
}

/**
 * Offline replay path. It never performs network I/O and verifies the immutable
 * content against the snapshot hash/length before returning it.
 */
export function replayDurableSourceSnapshot(
  snapshot: DurableSourceSnapshot | (Partial<DurableSourceSnapshot> & Pick<DurableSourceSnapshot, "contentHash" | "contentLength">),
): string {
  if (snapshot.replayable !== true || snapshot.contentEncoding !== "utf8" || typeof snapshot.originalContent !== "string") {
    throw new Error("source_snapshot_replay_content_unavailable");
  }
  const content = snapshot.originalContent;
  if (hashSourceContent(content) !== snapshot.contentHash) {
    throw new Error("source_snapshot_replay_hash_mismatch");
  }
  if (Buffer.byteLength(content, "utf8") !== snapshot.contentLength) {
    throw new Error("source_snapshot_replay_length_mismatch");
  }
  return content;
}
