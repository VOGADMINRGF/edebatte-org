import { describe, expect, it } from "vitest";

import { normalizeSourceRef } from "@features/feeds/sourceRef";
import { createDurableSourceSnapshot, replayDurableSourceSnapshot } from "@features/feeds/sourceSnapshot";
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

function snapshot(input: {
  body: string;
  retrievedAt: string;
  previous?: ReturnType<typeof createDurableSourceSnapshot> | null;
}) {
  return createDurableSourceSnapshot({
    source: source(),
    response: {
      status: 200,
      body: input.body,
      etag: `\"${input.body}\"`,
      lastModified: new Date(input.retrievedAt).toUTCString(),
      mime: "application/rss+xml",
    },
    retrievedAt: new Date(input.retrievedAt),
    previous: input.previous ?? null,
  });
}

describe("durable source snapshot repository", () => {
  it("keeps immutable revisions and returns the latest version first", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const first = snapshot({
      body: "version-1",
      retrievedAt: "2026-09-19T08:00:00.000Z",
    });
    const second = snapshot({
      body: "version-2",
      retrievedAt: "2026-09-19T09:00:00.000Z",
      previous: first,
    });

    expect((await repo.append(first)).status).toBe("inserted");
    expect((await repo.append(second)).status).toBe("inserted");

    expect((await repo.getLatest(first.sourceId))?.snapshotId).toBe(second.snapshotId);
    expect((await repo.listBySourceId(first.sourceId)).map((entry) => entry.version)).toEqual([2, 1]);
  });

  it("preserves A→B→A as three observations while reusing A content identity", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const firstA = snapshot({
      body: "A",
      retrievedAt: "2026-09-19T08:00:00.000Z",
    });
    const secondB = snapshot({
      body: "B",
      retrievedAt: "2026-09-19T09:00:00.000Z",
      previous: firstA,
    });
    const thirdA = snapshot({
      body: "A",
      retrievedAt: "2026-09-19T10:00:00.000Z",
      previous: secondB,
    });

    expect(firstA.contentId).toBe(thirdA.contentId);
    expect(firstA.snapshotId).not.toBe(thirdA.snapshotId);
    expect(thirdA.supersedes).toBe(secondB.snapshotId);

    expect((await repo.append(firstA)).status).toBe("inserted");
    expect((await repo.append(secondB)).status).toBe("inserted");
    expect((await repo.append(thirdA)).status).toBe("inserted");

    const history = await repo.listBySourceId(firstA.sourceId);
    expect(history.map((entry) => entry.version)).toEqual([3, 2, 1]);
    expect(history.map((entry) => replayDurableSourceSnapshot(entry))).toEqual(["A", "B", "A"]);
  });

  it("treats the same observation id as an idempotent duplicate without mutating history", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const first = snapshot({
      body: "stable",
      retrievedAt: "2026-09-19T08:00:00.000Z",
    });
    await repo.append(first);

    const changedCopy = { ...first, reviewStatus: "accepted" as const };
    const result = await repo.append(changedCopy);

    expect(result.status).toBe("duplicate");
    expect((await repo.getById(first.snapshotId))?.reviewStatus).toBe("unreviewed");
  });

  it("fails closed when two different payloads compete for the same source version", async () => {
    const repo = createInMemorySourceSnapshotRepository();
    const first = snapshot({
      body: "version-1",
      retrievedAt: "2026-09-19T08:00:00.000Z",
    });
    const candidateA = snapshot({
      body: "version-2-a",
      retrievedAt: "2026-09-19T09:00:00.000Z",
      previous: first,
    });
    const candidateB = snapshot({
      body: "version-2-b",
      retrievedAt: "2026-09-19T09:00:01.000Z",
      previous: first,
    });

    await repo.append(first);
    expect((await repo.append(candidateA)).status).toBe("inserted");
    const conflict = await repo.append(candidateB);

    expect(conflict.status).toBe("version_conflict");
    expect(conflict.snapshot?.snapshotId).toBe(candidateA.snapshotId);
    expect((await repo.listBySourceId(first.sourceId)).map((entry) => entry.version)).toEqual([2, 1]);
  });
});
