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

export type DurableSourceSnapshot = {
  snapshotId: string;
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

export function buildSourceSnapshotId(input: {
  sourceId: string;
  contentHash: string;
}): string {
  return `snapshot:${input.sourceId}:${input.contentHash}`;
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

  const contentHash = hashSourceContent(body);
  if (input.previous?.contentHash === contentHash) {
    return { kind: "not_modified", reason: "same_content_hash" };
  }
  return {
    kind: "changed",
    contentHash,
    contentLength: Buffer.byteLength(body, "utf8"),
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

  const canonicalUrl = assertHttpUrl(input.source.href);
  const version = (input.previous?.version ?? 0) + 1;
  const retrievedAt = input.retrievedAt.toISOString();

  return {
    snapshotId: buildSourceSnapshotId({
      sourceId: input.source.sourceId,
      contentHash: decision.contentHash,
    }),
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
