import { ObjectId, piiCol } from "@core/db/triMongo";
import type { UserPaymentProfileDoc } from "@core/pii/userPaymentProfileTypes";

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
        holderName: data.holderName,
        verifiedBy: data.verifiedBy ?? "manual",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
  return getUserPaymentProfile(userId);
}
