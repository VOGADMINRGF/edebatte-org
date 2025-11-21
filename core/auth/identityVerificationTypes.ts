import type { ObjectId } from "mongodb";
import type { IdentityMethod } from "./verificationTypes";

export type IdentityVerificationStatus = "pending" | "succeeded" | "failed" | "expired";

export type IdentityVerificationSessionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  method: IdentityMethod;
  provider: "mock" | "otb";
  status: IdentityVerificationStatus;
  createdAt: Date;
  updatedAt: Date;
  providerSessionId?: string;
  providerPayload?: unknown;
};
