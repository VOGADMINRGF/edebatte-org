import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  document: null as Record<string, unknown> | null,
  indexes: [] as unknown[],
  failBarrier: false,
  barrierScript: [] as Array<unknown>,
  finalizeScript: [] as Array<unknown>,
  barrierCalls: [] as Array<unknown[]>,
  finalizeCalls: [] as Array<{ filter: Record<string, string>; update: { $set: Record<string, unknown> } }>,
  firstFinalizeEntered: null as null | ReturnType<typeof deferred<void>>,
  releaseFirstFinalize: null as null | ReturnType<typeof deferred<void>>,
  pauseFirstFinalize: false,
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: async () => ({
    createIndex: async (...args: unknown[]) => { store.indexes.push(args); return "index"; },
    findOneAndUpdate: async (filter: Record<string, string>, update: { $set: Record<string, unknown> }, options: { upsert: boolean }) => {
      store.barrierCalls.push([filter, update, options]);
      const scripted = store.barrierScript.shift();
      if (scripted instanceof Error || (scripted && typeof scripted === "object" && "code" in scripted)) throw scripted;
      if (scripted === null) return null;
      if (store.failBarrier) throw new Error("storage unavailable");
      store.document = { ...update.$set };
      return store.document;
    },
    updateOne: async (filter: Record<string, string>, update: { $set: Record<string, unknown> }) => {
      store.finalizeCalls.push({ filter, update });
      if (store.pauseFirstFinalize && store.finalizeCalls.length === 1 && store.firstFinalizeEntered && store.releaseFirstFinalize) {
        store.firstFinalizeEntered.resolve();
        await store.releaseFirstFinalize.promise;
      }
      const scripted = store.finalizeScript.shift();
      if (scripted instanceof Error) throw scripted;
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
    store.barrierScript = [];
    store.finalizeScript = [];
    store.barrierCalls = [];
    store.finalizeCalls = [];
    store.firstFinalizeEntered = null;
    store.releaseFirstFinalize = null;
    store.pauseFirstFinalize = false;
    process.env.EDEBATTE_AT_REST_ACTIVE_KEY_VERSION = "test";
    process.env.EDEBATTE_AT_REST_KEYRING = "test:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  });

  it("writes a preparing barrier before safety, then stores only encrypted normalized payload", async () => {
    const result = await prepareGuestAdoptionPreparation({ session, claim: "  Sichere Schulwege  ", nowMs: 10_000 });
    expect(result).toMatchObject({ ok: true });
    expect(store.document).toMatchObject({ state: "prepared", version: 1 });
    expect(store.document).not.toHaveProperty("claim");
    expect(store.document).not.toHaveProperty("anonymousSessionId");
    expect(store.document).not.toHaveProperty("sessionId");
    expect(store.document).not.toHaveProperty("userId");
    expect(store.document).not.toHaveProperty("accountId");
    expect(store.document).not.toHaveProperty("operationId");
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
    expect(store.document?.anonymousSessionBindingHash).toBe(
      crypto.createHash("sha256").update("edebatte:create:adoption-preparation:anon-session:v1", "utf8").update(Buffer.from([0])).update(session.id, "utf8").digest("hex"),
    );
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

  it("uses the session-bounded fifteen-minute logical TTL", async () => {
    const shortSession = { ...session, expiresAtMs: 15_000 };
    const result = await prepareGuestAdoptionPreparation({ session: shortSession, claim: "Sicher", nowMs: 10_000 });
    expect(result).toMatchObject({ ok: true });
    expect((store.document?.expiresAt as Date).getTime() - 10_000).toBeLessThanOrEqual(900_000);
    expect((store.document?.expiresAt as Date).getTime()).toBeLessThanOrEqual(shortSession.expiresAtMs);
  });

  it("retries exactly once only for the unique binding-slot duplicate race", async () => {
    store.barrierScript.push({ code: 11000, keyPattern: { anonymousSessionBindingHash: 1 } });
    const result = await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    expect(result).toMatchObject({ ok: true });
    expect(store.barrierCalls).toHaveLength(2);
    expect((store.barrierCalls[0]?.[2] as { upsert: boolean }).upsert).toBe(true);
    expect((store.barrierCalls[1]?.[2] as { upsert: boolean }).upsert).toBe(false);
  });

  it.each([
    { code: 11000, keyPattern: { preparationId: 1 } },
    { code: 11000 },
    { code: 11000, keyPattern: { anonymousSessionBindingHash: 1, preparationId: 1 } },
  ])("never retries unrelated duplicate keys", async (error) => {
    store.barrierScript.push(error);
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "unavailable" });
    expect(store.barrierCalls).toHaveLength(1);
  });

  it("prevents stale A finalize after B supersedes the binding slot", async () => {
    store.pauseFirstFinalize = true;
    store.firstFinalizeEntered = deferred();
    store.releaseFirstFinalize = deferred();
    const a = prepareGuestAdoptionPreparation({ session, claim: "Sichere Schulwege A", nowMs: 10_000 });
    await store.firstFinalizeEntered.promise;
    const aId = store.document?.preparationId;
    const b = await prepareGuestAdoptionPreparation({ session, claim: "Sichere Schulwege B", nowMs: 10_001 });
    expect(b).toMatchObject({ ok: true });
    const bId = store.document?.preparationId;
    const payload = structuredClone(store.document?.encryptedPayload);
    store.releaseFirstFinalize.resolve();
    await expect(a).resolves.toEqual({ ok: false, afterBarrier: true, reason: "unavailable" });
    expect(store.finalizeCalls[0]?.filter).toMatchObject({ preparationId: aId, state: "preparing" });
    expect(store.document).toMatchObject({ preparationId: bId, state: "prepared", encryptedPayload: payload });
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: 10_002 })).resolves.toEqual({ preparationId: bId, claim: "Sichere Schulwege B" });
  });

  it("fails closed when binding duplicate retry does not confirm this attempt", async () => {
    store.barrierScript.push({ code: 11000, keyPattern: { anonymousSessionBindingHash: 1 } }, null);
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "unavailable" });
    expect(store.barrierCalls).toHaveLength(2);
    expect(store.finalizeCalls).toHaveLength(0);
  });

  it("keeps the new tombstone when encryption or finalization fails", async () => {
    process.env.EDEBATTE_AT_REST_KEYRING = "invalid";
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 })).resolves.toEqual({ ok: false, afterBarrier: true, reason: "unavailable" });
    expect(store.document).toMatchObject({ state: "preparing" });
    expect(store.document).not.toHaveProperty("encryptedPayload");
    process.env.EDEBATTE_AT_REST_KEYRING = "test:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    store.finalizeScript.push(new Error("finalize unavailable"));
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 10_001 })).resolves.toEqual({ ok: false, afterBarrier: true, reason: "unavailable" });
    expect(store.document).toMatchObject({ state: "preparing" });
  });

  it("preserves prior prepared slot when replacement barrier fails before commit", async () => {
    const first = await prepareGuestAdoptionPreparation({ session, claim: "Bestehender sicherer Hinweis A", nowMs: 10_000 });
    expect(first).toMatchObject({ ok: true });
    const prior = structuredClone(store.document);
    store.failBarrier = true;
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neuer sicherer Hinweis B", nowMs: 10_001 })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "unavailable" });
    expect(store.document).toEqual(prior);
    expect(store.document).toMatchObject({ state: "prepared", preparationId: prior?.preparationId, encryptedPayload: prior?.encryptedPayload, createdAt: prior?.createdAt, expiresAt: prior?.expiresAt, anonymousSessionBindingHash: prior?.anonymousSessionBindingHash });
  });
});

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
