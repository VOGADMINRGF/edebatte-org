import "server-only";

import crypto from "node:crypto";
import { coreCol } from "@core/db/triMongo";
import {
  decodeAtRestUtf8,
  decryptAtRest,
  encodeAtRestUtf8,
  encryptAtRest,
  type AtRestEnvelope,
} from "@/lib/server/atRestEncryption";
import { inspectGuestClaim } from "@/features/create/safety/createGuestClaimSafety";
import type { CreateAnonymousSession } from "@/features/create/createAnonymousSession";

const COLLECTION = "create_guest_adoption_preparations";
const PURPOSE = "create.guest-adoption-preparation" as const;
const BINDING_DOMAIN = "edebatte:create:adoption-preparation:anon-session:v1";
const ACCOUNT_BINDING_DOMAIN = "edebatte:create:adoption:account:v1";
const DRAFT_KEY_DOMAIN = "edebatte:create:guest-adoption-draft:v1";
const PREPARATION_TTL_MS = 15 * 60 * 1000;
const CLAIM_RECOVERY_TTL_MS = 15 * 60 * 1000;
const MAX_CLAIM_CHARS = 10_000;
const MAX_CLAIM_BYTES = 30_000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PreparationBase = {
  version: 1;
  preparationId: string;
  anonymousSessionBindingHash: string;
  createdAt: Date;
  expiresAt: Date;
};

type Preparing = PreparationBase & {
  state: "preparing";
};

type Prepared = PreparationBase & {
  state: "prepared";
  encryptedPayload: AtRestEnvelope;
  adoption?: never;
};

type Adoption = {
  version: 1;
  state: "claimed" | "completed";
  adoptionId: string;
  accountBindingHash: string;
  claimedAt: Date;
  recoveryExpiresAt: Date;
  completedAt?: Date;
  draftId?: string;
  draftRecovery?: { version: 1; boundAt: Date; recoveryExpiresAt: Date };
};

type ClaimedPrepared = PreparationBase & {
  state: "prepared";
  encryptedPayload: AtRestEnvelope;
  adoption: Adoption & { state: "claimed" };
};

type CompletedPrepared = PreparationBase & {
  state: "prepared";
  adoption: Adoption & { state: "completed"; completedAt: Date; draftId: string };
};

type PreparationDocument = Preparing | Prepared | ClaimedPrepared | CompletedPrepared;

export type GuestAdoptionClaimResult =
  | { ok: true; state: "claimed"; preparationId: string; adoptionId: string; claim: string; recoveryExpiresAtMs: number }
  | { ok: true; state: "completed"; preparationId: string; adoptionId: string; draftId: string }
  | { ok: false };

export type GuestAdoptionPreparationResult =
  | { ok: true; preparationId: string; expiresAtMs: number }
  | { ok: false; afterBarrier: boolean; reason: "invalid" | "rejected" | "unavailable" };

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

function isBindingSlotDuplicateKey(error: unknown) {
  const record = error as { code?: unknown; keyPattern?: unknown } | null;
  if (record?.code !== 11000 || !record.keyPattern || typeof record.keyPattern !== "object" || Array.isArray(record.keyPattern)) return false;
  const entries = Object.entries(record.keyPattern as Record<string, unknown>);
  return entries.length === 1 && entries[0]?.[0] === "anonymousSessionBindingHash" && entries[0]?.[1] === 1;
}

function isCommittedBarrier(value: unknown, document: Preparing) {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.anonymousSessionBindingHash === document.anonymousSessionBindingHash &&
    record.preparationId === document.preparationId && record.state === "preparing";
}

async function ensureIndexes() {
  if (indexesReady) return;
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const collection = await coreCol<Record<string, unknown>>(COLLECTION);
      await Promise.all([
        collection.createIndex({ preparationId: 1 }, { unique: true }),
        collection.createIndex({ anonymousSessionBindingHash: 1 }, { unique: true }),
        collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      ]);
      indexesReady = true;
    })().catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
}

function bindingHash(sessionId: string) {
  return crypto.createHash("sha256")
    .update(BINDING_DOMAIN, "utf8")
    .update(Buffer.from([0]))
    .update(sessionId, "utf8")
    .digest("hex");
}

function accountBindingHash(userId: string) {
  return crypto.createHash("sha256")
    .update(ACCOUNT_BINDING_DOMAIN, "utf8")
    .update(Buffer.from([0]))
    .update(userId, "utf8")
    .digest("hex");
}

