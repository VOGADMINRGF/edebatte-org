import crypto from "crypto";
import { cookies } from "next/headers";
import { createSession } from "@/utils/session";
import { normalizeAccessTier } from "@/config/accessTiers";
import { getEngagementLevelFromXp, normalizeEngagementLevel } from "@/config/engagement";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";
import { piiCol } from "@core/db/triMongo";
import { mailFailureMetadata, sendMail } from "@/utils/mailer";
import { buildTwoFactorCodeMail } from "@/utils/emailTemplates";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import type { ObjectId } from "@core/db/triMongo";
import type { UserRole } from "@/types/user";

export { ensureVerificationDefaults };

export const CREDENTIAL_COLLECTION = "user_credentials" as const;
export const TWO_FA_COLLECTION = "twofactor_challenges" as const;
export const DEFAULT_REDIRECT = "/" as const;
export const TWO_FA_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const TWO_FACTOR_FALLBACK_COOKIE = "u_2fa_fallback" as const;

export type TwoFactorMethod = "email" | "otp" | "totp";
export type TwoFactorChallengePurpose = "login_verify" | "setup_fallback" | "recovery";
export type TwoFactorFallbackMode = "setup" | "recovery";

export type PiiUserCredentials = {
  _id?: ObjectId;
  coreUserId: ObjectId;
  email: string;
  passwordHash: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: TwoFactorMethod | null;
  otpSecret?: string | null;
  otpTempSecret?: string | null;
  identityEmailCodeHash?: string | null;
  identityEmailCodeExpiresAt?: Date | null;
  identityEmailCodeAttempts?: number | null;
  identityEmailCodeSentAt?: Date | null;
  recoveryCodes?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TwoFactorChallengeDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  method: TwoFactorMethod;
  purpose?: TwoFactorChallengePurpose;
  redirectTo?: string | null;
  codeHash?: string | null;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  status?: "pending" | "used" | "expired" | "superseded" | "user_missing";
  supersededAt?: Date;
  consumedAt?: Date;
};

export type CoreUserAuthSnapshot = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: Array<UserRole | { role?: string; subRole?: string; premium?: boolean }>;
  groups?: string[];
  accessTier?: string | null;
  b2cPlanId?: string | null;
  engagementXp?: number | null;
  stats?: {
    xp?: number | null;
    engagementLevel?: string | null;
    contributionCredits?: number | null;
  };
  usage?: {
    xp?: number | null;
    contributionCredits?: number | null;
  };
  vogMembershipStatus?: string | null;
  profile?: {
    displayName?: string | null;
    location?: string | null;
    locale?: string | null;
  } | null;
  settings?: {
    uiLocale?: string | null;
    preferredLocale?: string | null;
    readingLocale?: string | null;
  } | null;
  verification?: ReturnType<typeof ensureVerificationDefaults> & {
    twoFA?: { enabled?: boolean; method?: TwoFactorMethod | null; secret?: string | null };
  };
};

export function resolveAvailableTwoFactorMethods(
  creds?: PiiUserCredentials | null,
  user?: CoreUserAuthSnapshot | null,
): TwoFactorMethod[] {
  const methods = new Set<TwoFactorMethod>();
  const hasEmail = Boolean((creds?.email || user?.email || "").trim());
  const hasOtp = Boolean(
    (creds?.otpSecret || creds?.otpTempSecret || user?.verification?.twoFA?.secret || "")
      .toString()
      .trim(),
  );
  const resolvedMethod = resolveTwoFactorMethod(creds, user);

  if (hasOtp || resolvedMethod === "otp") {
    methods.add("otp");
  }
  if (hasEmail || resolvedMethod === "email") {
    methods.add("email");
  }

  return Array.from(methods);
}

