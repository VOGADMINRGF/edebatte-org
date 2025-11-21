import { ObjectId, getCol } from "@core/db/triMongo";
import { getUserPaymentProfile } from "@core/db/pii/userPaymentProfiles";
import { getUserSignature } from "@core/db/pii/userSignatures";
import { ensureVerificationDefaults, upgradeVerificationLevel } from "./verificationTypes";
import { logIdentityEvent } from "@core/telemetry/identityEvents";

export async function applyStrongVerificationIfComplete(userId: ObjectId): Promise<boolean> {
  const [paymentProfile, signature] = await Promise.all([
    getUserPaymentProfile(userId),
    getUserSignature(userId),
  ]);
  if (!paymentProfile || !signature) return false;

  const Users = await getCol("users");
  const user = await Users.findOne({ _id: userId }, { projection: { verification: 1 } });
  if (!user) return false;

  const verification = ensureVerificationDefaults(user.verification);
  const nextLevel = upgradeVerificationLevel(verification.level, "strong");
  if (nextLevel === verification.level && verification.level === "strong") {
    return false;
  }

  const methods = new Set(verification.methods);
  methods.add("id_upload");

  await Users.updateOne(
    { _id: userId },
    {
      $set: {
        verification: {
          ...verification,
          level: nextLevel,
          methods: Array.from(methods),
          lastVerifiedAt: new Date(),
        },
        updatedAt: new Date(),
      },
    },
  );

  await logIdentityEvent("identity_strong_completed", {
    userId: userId.toString(),
    meta: { level: nextLevel },
  });

  return true;
}
