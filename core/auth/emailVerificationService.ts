import crypto from "node:crypto";
import { ObjectId, getCol } from "@core/db/triMongo";
import { ensureVerificationDefaults, upgradeVerificationLevel } from "./verificationTypes";
import type { EmailVerificationTokenDoc } from "./emailVerificationTypes";

const TOKEN_COLLECTION = "email_verification_tokens";
const TOKEN_TTL_HOURS = 24;

let indexesEnsured = false;

function tokenHash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function tokenSlotKey(userId: ObjectId) {
  return `slot:verify:${String(userId)}`;
}

async function ensureIndexes(col: Awaited<ReturnType<typeof getCol<EmailVerificationTokenDoc>>>) {
  if (indexesEnsured) return;

  try {
    await col.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "expires_ttl" },
    );
  } catch (error: any) {
    const code = error?.code ?? error?.codeName;
    if (!(code === 85 || code === "IndexOptionsConflict")) {
      throw error;
    }
  }

  try {
    await col.createIndex(
      { slotKey: 1 },
      { unique: true, sparse: true, name: "verify_token_slot_unique" },
    );
  } catch (error: any) {
    const code = error?.code ?? error?.codeName;
    if (!(code === 85 || code === "IndexOptionsConflict")) {
      throw error;
    }
  }

  indexesEnsured = true;
}

export async function createEmailVerificationToken(
  userId: ObjectId,
  email: string,
  continuationTarget?: string | null,
) {
  const Tokens = await getCol<EmailVerificationTokenDoc>(TOKEN_COLLECTION);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 3600 * 1000);
  const slotKey = tokenSlotKey(userId);

  await ensureIndexes(Tokens);

  await Tokens.findOneAndUpdate(
    { slotKey },
    {
      $set: {
        userId,
        email,
        tokenHash: tokenHash(rawToken),
        expiresAt,
        usedAt: null,
        invalidatedAt: null,
        invalidationReason: null,
        continuationTarget: continuationTarget ?? null,
        deliveryStatus: "pending",
        deliveryRetryable: null,
        deliveryCategory: null,
        deliveryAttemptedAt: null,
        deliveryAttemptedCount: 0,
        deliveryDeliveredCount: 0,
        deliveryFailedCount: 0,
        deliveryMessageId: null,
        deliveryRecoveryStatus: null,
        deliveryNextAttemptAt: null,
        updatedAt: now,
      },
      $setOnInsert: {
        slotKey,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: "before" },
  );

  await Tokens.updateMany(
    {
      slotKey: { $exists: false },
      userId,
      usedAt: null,
      $or: [{ invalidatedAt: null }, { invalidatedAt: { $exists: false } }],
      expiresAt: { $gt: now },
    },
    {
      $set: {
        invalidatedAt: now,
        invalidationReason: "rotated",
        updatedAt: now,
      },
    },
  );

  return { rawToken, expiresAt };
}

export async function recordEmailVerificationDelivery(
  userId: ObjectId,
  rawToken: string,
  delivery: {
    status: "delivered" | "failed" | "partial";
    retryable: boolean;
    category: string | null;
    attemptedCount?: number;
    deliveredCount?: number;
    failedCount?: number;
    messageId?: string | null;
  },
) {
  const Tokens = await getCol<EmailVerificationTokenDoc>(TOKEN_COLLECTION);
  const now = new Date();
  await Tokens.updateOne(
    {
      slotKey: tokenSlotKey(userId),
      tokenHash: tokenHash(rawToken),
    },
    {
      $set: {
        deliveryStatus: delivery.status,
        deliveryRetryable: delivery.retryable,
        deliveryCategory: delivery.category,
        deliveryAttemptedAt: now,
        deliveryAttemptedCount: delivery.attemptedCount ?? 0,
        deliveryDeliveredCount: delivery.deliveredCount ?? 0,
        deliveryFailedCount: delivery.failedCount ?? 0,
        deliveryMessageId: delivery.messageId ?? null,
        deliveryRecoveryStatus: null,
        deliveryNextAttemptAt: null,
        updatedAt: now,
      },
    },
  );
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const hash = tokenHash(rawToken);
  const Tokens = await getCol<EmailVerificationTokenDoc>(TOKEN_COLLECTION);
  const now = new Date();

  const tokenDoc = await Tokens.findOneAndUpdate(
    {
      slotKey: { $exists: true },
      tokenHash: hash,
      usedAt: null,
      $or: [{ invalidatedAt: null }, { invalidatedAt: { $exists: false } }],
      expiresAt: { $gt: now },
    },
    {
      $set: {
        usedAt: now,
        invalidatedAt: now,
        invalidationReason: "consumed",
        updatedAt: now,
      },
    },
    { returnDocument: "before" },
  );

  const legacyDoc = tokenDoc
    ? null
    : await Tokens.findOneAndUpdate(
        {
          slotKey: { $exists: false },
          tokenHash: hash,
          usedAt: null,
          $or: [{ invalidatedAt: null }, { invalidatedAt: { $exists: false } }],
          expiresAt: { $gt: now },
        },
        {
          $set: {
            usedAt: now,
            invalidatedAt: now,
            invalidationReason: "consumed",
            updatedAt: now,
          },
        },
        { returnDocument: "before" },
      );

  const activeDoc = tokenDoc ?? legacyDoc;
  if (!activeDoc) return null;

  const Users = await getCol("users");
  const user = await Users.findOne({ _id: activeDoc.userId }, { projection: { verification: 1 } });
  if (!user) return null;

  const verification = ensureVerificationDefaults(user.verification);
  const methods = new Set(verification.methods);
  methods.add("email_link");

  const nextVerification = {
    ...verification,
    level: upgradeVerificationLevel(verification.level, "email"),
    methods: Array.from(methods),
    lastVerifiedAt: now,
  };

  await Users.updateOne(
    { _id: activeDoc.userId },
    {
      $set: {
        verifiedEmail: true,
        emailVerified: true,
        verification: nextVerification,
        updatedAt: now,
      },
    },
  );

  return {
    userId: activeDoc.userId,
    email: activeDoc.email,
    verification: nextVerification,
    continuationTarget: activeDoc.continuationTarget ?? null,
  };
}
