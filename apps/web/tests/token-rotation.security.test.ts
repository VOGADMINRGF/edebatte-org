import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const mocks = vi.hoisted(() => {
  const resetTokens: Record<string, any>[] = [];
  const verificationTokens: Record<string, any>[] = [];
  const users = new Map<string, Record<string, any>>();

  function hash(raw: string) {
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  function clone<T>(value: T): T {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function matches(doc: Record<string, any>, filter: Record<string, any>) {
    return Object.entries(filter).every(([key, value]) => {
      if (key === "$or" && Array.isArray(value)) {
        return value.some((entry) => matches(doc, entry as Record<string, any>));
      }
      if (value && typeof value === "object" && "$gt" in value) {
        return doc[key] > value.$gt;
      }
      if (value && typeof value === "object" && "$exists" in value) {
        return value.$exists ? key in doc : !(key in doc);
      }
      return doc[key] === value;
    });
  }

  function collectionFor(docs: Record<string, any>[]) {
    return {
      createIndex: vi.fn(async () => "ok"),
      insertOne: vi.fn(async (doc: Record<string, any>) => {
        docs.push(clone({ _id: `doc-${docs.length + 1}`, ...doc }));
        return { acknowledged: true };
      }),
      updateMany: vi.fn(async (filter: Record<string, any>, update: Record<string, any>) => {
        for (const doc of docs) {
          if (matches(doc, filter)) Object.assign(doc, update.$set ?? {});
        }
        return { acknowledged: true };
      }),
      findOne: vi.fn(async (filter: Record<string, any>) =>
        clone(docs.find((doc) => matches(doc, filter)) ?? null),
      ),
      findOneAndUpdate: vi.fn(
        async (
          filter: Record<string, any>,
          update: Record<string, any>,
          options?: { upsert?: boolean; returnDocument?: "before" | "after" },
        ) => {
          const existing = docs.find((doc) => matches(doc, filter)) ?? null;
          if (!existing && !options?.upsert) return null;

          const target =
            existing ??
            (() => {
              const created = {
                _id: `doc-${docs.length + 1}`,
                ...(update.$setOnInsert ?? {}),
              };
              docs.push(created);
              return created;
            })();

          const before = clone(target);
          Object.assign(target, update.$set ?? {});
          if (!existing) {
            Object.assign(target, update.$setOnInsert ?? {});
          }

          return options?.returnDocument === "after" ? clone(target) : before;
        },
      ),
      updateOne: vi.fn(async (filter: Record<string, any>, update: Record<string, any>) => {
        const hit = docs.find((doc) => matches(doc, filter));
        if (hit) Object.assign(hit, update.$set ?? {});
        return { acknowledged: true };
      }),
    };
  }

  return {
    users,
    resetTokens,
    verificationTokens,
    piiCol: vi.fn(async () => collectionFor(resetTokens)),
    getCol: vi.fn(async (name: string) => {
      if (name === "email_verification_tokens") {
        return collectionFor(verificationTokens);
      }
      return {
        findOne: vi.fn(async (query: Record<string, any>) => clone(users.get(String(query?._id)) ?? null)),
        updateOne: vi.fn(async (query: Record<string, any>, update: Record<string, any>) => {
          const hit = users.get(String(query?._id));
          if (hit) Object.assign(hit, update.$set ?? {});
          return { acknowledged: true };
        }),
      };
    }),
    hash,
    reset() {
      resetTokens.length = 0;
      verificationTokens.length = 0;
      users.clear();
      vi.clearAllMocks();
    },
  };
});

vi.mock("@core/db/triMongo", async () => {
  const actual = await vi.importActual<any>("@core/db/triMongo");
  return {
    ...actual,
    piiCol: (...args: unknown[]) => mocks.piiCol(...args),
    getCol: (...args: unknown[]) => mocks.getCol(...args),
  };
});

describe("token rotation security", () => {
  beforeEach(() => {
    mocks.reset();
  });

  it("keeps only the latest sequential reset token valid and enforces single use", async () => {
    const { createToken, consumeToken } = await import("@/utils/tokens");

    const first = await createToken("user-1", "reset", 60);
    const second = await createToken("user-1", "reset", 60);

    expect(await consumeToken(first, "reset")).toBeNull();
    expect(await consumeToken(second, "reset")).toBe("user-1");
    expect(await consumeToken(second, "reset")).toBeNull();
    expect(mocks.resetTokens.filter((doc) => doc.slotKey)).toHaveLength(1);
  });

  it("keeps only the final current reset token valid across parallel issuance", async () => {
    const { createToken, consumeToken } = await import("@/utils/tokens");

    const [first, second] = await Promise.all([
      createToken("user-2", "reset", 60),
      createToken("user-2", "reset", 60),
    ]);

    expect(await consumeToken(first, "reset")).toBeNull();
    expect(await consumeToken(second, "reset")).toBe("user-2");
    expect(await consumeToken(second, "reset")).toBeNull();
    expect(mocks.resetTokens.filter((doc) => doc.slotKey)).toHaveLength(1);
  });

  it("keeps only the latest sequential verification token valid and returns its continuation intent", async () => {
    const { ObjectId } = await import("@core/db/triMongo");
    const { createEmailVerificationToken, consumeEmailVerificationToken } = await import("@core/auth/emailVerificationService");

    const userId = new ObjectId("507f1f77bcf86cd799439011");
    mocks.users.set(String(userId), {
      _id: userId,
      verification: { level: "none", methods: [] },
      verifiedEmail: false,
      emailVerified: false,
    });

    const first = await createEmailVerificationToken(
      userId,
      "member@edebatte.org",
      "/create?nextAction=guest-adoption-old",
    );
    const second = await createEmailVerificationToken(
      userId,
      "member@edebatte.org",
      "/create?nextAction=guest-adoption-resume",
    );

    expect(await consumeEmailVerificationToken(first.rawToken)).toBeNull();
    expect(await consumeEmailVerificationToken(second.rawToken)).toMatchObject({
      email: "member@edebatte.org",
      continuationTarget: "/create?nextAction=guest-adoption-resume",
    });
    expect(await consumeEmailVerificationToken(second.rawToken)).toBeNull();
    expect(mocks.verificationTokens.filter((doc) => doc.slotKey)).toHaveLength(1);
  });

  it("clears stale continuation intent when a later verification token is issued without one", async () => {
    const { ObjectId } = await import("@core/db/triMongo");
    const { createEmailVerificationToken, consumeEmailVerificationToken } = await import("@core/auth/emailVerificationService");

    const userId = new ObjectId("507f1f77bcf86cd799439013");
    mocks.users.set(String(userId), {
      _id: userId,
      verification: { level: "none", methods: [] },
      verifiedEmail: false,
      emailVerified: false,
    });

    await createEmailVerificationToken(
      userId,
      "member@edebatte.org",
      "/create?nextAction=guest-adoption-resume",
    );
    const current = await createEmailVerificationToken(userId, "member@edebatte.org");

    expect(mocks.verificationTokens.find((doc) => doc.slotKey)).toMatchObject({
      continuationTarget: null,
    });
    expect(await consumeEmailVerificationToken(current.rawToken)).toMatchObject({
      email: "member@edebatte.org",
      continuationTarget: null,
    });
  });

  it("keeps only the final current verification token valid across parallel issuance", async () => {
    const { ObjectId } = await import("@core/db/triMongo");
    const { createEmailVerificationToken, consumeEmailVerificationToken } = await import("@core/auth/emailVerificationService");

    const userId = new ObjectId("507f1f77bcf86cd799439012");
    mocks.users.set(String(userId), {
      _id: userId,
      verification: { level: "none", methods: [] },
      verifiedEmail: false,
      emailVerified: false,
    });

    const [first, second] = await Promise.all([
      createEmailVerificationToken(userId, "member@edebatte.org"),
      createEmailVerificationToken(userId, "member@edebatte.org"),
    ]);

    expect(await consumeEmailVerificationToken(first.rawToken)).toBeNull();
    expect(await consumeEmailVerificationToken(second.rawToken)).toMatchObject({
      email: "member@edebatte.org",
      continuationTarget: null,
    });
    expect(await consumeEmailVerificationToken(second.rawToken)).toBeNull();
    expect(mocks.verificationTokens.filter((doc) => doc.slotKey)).toHaveLength(1);
  });
});
