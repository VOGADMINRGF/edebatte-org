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
const PREPARATION_TTL_MS = 15 * 60 * 1000;
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
};

type PreparationDocument = Preparing | Prepared;

export type GuestAdoptionPreparationResult =
  | { ok: true; preparationId: string; expiresAtMs: number }
  | { ok: false; afterBarrier: boolean; reason: "invalid" | "rejected" | "unavailable" };

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

function isDuplicateKey(error: unknown) {
  return (error as { code?: unknown } | null)?.code === 11000;
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

function normalizedClaim(value: unknown) {
  if (typeof value !== "string") return null;
  const claim = value.trim();
  if (!claim || claim.length > MAX_CLAIM_CHARS || Buffer.byteLength(claim, "utf8") > MAX_CLAIM_BYTES) return null;
  return claim;
}

function isPreparedDocument(value: unknown): value is Prepared {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 || record.state !== "prepared" ||
    typeof record.preparationId !== "string" || !UUID_V4.test(record.preparationId) ||
    typeof record.anonymousSessionBindingHash !== "string" || !/^[a-f0-9]{64}$/.test(record.anonymousSessionBindingHash) ||
    !(record.createdAt instanceof Date) || !(record.expiresAt instanceof Date) ||
    !("encryptedPayload" in record)
  ) return false;
  return true;
}

async function commitBarrier(document: Preparing) {
  await ensureIndexes();
  const collection = await coreCol<Record<string, unknown>>(COLLECTION);
  const update = {
    $set: document,
    $unset: { encryptedPayload: "" as const },
  };
  try {
    await collection.findOneAndUpdate(
      { anonymousSessionBindingHash: document.anonymousSessionBindingHash },
      update,
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // A single retry serializes the only expected first-slot unique-upsert race.
    await collection.findOneAndUpdate(
      { anonymousSessionBindingHash: document.anonymousSessionBindingHash },
      update,
      { upsert: false, returnDocument: "after" },
    );
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
  preparationId: string;
  nowMs?: number;
}): Promise<{ preparationId: string; claim: string } | null> {
  if (!UUID_V4.test(input.preparationId)) return null;
  const nowMs = input.nowMs ?? Date.now();
  try {
    await ensureIndexes();
    const collection = await coreCol<Record<string, unknown>>(COLLECTION);
    const document = await collection.findOne({
      preparationId: input.preparationId,
      anonymousSessionBindingHash: bindingHash(input.session.id),
      state: "prepared",
      expiresAt: { $gt: new Date(nowMs) },
    });
    if (!isPreparedDocument(document) || document.preparationId !== input.preparationId || document.expiresAt.getTime() <= nowMs) return null;
    const claim = decodeAtRestUtf8(decryptAtRest({ purpose: PURPOSE, envelope: document.encryptedPayload }));
    const normalized = normalizedClaim(claim);
    return normalized === claim ? { preparationId: document.preparationId, claim } : null;
  } catch {
    return null;
  }
}
