import { coreCol, ObjectId } from "@core/db/triMongo";

export type MembershipPackage = "basis" | "pro" | "premium";

type MembershipApplicationDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  plan: MembershipPackage;
  monthlyAmountEUR: number;
  reference: string;
  notes?: string | null;
  contact: {
    email: string;
    phone?: string | null;
    firstName: string;
    lastName: string;
  };
  address: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  birthDate?: string | null;
  status: "received" | "processing" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
};

export async function insertMembershipApplication(doc: Omit<MembershipApplicationDoc, "_id" | "createdAt" | "updatedAt">) {
  const col = await coreCol<MembershipApplicationDoc>("membership_applications");
  const now = new Date();
  const record: MembershipApplicationDoc = {
    ...doc,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await col.insertOne(record);
  return insertedId;
}
