import { NextResponse, type NextRequest } from "next/server";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { ObjectId } from "@core/db/triMongo";
import { verifyPassword } from "@/utils/password";
import { logAuthEvent } from "@core/telemetry/authEvents";
import { ensureBasicPiiProfile } from "@core/pii/userProfileService";
import { ensureEnvSuperadminSeed } from "@/lib/server/auth/superadminSeed";
import { resolvePostLoginRedirect } from "@/features/auth/roleExperienceContract";
import { scheduleAuthEvent } from "../authEventScheduling";
import {
  applySessionCookies,
  CREDENTIAL_COLLECTION,
  CoreUserAuthSnapshot,
  issueTwoFactorChallenge,
  LOGIN_WINDOW_MS,
  normalizeIdentifier,
  PiiUserCredentials,
  resolveAvailableTwoFactorMethods,
  resolveTwoFactorMethod,
  sanitizeRedirect,
  sha256,
} from "../sharedAuth";
import { mailLocaleFromUser } from "@/utils/mailRenderer";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";
type LoginUser = CoreUserAuthSnapshot & { passwordHash?: string };

type LoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
  next?: string;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error, message: error }, { status });
}

function isAccountDisabled(user: Record<string, unknown>) {
  return Boolean((user as any).suspended || (user as any).suspendedAt || (user as any).disabledAt);
}

function maybeBackfillCredentials(
  user: LoginUser,
  credentials: PiiUserCredentials | null,
  identifier: string,
) {
  if (credentials || !user.email || !user.passwordHash) return;
  piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION).then((col) =>
    col.updateOne(
      { coreUserId: user._id },
      {
        $set: {
          email: user.email?.toLowerCase() ?? identifier,
          passwordHash: user.passwordHash,
        },
      },
      { upsert: true },
    ),
  );
}

function buildUserLookupQuery(identifier: string, rawIdentifier: string) {
  const normalizedRaw = rawIdentifier.trim();
  const orClauses: Record<string, string>[] = [{ email: identifier }];
  if (normalizedRaw) {
    orClauses.push(
      { name: normalizedRaw },
      { nickname: normalizedRaw },
      { "profile.nickname": normalizedRaw },
      { "profile.displayName": normalizedRaw },
    );
  }
  return { $or: orClauses };
}

