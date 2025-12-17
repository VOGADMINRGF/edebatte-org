import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createSession } from "@/utils/session";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import type { ObjectId } from "@core/db/triMongo";
import type { UserRole } from "@/types/user";

export { ensureVerificationDefaults };

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
  roles?: Array<UserRole | { role?: string; subRole?: string; premium?: boolean }>;
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
  const tier = user.accessTier || (user as any).tier || null;
  const groups = Array.isArray(user.groups) ? user.groups : [];

  const twoFactorAuthenticated = opts?.twoFactorAuthenticated ?? true;

  const rolesForSession = normalizedRoles.length ? normalizedRoles : primaryRole ? [primaryRole] : [];

  await createSession(String(user._id), rolesForSession, {
    twoFactorAuthenticated,
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
  if (tier) cookieJar.set("u_tier", String(tier), baseOpts);
  if (groups.length) cookieJar.set("u_groups", groups.join(","), baseOpts);
  cookieJar.set("u_loc", hasLocation ? "1" : "0", baseOpts);
  cookieJar.set("u_2fa", twoFactorAuthenticated ? "1" : "0", baseOpts);
}
