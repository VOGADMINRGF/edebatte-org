import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  document: null as Record<string, unknown> | null,
  indexes: [] as unknown[],
  failBarrier: false,
  barrierScript: [] as Array<unknown>,
  finalizeScript: [] as Array<unknown>,
  barrierCalls: [] as Array<unknown[]>,
  finalizeCalls: [] as Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }>,
  firstFinalizeEntered: null as null | ReturnType<typeof deferred<void>>,
  releaseFirstFinalize: null as null | ReturnType<typeof deferred<void>>,
  pauseFirstFinalize: false,
  firstClaimCasEntered: null as null | ReturnType<typeof deferred<void>>,
  releaseFirstClaimCas: null as null | ReturnType<typeof deferred<void>>,
  pauseFirstClaimCas: false,
}));

vi.mock("@core/db/triMongo", () => ({
  coreCol: async () => ({
    createIndex: async (...args: unknown[]) => { store.indexes.push(args); return "index"; },
    findOneAndUpdate: async (filter: Record<string, unknown>, update: Record<string, unknown>, options: { upsert?: boolean }) => {
      store.barrierCalls.push([filter, update, options]);
      const scripted = store.barrierScript.shift();
      if (scripted instanceof Error || (scripted && typeof scripted === "object" && "code" in scripted)) throw scripted;
      if (scripted === null) return null;
      if (store.failBarrier) throw new Error("storage unavailable");
      if (store.pauseFirstClaimCas && "adoption" in filter && store.firstClaimCasEntered && store.releaseFirstClaimCas) {
        store.pauseFirstClaimCas = false;
        store.firstClaimCasEntered.resolve();
        await store.releaseFirstClaimCas.promise;
      }
      if (store.document && !matches(store.document, filter)) {
        if (options.upsert) throw { code: 11000, keyPattern: { anonymousSessionBindingHash: 1 } };
        return null;
      }
      store.document ??= {};
      applyUpdate(store.document, update);
      return store.document;
    },
    updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      store.finalizeCalls.push({ filter, update });
      if (store.pauseFirstFinalize && store.finalizeCalls.length === 1 && store.firstFinalizeEntered && store.releaseFirstFinalize) {
        store.firstFinalizeEntered.resolve();
        await store.releaseFirstFinalize.promise;
      }
      const scripted = store.finalizeScript.shift();
      if (scripted instanceof Error) throw scripted;
      if (!store.document || !matches(store.document, filter)) return { modifiedCount: 0 };
      applyUpdate(store.document, update);
      return { modifiedCount: 1 };
    },
    findOne: async (filter: Record<string, unknown>) => {
      if (!store.document) return null;
      return matches(store.document, filter) ? store.document : null;
    },
  }),
}));

