import type { ObjectId } from "mongodb";
import type { UserVerification } from "@core/auth/verificationTypes";

export type CoreAccessTier =
  | "public"
  | "citizenBasic"
  | "citizenPremium"
  | "institutionBasic"
  | "institutionPremium"
  | "staff";

export type CoreUserProfile = {
  displayName?: string | null;
  locale?: string | null;
  location?: string | null;
};

export type CoreUserSettings = {
  preferredLocale?: string | null;
  newsletterOptIn?: boolean;
};

export type CoreUserDoc = {
  _id: ObjectId;
  email: string;
  name?: string | null;
  role?: string | null;
  roles?: Array<string | { role?: string; subRole?: string; premium?: boolean }>;
  accessTier?: CoreAccessTier;
  profile?: CoreUserProfile;
  settings?: CoreUserSettings;
  verification?: UserVerification;
  verifiedEmail?: boolean;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
