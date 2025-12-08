import { ObjectId, getCol } from "@core/db/triMongo";
import { DEFAULT_LOCALE, isSupportedLocale } from "@core/locale/locales";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import { getUserPaymentProfile } from "@core/db/pii/userPaymentProfiles";
import { getUserSignature } from "@core/db/pii/userSignatures";
import type { AccessTier } from "@features/pricing/types";
import type {
  AccountOverview,
  AccountProfile,
  AccountProfileUpdate,
  AccountSettingsUpdate,
  AccountStats,
  MembershipStatus,
  PricingTier,
  ProfilePublicFlags,
  ProfileTopTopic,
} from "./types";
import { TOPIC_CHOICES, TOPIC_LABEL_BY_KEY, type TopicKey } from "@features/interests/topics";
import { getEngagementLevel, swipesUntilNextCredit } from "@features/user/engagement";
import { getProfilePackageForAccessTier } from "./profilePackages";

const RESEARCH_XP_AWARD = 25;

export async function awardResearchXp(userId: string, _taskId?: string): Promise<void> {
  const oid = parseObjectId(userId);
  if (!oid) return;

  const Users = await getCol("users");
  await Users.updateOne(
    { _id: oid },
    {
      $inc: { "usage.xp": RESEARCH_XP_AWARD, "stats.xp": RESEARCH_XP_AWARD },
      $set: { updatedAt: new Date() },
    },
  );
}

