import { describe, expect, it } from "vitest";

import {
  feedRefFromSourceRef,
  normalizeSourceRef,
  sourceRefFromFeedRef,
} from "@features/feeds/sourceRef";

describe("feed source reference contract", () => {
  it("adapts the existing feed runtime without creating a second RSS truth", () => {
    const source = sourceRefFromFeedRef({
      feedUrl: "https://example.org/feed.xml",
      regionCode: "DE:BE",
      topicHints: ["Wohnen"],
    });

    expect(source.kind).toBe("rss");
    expect(source.reviewRequired).toBe(true);
    expect(source.autoPublishAllowed).toBe(false);
    expect(feedRefFromSourceRef(source)).toEqual({
      feedUrl: "https://example.org/feed.xml",
      regionCode: "DE:BE",
      topicHints: ["Wohnen"],
    });
  });

  it("accepts API/Open-Data metadata but fails closed before legacy feed ingestion", () => {
    const source = normalizeSourceRef({
      kind: "api",
      href: "https://api.example.org/v1/items",
      regionCode: "DE",
      connector: "example-api",
      topicHints: ["Bundestag"],
    });

    expect(source).not.toBeNull();
    expect(source?.connector).toBe("example-api");
    expect(source && feedRefFromSourceRef(source)).toBeNull();
  });

  it("rejects non-http source locations", () => {
    expect(normalizeSourceRef({ kind: "snapshot", href: "file:///tmp/data.json" })).toBeNull();
    expect(normalizeSourceRef({ kind: "api", href: "javascript:alert(1)" })).toBeNull();
  });
});