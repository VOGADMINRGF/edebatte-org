import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mocks = vi.hoisted(() => {
  type Doc = Record<string, any>;
  const docs: Doc[] = [];

  function key(value: unknown) {
    if (value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)) {
      const fn = (value as { toHexString?: () => string }).toHexString;
      if (typeof fn === "function") return fn.call(value);
    }
    return String(value ?? "");
  }

  function setPath(target: Doc, path: string, value: unknown) {
    const parts = path.split(".");
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
      const next = cursor[part];
      cursor[part] =
        next && typeof next === "object" && !Array.isArray(next) ? next : {};
      cursor = cursor[part];
    }
    cursor[parts.at(-1)!] = value;
  }

  function matches(doc: Doc, filter: Doc) {
    return Object.entries(filter).every(([name, value]) => {
      if (name === "_id") return key(doc._id) === key(value);
      return String(doc[name] ?? "") === String(value ?? "");
    });
  }

  return {
    reset() {
      docs.length = 0;
    },
    seed(doc: Doc) {
      docs.push(doc);
    },
    read(id: string) {
      return docs.find((doc) => key(doc._id) === id);
    },
    coreCol: vi.fn(async (name: string) => {
      if (name !== "drafts") throw new Error(\`unexpected_collection_\${name}\`);
      return {
        async findOne(filter: Doc) {
          return docs.find((doc) => matches(doc, filter)) ?? null;
        },
        async updateOne(filter: Doc, update: Doc) {
          const doc = docs.find((entry) => matches(entry, filter));
          if (!doc) return { matchedCount: 0, modifiedCount: 0 };
          for (const [path, value] of Object.entries(update.$set ?? {})) {
            setPath(doc, path, value);
          }
          return { matchedCount: 1, modifiedCount: 1 };
        },
      };
    }),
    getCol: vi.fn(async () => {
      throw new Error("legacy_collection_must_not_be_used");
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

  it("idempotently upserts one unverified SourceArtifact for the same draft/source", async () => {
    const first = await upsertCreateDraftSourceEvidence({
      draftId: DRAFT_ID,
      userId: "user-1",
      canonicalRef: "https://example.org/final",
      contentHash: "a".repeat(64),
      originalLocale: "en",
      accessedAt: new Date("2026-09-18T08:00:00.000Z"),
    });
    const second = await upsertCreateDraftSourceEvidence({
      draftId: DRAFT_ID,
      userId: "user-1",
      canonicalRef: "https://example.org/final",
      contentHash: "b".repeat(64),
      originalLocale: "en",
      accessedAt: new Date("2026-09-18T08:01:00.000Z"),
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.sourceKey).toBe(first.sourceKey);

    const stored = mocks.read(DRAFT_ID);
    const evidence = stored.analysis.createSourceEvidence;
    expect(Object.keys(evidence.items)).toHaveLength(1);
    const entry = evidence.items[first.sourceKey];
    expect(entry).toMatchObject({
      verificationStatus: "not_checked",
      artifact: {
        sourceType: "user_provided_material",
        lineageStatus: "copy",
        rightsStatus: "unknown",
        retentionStatus: "limited",
        accessStatus: "public",
        contentHashOrRevision: "b".repeat(64),
      },
    });
    expect(JSON.stringify(entry)).not.toContain("saved draft");
    expect(evidence).toMatchObject({
      reviewFirstOnly: true,
      noAutoPublish: true,
      noSilentMerge: true,
    });
  });

  it("rejects foreign, missing and finalized canonical drafts", async () => {
    await expect(
      upsertCreateDraftSourceEvidence({
        draftId: DRAFT_ID,
        userId: "user-2",
        canonicalRef: "https://example.org/source",
        contentHash: "a".repeat(64),
      }),
    ).resolves.toEqual({ ok: false, error: "draft_not_found" });

    mocks.read(DRAFT_ID).status = "finalized";
    await expect(
      upsertCreateDraftSourceEvidence({
        draftId: DRAFT_ID,
        userId: "user-1",
        canonicalRef: "https://example.org/source",
        contentHash: "a".repeat(64),
      }),
    ).resolves.toEqual({ ok: false, error: "draft_finalized" });
    expect(mocks.getCol).not.toHaveBeenCalled();
  });
});
