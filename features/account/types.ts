import type { SupportedLocale } from "@core/locale/locales";
import type { IdentityMethod, VerificationLevel, UserVerification } from "@core/auth/verificationTypes";
import type { EngagementLevel } from "@features/user/engagement";
import type { AccessTier } from "@features/pricing/types";
import type { TopicKey } from "@features/interests/topics";

export type MembershipStatus =
  | "none"
  | "submitted"
  | "pending"
  | "waiting_payment"
  | "active"
  | "cancelled"
  | "household_locked";

export type PricingTier =
  | "free"
  | "citizenBasic"
  | "citizenPremium"
  | "institutionBasic"
  | "institutionPremium"
  | "staff"
  | "custom";

export type EDebattePackage = "basis" | "start" | "pro" | "none";
export type EDebatteStatus = "none" | "preorder" | "active" | "canceled";

export type AccountEdebateInfo = {
  package: EDebattePackage;
  status: EDebatteStatus;
  billingInterval?: "monthly" | "yearly";
  nextBillingDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export type AccountStats = {
  swipesThisMonth: number;
  remainingPostsLevel1: number;
  remainingPostsLevel2: number;
  swipeCountTotal: number;
  xp: number;
  contributionCredits: number;
  engagementLevel: EngagementLevel;
  nextCreditIn: number;
  lastSwipeAt?: string | null;
};

export type AccountPaymentProfile = {
  ibanMasked: string;
  holderName: string;
  bic?: string | null;
};

export type AccountSignatureInfo = {
  kind: "digital" | "id_document";
  storedAt: string;
};

export type ProfilePublicFlags = {
  showRealName?: boolean;
  showCity?: boolean;
  showJoinDate?: boolean;
  showEngagementLevel?: boolean;
  showStats?: boolean;
};

export type ProfileTopTopic = {
  key: TopicKey;
  title: string;
  statement?: string | null;
};

export type AccountProfile = {
  headline?: string | null;
  bio?: string | null;
  avatarStyle?: "initials" | "abstract" | "emoji" | null;
  topTopics?: ProfileTopTopic[];
  publicFlags?: ProfilePublicFlags;
};

export type ProfilePackage = "basic" | "pro" | "premium";

export type AccountOverview = {
  userId: string;
  email: string;
  displayName: string | null;
  profile?: AccountProfile;
  profilePackage?: ProfilePackage;
  /** Legacy mirrors for backward compatibility */
  publicFlags?: ProfilePublicFlags;
  topTopics?: ProfileTopTopic[];
  accessTier: AccessTier;
  planSlug?: string | null;
  roles: string[];
  groups: string[];
  vogMembershipStatus: MembershipStatus;
  hasVogMembership: boolean;
  membershipSnapshot?: {
    status: MembershipStatus;
    amountPerMonth?: number | null;
    rhythm?: "monthly" | "once" | "yearly" | null;
    householdSize?: number | null;
    peopleCount?: number | null;
    submittedAt?: string | null;
    applicationId?: string | null;
    paymentMethod?: "sepa" | "bank_transfer" | "paypal" | "other" | null;
    paymentReference?: string | null;
    paymentInfo?: {
      method: "bank_transfer";
      reference: string;
      bankRecipient: string;
      bankIbanMasked: string;
      bankBic?: string | null;
      bankName?: string | null;
      accountMode?: "private_preUG" | "org_postUG";
      mandateStatus?: string | null;
    } | null;
    edebatte?: {
      enabled: boolean;
      planKey?: string | null;
      finalPricePerMonth?: number | null;
      billingMode?: string | null;
      discountPercent?: number | null;
    } | null;
  } | null;
  edebatte?: AccountEdebateInfo;
  pricingTier: PricingTier;
  stats: AccountStats;
  preferredLocale: SupportedLocale;
  newsletterOptIn: boolean;
  emailVerified: boolean;
  verificationLevel: VerificationLevel;
  verificationMethods: IdentityMethod[];
  verification?: UserVerification;
  paymentProfile?: AccountPaymentProfile | null;
  signature?: AccountSignatureInfo | null;
  createdAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
};

export type AccountSettingsUpdate = {
  displayName?: string | null;
  preferredLocale?: SupportedLocale;
  newsletterOptIn?: boolean;
};

export type AccountProfileUpdate = {
  headline?: string | null;
  bio?: string | null;
  avatarStyle?: "initials" | "abstract" | "emoji" | null;
  topTopics?: { key: TopicKey; statement?: string | null }[] | null;
  publicFlags?: ProfilePublicFlags | null;
};