export function buildGuestAdoptionDraftIdempotencyKey(adoptionId: string) {
  if (!UUID_V4.test(adoptionId)) return null;
  return crypto.createHash("sha256").update(DRAFT_KEY_DOMAIN, "utf8").update(Buffer.from([0])).update(adoptionId, "utf8").digest("hex");
}

function validUserId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && value.trim() === value;
}

function normalizedClaim(value: unknown) {
  if (typeof value !== "string") return null;
  const claim = value.trim();
  if (!claim || claim.length > MAX_CLAIM_CHARS || Buffer.byteLength(claim, "utf8") > MAX_CLAIM_BYTES) return null;
  return claim;
}

function isBasePrepared(value: unknown): value is PreparationBase & { state: "prepared" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 || record.state !== "prepared" ||
    typeof record.preparationId !== "string" || !UUID_V4.test(record.preparationId) ||
    typeof record.anonymousSessionBindingHash !== "string" || !/^[a-f0-9]{64}$/.test(record.anonymousSessionBindingHash) ||
    !(record.createdAt instanceof Date) || !(record.expiresAt instanceof Date)
  ) return false;
  return true;
}

function isAdoption(value: unknown): value is Adoption {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const adoption = value as Record<string, unknown>;
  if (adoption.version !== 1 || (adoption.state !== "claimed" && adoption.state !== "completed") ||
    typeof adoption.adoptionId !== "string" || !UUID_V4.test(adoption.adoptionId) ||
    typeof adoption.accountBindingHash !== "string" || !/^[a-f0-9]{64}$/.test(adoption.accountBindingHash) ||
    !(adoption.claimedAt instanceof Date) || !(adoption.recoveryExpiresAt instanceof Date)) return false;
  const recovery = adoption.draftRecovery;
  const validRecovery = recovery === undefined || (!!recovery && typeof recovery === "object" && !Array.isArray(recovery) && (recovery as Record<string, unknown>).version === 1 && (recovery as Record<string, unknown>).boundAt instanceof Date && (recovery as Record<string, unknown>).recoveryExpiresAt instanceof Date);
  return validRecovery && (adoption.state !== "completed" || (adoption.completedAt instanceof Date && typeof adoption.draftId === "string" && adoption.draftId.length > 0));
}

function isUnclaimedPrepared(value: unknown): value is Prepared {
  return isBasePrepared(value) && !("adoption" in (value as Record<string, unknown>)) && "encryptedPayload" in (value as Record<string, unknown>);
}

function isClaimedPrepared(value: unknown): value is ClaimedPrepared {
  const record = value as Record<string, unknown>;
  return isBasePrepared(value) && "encryptedPayload" in record && isAdoption(record.adoption) && record.adoption.state === "claimed";
}

function isCompletedPrepared(value: unknown): value is CompletedPrepared {
  const record = value as Record<string, unknown>;
  return isBasePrepared(value) && !("encryptedPayload" in record) && isAdoption(record.adoption) && record.adoption.state === "completed";
}

async function commitBarrier(document: Preparing) {
  await ensureIndexes();
  const collection = await coreCol<Record<string, unknown>>(COLLECTION);
  const update = {
    $set: document,
    $unset: { encryptedPayload: "" as const, adoption: "" as const },
  };
  const filter = {
    anonymousSessionBindingHash: document.anonymousSessionBindingHash,
    $or: [
      { adoption: { $exists: false } },
      { "adoption.state": "completed" },
      { "adoption.state": "claimed", "adoption.draftRecovery": { $exists: false }, "adoption.recoveryExpiresAt": { $lte: document.createdAt } },
      { "adoption.state": "claimed", "adoption.draftRecovery.recoveryExpiresAt": { $lte: document.createdAt } },
    ],
  };
  try {
    const committed = await collection.findOneAndUpdate(
      filter,
      update,
      { upsert: true, returnDocument: "after" },
    );
    if (!isCommittedBarrier(committed, document)) throw new Error("barrier_commit_unconfirmed");
  } catch (error) {
    if (!isBindingSlotDuplicateKey(error)) throw error;
    // A single retry serializes the only expected first-slot unique-upsert race.
    const committed = await collection.findOneAndUpdate(
      filter,
      update,
      { upsert: false, returnDocument: "after" },
    );
    if (!isCommittedBarrier(committed, document)) throw new Error("barrier_retry_unconfirmed");
  }
}

