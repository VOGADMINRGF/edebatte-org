import type { ObjectId } from "mongodb";

export type UserPaymentProfileDoc = {
  _id: ObjectId;
  userId: ObjectId;
  ibanMasked: string;
  bic?: string | null;
  holderName: string;
  createdAt: Date;
  updatedAt: Date;
  verifiedBy?: "sepa_mandate" | "card" | "manual";
};
