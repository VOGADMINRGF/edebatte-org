import { NextResponse, type NextRequest } from "next/server";
import { coreCol, piiCol, ObjectId } from "@core/db/triMongo";
import { logAuthEvent } from "@core/telemetry/authEvents";
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

type VerifyBody = {
  code?: string | number;
  method?: TwoFactorMethod;
  next?: string;
};

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    const ipLimit = await rateLimitOrThrow(`2fa:ip:${ip}`, 12, CODE_WINDOW_MS, {
      salt: "auth",
    });
    if (!ipLimit.ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as VerifyBody;
    const method = body.method === "totp" ? "otp" : body.method;
    const redirectUrl = sanitizeRedirect(body.next);
    if (!method) {
      return NextResponse.json({ error: "method_required" }, { status: 400 });
    }

    const pendingId = req.cookies.get("pending_2fa")?.value;
    if (!pendingId || !ObjectId.isValid(pendingId)) {
      return NextResponse.json({ error: "challenge_missing" }, { status: 400 });
    }

    const challenges = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
    const challenge = await challenges.findOne({ _id: new ObjectId(pendingId) });
    if (!challenge) {
      await clearPendingTwoFactorCookie();
      return NextResponse.json({ error: "challenge_missing" }, { status: 400 });
    }

    if (challenge.expiresAt < new Date()) {
      await challenges.updateOne(
        { _id: challenge._id },
        { $set: { consumedAt: new Date(), status: "expired" } },
      );
      await clearPendingTwoFactorCookie();
      return NextResponse.json({ error: "challenge_expired" }, { status: 400 });
    }

    if (challenge.method !== method) {
      return NextResponse.json({ error: "method_mismatch" }, { status: 400 });
    }

    const userLimit = await rateLimitOrThrow(
      `2fa:user:${String(challenge.userId)}`,
      8,
      CODE_WINDOW_MS,
      { salt: "auth-user" },
    );
    if (!userLimit.ok) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
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
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    const codeStr =
      typeof body.code === "string" || typeof body.code === "number"
        ? String(body.code).trim()
        : "";
    if (!codeStr) {
      return NextResponse.json({ error: "code_required" }, { status: 400 });
    }

    let valid = false;
    if (method === "email") {
      const hashed = sha256(codeStr);
      valid = challenge.codeHash === hashed;
    } else {
      const secret = (credentials?.otpSecret || user.verification?.twoFA?.secret)?.toString().trim();
      if (!secret || secret.length < 6) {
        await challenges.deleteOne({ _id: challenge._id });
        await clearPendingTwoFactorCookie();
        return NextResponse.json({ error: "totp_not_setup" }, { status: 400 });
      }
      valid = verifyTotpToken(codeStr, secret);
    }

    if (!valid) {
      await challenges.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
      await logAuthEvent("auth.2fa.failed", {
        userId: String(challenge.userId),
        meta: { method, ipHash: sha256(ip) },
      });
      return NextResponse.json({ error: "invalid_code" }, { status: 401 });
    }

    const now = new Date();
    await challenges.updateOne(
      { _id: challenge._id },
      { $set: { consumedAt: now, status: "used" } },
    );
    await clearPendingTwoFactorCookie();
    await applySessionCookies(user);

    await logAuthEvent("auth.login.success", {
      userId: String(challenge.userId),
      meta: { ipHash: sha256(ip), via: method },
    });

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (err: any) {
    console.error("[verify-2fa] failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
