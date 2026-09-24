import type { SupportedLocale } from "@core/locale/locales";
import type { IdentityMethod, VerificationLevel, UserVerification } from "@core/auth/verificationTypes";
import type { EngagementLevel } from "@features/user/engagement";
import type { AccessTier } from "@features/pricing/types";
import type { TopicKey } from "@features/interests/topics";
import type { AccountEditorialReviewSlice } from "./editorialReviewTypes";
import type { AccountFactcheckJobSlice } from "./factcheckJobTypes";
import type { AccountGraphMergeCandidateSlice } from "./graphCandidateTypes";
import type { AccountManualAnlassraumServerDraftSlice } from "./manualAnlassraumServerDraftTypes";
import type { AccountSavedWorkstateSlice } from "./savedWorkstateTypes";
import type { AccountUserScopedRuntimeLinkageSlice } from "./userScopedRuntimeLinkageTypes";

type AccountCreateDraftSlice = import("./createContributionLedgerTypes").AccountCreateContributionLedgerSlice;
type AccountReviewSupplementSlices =
  AccountManualAnlassraumServerDraftSlice &
  AccountEditorialReviewSlice &
  AccountFactcheckJobSlice &
  AccountGraphMergeCandidateSlice &
  AccountUserScopedRuntimeLinkageSlice &
  AccountSavedWorkstateSlice;

export const ACCOUNT_FEATURE_INTEREST_KEYS = ["streams", "hostRights", "chat"] as const;
export type AccountFeatureInterestKey = (typeof ACCOUNT_FEATURE_INTEREST_KEYS)[number];

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

export type EDebattePackage =
  | "basis"
  | "start"
  | "pro"
  | "b2b_basis"
  | "b2b_pro"
  | "b2g_basis"
  | "b2g_pro"
  | "none";
export type EDebatteStatus = "none" | "preorder" | "active" | "canceled";

export type AccountEdebateInfo = {
  package: EDebattePackage;
  status: EDebatteStatus;
  billingInterval?: "monthly" | "yearly";
  nextBillingDate?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  pledgeAmount?: number | null;
  pledgeInterval?: "once" | "monthly" | "yearly" | null;
  pledgeReference?: string | null;
  pledgeConfirmedAt?: string | null;
  commitmentMonths?: number | null;
  commitmentStartsAt?: string | null;
  commitmentEndsAt?: string | null;
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
  showMembership?: boolean;
};

export type ProfileTopTopic = {
  key: TopicKey;
  title: string;
  statement?: string | null;
};

export type AccountProfile = {
  headline?: string | null;
  bio?: string | null;
  tagline?: string | null;
  avatarStyle?: "initials" | "abstract" | "emoji" | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  topTopics?: ProfileTopTopic[];
  publicFlags?: ProfilePublicFlags;
  publicLocation?: {
    city?: string | null;
    region?: string | null;
    countryCode?: string | null;
  };
  publicShareId?: string | null;
};

export type ProfilePackage = "basic" | "pro" | "premium";

export type PublicProfileSnapshot = {
  bio?: string | null;
  tagline?: string | null;
  avatarStyle?: "initials" | "abstract" | "emoji" | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  topTopics?: ProfileTopTopic[];
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  showRealName?: boolean;
  showCity?: boolean;
  showStats?: boolean;
  showJoinDate?: boolean;
  showEngagementLevel?: boolean;
  showMembership?: boolean;
  shareId?: string | null;
};

export type AccountOverview = {
  userId: string;
  email: string;
  displayName: string | null;
  profile?: AccountProfile;
  publicProfile?: PublicProfileSnapshot;
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
      bankIban?: string;
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
  uiLocale: SupportedLocale;
  readingLocale: SupportedLocale;
  preferredOutputLocales: SupportedLocale[];
  showOriginalByDefault: boolean;
  preferredLocale: SupportedLocale;
  newsletterOptIn: boolean;
  emailVerified: boolean;
  verificationLevel: VerificationLevel;
  verificationMethods: IdentityMethod[];
  verification?: UserVerification;
  paymentProfile?: AccountPaymentProfile | null;
  signature?: AccountSignatureInfo | null;
  featureInterests?: AccountFeatureInterestKey[];
  createdAt?: Date | string | null;
  lastLoginAt?: Date | string | null;
} & AccountCreateDraftSlice &
  AccountReviewSupplementSlices;

export type CreateAccountContext = {
  userId: string;
  displayName: string | null;
  profile?: Pick<AccountProfile, "publicLocation">;
  accessTier: AccessTier;
  roles: string[];
  edebatte: Pick<AccountEdebateInfo, "package">;
  stats: Pick<AccountStats, "contributionCredits" | "nextCreditIn">;
};

export type AccountSettingsUpdate = {
  displayName?: string | null;
  uiLocale?: SupportedLocale;
  readingLocale?: SupportedLocale;
  preferredOutputLocales?: SupportedLocale[];
  showOriginalByDefault?: boolean;
  preferredLocale?: SupportedLocale;
  newsletterOptIn?: boolean;
  featureInterests?: AccountFeatureInterestKey[];
};

export type AccountProfileUpdate = {
  headline?: string | null;
  bio?: string | null;
  tagline?: string | null;
  avatarStyle?: "initials" | "abstract" | "emoji" | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  topTopics?: { key: TopicKey; statement?: string | null }[] | null;
  publicFlags?: ProfilePublicFlags | null;
  publicLocation?: {
    city?: string | null;
    region?: string | null;
    countryCode?: string | null;
  } | null;
};
