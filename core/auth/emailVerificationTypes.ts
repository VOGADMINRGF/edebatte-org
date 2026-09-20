import type { ObjectId } from "mongodb";

export type EmailVerificationTokenDoc = {
  _id?: ObjectId;
  slotKey?: string | null;
  userId: ObjectId;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
  invalidatedAt?: Date | null;
  invalidationReason?: string | null;
  updatedAt?: Date | null;
  continuationTarget?: string | null;
  deliveryStatus?: "pending" | "delivered" | "failed" | "partial";
  deliveryRetryable?: boolean | null;
  deliveryCategory?: string | null;
  deliveryAttemptedAt?: Date | null;
  deliveryAttemptedCount?: number;
  deliveryDeliveredCount?: number;
  deliveryFailedCount?: number;
  deliveryMessageId?: string | null;
  deliveryRecoveryStatus?: string | null;
  deliveryNextAttemptAt?: Date | null;
};
