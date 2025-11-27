import type { SupportedLocale } from "@core/locale/locales";
import type { IdentityMethod, VerificationLevel } from "@core/auth/verificationTypes";
import type { EngagementLevel } from "@features/user/engagement";
import type { AccessTier } from "@features/pricing/types";
import type { TopicKey } from "@features/interests/topics";

export type MembershipStatus = "none" | "active" | "cancelled" | "pending";

export type PricingTier =
  | "free"
  | "citizenBasic"
  | "citizenPremium"
  | "institutionBasic"
  | "institutionPremium"
  | "staff"
  | "custom";

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
  roles: string[];
  groups: string[];
  vogMembershipStatus: MembershipStatus;
  hasVogMembership: boolean;
  pricingTier: PricingTier;
  stats: AccountStats;
  preferredLocale: SupportedLocale;
  newsletterOptIn: boolean;
  emailVerified: boolean;
  verificationLevel: VerificationLevel;
  verificationMethods: IdentityMethod[];
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
