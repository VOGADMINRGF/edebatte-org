import crypto from "node:crypto";
import { ObjectId, getCol } from "@core/db/triMongo";
import { ensureVerificationDefaults, upgradeVerificationLevel } from "./verificationTypes";
import type { EmailVerificationTokenDoc } from "./emailVerificationTypes";

const TOKEN_COLLECTION = "email_verification_tokens";
const TOKEN_TTL_HOURS = 24;

function tokenHash(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createEmailVerificationToken(userId: ObjectId, email: string) {
  const Tokens = await getCol<EmailVerificationTokenDoc>(TOKEN_COLLECTION);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_HOURS * 3600 * 1000);

  await Tokens.insertOne({
    userId,
    email,
    tokenHash: tokenHash(rawToken),
    createdAt: now,
    expiresAt,
    usedAt: null,
  } as EmailVerificationTokenDoc);

  return { rawToken, expiresAt };
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const hash = tokenHash(rawToken);
  const Tokens = await getCol<EmailVerificationTokenDoc>(TOKEN_COLLECTION);
  const tokenDoc = await Tokens.findOne({ tokenHash: hash });
  if (!tokenDoc) return null;

  const now = new Date();
  if (tokenDoc.usedAt || tokenDoc.expiresAt < now) {
    return null;
  }

  await Tokens.updateOne({ _id: tokenDoc._id }, { $set: { usedAt: now } });

  const Users = await getCol("users");
  const user = await Users.findOne({ _id: tokenDoc.userId }, { projection: { verification: 1 } });
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
    { _id: tokenDoc.userId },
    {
      $set: {
        verifiedEmail: true,
        emailVerified: true,
        verification: nextVerification,
        updatedAt: now,
      },
    },
  );

  return { userId: tokenDoc.userId, email: tokenDoc.email, verification: nextVerification };
}