import {
  prepareGuestAdoptionPreparation,
  readGuestAdoptionPreparationForVerifiedAnonymousSession,
  claimGuestAdoptionPreparationForAuthenticatedAccount,
  completeGuestAdoptionPreparationForAuthenticatedAccount,
  bindGuestAdoptionDraftRecoveryForAuthenticatedAccount,
  recoverDraftBoundGuestAdoptionForAuthenticatedAccount,
  buildGuestAdoptionDraftIdempotencyKey,
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
    store.firstClaimCasEntered = null;
    store.releaseFirstClaimCas = null;
    store.pauseFirstClaimCas = false;
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

  it("claims once for the authenticated account and closes the anonymous reader", async () => {
    const prepared = await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claimed = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    expect(claimed).toMatchObject({ ok: true, state: "claimed", preparationId: prepared.ok ? prepared.preparationId : "", claim: "Sicher" });
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: 10_002 })).resolves.toBeNull();
  });

  it("replays an active claim only to its owning account", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const first = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    const retry = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_002 });
    const foreign = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", nowMs: 10_002 });
    expect(retry).toEqual(first);
    expect(foreign).toEqual({ ok: false });
  });

  it("completes with an exact adoption CAS, removes ciphertext, and is idempotent", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claimed = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claimed.ok || claimed.state !== "claimed") throw new Error("claim failed");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claimed.adoptionId, draftId: "draft-a", nowMs: 10_002 })).resolves.toBe(true);
    expect(store.document).not.toHaveProperty("encryptedPayload");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claimed.adoptionId, draftId: "draft-a", nowMs: 10_003 })).resolves.toBe(true);
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claimed.adoptionId, draftId: "draft-b", nowMs: 10_003 })).resolves.toBe(false);
  });

  it("does not let an active claim be overwritten, but replaces expired adoption", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Alt", nowMs: 10_000 });
    const short = { ...session, expiresAtMs: 15_000 };
    const claimed = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session: short, userId: "account-a", nowMs: 10_001 });
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 10_002 })).resolves.toEqual({ ok: false, afterBarrier: false, reason: "unavailable" });
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 15_001 })).resolves.toMatchObject({ ok: true });
    expect(store.document).not.toHaveProperty("adoption");
    expect(store.document).toMatchObject({ state: "prepared" });
    expect(claimed).toMatchObject({ ok: true });
  });

  it("lets the anonymous reader read an unclaimed preparation", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Vor Adoption", nowMs: 10_000 });
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: 10_001 })).resolves.toMatchObject({ claim: "Vor Adoption" });
  });

  it("returns null from the anonymous reader after completion", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 10_002 });
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: 10_003 })).resolves.toBeNull();
  });

  it("caps recovery at the C3A session expiry", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session: { ...session, expiresAtMs: 20_000 }, userId: "account-a", nowMs: 10_001 });
    expect(claim).toMatchObject({ ok: true, recoveryExpiresAtMs: 20_000 });
  });

  it("allows same-account replay immediately before recovery expiry", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const short = { ...session, expiresAtMs: 20_000 };
    await claimGuestAdoptionPreparationForAuthenticatedAccount({ session: short, userId: "account-a", nowMs: 10_001 });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session: short, userId: "account-a", nowMs: 19_999 })).resolves.toMatchObject({ ok: true, state: "claimed" });
  });

  it("fails same-account and cross-account recovery after expiry", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const short = { ...session, expiresAtMs: 20_000 };
    await claimGuestAdoptionPreparationForAuthenticatedAccount({ session: short, userId: "account-a", nowMs: 10_001 });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 20_000 })).resolves.toEqual({ ok: false });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", nowMs: 20_000 })).resolves.toEqual({ ok: false });
  });

  it("permits intentional reprepare after completed adoption", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Alt", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 10_002 });
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 10_003 })).resolves.toMatchObject({ ok: true });
    expect(store.document).not.toHaveProperty("adoption");
    expect(store.document).toHaveProperty("encryptedPayload");
  });

  it("does not carry adoption metadata into a replacement preparation", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Alt", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 10_002 });
    await prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 10_003 });
    expect(store.document).not.toHaveProperty("adoption");
  });

  it("rejects completion by a different account", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 10_002 })).resolves.toBe(false);
  });

  it("rejects a stale adoption id without changing the current adoption", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: "123e4567-e89b-42d3-a456-426614174099", draftId: "draft-a", nowMs: 10_002 })).resolves.toBe(false);
    expect((store.document?.adoption as { adoptionId: string }).adoptionId).toBe(claim.adoptionId);
  });

  it("returns completed metadata only to the owning account", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 10_002 });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_003 })).resolves.toEqual({ ok: true, state: "completed", preparationId: claim.preparationId, adoptionId: claim.adoptionId, draftId: "draft-a" });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", nowMs: 10_003 })).resolves.toEqual({ ok: false });
  });

  it("rejects completion after an expired claim", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const short = { ...session, expiresAtMs: 20_000 };
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session: short, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, draftId: "draft-a", nowMs: 20_000 })).resolves.toBe(false);
  });

  it("rejects malformed account identities without querying the slot", async () => {
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: " account-a", nowMs: 10_000 })).resolves.toEqual({ ok: false });
    expect(store.barrierCalls).toHaveLength(0);
  });

  it("uses no browser carrier or storage outside the binding slot", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    expect(claim).toMatchObject({ ok: true });
    expect(store.document).not.toHaveProperty("userId");
    expect(store.document).not.toHaveProperty("sessionId");
    expect(store.document).not.toHaveProperty("returnUrl");
  });

  it("serializes concurrent claims to one account-bound adoption", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const [a, b] = await Promise.all([
      claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 }),
      claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", nowMs: 10_001 }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it("prevents a claim after a newer barrier has replaced the prior slot", async () => {
    const first = await prepareGuestAdoptionPreparation({ session, claim: "Alt", nowMs: 10_000 });
    await prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 10_001 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_002 });
    expect(claim).toMatchObject({ ok: true, claim: "Neu" });
    expect(claim).not.toMatchObject({ preparationId: first.ok ? first.preparationId : "" });
  });

  it("binds draft recovery before save, extends TTL, and preserves the ordinary deadline", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    const bound = await bindGuestAdoptionDraftRecoveryForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, nowMs: 10_002 });
    expect(bound).toMatchObject({ ok: true, recoveryExpiresAtMs: session.expiresAtMs });
    expect((store.document?.expiresAt as Date).getTime()).toBe(session.expiresAtMs);
    expect(((store.document?.adoption as { recoveryExpiresAt: Date }).recoveryExpiresAt).getTime()).toBe(claim.recoveryExpiresAtMs);
    await expect(recoverDraftBoundGuestAdoptionForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, nowMs: claim.recoveryExpiresAtMs + 1 })).resolves.toMatchObject({ ok: true, claim: "Sicher" });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: claim.recoveryExpiresAtMs + 1 })).resolves.toEqual({ ok: false });
  });

  it("keeps bound recovery account and generation exact", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claim = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claim.ok || claim.state !== "claimed") throw new Error("claim failed");
    await bindGuestAdoptionDraftRecoveryForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claim.adoptionId, nowMs: 10_002 });
    await expect(recoverDraftBoundGuestAdoptionForAuthenticatedAccount({ session, userId: "account-b", adoptionId: claim.adoptionId, nowMs: 10_003 })).resolves.toEqual({ ok: false });
    expect(buildGuestAdoptionDraftIdempotencyKey(claim.adoptionId)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retains completed replay metadata through the C3A expiry, beyond claim recovery", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    const claimed = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!claimed.ok || claimed.state !== "claimed") throw new Error("claim failed");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: claimed.adoptionId, draftId: "draft-a", nowMs: 20_000 })).resolves.toBe(true);
    expect((store.document?.expiresAt as Date).getTime()).toBe(session.expiresAtMs);
    expect(store.document).not.toHaveProperty("encryptedPayload");
    const replayAt = 910_002;
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: replayAt })).resolves.toEqual({ ok: true, state: "completed", preparationId: claimed.preparationId, adoptionId: claimed.adoptionId, draftId: "draft-a" });
    await expect(claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-b", nowMs: replayAt })).resolves.toEqual({ ok: false });
    await expect(readGuestAdoptionPreparationForVerifiedAnonymousSession({ session, nowMs: replayAt })).resolves.toBeNull();
  });

  it("converges overlapping same-account claims on the one durable adoption", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Sicher", nowMs: 10_000 });
    store.pauseFirstClaimCas = true;
    store.firstClaimCasEntered = deferred();
    store.releaseFirstClaimCas = deferred();
    const first = claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    await store.firstClaimCasEntered.promise;
    const second = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    store.releaseFirstClaimCas.resolve();
    const firstResult = await first;
    expect(firstResult).toMatchObject({ ok: true, state: "claimed" });
    expect(second).toMatchObject({ ok: true, state: "claimed" });
    if (!firstResult.ok || firstResult.state !== "claimed" || !second.ok || second.state !== "claimed") throw new Error("claim failed");
    expect(firstResult).toMatchObject({ adoptionId: second.adoptionId, preparationId: second.preparationId, claim: second.claim });
    expect((store.document?.adoption as { adoptionId: string }).adoptionId).toBe(second.adoptionId);
  });

  it("does not let a stale completion consume a new generation after expired reprepare", async () => {
    await prepareGuestAdoptionPreparation({ session, claim: "Alt", nowMs: 10_000 });
    const old = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 10_001 });
    if (!old.ok || old.state !== "claimed") throw new Error("old claim failed");
    await expect(prepareGuestAdoptionPreparation({ session, claim: "Neu", nowMs: 910_002 })).resolves.toMatchObject({ ok: true });
    const current = await claimGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", nowMs: 910_003 });
    if (!current.ok || current.state !== "claimed") throw new Error("new claim failed");
    expect(current.adoptionId).not.toBe(old.adoptionId);
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: old.adoptionId, draftId: "old-draft", nowMs: 910_004 })).resolves.toBe(false);
    expect(store.document).toMatchObject({ "adoption": expect.objectContaining({ state: "claimed", adoptionId: current.adoptionId }) });
    expect(store.document).toHaveProperty("encryptedPayload");
    await expect(completeGuestAdoptionPreparationForAuthenticatedAccount({ session, userId: "account-a", adoptionId: current.adoptionId, draftId: "new-draft", nowMs: 910_004 })).resolves.toBe(true);
  });
});