export function normalizeIdentifier(raw?: string | null) {
  const v = (raw ?? "").trim();
  return v.toLowerCase();
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sanitizeRedirect(raw?: string | null) {
  if (!raw) return DEFAULT_REDIRECT;
  const normalized = normalizeInternalRedirectPath(raw);
  return normalized ?? DEFAULT_REDIRECT;
}

export function resolveTwoFactorMethod(
  creds?: PiiUserCredentials | null,
  user?: CoreUserAuthSnapshot | null,
): TwoFactorMethod | null {
  const method = creds?.twoFactorMethod || user?.verification?.twoFA?.method;
  if (!method) return null;
  return method === "totp" ? "otp" : method;
}

export async function issueTwoFactorChallenge(opts: {
  userId: ObjectId;
  method: TwoFactorMethod;
  emailForCode?: string | null;
  purpose?: TwoFactorChallengePurpose;
  redirectTo?: string | null;
  locale?: string | null;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_FA_WINDOW_MS);
  const challenge: TwoFactorChallengeDoc = {
    userId: opts.userId,
    method: opts.method,
    purpose: opts.purpose,
    redirectTo: opts.redirectTo ?? null,
    createdAt: now,
    expiresAt,
    attempts: 0,
    status: "pending",
  };

  if (opts.method === "email") {
    if (!opts.emailForCode) {
      return {
        ok: false as const,
        error: "email_unavailable" as const,
        delivery: null,
      };
    }
    const code = crypto.randomInt(100000, 999999).toString();
    challenge.codeHash = sha256(code);
    const mail = buildTwoFactorCodeMail({ code, locale: opts.locale });
    const mailResult = await sendMail({
      to: opts.emailForCode,
      mail,
      delivery: "required_delivery",
      tag: "two_factor_challenge",
    });
    if (!mailResult.ok) {
      return {
        ok: false as const,
        error: "mail_delivery_failed" as const,
        delivery: mailFailureMetadata(mailResult),
      };
    }
  }

  const col = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
  const { insertedId } = await col.insertOne(challenge);
  await setPendingTwoFactorCookie(String(insertedId));
  return { ok: true as const, expiresAt, challengeId: insertedId };
}

function normalizeUserRoles(
  roles?: Array<UserRole | { role?: string; subRole?: string; premium?: boolean } | string> | null,
): UserRole[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r: any) => (typeof r === "string" ? r : r?.role))
    .filter(Boolean) as UserRole[];
}

export async function setPendingTwoFactorCookie(id: string) {
  const jar = await cookies();
  jar.set({
    name: "pending_2fa",
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TWO_FA_WINDOW_MS / 1000),
  });
}

export async function clearPendingTwoFactorCookie() {
  const jar = await cookies();
  jar.set({
    name: "pending_2fa",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function setTwoFactorFallbackCookie(mode: TwoFactorFallbackMode) {
  const jar = await cookies();
  jar.set({
    name: TWO_FACTOR_FALLBACK_COOKIE,
    value: mode,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearTwoFactorFallbackCookie() {
  const jar = await cookies();
  jar.set({
    name: TWO_FACTOR_FALLBACK_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function applySessionCookies(
  user: CoreUserAuthSnapshot,
  opts?: { twoFactorAuthenticated?: boolean },
) {
  const cookieJar = await cookies();
  const verification = ensureVerificationDefaults(user.verification);
  const isVerified = verification.level !== "none";
  const hasLocation = !!(user.profile?.location || (user as any).city || (user as any).region);
  const normalizedRoles = normalizeUserRoles(user.roles);
  const primaryRole = user.role || normalizedRoles[0];
  const tier = normalizeAccessTier(
    user.accessTier || user.b2cPlanId || (user as any).tier || "citizenBasic",
  );
  const xp = user.engagementXp ?? user.stats?.xp ?? user.usage?.xp ?? 0;
  const engagementLevel = normalizeEngagementLevel(user.stats?.engagementLevel) || getEngagementLevelFromXp(xp);
  const groups = Array.isArray(user.groups) ? user.groups : [];

  const twoFactorAuthenticated = opts?.twoFactorAuthenticated ?? true;

  const rolesForSession = normalizedRoles.length ? normalizedRoles : primaryRole ? [primaryRole] : [];

  await createSession(String(user._id), rolesForSession, {
    twoFactorAuthenticated,
    session: {
      accessTier: tier,
      engagementLevel,
      b2cPlanId: user.b2cPlanId ?? tier,
      vogMembershipStatus: user.vogMembershipStatus ?? null,
    },
  });
  const secureCookie =
    process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  const baseOpts = {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: secureCookie,
  };
  cookieJar.set("u_id", String(user._id), baseOpts);
  if (primaryRole) cookieJar.set("u_role", primaryRole, baseOpts);
  cookieJar.set("u_verified", isVerified ? "1" : "0", baseOpts);
  cookieJar.set("u_tier", String(tier), baseOpts);
  if (groups.length) cookieJar.set("u_groups", groups.join(","), baseOpts);
  cookieJar.set("u_loc", hasLocation ? "1" : "0", baseOpts);
  cookieJar.set("u_2fa", twoFactorAuthenticated ? "1" : "0", baseOpts);
}
