import { NextResponse, type NextRequest } from "next/server";
import { authenticator } from "otplib";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { ObjectId } from "@core/db/triMongo";
import { rateLimit } from "@/utils/rateLimit";
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

export const runtime = "nodejs";

const CODE_WINDOW_MS = TWO_FA_WINDOW_MS;

type VerifyBody = {
  code?: string | number;
  method?: TwoFactorMethod;
  next?: string;
};

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const ipLimit = await rateLimit(`2fa:ip:${ip}`, 12, CODE_WINDOW_MS, { salt: "auth" });
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
    await challenges.deleteOne({ _id: challenge._id });
    await clearPendingTwoFactorCookie();
    return NextResponse.json({ error: "challenge_expired" }, { status: 400 });
  }

  if (challenge.method !== method) {
    return NextResponse.json({ error: "method_mismatch" }, { status: 400 });
  }

  const userLimit = await rateLimit(
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
    await challenges.deleteOne({ _id: challenge._id });
    await clearPendingTwoFactorCookie();
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (!body.code && body.code !== 0) {
    return NextResponse.json({ error: "code_required" }, { status: 400 });
  }

  let valid = false;
  if (method === "email") {
    const hashed = sha256(String(body.code).trim());
    valid = challenge.codeHash === hashed;
  } else {
    const secret = credentials?.otpSecret || user.verification?.twoFA?.secret;
    valid = secret ? authenticator.check(String(body.code), String(secret)) : false;
  }

  if (!valid) {
    await challenges.updateOne({ _id: challenge._id }, { $inc: { attempts: 1 } });
    await logAuthEvent("auth.2fa.failed", {
      userId: String(challenge.userId),
      meta: { method, ipHash: sha256(ip) },
    });
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  await challenges.deleteOne({ _id: challenge._id });
  await clearPendingTwoFactorCookie();
  await applySessionCookies(user);

  await logAuthEvent("auth.login.success", {
    userId: String(challenge.userId),
    meta: { ipHash: sha256(ip), via: method },
  });

  return NextResponse.json({ ok: true, redirectUrl });
}