type UserDoc = {
  _id: ObjectId;
  email?: string;
  name?: string;
  role?: string;
  roles?: Array<string | { role?: string; subRole?: string; premium?: boolean }>;
  activeRole?: number;
  premium?: boolean;
  accessTier?: AccessTier;
  b2cPlanId?: string | null;
  tier?: AccessTier;
  groups?: string[];
  profile?: {
    displayName?: string | null;
    locale?: string | null;
    headline?: string | null;
    bio?: string | null;
    avatarStyle?: "initials" | "abstract" | "emoji" | null;
    topTopics?: Array<{ key?: string; title?: string; statement?: string | null }>;
    publicFlags?: ProfilePublicFlags;
  };
  publicFlags?: ProfilePublicFlags;
  settings?: {
    preferredLocale?: string | null;
    newsletterOptIn?: boolean;
  };
  membership?: {
    status?: MembershipStatus;
  };
  usage?: {
    swipesThisMonth?: number;
    swipeCountTotal?: number;
    xp?: number;
    contributionCredits?: number;
    lastSwipeAt?: Date | string | null;
    remainingPosts?: {
      level1?: number;
      level2?: number;
    };
  };
  stats?: {
    swipesThisMonth?: number;
    swipeCountTotal?: number;
    xp?: number;
    contributionCredits?: number;
    lastSwipeAt?: Date | string | null;
    remainingPostsLevel1?: number;
    remainingPostsLevel2?: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  verifiedEmail?: boolean;
  emailVerified?: boolean;
  verification?: {
    level?: string;
    methods?: string[];
    lastVerifiedAt?: Date | null;
    preferredRegionCode?: string | null;
  };
};

export async function getAccountOverview(userId: string): Promise<AccountOverview | null> {
  const oid = parseObjectId(userId);
  if (!oid) return null;

  const Users = await getCol<UserDoc>("users");
  const doc = await Users.findOne(
    { _id: oid },
    {
      projection: {
        email: 1,
        name: 1,
        role: 1,
        roles: 1,
        activeRole: 1,
        premium: 1,
        accessTier: 1,
        tier: 1,
        b2cPlanId: 1,
        groups: 1,
        profile: 1,
        publicFlags: 1,
        settings: 1,
        membership: 1,
        usage: 1,
        stats: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1,
        verifiedEmail: 1,
        emailVerified: 1,
        verification: 1,
      },
    },
  );

  if (!doc) return null;

  const [paymentProfileDoc, signatureDoc] = await Promise.all([
    getUserPaymentProfile(doc._id),
    getUserSignature(doc._id),
  ]);

  const roles = deriveRoles(doc);
  const accessTier = deriveTier(doc);
  const groups = deriveGroups(doc, accessTier, roles);
  const preferredLocale = normalizeLocale(doc.settings?.preferredLocale ?? doc.profile?.locale);
  const stats = deriveStats(doc);
  const verification = ensureVerificationDefaults(doc.verification as any);
  const hasVogMembership = doc.membership?.status === "active";
  const profile = deriveProfile(doc);
  const profilePackage = getProfilePackageForAccessTier(accessTier);
  const membershipSnapshot = doc.membership
    ? {
        status: (doc.membership as any).status ?? "none",
        amountPerMonth: (doc.membership as any).amountPerMonth ?? null,
        rhythm: (doc.membership as any).rhythm ?? null,
        householdSize: (doc.membership as any).householdSize ?? null,
        peopleCount: (doc.membership as any).peopleCount ?? null,
        submittedAt: (doc.membership as any).submittedAt
          ? new Date((doc.membership as any).submittedAt).toISOString()
          : null,
        applicationId: (doc.membership as any).applicationId
          ? String((doc.membership as any).applicationId)
          : null,
        paymentMethod: (doc.membership as any).paymentMethod ?? null,
        paymentReference: (doc.membership as any).paymentReference ?? null,
        paymentInfo: (doc.membership as any).paymentInfo
          ? {
              method: (doc.membership as any).paymentInfo.method ?? "bank_transfer",
              reference: (doc.membership as any).paymentInfo.reference ?? "",
              bankRecipient: (doc.membership as any).paymentInfo.bankRecipient ?? "",
              bankIbanMasked: (doc.membership as any).paymentInfo.bankIbanMasked ?? "",
              bankBic: (doc.membership as any).paymentInfo.bankBic ?? null,
              bankName: (doc.membership as any).paymentInfo.bankName ?? null,
              accountMode: (doc.membership as any).paymentInfo.accountMode ?? null,
              mandateStatus: (doc.membership as any).paymentInfo.mandateStatus ?? null,
            }
          : null,
        edebatte: (doc.membership as any).edebatte
          ? {
              enabled: !!(doc.membership as any).edebatte.enabled,
              planKey: (doc.membership as any).edebatte.planKey ?? null,
              finalPricePerMonth: (doc.membership as any).edebatte.finalPricePerMonth ?? null,
              billingMode: (doc.membership as any).edebatte.billingMode ?? null,
              discountPercent: (doc.membership as any).edebatte.discountPercent ?? null,
            }
          : null,
      }
    : null;

  return {
    userId: String(doc._id),
    email: doc.email ?? "",
    displayName: deriveDisplayName(doc),
    profile,
    profilePackage,
    publicFlags: profile.publicFlags,
    topTopics: profile.topTopics,
    accessTier,
    planSlug: doc.b2cPlanId ?? accessTier ?? null,
    roles,
    groups,
    vogMembershipStatus: doc.membership?.status ?? "none",
    hasVogMembership,
    membershipSnapshot,
    pricingTier: derivePricingTier(doc, accessTier),
    stats,
    preferredLocale,
    newsletterOptIn: doc.settings?.newsletterOptIn ?? false,
    emailVerified: doc.verifiedEmail ?? doc.emailVerified ?? false,
    verificationLevel: verification.level,
    verificationMethods: verification.methods,
    paymentProfile: paymentProfileDoc
      ? {
          ibanMasked: paymentProfileDoc.ibanMasked,
          holderName: paymentProfileDoc.holderName,
          bic: paymentProfileDoc.bic ?? null,
        }
      : null,
    signature: signatureDoc
      ? {
          kind: signatureDoc.kind,
          storedAt: signatureDoc.storedAt instanceof Date
            ? signatureDoc.storedAt.toISOString()
            : new Date(signatureDoc.storedAt).toISOString(),
        }
      : null,
    createdAt: doc.createdAt ?? null,
    lastLoginAt: doc.lastLoginAt ?? doc.updatedAt ?? doc.createdAt ?? null,
  };
}

export async function updateAccountSettings(
  userId: string,
  patch: AccountSettingsUpdate,
): Promise<AccountOverview | null> {
  const oid = parseObjectId(userId);
  if (!oid) return null;

  const setOps: Record<string, any> = {};
  if (patch.displayName !== undefined) {
    const value = patch.displayName?.trim() || null;
    setOps["profile.displayName"] = value;
  }
  if (patch.preferredLocale !== undefined) {
    if (isSupportedLocale(patch.preferredLocale)) {
      setOps["settings.preferredLocale"] = patch.preferredLocale;
    }
  }
  if (typeof patch.newsletterOptIn === "boolean") {
    setOps["settings.newsletterOptIn"] = patch.newsletterOptIn;
  }

  if (Object.keys(setOps).length > 0) {
    setOps.updatedAt = new Date();
    const Users = await getCol("users");
    await Users.updateOne({ _id: oid }, { $set: setOps });
  }

  return getAccountOverview(userId);
}

export async function updateAccountProfile(
  userId: string,
  patch: AccountProfileUpdate,
): Promise<AccountOverview | null> {
  const oid = parseObjectId(userId);
  if (!oid) return null;

  const setOps: Record<string, any> = {};
  const unsetOps: Record<string, any> = {};

  if (patch.headline !== undefined) {
    const value = patch.headline?.trim() || null;
    setOps["profile.headline"] = value;
  }

  if (patch.bio !== undefined) {
    const value = patch.bio?.trim() || null;
    setOps["profile.bio"] = value;
  }

  if (patch.avatarStyle !== undefined) {
    setOps["profile.avatarStyle"] = patch.avatarStyle ?? null;
  }

  if (patch.topTopics !== undefined) {
    const topics = patch.topTopics === null ? [] : sanitizeTopTopics(patch.topTopics ?? []);
    setOps["profile.topTopics"] = topics;
  }

  if (patch.publicFlags !== undefined) {
    const flags = normalizePublicFlags(patch.publicFlags);
    if (Object.keys(flags).length > 0) {
      setOps["profile.publicFlags"] = flags;
      unsetOps.publicFlags = "";
    } else {
      unsetOps["profile.publicFlags"] = "";
      unsetOps.publicFlags = "";
    }
  }

  if (Object.keys(setOps).length > 0 || Object.keys(unsetOps).length > 0) {
    setOps.updatedAt = new Date();
    const Users = await getCol("users");
    await Users.updateOne({ _id: oid }, { $set: setOps, ...(Object.keys(unsetOps).length ? { $unset: unsetOps } : {}) });
  }

  return getAccountOverview(userId);
}

function parseObjectId(value: string) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

function normalizePublicFlags(flags?: ProfilePublicFlags | null): ProfilePublicFlags {
  if (!flags || typeof flags !== "object") return {};
  const result: ProfilePublicFlags = {};
  (
    ["showRealName", "showCity", "showJoinDate", "showEngagementLevel", "showStats"] as Array<
      keyof ProfilePublicFlags
    >
  ).forEach((key) => {
    if (typeof flags[key] === "boolean") {
      result[key] = flags[key];
    }
  });
  return result;
}

function deriveDisplayName(doc: UserDoc): string | null {
  return (
    doc.profile?.displayName?.trim() ||
    doc.name?.trim() ||
    doc.email?.split("@").shift() ||
    null
  );
}

function deriveRoles(doc: UserDoc): string[] {
  if (Array.isArray(doc.roles) && doc.roles.length > 0) {
    return doc.roles
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === "string") return entry;
        if (typeof entry.role === "string") return entry.role;
        return null;
      })
      .filter((role): role is string => typeof role === "string");
  }
  if (doc.role) return [doc.role];
  return ["user"];
}

