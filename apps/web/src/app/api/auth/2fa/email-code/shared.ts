import crypto from "crypto";
import { ObjectId } from "@core/db/triMongo";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { logAuthEvent } from "@core/telemetry/authEvents";
import { buildTwoFactorCodeMail } from "@/utils/emailTemplates";
import { mailLocaleFromUser } from "@/utils/mailRenderer";
import { mailFailureMetadata, sendMail } from "@/utils/mailer";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";
import { isDemoUser } from "@/lib/demo/demoAccess";
import {
  CREDENTIAL_COLLECTION,
  clearPendingTwoFactorCookie,
  clearTwoFactorFallbackCookie,
  CoreUserAuthSnapshot,
  PiiUserCredentials,
  sanitizeRedirect,
  setPendingTwoFactorCookie,
  setTwoFactorFallbackCookie,
  sha256,
  TWO_FA_COLLECTION,
  TWO_FA_WINDOW_MS,
  TwoFactorChallengeDoc,
  type TwoFactorChallengePurpose,
  type TwoFactorFallbackMode,
} from "../../sharedAuth";

export const TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS = 60;
export const TWO_FACTOR_EMAIL_CODE_LENGTH = 6;

export type TwoFactorEmailCodeContext = "setup" | "recovery";

function getDemoCode() {
  const raw = (process.env.VOG_DEMO_2FA_CODE || "").trim();
  if (/^\d{6}$/.test(raw)) return raw;
  return "123456";
}

function mapContextToPurpose(context: TwoFactorEmailCodeContext): TwoFactorChallengePurpose {
  return context === "recovery" ? "recovery" : "setup_fallback";
}

export async function loadTwoFactorUser(userId: string) {
  if (!ObjectId.isValid(userId)) return null;
  const users = await coreCol<CoreUserAuthSnapshot>("users");
  const creds = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
  const objectId = new ObjectId(userId);
  const [user, credentials] = await Promise.all([
    users.findOne({ _id: objectId }),
    creds.findOne({ coreUserId: objectId }),
  ]);
  if (!user) return null;
  const email = credentials?.email || user.email || null;
  const totpConfigured = Boolean(
    credentials?.otpSecret ||
      credentials?.twoFactorEnabled ||
      user.verification?.twoFA?.enabled ||
      user.verification?.twoFA?.secret,
  );
  return { objectId, user, credentials, email, totpConfigured };
}

export async function issueSetupEmailCode(params: {
  userId: string;
  ip: string;
  context: TwoFactorEmailCodeContext;
  next?: string | null;
}) {
  const { userId, ip, context, next } = params;
  const ipCooldown = await rateLimitOrThrow(
    `2fa:email-code:cooldown:ip:${ip}`,
    1,
    TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS * 1000,
    { salt: "auth" },
  );
  if (!ipCooldown.ok) {
    return {
      ok: false as const,
      error: "rate_limited",
      status: 429,
      retryAfterSeconds: TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS,
    };
  }

  const loaded = await loadTwoFactorUser(userId);
  if (!loaded) {
    return { ok: false as const, error: "unauthorized", status: 401 };
  }

  const { objectId, user, email, totpConfigured } = loaded;
  if (context === "setup" && totpConfigured) {
    return { ok: false as const, error: "email_fallback_not_allowed", status: 409 };
  }
  if (context === "recovery" && !totpConfigured) {
    return { ok: false as const, error: "recovery_not_available", status: 409 };
  }

  const userCooldown = await rateLimitOrThrow(
    `2fa:email-code:cooldown:user:${userId}`,
    1,
    TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS * 1000,
    { salt: "auth-user" },
  );
  if (!userCooldown.ok) {
    return {
      ok: false as const,
      error: "rate_limited",
      status: 429,
      retryAfterSeconds: TWO_FACTOR_EMAIL_RESEND_COOLDOWN_SECONDS,
    };
  }

  const userWindow = await rateLimitOrThrow(`2fa:email-code:user:${userId}`, 5, TWO_FA_WINDOW_MS, {
    salt: "auth-window",
  });
  if (!userWindow.ok) {
    return { ok: false as const, error: "rate_limited", status: 429, retryAfterSeconds: 60 };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_FA_WINDOW_MS);
  const normalizedNext = sanitizeRedirect(next);
  const demo = isDemoUser({ _id: objectId, email });
  const code = demo ? getDemoCode() : crypto.randomInt(100000, 999999).toString();
  const challenge: TwoFactorChallengeDoc = {
    userId: objectId,
    method: "email",
    purpose: mapContextToPurpose(context),
    redirectTo: normalizedNext,
    createdAt: now,
    expiresAt,
    attempts: 0,
    status: "pending",
    codeHash: sha256(code),
  };

  const challenges = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
  const { insertedId } = await challenges.insertOne(challenge);

  if (!email) {
    await challenges.updateOne(
      { _id: insertedId },
      { $set: { status: "superseded", supersededAt: new Date() } },
    );
    return {
      ok: false as const,
      error: "email_unavailable",
      status: 400,
    };
  }

  const mail = buildTwoFactorCodeMail({
    code,
    locale: mailLocaleFromUser(user),
  });
  const mailResult = await sendMail({
    to: email,
    mail,
    delivery: "required_delivery",
    tag: "two_factor_setup_code",
  });
  if (!mailResult.ok) {
    await challenges.updateOne(
      { _id: insertedId },
      { $set: { status: "superseded", supersededAt: new Date() } },
    );
    return {
      ok: false as const,
      error: "mail_delivery_failed",
      status: 503,
      delivery: mailFailureMetadata(mailResult),
    };
  }

  await setPendingTwoFactorCookie(String(insertedId));
  return {
    ok: true as const,
    expiresAt,
    message: "Wir haben dir einen Code per E-Mail gesendet, falls die Adresse bestätigt ist.",
  };
}

