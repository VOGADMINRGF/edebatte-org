import { describe, expect, it } from "vitest";

import { normalizeSourceRef } from "@features/feeds/sourceRef";
import { fetchSourceWithSnapshot } from "@features/feeds/sourceFetchRuntime";
import { createInMemorySourceSnapshotRepository } from "@features/feeds/sourceSnapshotStore";

function source() {
  const ref = normalizeSourceRef({
    kind: "rss",
    href: "https://example.org/feed.xml",
    regionCode: "DE",
  });
  if (!ref) throw new Error("source fixture invalid");
  return ref;
}

describe("conditional source fetch runtime", () => {
  it("persists the first payload and sends ETag/Last-Modified on the next fetch", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const seenHeaders: Headers[] = [];
    let call = 0;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      seenHeaders.push(new Headers(init?.headers));
      call += 1;
      if (call === 1) {
        return new Response("payload-v1", {
          status: 200,
          headers: {
            etag: '"v1"',
            "last-modified": "Sat, 19 Sep 2026 08:00:00 GMT",
            "content-type": "application/rss+xml",
          },
        });
      }
      return new Response(null, { status: 304 });
    }) as typeof fetch;

    const first = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      repository: repo,
      fetchImpl,
    });
    const second = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      repository: repo,
      fetchImpl,
    });

    expect(first.status).toBe("changed");
    expect(first.status === "changed" && first.snapshot.version).toBe(1);
    expect(second).toMatchObject({ status: "not_modified", reason: "http_304" });
    expect(seenHeaders[1].get("if-none-match")).toBe('"v1"');
    expect(seenHeaders[1].get("if-modified-since")).toBe("Sat, 19 Sep 2026 08:00:00 GMT");
    expect((await repo.listBySourceId(source().sourceId)).length).toBe(1);
  });

  it("deduplicates identical 200 payloads by content hash", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const fetchImpl = (async () =>
      new Response("same-payload", {
        status: 200,
        headers: { "content-type": "application/rss+xml" },
      })) as typeof fetch;

    const first = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      repository: repo,
      fetchImpl,
    });
    const second = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      repository: repo,
      fetchImpl,
    });

    expect(first.status).toBe("changed");
    expect(second).toMatchObject({ status: "not_modified", reason: "same_content_hash" });
    expect((await repo.listBySourceId(source().sourceId)).length).toBe(1);
  });

  it("reports 429 retry guidance without creating a snapshot", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const result = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      repository: repo,
      fetchImpl: (async () =>
        new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "120" },
        })) as typeof fetch,
    });

    expect(result).toMatchObject({
      status: "failed",
      httpStatus: 429,
      reason: "source_fetch_failed_429",
      retryAfter: "120",
    });
    expect(await repo.getLatest(source().sourceId)).toBeNull();
  });

  it("keeps dry-run fetches read-only", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const result = await fetchSourceWithSnapshot({
      source: source(),
      timeoutMs: 5_000,
      persist: false,
      repository: repo,
      fetchImpl: (async () => new Response("preview-only", { status: 200 })) as typeof fetch,
    });

    expect(result).toMatchObject({ status: "changed", persistence: "skipped" });
    expect(await repo.getLatest(source().sourceId)).toBeNull();
  });
});
