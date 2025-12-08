import type { ObjectId } from "mongodb";

export type HouseholdInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface HouseholdInvite {
  _id: ObjectId;
  membershipId: ObjectId; // Verweis auf core.membership_applications
  coreUserId: ObjectId; // Hauptperson, die einlädt
  targetEmail: string;
  targetGivenName?: string | null;
  targetFamilyName?: string | null;

  token: string;
  status: HouseholdInviteStatus;

  sentAt: Date;
  acceptedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
