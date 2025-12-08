import type { ObjectId } from "mongodb";

export type UserPaymentProfileDoc = {
  _id: ObjectId;
  userId: ObjectId;
  type: "sepa_mandate" | "manual_transfer" | "paypal" | "other";

  billingName: string;
  holderName?: string | null;
  billingAddress?: {
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  };

  ibanMasked?: string | null;
  ibanLast4?: string | null;
  ibanFingerprint?: string | null;
  encryptedIban?: string | null;
  bic?: string | null;
  mandateReference?: string | null;

  createdAt: Date;
  updatedAt: Date;
  verifiedBy?: "sepa_mandate" | "card" | "manual";
};
