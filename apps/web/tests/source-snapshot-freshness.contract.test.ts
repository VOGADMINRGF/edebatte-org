import { describe, expect, it } from "vitest";

import { normalizeSourceRef } from "@features/feeds/sourceRef";
import {
  buildConditionalSourceHeaders,
  createDurableSourceSnapshot,
  decideSourceFetch,
  hashSourceContent,
} from "@features/feeds/sourceSnapshot";

function source() {
  const ref = normalizeSourceRef({
    kind: "rss",
    href: "https://example.org/feed.xml",
    regionCode: "DE",
  });
  if (!ref) throw new Error("source fixture invalid");
  return ref;
}

describe("durable source snapshot freshness", () => {
  it("uses ETag and Last-Modified for conditional fetches", () => {
    expect(
      buildConditionalSourceHeaders({
        etag: '"abc"',
        lastModified: "Wed, 16 Sep 2026 10:00:00 GMT",
      }),
    ).toEqual({
      "if-none-match": '"abc"',
      "if-modified-since": "Wed, 16 Sep 2026 10:00:00 GMT",
    });
  });

  it("treats HTTP 304 as unchanged without creating a new version", () => {
    expect(decideSourceFetch({ response: { status: 304 } })).toEqual({
      kind: "not_modified",
      reason: "http_304",
    });
  });

  it("deduplicates a 200 response with identical content hash", () => {
    const body = "<rss><item>same</item></rss>";
    expect(
      decideSourceFetch({
        response: { status: 200, body },
        previous: { contentHash: hashSourceContent(body) },
      }),
    ).toEqual({ kind: "not_modified", reason: "same_content_hash" });
  });

  it("creates an immutable next revision for changed content", () => {
    const first = createDurableSourceSnapshot({
      source: source(),
      response: {
        status: 200,
        body: "version-1",
        etag: '"v1"',
        lastModified: "Wed, 16 Sep 2026 10:00:00 GMT",
        mime: "application/rss+xml",
      },
      retrievedAt: new Date("2026-09-16T10:01:00.000Z"),
    });

    const second = createDurableSourceSnapshot({
      source: source(),
      response: {
        status: 200,
        body: "version-2",
        etag: '"v2"',
        lastModified: "Thu, 17 Sep 2026 10:00:00 GMT",
        mime: "application/rss+xml",
      },
      retrievedAt: new Date("2026-09-17T10:01:00.000Z"),
      previous: first,
    });

    expect(first.version).toBe(1);
    expect(first.supersedes).toBeNull();
    expect(second.version).toBe(2);
    expect(second.supersedes).toBe(first.snapshotId);
    expect(second.snapshotId).not.toBe(first.snapshotId);
    expect(second.reviewRequired).toBe(true);
    expect(second.autoPublishAllowed).toBe(false);
  });

  it("fails closed for non-success responses and missing bodies", () => {
    expect(decideSourceFetch({ response: { status: 429 } })).toEqual({
      kind: "failed",
      status: 429,
      reason: "source_fetch_failed_429",
    });
    expect(decideSourceFetch({ response: { status: 200 } })).toEqual({
      kind: "failed",
      status: 200,
      reason: "source_fetch_body_missing",
    });
  });
});
