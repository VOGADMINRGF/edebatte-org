import { ObjectId, getCol } from "@core/db/triMongo";
import { DEFAULT_LOCALE, isSupportedLocale } from "@core/locale/locales";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import { getUserPaymentProfile } from "@core/db/pii/userPaymentProfiles";
import { getUserSignature } from "@core/db/pii/userSignatures";
import type { AccessTier } from "@features/pricing/types";
import type {
  AccountOverview,
  AccountSettingsUpdate,
  AccountStats,
  MembershipStatus,
  PricingTier,
} from "./types";

type UserDoc = {
  _id: ObjectId;
  email?: string;
  name?: string;
  role?: string;
  roles?: Array<string | { role?: string; subRole?: string; premium?: boolean }>;
  activeRole?: number;
  premium?: boolean;
  accessTier?: AccessTier;
  tier?: AccessTier;
  groups?: string[];
  profile?: {
    displayName?: string | null;
    locale?: string | null;
  };
  settings?: {
    preferredLocale?: string | null;
    newsletterOptIn?: boolean;
  };
  membership?: {
    status?: MembershipStatus;
  };
  usage?: {
    swipesThisMonth?: number;
    remainingPosts?: {
      level1?: number;
      level2?: number;
    };
  };
  stats?: {
    swipesThisMonth?: number;
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
        groups: 1,
        profile: 1,
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
  const verification = ensureVerificationDefaults(doc.verification);

  return {
    userId: String(doc._id),
    email: doc.email ?? "",
    displayName: deriveDisplayName(doc),
    accessTier,
    roles,
    groups,
    vogMembershipStatus: doc.membership?.status ?? "none",
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

function parseObjectId(value: string) {
  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
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

function deriveStats(doc: UserDoc): AccountStats {
  const usage = doc.usage ?? {};
  const stats = doc.stats ?? {};
  return {
    swipesThisMonth: usage.swipesThisMonth ?? stats.swipesThisMonth ?? 0,
    remainingPostsLevel1: usage.remainingPosts?.level1 ?? stats.remainingPostsLevel1 ?? 0,
    remainingPostsLevel2: usage.remainingPosts?.level2 ?? stats.remainingPostsLevel2 ?? 0,
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
  if (["citizenPremium", "institutionPremium"].includes(tier)) {
    return tier;
  }
  if (["institutionBasic", "institutionPremium"].includes(tier)) {
    return tier as PricingTier;
  }
  if (tier === "staff") return "staff";
  return doc.premium ? "citizenPremium" : tier ?? "free";
}
