import { ObjectId, piiCol } from "@core/db/triMongo";
import type { UserPaymentProfileDoc } from "@core/pii/userPaymentProfileTypes";
import crypto from "node:crypto";

const COLLECTION = "user_payment_profiles";

export async function getUserPaymentProfile(userId: ObjectId) {
  const col = await piiCol<UserPaymentProfileDoc>(COLLECTION);
  return col.findOne({ userId });
}

export async function upsertUserPaymentProfile(userId: ObjectId, data: {
  ibanMasked: string;
  bic?: string | null;
  holderName: string;
  verifiedBy?: UserPaymentProfileDoc["verifiedBy"];
}) {
  const col = await piiCol<UserPaymentProfileDoc>(COLLECTION);
  const now = new Date();
  await col.updateOne(
    { userId },
    {
      $set: {
        ibanMasked: data.ibanMasked,
        bic: data.bic ?? null,
        billingName: data.holderName,
        holderName: data.holderName,
        verifiedBy: data.verifiedBy ?? "manual",
        type: "manual_transfer",
        updatedAt: now,
      },
      $setOnInsert: {
        billingName: data.holderName,
        holderName: data.holderName,
        type: "manual_transfer",
        createdAt: now,
      },
    },
    { upsert: true },
  );
  return getUserPaymentProfile(userId);
}

function normalizeIban(iban?: string | null): string | null {
  if (!iban) return null;
  return iban.replace(/\s+/g, "").toUpperCase();
}

function ibanLast4(iban?: string | null): string | null {
  const clean = normalizeIban(iban);
  if (!clean || clean.length < 4) return null;
  return clean.slice(-4);
}

function ibanFingerprint(iban?: string | null): string | null {
  const clean = normalizeIban(iban);
  if (!clean) return null;
  return crypto.createHash("sha256").update(clean).digest("hex");
}

/**
 * Upsert für Mitgliedschafts-Zahlungsprofile.
 * Voll-IBAN wird aktuell NICHT gespeichert, solange kein Encryption-Helper angebunden ist.
 */
export async function upsertMembershipPaymentProfile(
  userId: ObjectId,
  input: {
    type: "sepa_mandate" | "manual_transfer" | "paypal" | "other" | "bank_transfer";
    billingName: string;
    billingAddress?: { street?: string; postalCode?: string; city?: string; country?: string };
    iban?: string | null;
    mandateReference?: string | null;
    microTransferHash?: string | null;
    microTransferExpiresAt?: Date | null;
    microTransferAttempts?: number | null;
    microTransferVerifiedAt?: Date | null;
  },
): Promise<ObjectId> {
  const col = await piiCol<UserPaymentProfileDoc>(COLLECTION);
  const now = new Date();
  const normalizedIban = normalizeIban(input.iban);
  const profile: Partial<UserPaymentProfileDoc> = {
    type: input.type,
    billingName: input.billingName,
    billingAddress: input.billingAddress
      ? {
          street: input.billingAddress.street ?? null,
          postalCode: input.billingAddress.postalCode ?? null,
          city: input.billingAddress.city ?? null,
          country: input.billingAddress.country ?? null,
        }
      : undefined,
    ibanMasked: normalizedIban ? maskIban(normalizedIban) : null,
    ibanLast4: ibanLast4(normalizedIban),
    ibanFingerprint: ibanFingerprint(normalizedIban),
    // TODO: encryptedIban, sobald zentraler Encryption-Helper verfügbar ist.
    mandateReference: input.mandateReference ?? null,
    updatedAt: now,
  };

  if (input.microTransferHash !== undefined) {
    profile.microTransferHash = input.microTransferHash;
  }
  if (input.microTransferExpiresAt !== undefined) {
    profile.microTransferExpiresAt = input.microTransferExpiresAt;
  }
  if (input.microTransferAttempts !== undefined) {
    profile.microTransferAttempts = input.microTransferAttempts;
  }
  if (input.microTransferVerifiedAt !== undefined) {
    profile.microTransferVerifiedAt = input.microTransferVerifiedAt;
  }

  const result = await col.updateOne(
    { userId },
    {
      $set: profile,
      $setOnInsert: {
        userId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return result.upsertedId?._id ?? (await col.findOne({ userId }, { projection: { _id: 1 } }))!._id!;
}

function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  const middle = "*".repeat(Math.max(0, clean.length - 8));
  const combined = `${start}${middle}${end}`;
  return combined.match(/.{1,4}/g)?.join(" ") ?? combined;
}
