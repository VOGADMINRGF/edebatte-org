import { NextResponse, type NextRequest } from "next/server";
import { coreCol, piiCol, ObjectId } from "@core/db/triMongo";
import { isDemoUser } from "@/lib/demo/demoAccess";
import { resolvePostLoginRedirect } from "@/features/auth/roleExperienceContract";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { scheduleAuthEvent } from "../authEventScheduling";
import {
  applySessionCookies,
  CREDENTIAL_COLLECTION,
  CoreUserAuthSnapshot,
  PiiUserCredentials,
  sanitizeRedirect,
  sha256,
  TWO_FA_COLLECTION,
  TWO_FA_WINDOW_MS,
  TwoFactorChallengeDoc,
  TwoFactorMethod,
  clearPendingTwoFactorCookie,
} from "../sharedAuth";
import { verifyTotpToken } from "../totp/totpHelpers";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";

export const runtime = "nodejs";

const CODE_WINDOW_MS = TWO_FA_WINDOW_MS;

function getDemoCode() {
  const raw = (process.env.VOG_DEMO_2FA_CODE || "").trim();
  if (/^\d{6}$/.test(raw)) return raw;
  return "123456";
}

type VerifyBody = {
  code?: string | number;
  method?: TwoFactorMethod;
  next?: string;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error, message: error }, { status });
}

async function existingSessionSuccess(
  req: NextRequest,
  requestedRedirect: string | null,
) {
  const sessionUser = await getSessionUser(req);
  if (
    !sessionUser?.sessionValid ||
    sessionUser.sessionTwoFactorAuthenticated !== true
  ) {
    return null;
  }

  await clearPendingTwoFactorCookie();
  const redirectUrl = resolvePostLoginRedirect({
    requestedRedirect,
    roles: sessionUser.roles,
    primaryRole: sessionUser.role,
  });

  return NextResponse.json({
    ok: true,
    idempotent: true,
    redirectUrl,
    message: "2fa_already_verified",
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    const ipLimit = await rateLimitOrThrow(`2fa:ip:${ip}`, 12, CODE_WINDOW_MS, {
      salt: "auth",
    });
    if (!ipLimit.ok) {
      return errorResponse("rate_limited", 429);
    }

    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const method = body.method === "totp" ? "otp" : body.method;
    const requestedRedirect = body.next ? sanitizeRedirect(body.next) : null;
    if (!method) {
      return errorResponse("method_required", 400);
    }

    const pendingId = req.cookies.get("pending_2fa")?.value;
    if (!pendingId || !ObjectId.isValid(pendingId)) {
      const replayResponse = await existingSessionSuccess(req, requestedRedirect);
      if (replayResponse) return replayResponse;
      return errorResponse("challenge_missing", 400);
    }

    const challenges = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
    const challenge = await challenges.findOne({ _id: new ObjectId(pendingId) });
    if (!challenge) {
      const replayResponse = await existingSessionSuccess(req, requestedRedirect);
      if (replayResponse) return replayResponse;
      await clearPendingTwoFactorCookie();
      return errorResponse("challenge_missing", 400);
    }

    if (challenge.method !== method) {
      return errorResponse("method_mismatch", 400);
    }

    if (challenge.status === "expired" || challenge.expiresAt < new Date()) {
      await challenges.updateOne(
        { _id: challenge._id },
        { $set: { consumedAt: new Date(), status: "expired" } },
      );
      await clearPendingTwoFactorCookie();
      return errorResponse("challenge_expired", 400);
    }

    if (
      challenge.consumedAt ||
      (challenge.status && challenge.status !== "pending")
    ) {
      const replayResponse = await existingSessionSuccess(req, requestedRedirect);
      if (replayResponse) return replayResponse;
      await clearPendingTwoFactorCookie();
      return errorResponse("challenge_missing", 400);
    }

    const userLimit = await rateLimitOrThrow(
      `2fa:user:${String(challenge.userId)}`,
      8,
      CODE_WINDOW_MS,
      { salt: "auth-user" },
    );
    if (!userLimit.ok) {
      return errorResponse("rate_limited", 429);
    }

    const users = await coreCol<CoreUserAuthSnapshot & { passwordHash?: string }>("users");
    const creds = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
    const user = await users.findOne({ _id: challenge.userId });
    const credentials = await creds.findOne({ coreUserId: challenge.userId });

    if (!user) {
      await challenges.updateOne(
        { _id: challenge._id },
        { $set: { consumedAt: new Date(), status: "user_missing" } },
      );
      await clearPendingTwoFactorCookie();
      return errorResponse("user_not_found", 404);
    }

    const codeStr =
      typeof body.code === "string" || typeof body.code === "number"
        ? String(body.code).trim()
        : "";
    if (!codeStr) {
      return errorResponse("code_required", 400);
    }

    const demo = isDemoUser({ _id: challenge.userId, email: credentials?.email || user.email });
    const demoCode = getDemoCode();

    let valid = false;
    if (demo && codeStr === demoCode) {
      valid = true;
    }

    if (!valid) {
      if (method === "email") {
        const hashed = sha256(codeStr);
        valid = challenge.codeHash === hashed;
      } else {
        const secret = (credentials?.otpSecret || user.verification?.twoFA?.secret)?.toString().trim();
        if (!secret || secret.length < 6) {
          await challenges.deleteOne({ _id: challenge._id });
          await clearPendingTwoFactorCookie();
          return errorResponse("totp_not_setup", 400);
        }
        valid = verifyTotpToken(codeStr, secret);
      }
    }

    if (!valid) {
      await challenges.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
      scheduleAuthEvent("auth.2fa.failed", {
        meta: { method, ipHash: sha256(ip), userHash: sha256(String(challenge.userId)) },
      });
      return errorResponse("invalid_code", 401);
    }

    const now = new Date();
    const consumeResult = await challenges.updateOne(
      {
        _id: challenge._id,
        consumedAt: { $exists: false },
        $or: [
          { status: "pending" },
          { status: { $exists: false } },
        ],
      },
      { $set: { consumedAt: now, status: "used" } },
    );
    if (consumeResult.matchedCount !== 1) {
      const replayResponse = await existingSessionSuccess(req, requestedRedirect);
      if (replayResponse) return replayResponse;
      await clearPendingTwoFactorCookie();
      return errorResponse("challenge_missing", 400);
    }

    await clearPendingTwoFactorCookie();
    await applySessionCookies(user);
    const redirectUrl = resolvePostLoginRedirect({
      requestedRedirect,
      roles: user.roles,
      primaryRole: user.role,
    });

    scheduleAuthEvent("auth.2fa.success", {
      meta: { method, ipHash: sha256(ip), userHash: sha256(String(challenge.userId)) },
    });
    scheduleAuthEvent("auth.login.success", {
      meta: { ipHash: sha256(ip), via: method, userHash: sha256(String(challenge.userId)) },
    });

    return NextResponse.json({ ok: true, redirectUrl, message: "2fa_success" });
  } catch (err: any) {
    console.error("[verify-2fa] failed");
    return errorResponse("server_error", 500);
  }
}