async function findUserByCredentialsCoreId(
  usersCol: { findOne: (query: Record<string, unknown>) => Promise<LoginUser | null> },
  credentials: PiiUserCredentials | null,
) {
  if (!credentials?.coreUserId) return null;

  const direct = await usersCol.findOne({ _id: credentials.coreUserId as any });
  if (direct) return direct;

  const rawCoreId = credentials.coreUserId as unknown;
  if (typeof rawCoreId === "string" && ObjectId.isValid(rawCoreId)) {
    return usersCol.findOne({ _id: new ObjectId(rawCoreId) as any });
  }

  return null;
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const ipLimit = await rateLimitOrThrow(`login:ip:${ip}`, 10, LOGIN_WINDOW_MS, {
    salt: "auth",
  });
  if (!ipLimit.ok) {
    return errorResponse("rate_limited", 429);
  }

  const body = (await req.json().catch(() => ({}))) as LoginBody;
  const rawIdentifier = (body.identifier || body.email || "").trim();
  const identifier = normalizeIdentifier(rawIdentifier);
  const password = body.password?.trim();
  const requestedRedirect = body.next ? sanitizeRedirect(body.next) : null;

  if (!identifier || !password) {
    return errorResponse("invalid_input", 400);
  }

  // Dev/staging convenience: if SUPERADMIN_* is configured and the user tries to login as that email,
  // ensure the account exists before checking credentials.
  try {
    const superEmail = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
    if (superEmail && identifier === superEmail) {
      await ensureEnvSuperadminSeed();
    }
  } catch (err) {
    console.warn("[auth.login] ensureEnvSuperadminSeed failed");
  }

  const credsCol = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
  const usersCol = await coreCol<LoginUser>("users");

  const credentials = await credsCol.findOne({ email: identifier });
  const userFromCredentials = await findUserByCredentialsCoreId(usersCol, credentials);
  const user =
    userFromCredentials ||
    (await usersCol.findOne(buildUserLookupQuery(identifier, rawIdentifier))) ||
    null;

  if (!user || !(credentials?.passwordHash || user.passwordHash)) {
    await logAuthEvent("auth.login.failed", {
      meta: { reason: "not_found", ipHash: sha256(ip), userHash: credentials?.coreUserId ? sha256(String(credentials.coreUserId)) : null },
    });
    return errorResponse("invalid_credentials", 401);
  }

  if (isAccountDisabled(user as any)) {
    await logAuthEvent("auth.login.failed", {
      meta: { reason: "disabled", ipHash: sha256(ip), userHash: sha256(String(user._id)) },
    });
    return errorResponse("invalid_credentials", 401);
  }

  const perUser = await rateLimitOrThrow(`login:user:${String(user._id)}`, 8, LOGIN_WINDOW_MS, {
    salt: "auth-user",
  });
  if (!perUser.ok) {
    return errorResponse("rate_limited", 429);
  }

  const credentialsPasswordHash = credentials?.passwordHash ? String(credentials.passwordHash) : null;
  const userPasswordHash = user.passwordHash ? String(user.passwordHash) : null;

  let passwordOk = false;
  let validatedPasswordSource: "credentials" | "user" | null = null;

  if (credentialsPasswordHash) {
    passwordOk = await verifyPassword(password, credentialsPasswordHash);
    if (passwordOk) validatedPasswordSource = "credentials";
  }

  if (!passwordOk && userPasswordHash && (!credentialsPasswordHash || userPasswordHash !== credentialsPasswordHash)) {
    passwordOk = await verifyPassword(password, userPasswordHash);
    if (passwordOk) validatedPasswordSource = "user";
  }

  if (!passwordOk) {
    await logAuthEvent("auth.login.failed", {
      meta: { reason: "invalid_password", ipHash: sha256(ip), userHash: sha256(String(user._id)) },
    });
    return errorResponse("invalid_credentials", 401);
  }

  if (
    validatedPasswordSource === "user" &&
    credentials &&
    credentialsPasswordHash &&
    userPasswordHash &&
    credentialsPasswordHash !== userPasswordHash
  ) {
    const repairFilter = credentials._id
      ? { _id: credentials._id }
      : { email: credentials.email || identifier };
    try {
      await credsCol.updateOne(
        repairFilter,
        { $set: { passwordHash: userPasswordHash, updatedAt: new Date() } },
      );
    } catch {
      console.warn("[auth.login] failed to repair stale credentials password hash");
    }
  }

  maybeBackfillCredentials(user, credentials ?? null, identifier);
  ensureBasicPiiProfile(user._id, {
    email: user.email || credentials?.email || identifier,
    displayName: user.name || (user as any)?.profile?.displayName || null,
  }).catch(() => console.warn("[auth.login] failed to sync PII profile"));

  const twoFactorMethod = resolveTwoFactorMethod(credentials, user);
  const twoFactorEnabled = credentials?.twoFactorEnabled || user.verification?.twoFA?.enabled;
  const availableMethods = resolveAvailableTwoFactorMethods(credentials, user);
  const allowEmailFallback = availableMethods.includes("email");
  const redirectUrl = resolvePostLoginRedirect({
    requestedRedirect,
    roles: user.roles,
    primaryRole: user.role,
  });

  if (!twoFactorEnabled || !twoFactorMethod) {
    await applySessionCookies(user);
    scheduleAuthEvent("auth.login.success", {
      meta: { ipHash: sha256(ip), userHash: sha256(String(user._id)) },
    });
    return NextResponse.json({ ok: true, require2fa: false, redirectUrl, message: "login_success" });
  }

  const challengeResult = await issueTwoFactorChallenge({
    userId: user._id,
    method: twoFactorMethod,
    emailForCode: credentials?.email || user.email,
    purpose: "login_verify",
    redirectTo: redirectUrl,
    locale: mailLocaleFromUser(user),
  });
  if (!challengeResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: challengeResult.error,
        delivery: challengeResult.delivery,
      },
      { status: 503 },
    );
  }
  const { expiresAt } = challengeResult;

  return NextResponse.json({
    ok: true,
    require2fa: true,
    method: twoFactorMethod,
    availableMethods,
    expiresAt: expiresAt.toISOString(),
    redirectUrl,
    allowEmailFallback,
    message: "twofactor_required",
  });
}
