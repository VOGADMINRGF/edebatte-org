import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => {
  type Doc = Record<string, any>;
  const docs: Doc[] = [];
  const key = (value: unknown) =>
    value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)
      ? (value as { toHexString: () => string }).toHexString()
      : String(value ?? "");
  const matches = (doc: Doc, filter: Doc) =>
    Object.entries(filter).every(([name, value]) =>
      name === "_id" ? key(doc._id) === key(value) : String(doc[name] ?? "") === String(value ?? ""),
    );
  const setPath = (target: Doc, path: string, value: unknown) => {
    const parts = path.split(".");
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
      cursor[part] =
        cursor[part] && typeof cursor[part] === "object" ? cursor[part] : {};
      cursor = cursor[part];
    }
    cursor[parts.at(-1)!] = value;
  };
  return {
    reset: () => void (docs.length = 0),
    seed: (doc: Doc) => docs.push(doc),
    read: (id: string) => docs.find((doc) => key(doc._id) === id),
    getCol: vi.fn(async () => { throw new Error("legacy_collection_must_not_be_used"); }),
    coreCol: vi.fn(async (name: string) => {
      if (name !== "drafts") throw new Error(\`unexpected_collection_\${name}\`);
      return {
        findOne: async (filter: Doc) => docs.find((doc) => matches(doc, filter)) ?? null,
        updateOne: async (filter: Doc, update: Doc) => {
          const doc = docs.find((entry) => matches(entry, filter));
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          for (const [path, value] of Object.entries(update.$set ?? {})) setPath(doc, path, value);
          return { matchedCount: 1, modifiedCount: 1 };
        },
      };
    }),
  };
});

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    coreCol: (...args: unknown[]) => mocks.coreCol(...args),
    getCol: (...args: unknown[]) => mocks.getCol(...args),
  };
});

import { upsertCreateDraftSourceEvidence } from "@/server/serverDrafts";

const DRAFT_ID = "65f000000000000000000001";
const baseInput = {
  draftId: DRAFT_ID,
  userId: "user-1",
  canonicalRef: "https://example.org/final",
  contentHash: "a".repeat(64),
};

describe("canonical C8 draft source evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
    mocks.seed({
      _id: new ObjectId(DRAFT_ID),
      userId: "user-1",
      text: "saved draft",
      analysis: { existing: true },
      status: "draft",
      createdAt: new Date("2026-09-18T00:00:00.000Z"),
      updatedAt: new Date("2026-09-18T00:00:00.000Z"),
    });
  });

  it("idempotently upserts one unverified artifact for the same draft/source", async () => {
    const first = await upsertCreateDraftSourceEvidence({
      ...baseInput,
      originalLocale: "en",
      accessedAt: new Date("2026-09-18T08:00:00.000Z"),
    });
    const second = await upsertCreateDraftSourceEvidence({
      ...baseInput,
      contentHash: "b".repeat(64),
      originalLocale: "en",
      accessedAt: new Date("2026-09-18T08:01:00.000Z"),
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.sourceKey).toBe(first.sourceKey);

    const evidence = mocks.read(DRAFT_ID).analysis.createSourceEvidence;
    expect(Object.keys(evidence.items)).toHaveLength(1);
    expect(evidence.items[first.sourceKey]).toMatchObject({
      verificationStatus: "not_checked",
      artifact: {
        sourceType: "user_provided_material",
        lineageStatus: "copy",
        rightsStatus: "unknown",
        retentionStatus: "limited",
        contentHashOrRevision: "b".repeat(64),
      },
    });
    expect(JSON.stringify(evidence)).not.toContain("saved draft");
    expect(evidence).toMatchObject({
      reviewFirstOnly: true,
      noAutoPublish: true,
      noSilentMerge: true,
    });
  });

  it("rejects foreign and finalized canonical drafts without legacy fallback", async () => {
    await expect(
      upsertCreateDraftSourceEvidence({ ...baseInput, userId: "user-2" }),
    ).resolves.toEqual({ ok: false, error: "draft_not_found" });
    mocks.read(DRAFT_ID).status = "finalized";
    await expect(upsertCreateDraftSourceEvidence(baseInput)).resolves.toEqual({
      ok: false,
      error: "draft_finalized",
    });
    expect(mocks.getCol).not.toHaveBeenCalled();
  });
});
