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
  roles?: UserRole[] | null;
  role?: UserRole | null;
  verification?: any;
  sessionTwoFactorAuthenticated?: boolean;
  sessionValid?: boolean;
};

export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  const session = await readSessionPayload(req);
  const sessionUid = session?.uid && ObjectId.isValid(session.uid) ? session.uid : null;
  const cookieUid = req ? req.cookies.get("u_id")?.value : await readCookie("u_id");
  const uid = sessionUid ?? (cookieUid && ObjectId.isValid(cookieUid) ? cookieUid : null);
  if (!uid) return null;

  const payloadRoles =
    session && Array.isArray(session.roles) && session.roles.length > 0
      ? session.roles
      : session && (session as any)?.role
        ? [String((session as any).role)]
        : [];

  const users = await getCol<SessionUser>("users");
  const user = await users.findOne(
    { _id: new ObjectId(uid) },
    { projection: { roles: 1, role: 1, email: 1, name: 1, verification: 1 } },
  );
  if (!user) return null;

  const cookieTwoFactor =
    (req ? req.cookies.get("u_2fa")?.value : await readCookie("u_2fa")) ?? undefined;
  const sessionTwoFactorAuthenticated =
    session?.tfa ?? (cookieTwoFactor === "1" ? true : cookieTwoFactor === "0" ? false : undefined);

  const normalizedRoles = payloadRoles.length
    ? payloadRoles
    : Array.isArray(user.roles)
      ? user.roles.map((r: any) => (typeof r === "string" ? r : r?.role)).filter(Boolean)
      : user.role
        ? [user.role]
        : [];

  const verificationDefaults = ensureVerificationDefaults((user as any).verification);
  const twoFA = (user as any)?.verification?.twoFA;
  const verification = twoFA ? { ...verificationDefaults, twoFA } : verificationDefaults;

  return {
    ...user,
    roles: normalizedRoles as UserRole[],
    verification,
    sessionTwoFactorAuthenticated,
    sessionValid: Boolean(sessionUid),
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

async function readCookie(name: string): Promise<string | null> {
  try {
    const jar = await cookies();
    return jar.get(name)?.value ?? null;
  } catch {
    return null;
  }
}
