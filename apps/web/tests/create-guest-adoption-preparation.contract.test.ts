import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  document: null as Record<string, unknown> | null,
  indexes: [] as unknown[],
  failBarrier: false,
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: async () => ({
    createIndex: async (...args: unknown[]) => { store.indexes.push(args); return "index"; },
    findOneAndUpdate: async (filter: Record<string, string>, update: { $set: Record<string, unknown> }, options: { upsert: boolean }) => {
      if (store.failBarrier) throw new Error("storage unavailable");
      if (!store.document && !options.upsert) return null;
      store.document = { ...update.$set };
      return store.document;
    },
    updateOne: async (filter: Record<string, string>, update: { $set: Record<string, unknown> }) => {
      if (!store.document || Object.entries(filter).some(([key, value]) => store.document?.[key] !== value)) return { modifiedCount: 0 };
      store.document = { ...store.document, ...update.$set };
      return { modifiedCount: 1 };
    },
    findOne: async (filter: Record<string, unknown>) => {
      if (!store.document) return null;
      return Object.entries(filter).every(([key, value]) => {
        if (value && typeof value === "object" && "$gt" in value) return store.document?.[key] instanceof Date && (store.document[key] as Date).getTime() > (value as { $gt: Date }).$gt.getTime();
        return store.document?.[key] === value;
      }) ? store.document : null;
    },
  }),
}));

import {
  prepareGuestAdoptionPreparation,
  readGuestAdoptionPreparationForVerifiedAnonymousSession,
} from "@/features/create/createGuestAdoptionPreparation";

const session = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  issuedAtMs: 1_000,
  expiresAtMs: 1_000_000,
};

describe("guest adoption preparation durable lifecycle", () => {
  beforeEach(() => {
    store.document = null;
    store.failBarrier = false;
    process.env.EDEBATTE_AT_REST_ACTIVE_KEY_VERSION = "test";
    process.env.EDEBATTE_AT_REST_KEYRING = "test:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  });

  it("writes a preparing barrier before safety, then stores only encrypted normalized payload", async () => {
    const result = await prepareGuestAdoptionPreparation({ session, claim: "  Sichere Schulwege  ", nowMs: 10_000 });
    expect(result).toMatchObject({ ok: true });
    expect(store.document).toMatchObject({ state: "prepared", version: 1 });
    expect(store.document).not.toHaveProperty("claim");
    expect(store.document).not.toHaveProperty("anonymousSessionId");
    expect(store.document?.preparationId).toMatch(UUID_V4);
    expect(store.document?.encryptedPayload).toBeDefined();
    const read = await readGuestAdoptionPreparationForVerifiedAnonymousSession({
      session,
      nowMs: 10_001,
    });
    expect(read).toEqual({ preparationId: result.ok ? result.preparationId : "", claim: "Sichere Schulwege" });
    expect(store.indexes).toEqual(expect.arrayContaining([
      [{ preparationId: 1 }, { unique: true }],
      [{ anonymousSessionBindingHash: 1 }, { unique: true }],
      [{ expiresAt: 1 }, { expireAfterSeconds: 0 }],
    ]));
  });

  it("keeps the post-barrier tombstone and revocation when safety rejects", async () => {
    const result = await prepareGuestAdoptionPreparation({ session, claim: "mail@example.org", nowMs: 10_000 });
    expect(result).toEqual({ ok: false, afterBarrier: true, reason: "rejected" });
    expect(store.document).toMatchObject({ state: "preparing" });
    expect(store.document).not.toHaveProperty("encryptedPayload");
  });

  it("fails before the barrier when storage is unavailable or session lifetime is exhausted", async () => {
    store.failBarrier = true;
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "unavailable" });
    store.failBarrier = false;
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: session.expiresAtMs })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "invalid" });
  });

  it("fails closed when the authoritative slot is preparing or logically expired", async () => {
    store.document = {
      version: 1, preparationId: "123e4567-e89b-42d3-a456-426614174001",
      anonymousSessionBindingHash: "a".repeat(64), state: "preparing",
      createdAt: new Date(1), expiresAt: new Date(999_999),
    };
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: 10_000 })).resolves.toBeNull();
  });
});

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