export async function prepareGuestAdoptionPreparation(input: {
  session: CreateAnonymousSession;
  claim: unknown;
  nowMs?: number;
}): Promise<GuestAdoptionPreparationResult> {
  const nowMs = input.nowMs ?? Date.now();
  const claim = normalizedClaim(input.claim);
  const effectiveTtlMs = Math.min(PREPARATION_TTL_MS, input.session.expiresAtMs - nowMs);
  if (!claim || !Number.isSafeInteger(nowMs) || effectiveTtlMs <= 0) {
    return { ok: false, afterBarrier: false, reason: "invalid" };
  }

  const preparationId = crypto.randomUUID();
  const expiresAt = new Date(nowMs + effectiveTtlMs);
  const barrier: Preparing = {
    version: 1,
    preparationId,
    anonymousSessionBindingHash: bindingHash(input.session.id),
    state: "preparing",
    createdAt: new Date(nowMs),
    expiresAt,
  };
  try {
    await commitBarrier(barrier);
  } catch {
    return { ok: false, afterBarrier: false, reason: "unavailable" };
  }

  if (!inspectGuestClaim(claim).ok) return { ok: false, afterBarrier: true, reason: "rejected" };
  let encryptedPayload: AtRestEnvelope;
  try {
    encryptedPayload = encryptAtRest({ purpose: PURPOSE, plaintext: encodeAtRestUtf8(claim) });
  } catch {
    return { ok: false, afterBarrier: true, reason: "unavailable" };
  }
  try {
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const finalized = await collection.updateOne(
      {
        anonymousSessionBindingHash: barrier.anonymousSessionBindingHash,
        preparationId,
        state: "preparing",
      },
      { $set: { state: "prepared", encryptedPayload } },
    );
    if (finalized.modifiedCount !== 1) return { ok: false, afterBarrier: true, reason: "unavailable" };
  } catch {
    return { ok: false, afterBarrier: true, reason: "unavailable" };
  }
  return { ok: true, preparationId, expiresAtMs: expiresAt.getTime() };
}

export async function readGuestAdoptionPreparationForVerifiedAnonymousSession(input: {
  session: CreateAnonymousSession;
  nowMs?: number;
}): Promise<{ preparationId: string; claim: string } | null> {
  const nowMs = input.nowMs ?? Date.now();
  try {
    await ensureIndexes();
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const document = await collection.findOne({
      anonymousSessionBindingHash: bindingHash(input.session.id),
      state: "prepared",
      expiresAt: { $gt: new Date(nowMs) },
      adoption: { $exists: false },
    });
    if (!isUnclaimedPrepared(document) || document.expiresAt.getTime() <= nowMs) return null;
    const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: document.encryptedPayload }));
    const normalized = normalizedClaim(claim);
    return normalized === claim ? { preparationId: document.preparationId, claim } : null;
  } catch {
    return null;
  }
}

export async function claimGuestAdoptionPreparationForAuthenticatedAccount(input: {
  session: CreateAnonymousSession;
  userId: string;
  nowMs?: number;
}): Promise<GuestAdoptionClaimResult> {
  const nowMs = input.nowMs ?? Date.now();
  if (!validUserId(input.userId) || !Number.isSafeInteger(nowMs) || input.session.expiresAtMs <= nowMs) return { ok: false };
  const recoveryExpiresAt = new Date(Math.min(nowMs + CLAIM_RECOVERY_TTL_MS, input.session.expiresAtMs));
  const binding = bindingHash(input.session.id);
  const account = accountBindingHash(input.userId);
  const adoption: Adoption = { version: 1, state: "claimed", adoptionId: crypto.randomUUID(), accountBindingHash: account, claimedAt: new Date(nowMs), recoveryExpiresAt };
  try {
    await ensureIndexes();
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const claimed = await collection.findOneAndUpdate(
      { anonymousSessionBindingHash: binding, state: "prepared", expiresAt: { $gt: new Date(nowMs) }, adoption: { $exists: false } },
      { $set: { adoption, expiresAt: recoveryExpiresAt } },
      { returnDocument: "after" },
    );
    if (isClaimedPrepared(claimed) && claimed.adoption.adoptionId === adoption.adoptionId) {
      const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: claimed.encryptedPayload }));
      return normalizedClaim(claim) === claim ? { ok: true, state: "claimed", preparationId: claimed.preparationId, adoptionId: adoption.adoptionId, claim, recoveryExpiresAtMs: recoveryExpiresAt.getTime() } : { ok: false };
    }
    const existing = await collection.findOne({ anonymousSessionBindingHash: binding, state: "prepared" });
    if (isClaimedPrepared(existing) && existing.adoption.accountBindingHash === account && existing.adoption.recoveryExpiresAt.getTime() > nowMs) {
      const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: existing.encryptedPayload }));
      return normalizedClaim(claim) === claim ? { ok: true, state: "claimed", preparationId: existing.preparationId, adoptionId: existing.adoption.adoptionId, claim, recoveryExpiresAtMs: existing.adoption.recoveryExpiresAt.getTime() } : { ok: false };
    }
    if (isCompletedPrepared(existing) && existing.adoption.accountBindingHash === account) return { ok: true, state: "completed", preparationId: existing.preparationId, adoptionId: existing.adoption.adoptionId, draftId: existing.adoption.draftId };
    return { ok: false };
  } catch { return { ok: false }; }
}

