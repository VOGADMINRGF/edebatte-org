import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { CREATE_SAFETY_ADVERSARIAL_FIXTURES } from "./fixtures/createSafetyAdversarialFixtures";
import "./support/create-save-route-security.setup";

const mocks = vi.hoisted(() => {
  type AnyDoc = Record<string, any>;
  let userId: string | null = "user-1";
  const docs: AnyDoc[] = [];
  const reviewRequests: AnyDoc[] = [];

  function toKey(value: unknown) {
    if (value && typeof value === "object" && "toHexString" in (value as Record<string, unknown>)) {
      const fn = (value as { toHexString?: () => string }).toHexString;
      if (typeof fn === "function") return fn.call(value);
    }
    return String(value ?? "");
  }

  function readPath(source: AnyDoc, path: string) {
    return path.split(".").reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, source);
  }

  function matchesFilter(doc: AnyDoc, filter: AnyDoc) {
    return Object.entries(filter ?? {}).every(([key, value]) => {
      if (key === "_id") return toKey(doc._id) === toKey(value);
      const currentValue = key.includes(".") ? readPath(doc, key) : doc[key];
      return String(currentValue ?? "") === String(value ?? "");
    });
  }

  return {
    reset() {
      userId = "user-1";
      docs.length = 0;
      reviewRequests.length = 0;
    },
    setUser(next: string | null) {
      userId = next;
    },
    readAll() {
      return docs.map((doc) => ({ ...doc }));
    },
    readReviewRequests() {
      return reviewRequests.map((entry) => ({ ...entry }));
    },
    getDraft: vi.fn(async () => null),
    getSessionUser: vi.fn(async () =>
      userId
        ? {
            _id: { toHexString: () => userId },
            roles: ["user"],
            sessionValid: true,
          }
        : null,
    ),
    getCol: vi.fn(async (name: string) => {
      throw new Error(`unexpected_collection_${name}`);
    }),
    coreCol: vi.fn(async (name: string) => {
      if (name === "drafts") {
        return {
          async insertOne(doc: AnyDoc) {
            docs.push({ ...doc });
            return { acknowledged: true, insertedId: doc._id };
          },
          async findOne(filter: AnyDoc) {
            return docs.find((doc) => matchesFilter(doc, filter)) ?? null;
          },
          async updateOne(filter: AnyDoc, update: AnyDoc) {
            const idx = docs.findIndex((doc) => matchesFilter(doc, filter));
            if (idx < 0) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
            const set = update?.$set && typeof update.$set === "object" ? update.$set : {};
            docs[idx] = { ...docs[idx], ...set };
            return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
          },
        };
      }
      if (name === "landing_editorial_review_requests") {
        return {
          async countDocuments() {
            return reviewRequests.length;
          },
          async findOne() {
            return null;
          },
          async insertOne(doc: AnyDoc) {
            const next = { ...doc, _id: new ObjectId() };
            reviewRequests.push(next);
            return { acknowledged: true, insertedId: next._id };
          },
          async updateOne() {
            return { acknowledged: true };
          },
          find() {
            return {
              sort() {
                return {
                  limit() {
                    return {
                      async toArray() {
                        return [];
                      },
                    };
                  },
                  async toArray() {
                    return [];
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected_core_collection_${name}`);
    }),
  };
});

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    getCol: (...args: unknown[]) => mocks.getCol(...args),
    coreCol: (...args: unknown[]) => mocks.coreCol(...args),
  };
});

vi.mock("@/lib/server/auth/sessionUser", () => ({
  getSessionUser: (...args: unknown[]) => mocks.getSessionUser(...args),
}));

vi.mock("@/server/draftStore", () => ({
  getDraft: (...args: unknown[]) => mocks.getDraft(...args),
}));

vi.mock("@features/editorialReviewQueue", () => ({
  createEditorialReviewRequest: vi.fn(async (input: Record<string, unknown>) => {
    const reviewRequest = {
      id: `review-${mocks.readReviewRequests().length + 1}`,
      status: "submitted",
      ...input,
    };
    return { reviewRequest };
  }),
}));

import { POST } from "@/app/api/create/save/route";

function req(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/create/save", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      "x-edebatte-create-csrf": "create-mutation-v1",
    },
    body: JSON.stringify(body),
  });
}

describe("create save safety gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
    mocks.getDraft.mockResolvedValue(null);
  });

  it("blocks save on blocked safety decision", async () => {
    const res = await POST(
      req({
        textPrepared: CREATE_SAFETY_ADVERSARIAL_FIXTURES.threat,
        createMode: "source",
      }),
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("create_input_blocked");
    expect(body.safety.decision).toBe("blocked");
    expect(mocks.readAll()).toHaveLength(0);
  });

  it("stores redacted text when pii is present", async () => {
    const res = await POST(
      req({
        textPrepared: CREATE_SAFETY_ADVERSARIAL_FIXTURES.selfPii,
        textOriginal: CREATE_SAFETY_ADVERSARIAL_FIXTURES.selfPii,
        createMode: "source",
        analysis: {
          claims: [
            {
              id: "c1",
              text: CREATE_SAFETY_ADVERSARIAL_FIXTURES.thirdPartyPiiAccusation,
            },
          ],
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].text).not.toContain("max@example.org");
    expect(saved[0].text).toContain("[E-MAIL ENTFERNT]");
    expect(saved[0].textOriginal).toContain("max.mustermann@example.org");
    expect(saved[0].analysis?.safety?.decision).toBeTruthy();
    expect(saved[0].analysis?.safety?.claimSafety?.[0]?.claimId).toBe("c1");
    expect(saved[0].analysis?.safety?.claimSafety?.[0]?.publicationStatus).toBeTruthy();
    expect(JSON.stringify(saved[0].analysis?.safety?.telemetry ?? {})).not.toContain("1234567");
    expect(JSON.stringify(saved[0].analysis?.safety?.claimSafety ?? [])).not.toContain("9999999");
    expect(saved[0].analysis?.safety?.telemetry?.routeStage).toBe("save");
  });

  it("saves moderation-required draft but keeps safety in analysis", async () => {
    const res = await POST(
      req({
        textPrepared: CREATE_SAFETY_ADVERSARIAL_FIXTURES.selfJustice,
        createMode: "source",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.safety.decision).toBe("moderation_required");
    const saved = mocks.readAll();
    expect(saved[0].analysis?.safety?.decision).toBe("moderation_required");
  });

  it("saves safe verification questions with review items but without raw pii in review data", async () => {
    const res = await POST(
      req({
        textPrepared: CREATE_SAFETY_ADVERSARIAL_FIXTURES.safeQuestionOnUnsafeClaim,
        createMode: "source",
        analysis: {
          claims: [
            {
              id: "c1",
              text: CREATE_SAFETY_ADVERSARIAL_FIXTURES.safeQuestionOnUnsafeClaim,
            },
          ],
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.safety.decision).toBe("allow");
    const saved = mocks.readAll();
    expect(saved[0].analysis?.safety?.reviewItems?.length).toBeGreaterThan(0);
    expect(saved[0].analysis?.safety?.claimSafety?.[0]?.publicationStatus).toBe(
      "publishable_as_question",
    );
    expect(JSON.stringify(saved[0].analysis?.safety?.reviewItems ?? [])).not.toContain("9999999");
  });

  it("preserves supplied quality clarifications in a review-first draft", async () => {
    const qualityClarifications = [
      {
        question: "Welcher konkrete Schulweg ist betroffen?",
        answer: "Der Übergang an der Hauptstraße.",
      },
    ];

    const res = await POST(
      req({
        textPrepared: "Bitte strukturiert unseren Hinweis zum Schulweg in unserer Stadt.",
        createMode: "source",
        analysis: {
          qualityClarifications,
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.safety.noAutoPublish).toBe(true);
    expect(body.safety.noSilentMerge).toBe(true);

    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe("draft");
    expect(saved[0].analysis?.qualityClarifications).toEqual(qualityClarifications);
    expect(saved[0].analysis?.safety?.noAutoPublish).toBe(true);
    expect(saved[0]).not.toHaveProperty("publishedAt");
  });

  it("creates an explicit mobile review handoff without auto publish", async () => {
    const res = await POST(
      req({
        textPrepared: "Bitte strukturiert unseren Hinweis zum Schulweg in unserer Stadt.",
        createMode: "source",
        manualReviewRequested: true,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.safety.noAutoPublish).toBe(true);
    expect(body.reviewRequest).toBeTruthy();

    const saved = mocks.readAll();
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe("draft");
    expect(saved[0].analysis?.safety?.noAutoPublish).toBe(true);
    expect(saved[0]).not.toHaveProperty("publishedAt");
  });
});
