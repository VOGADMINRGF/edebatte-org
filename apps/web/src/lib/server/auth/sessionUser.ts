import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ObjectId, getCol } from "@core/db/triMongo";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import type { SessionPayload } from "@/utils/session";
import { readSession, verifySessionToken } from "@/utils/session";
import type { UserRole } from "@/types/user";

export type SessionUser = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  profile?: {
    displayName?: string | null;
    locale?: string | null;
    publicLocation?: {
      city?: string | null;
      region?: string | null;
      countryCode?: string | null;
    } | null;
  } | null;
  settings?: {
    uiLocale?: string | null;
    preferredLocale?: string | null;
    readingLocale?: string | null;
  } | null;
  roles?: UserRole[] | null;
  role?: UserRole | null;
  accessTier?: string | null;
  b2cPlanId?: string | null;
  verification?: any;
  suspended?: boolean | null;
  suspendedAt?: Date | null;
  disabledAt?: Date | null;
  sessionRevokedAt?: Date | null;
  sessionTwoFactorAuthenticated?: boolean;
  sessionTwoFactorFallbackMode?: "setup" | "recovery" | null;
  sessionValid?: boolean;
};

function splitRoleTokens(value: unknown): string[] {
  if (typeof value !== "string") return [];
  // Support legacy/manual formats like "admin,superadmin".
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  const session = await readSessionPayload(req);
  const sessionUid = session?.uid && ObjectId.isValid(session.uid) ? session.uid : null;
  if (!sessionUid) return null;

  const payloadRoles =
    session && Array.isArray(session.roles) && session.roles.length > 0
      ? session.roles
      : session && (session as any)?.role
        ? [String((session as any).role)]
        : [];

  const users = await getCol<SessionUser>("users");
  const user = await users.findOne(
    { _id: new ObjectId(sessionUid) },
    {
      projection: {
        roles: 1,
        role: 1,
        email: 1,
        name: 1,
        profile: 1,
        settings: 1,
        accessTier: 1,
        b2cPlanId: 1,
        verification: 1,
        suspended: 1,
        suspendedAt: 1,
        disabledAt: 1,
        sessionRevokedAt: 1,
      },
    },
  );
  if (!user) return null;
  if ((user as any).suspended || (user as any).suspendedAt || (user as any).disabledAt) return null;
  if (isSessionRevoked(session?.iat ?? null, (user as any).sessionRevokedAt ?? null)) return null;

  const cookieTwoFactor =
    (req ? req.cookies.get("u_2fa")?.value : await readCookie("u_2fa")) ?? undefined;
  const sessionTwoFactorAuthenticated =
    session?.tfa ?? (cookieTwoFactor === "1" ? true : cookieTwoFactor === "0" ? false : undefined);
  const cookieTwoFactorFallback =
    (req ? req.cookies.get("u_2fa_fallback")?.value : await readCookie("u_2fa_fallback")) ?? undefined;
  const sessionTwoFactorFallbackMode =
    cookieTwoFactorFallback === "setup" || cookieTwoFactorFallback === "recovery"
      ? cookieTwoFactorFallback
      : null;

  // DB is source of truth for roles (session roles can be stale after role changes).
  const dbRoles = Array.isArray(user.roles)
    ? user.roles
        .flatMap((r: any) => (typeof r === "string" ? splitRoleTokens(r) : splitRoleTokens(r?.role)))
        .filter(Boolean)
    : splitRoleTokens(user.role);
  const normalizedRoles = dbRoles.length ? dbRoles : payloadRoles;

  const verificationDefaults = ensureVerificationDefaults((user as any).verification);
  const twoFA = (user as any)?.verification?.twoFA;
  const verification = twoFA ? { ...verificationDefaults, twoFA } : verificationDefaults;

  return {
    ...user,
    roles: normalizedRoles as UserRole[],
    verification,
    sessionTwoFactorAuthenticated,
    sessionTwoFactorFallbackMode,
    sessionValid: true,
  };
}

async function readSessionPayload(req?: NextRequest): Promise<SessionPayload | null> {
  if (req) {
    const token = req.cookies.get("session_token")?.value ?? req.cookies.get("session")?.value;
    if (!token) return null;
    return verifySessionToken(token);
  }
  return readSession();
}

function isSessionRevoked(sessionIssuedAt: number | null, sessionRevokedAt: Date | null) {
  if (!sessionIssuedAt || !sessionRevokedAt) return false;
  return sessionIssuedAt <= sessionRevokedAt.getTime();
}

async function readCookie(name: string): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(name)?.value ?? null;
  } catch {
    return null;
  }
}