export async function completeGuestAdoptionPreparationForAuthenticatedAccount(input: {
  session: CreateAnonymousSession; userId: string; adoptionId: string; draftId: string; nowMs?: number;
}): Promise<boolean> {
  const nowMs = input.nowMs ?? Date.now();
  if (!validUserId(input.userId) || !UUID_V4.test(input.adoptionId) || !String(input.draftId).trim() || input.session.expiresAtMs <= nowMs) return false;
  const binding = bindingHash(input.session.id); const account = accountBindingHash(input.userId);
  try {
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const completed = await collection.findOneAndUpdate(
      {
        anonymousSessionBindingHash: binding,
        state: "prepared",
        expiresAt: { $gt: new Date(nowMs) },
        "adoption.state": "claimed",
        "adoption.adoptionId": input.adoptionId,
        "adoption.accountBindingHash": account,
        $or: [
          { "adoption.recoveryExpiresAt": { $gt: new Date(nowMs) } },
          {
            "adoption.draftRecovery.version": 1,
            "adoption.draftRecovery.boundAt": { $type: "date" },
            "adoption.draftRecovery.recoveryExpiresAt": { $type: "date", $gt: new Date(nowMs) },
          },
        ],
      },
      {
        $set: {
          "adoption.state": "completed",
          "adoption.completedAt": new Date(nowMs),
          "adoption.draftId": input.draftId,
          expiresAt: new Date(input.session.expiresAtMs),
        },
        $unset: { encryptedPayload: "", "adoption.draftRecovery": "" },
      },
      { returnDocument: "after" },
    );
    if (isCompletedPrepared(completed) && completed.adoption.adoptionId === input.adoptionId && completed.adoption.draftId === input.draftId) return true;
    const existing = await collection.findOne({ anonymousSessionBindingHash: binding, state: "prepared", "adoption.adoptionId": input.adoptionId, "adoption.accountBindingHash": account, "adoption.state": "completed" });
    return isCompletedPrepared(existing) && existing.adoption.draftId === input.draftId;
  } catch { return false; }
}

export async function bindGuestAdoptionDraftRecoveryForAuthenticatedAccount(input: { session: CreateAnonymousSession; userId: string; adoptionId: string; nowMs?: number }): Promise<{ ok: true; draftIdempotencyKey: string; recoveryExpiresAtMs: number } | { ok: false }> {
  const nowMs = input.nowMs ?? Date.now();
  if (!validUserId(input.userId) || !UUID_V4.test(input.adoptionId) || input.session.expiresAtMs <= nowMs) return { ok: false };
  const key = buildGuestAdoptionDraftIdempotencyKey(input.adoptionId); if (!key) return { ok: false };
  const binding = bindingHash(input.session.id); const account = accountBindingHash(input.userId); const expiry = new Date(input.session.expiresAtMs);
  try {
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const recovery = { version: 1 as const, boundAt: new Date(nowMs), recoveryExpiresAt: expiry };
    const bound = await collection.findOneAndUpdate({ anonymousSessionBindingHash: binding, state: "prepared", "adoption.state": "claimed", "adoption.adoptionId": input.adoptionId, "adoption.accountBindingHash": account, "adoption.recoveryExpiresAt": { $gt: new Date(nowMs) }, "adoption.draftRecovery": { $exists: false } }, { $set: { "adoption.draftRecovery": recovery, expiresAt: expiry } }, { returnDocument: "after" });
    if (isClaimedPrepared(bound) && bound.adoption.adoptionId === input.adoptionId) return { ok: true, draftIdempotencyKey: key, recoveryExpiresAtMs: expiry.getTime() };
    const existing = await collection.findOne({ anonymousSessionBindingHash: binding, state: "prepared", "adoption.state": "claimed", "adoption.adoptionId": input.adoptionId, "adoption.accountBindingHash": account });
    const draftRecovery = isClaimedPrepared(existing) ? existing.adoption.draftRecovery : null;
    return draftRecovery && draftRecovery.recoveryExpiresAt.getTime() > nowMs && draftRecovery.recoveryExpiresAt.getTime() <= input.session.expiresAtMs ? { ok: true, draftIdempotencyKey: key, recoveryExpiresAtMs: draftRecovery.recoveryExpiresAt.getTime() } : { ok: false };
  } catch { return { ok: false }; }
}