function matches(document: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return Array.isArray(expected) && expected.some((item) => matches(document, item as Record<string, unknown>));
    const actual = getPath(document, key);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      const query = expected as Record<string, unknown>;
      if ("$exists" in query) return Boolean(actual !== undefined) === query.$exists;
      if ("$gt" in query) return actual instanceof Date && query.$gt instanceof Date && actual.getTime() > query.$gt.getTime();
      if ("$lte" in query) return actual instanceof Date && query.$lte instanceof Date && actual.getTime() <= query.$lte.getTime();
    }
    return actual === expected;
  });
}

function getPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, value);
}

function applyUpdate(document: Record<string, unknown>, update: Record<string, unknown>) {
  for (const [path, value] of Object.entries((update.$set ?? {}) as Record<string, unknown>)) setPath(document, path, value);
  for (const path of Object.keys((update.$unset ?? {}) as Record<string, unknown>)) deletePath(document, path);
}

function setPath(document: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split("."); const last = parts.pop()!;
  const parent = parts.reduce<Record<string, unknown>>((current, part) => (current[part] ??= {}) as Record<string, unknown>, document);
  parent[last] = value;
}

function deletePath(document: Record<string, unknown>, path: string) {
  const parts = path.split("."); const last = parts.pop()!;
  const parent = parts.reduce<unknown>((current, part) => current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined, document);
  if (parent && typeof parent === "object") delete (parent as Record<string, unknown>)[last];
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
