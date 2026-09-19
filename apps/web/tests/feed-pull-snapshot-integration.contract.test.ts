import fs from "node:fs";

import { describe, expect, it } from "vitest";

const routeSource = fs.readFileSync(
  new URL("../src/app/api/feeds/pull/route.ts", import.meta.url),
  "utf8",
);

describe("feed pull durable snapshot integration", () => {
  it("routes RSS/Atom pulls through the canonical conditional snapshot runtime", () => {
    expect(routeSource).toContain('from "@features/feeds/sourceFetchRuntime"');
    expect(routeSource).toContain('from "@features/feeds/sourceRef"');
    expect(routeSource).toContain("sourceRefFromFeedRef(ref)");
    expect(routeSource).toContain("fetchSourceWithSnapshot({");
    expect(routeSource).toContain("persist: !dryRun");
    expect(routeSource).not.toContain("await fetch(feedUrl");
  });

  it("exposes snapshot/freshness evidence without auto-publishing", () => {
    expect(routeSource).toContain("notModifiedFeeds");
    expect(routeSource).toContain("snapshotRevisions");
    expect(routeSource).toContain("source_snapshots_created=");
    expect(routeSource).toContain("recordFeedSourceAutomationEvent({");
  });
});
