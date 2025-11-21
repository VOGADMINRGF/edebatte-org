import type { ObjectId } from "mongodb";

export type EmailVerificationTokenDoc = {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
};