export async function verifySetupEmailCode(params: {
  userId: string;
  ip: string;
  code: string;
  next?: string | null;
  context: TwoFactorEmailCodeContext;
  pendingId?: string | null;
}) {
  const { userId, ip, code, next, context, pendingId } = params;
  const ipLimit = await rateLimitOrThrow(`2fa:verify:ip:${ip}`, 12, TWO_FA_WINDOW_MS, {
    salt: "auth",
  });
  if (!ipLimit.ok) {
    return { ok: false as const, error: "rate_limited", status: 429 };
  }

  if (!pendingId || !ObjectId.isValid(pendingId)) {
    return { ok: false as const, error: "challenge_missing", status: 400 };
  }

  const loaded = await loadTwoFactorUser(userId);
  if (!loaded) {
    await clearPendingTwoFactorCookie();
    await clearTwoFactorFallbackCookie();
    return { ok: false as const, error: "unauthorized", status: 401 };
  }

  const expectedPurpose = mapContextToPurpose(context);
  const challenges = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
  const challenge = await challenges.findOne({ _id: new ObjectId(pendingId) });
  if (!challenge || String(challenge.userId) !== String(loaded.objectId)) {
    await clearPendingTwoFactorCookie();
    return { ok: false as const, error: "challenge_missing", status: 400 };
  }

  if (challenge.expiresAt < new Date()) {
    await challenges.updateOne(
      { _id: challenge._id },
      { $set: { consumedAt: new Date(), status: "expired" } },
    );
    await clearPendingTwoFactorCookie();
    return { ok: false as const, error: "challenge_expired", status: 400 };
  }

  if (challenge.method !== "email" || challenge.purpose !== expectedPurpose) {
    return { ok: false as const, error: "method_mismatch", status: 400 };
  }

  const userLimit = await rateLimitOrThrow(`2fa:verify:user:${userId}`, 8, TWO_FA_WINDOW_MS, {
    salt: "auth-user",
  });
  if (!userLimit.ok) {
    return { ok: false as const, error: "rate_limited", status: 429 };
  }

  const demo = isDemoUser({ _id: loaded.objectId, email: loaded.email });
  const valid = demo
    ? code === getDemoCode()
    : Boolean(challenge.codeHash && challenge.codeHash === sha256(code));
  if (!valid) {
    await challenges.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
    await logAuthEvent("auth.2fa.failed", {
      meta: {
        userHash: sha256(String(loaded.objectId)),
        ipHash: sha256(ip),
        purpose: challenge.purpose,
      },
    });
    return { ok: false as const, error: "invalid_code", status: 401 };
  }

  const fallbackMode: TwoFactorFallbackMode = context === "recovery" ? "recovery" : "setup";
  await challenges.updateOne(
    { _id: challenge._id },
    { $set: { consumedAt: new Date(), status: "used" } },
  );
  await clearPendingTwoFactorCookie();
  await setTwoFactorFallbackCookie(fallbackMode);
  await logAuthEvent("auth.2fa.success", {
    meta: {
      userHash: sha256(String(loaded.objectId)),
      ipHash: sha256(ip),
      purpose: challenge.purpose,
      fallbackMode,
    },
  });

  return {
    ok: true as const,
    redirectUrl: sanitizeRedirect(next || challenge.redirectTo),
  };
}