function deriveProfile(doc: UserDoc): AccountProfile {
  return {
    headline: doc.profile?.headline?.trim() || null,
    bio: doc.profile?.bio?.trim() || null,
    avatarStyle: doc.profile?.avatarStyle ?? null,
    topTopics: sanitizeTopTopics(doc.profile?.topTopics ?? []),
    publicFlags: normalizePublicFlags(doc.profile?.publicFlags ?? doc.publicFlags),
  };
}

function deriveTier(doc: UserDoc): AccessTier {
  if (doc.accessTier) return doc.accessTier;
  if (doc.tier) return doc.tier;
  const roles = deriveRoles(doc);
  const adminRoles = ["admin", "superadmin", "moderator", "staff"];
  if (roles.some((role) => adminRoles.includes(role))) {
    return "staff";
  }
  return "citizenBasic";
}

function deriveGroups(doc: UserDoc, tier: AccessTier, roles: string[]): string[] {
  const groups = new Set<string>();
  if (Array.isArray(doc.groups)) {
    doc.groups.filter(Boolean).forEach((group) => groups.add(group));
  }
  groups.add(tier);
  roles.forEach((role) => {
    if (["admin", "superadmin"].includes(role)) {
      groups.add("admin");
      groups.add("staff");
    } else if (["moderator", "staff"].includes(role)) {
      groups.add("staff");
    } else if (role === "creator") {
      groups.add("creator");
    }
  });
  return Array.from(groups);
}

