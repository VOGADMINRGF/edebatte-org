import type { ObjectId } from "mongodb";

export type UserSignatureKind = "digital" | "id_document";

export type UserSignatureDoc = {
  _id: ObjectId;
  userId: ObjectId;
  kind: UserSignatureKind;
  storedAt: Date;
  meta?: {
    provider?: "otb" | "manual";
    documentType?: "id_card" | "passport" | "driver_license";
  };
};
