import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSession } from "@/utils/session";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import type { ObjectId } from "@core/db/triMongo";

export const CREDENTIAL_COLLECTION = "user_credentials" as const;
export const TWO_FA_COLLECTION = "twofactor_challenges" as const;
export const DEFAULT_REDIRECT = "/" as const;
export const TWO_FA_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export type TwoFactorMethod = "email" | "otp" | "totp";

export type PiiUserCredentials = {
  _id?: ObjectId;
  coreUserId: ObjectId;
  email: string;
  passwordHash: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: TwoFactorMethod | null;
  otpSecret?: string | null;
  otpTempSecret?: string | null;
  recoveryCodes?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TwoFactorChallengeDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  method: TwoFactorMethod;
  codeHash?: string | null;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
};

export type CoreUserAuthSnapshot = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  roles?: Array<string | { role?: string; subRole?: string; premium?: boolean }>;
  groups?: string[];
  accessTier?: string | null;
  b2cPlanId?: string | null;
  engagementXp?: number | null;
  vogMembershipStatus?: string | null;
  profile?: { displayName?: string | null; location?: string | null } | null;
  verification?: ReturnType<typeof ensureVerificationDefaults> & {
    twoFA?: { enabled?: boolean; method?: TwoFactorMethod | null; secret?: string | null };
  };
};

export function normalizeIdentifier(raw?: string | null) {
  const v = (raw ?? "").trim();
  return v.toLowerCase();
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sanitizeRedirect(raw?: string | null) {
  if (!raw) return DEFAULT_REDIRECT;
  try {
    const url = new URL(raw, "http://localhost");
    return url.pathname + url.search;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export function resolveTwoFactorMethod(
  creds?: PiiUserCredentials | null,
  user?: CoreUserAuthSnapshot | null,
): TwoFactorMethod | null {
  const method = creds?.twoFactorMethod || user?.verification?.twoFA?.method;
  if (!method) return null;
  return method === "totp" ? "otp" : method;
}

export function setPendingTwoFactorCookie(id: string) {
  cookies().set({
    name: "pending_2fa",
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(TWO_FA_WINDOW_MS / 1000),
  });
}

export function clearPendingTwoFactorCookie() {
  cookies().set({
    name: "pending_2fa",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function applySessionCookies(user: CoreUserAuthSnapshot) {
  const cookieJar = cookies();
  const verification = ensureVerificationDefaults(user.verification);
  const isVerified = verification.level !== "none";
  const hasLocation = !!(user.profile?.location || (user as any).city || (user as any).region);
  const primaryRole =
    user.role || (Array.isArray(user.roles) && typeof user.roles[0] === "string"
      ? user.roles[0]
      : (user.roles?.[0] as any)?.role);
  const tier = user.accessTier || (user as any).tier || null;
  const groups = Array.isArray(user.groups) ? user.groups : [];

  createSession(String(user._id), primaryRole ? [primaryRole] : []);
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
  if (tier) cookieJar.set("u_tier", String(tier), baseOpts);
  if (groups.length) cookieJar.set("u_groups", groups.join(","), baseOpts);
  cookieJar.set("u_loc", hasLocation ? "1" : "0", baseOpts);
}