function sanitizeTopTopics(topics: unknown): ProfileTopTopic[] {
  if (!Array.isArray(topics)) return [];
  const result: ProfileTopTopic[] = [];
  const seen = new Set<TopicKey>();
  for (const entry of topics) {
    const topic = resolveTopic(entry);
    if (!topic || seen.has(topic.key)) continue;
    seen.add(topic.key);
    result.push(topic);
    if (result.length >= 3) break;
  }
  return result;
}

function resolveTopic(raw: unknown): ProfileTopTopic | null {
  if (!raw) return null;
  let key: TopicKey | null = null;
  let statement: string | null | undefined;

  if (typeof raw === "string") {
    key = matchTopicKey(raw);
  } else if (typeof raw === "object") {
    const anyRaw = raw as any;
    if (typeof anyRaw.key === "string") key = matchTopicKey(anyRaw.key);
    else if (typeof anyRaw.title === "string") key = matchTopicKey(anyRaw.title);
    if (typeof anyRaw.statement === "string") {
      const trimmed = anyRaw.statement.trim().slice(0, 140);
      statement = trimmed.length > 0 ? trimmed : null;
    }
  }

  if (!key) return null;
  const title = TOPIC_LABEL_BY_KEY[key];
  return {
    key,
    title: title ?? key,
    statement,
  };
}

function matchTopicKey(raw: string): TopicKey | null {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return null;
  const match = TOPIC_CHOICES.find(
    (topic) =>
      topic.key === normalized ||
      topic.label.toLowerCase() === normalized,
  );
  return match ? match.key : null;
}

function deriveStats(doc: UserDoc): AccountStats {
  const usage = doc.usage ?? {};
  const stats = doc.stats ?? {};
  const swipeCountTotal =
    usage.swipeCountTotal ??
    stats.swipeCountTotal ??
    0;
  const xp = usage.xp ?? stats.xp ?? 0;
  const contributionCredits =
    usage.contributionCredits ??
    stats.contributionCredits ??
    0;
  const rawLastSwipe = usage.lastSwipeAt ?? stats.lastSwipeAt ?? null;
  const lastSwipeAt =
    rawLastSwipe instanceof Date
      ? rawLastSwipe.toISOString()
      : typeof rawLastSwipe === "string"
        ? rawLastSwipe
        : null;
  return {
    swipesThisMonth: usage.swipesThisMonth ?? stats.swipesThisMonth ?? 0,
    remainingPostsLevel1: usage.remainingPosts?.level1 ?? stats.remainingPostsLevel1 ?? 0,
    remainingPostsLevel2: usage.remainingPosts?.level2 ?? stats.remainingPostsLevel2 ?? 0,
    swipeCountTotal,
    xp,
    contributionCredits,
    engagementLevel: getEngagementLevel(xp),
    nextCreditIn: swipesUntilNextCredit(swipeCountTotal),
    lastSwipeAt,
  };
}

function normalizeLocale(value?: string | null) {
  if (typeof value === "string" && isSupportedLocale(value)) return value;
  return DEFAULT_LOCALE;
}

function derivePricingTier(doc: UserDoc, tier: AccessTier): PricingTier {
  if (doc.membership?.status === "active" && tier === "citizenBasic") {
    return "citizenPremium";
  }
  if (tier === "citizenPremium") return "citizenPremium";
  if (tier === "institutionPremium") return "institutionPremium";
  if (tier === "institutionBasic") return "institutionBasic";
  if (tier === "citizenBasic") return "citizenBasic";
  if (tier === "staff") return "staff";
  return doc.premium ? "citizenPremium" : "free";
}