export async function recoverDraftBoundGuestAdoptionForAuthenticatedAccount(input: { session: CreateAnonymousSession; userId: string; adoptionId: string; nowMs?: number }): Promise<{ ok: true; preparationId: string; adoptionId: string; claim: string; draftIdempotencyKey: string; recoveryExpiresAtMs: number } | { ok: false }> {
  const nowMs = input.nowMs ?? Date.now(); const key = buildGuestAdoptionDraftIdempotencyKey(input.adoptionId);
  if (!validUserId(input.userId) || !key || input.session.expiresAtMs <= nowMs) return { ok: false };
  try { const doc = await (await coreCol<Record<string, unknown>>(COLLECTION)).findOne({ anonymousSessionBindingHash: bindingHash(input.session.id), state: "prepared", "adoption.state": "claimed", "adoption.adoptionId": input.adoptionId, "adoption.accountBindingHash": accountBindingHash(input.userId), "adoption.draftRecovery.recoveryExpiresAt": { $gt: new Date(nowMs) }, expiresAt: { $gt: new Date(nowMs) } });
    if (!isClaimedPrepared(doc) || !doc.adoption.draftRecovery) return { ok: false }; const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: doc.encryptedPayload }));
    return normalizedClaim(claim) === claim ? { ok: true, preparationId: doc.preparationId, adoptionId: input.adoptionId, claim, draftIdempotencyKey: key, recoveryExpiresAtMs: doc.adoption.draftRecovery.recoveryExpiresAt.getTime() } : { ok: false };
  } catch { return { ok: false }; }
}

export async function discoverDraftBoundGuestAdoptionForAuthenticatedAccount(input: { session: CreateAnonymousSession; userId: string; nowMs?: number }): Promise<{ ok: true; preparationId: string; adoptionId: string; claim: string; draftIdempotencyKey: string; recoveryExpiresAtMs: number } | { ok: false }> {
  const nowMs = input.nowMs ?? Date.now();
  if (!validUserId(input.userId) || !Number.isSafeInteger(nowMs) || input.session.expiresAtMs <= nowMs) return { ok: false };
  try {
    const doc = await (await coreCol<Record<string, unknown>>(COLLECTION)).findOne({
      anonymousSessionBindingHash: bindingHash(input.session.id), state: "prepared", expiresAt: { $gt: new Date(nowMs) },
      "adoption.state": "claimed", "adoption.accountBindingHash": accountBindingHash(input.userId),
      "adoption.draftRecovery.version": 1, "adoption.draftRecovery.boundAt": { $type: "date" },
      "adoption.draftRecovery.recoveryExpiresAt": { $type: "date", $gt: new Date(nowMs) },
    });
    if (!isClaimedPrepared(doc) || !doc.adoption.draftRecovery) return { ok: false };
    const key = buildGuestAdoptionDraftIdempotencyKey(doc.adoption.adoptionId);
    if (!key) return { ok: false };
    const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: doc.encryptedPayload }));
    return normalizedClaim(claim) === claim ? { ok: true, preparationId: doc.preparationId, adoptionId: doc.adoption.adoptionId, claim, draftIdempotencyKey: key, recoveryExpiresAtMs: doc.adoption.draftRecovery.recoveryExpiresAt.getTime() } : { ok: false };
  } catch { return { ok: false }; }
}
