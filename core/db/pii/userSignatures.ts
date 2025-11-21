import { ObjectId, piiCol } from "@core/db/triMongo";
import type { UserSignatureDoc, UserSignatureKind } from "@core/pii/userSignatureTypes";

const COLLECTION = "user_signatures";

export async function getUserSignature(userId: ObjectId) {
  const col = await piiCol<UserSignatureDoc>(COLLECTION);
  return col.findOne({ userId });
}

export async function upsertUserSignature(userId: ObjectId, kind: UserSignatureKind, meta?: UserSignatureDoc["meta"]) {
  const col = await piiCol<UserSignatureDoc>(COLLECTION);
  const now = new Date();
  await col.updateOne(
    { userId },
    {
      $set: {
        kind,
        meta: meta ?? null,
        storedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );
  return getUserSignature(userId);
}
