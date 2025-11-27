import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { ObjectId } from "@core/db/triMongo";
import { rateLimit } from "@/utils/rateLimit";
import { verifyPassword } from "@/utils/password";
import { sendMail } from "@/utils/mailer";
import { buildTwoFactorCodeMail } from "@/utils/emailTemplates";
import { logAuthEvent } from "@core/telemetry/authEvents";
import {
  applySessionCookies,
  CREDENTIAL_COLLECTION,
  CoreUserAuthSnapshot,
  LOGIN_WINDOW_MS,
  normalizeIdentifier,
  PiiUserCredentials,
  resolveTwoFactorMethod,
  sanitizeRedirect,
  setPendingTwoFactorCookie,
  sha256,
  TWO_FA_COLLECTION,
  TWO_FA_WINDOW_MS,
  TwoFactorChallengeDoc,
  TwoFactorMethod,
} from "../sharedAuth";

export const runtime = "nodejs";

type LoginBody = {
  identifier?: string;
  email?: string;
  password?: string;
  next?: string;
};

async function issueTwoFactorChallenge(
  userId: ObjectId,
  method: TwoFactorMethod,
  emailForCode?: string | null,
): Promise<{ expiresAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TWO_FA_WINDOW_MS);
  const challenge: TwoFactorChallengeDoc = {
    userId,
    method,
    createdAt: now,
    expiresAt,
    attempts: 0,
  };

  if (method === "email") {
    const code = crypto.randomInt(100000, 999999).toString();
    challenge.codeHash = sha256(code);
    const mail = buildTwoFactorCodeMail({ code });
    if (emailForCode) {
      await sendMail({ to: emailForCode, subject: mail.subject, html: mail.html, text: mail.text });
    }
  }

  const col = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
  const { insertedId } = await col.insertOne(challenge);
  setPendingTwoFactorCookie(String(insertedId));

  return { expiresAt };
}

function maybeBackfillCredentials(
  user: CoreUserAuthSnapshot & { passwordHash?: string },
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

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const ipLimit = await rateLimit(`login:ip:${ip}`, 10, LOGIN_WINDOW_MS, { salt: "auth" });
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as LoginBody;
  const identifier = normalizeIdentifier(body.identifier || body.email);
  const password = body.password?.trim();
  const redirectUrl = sanitizeRedirect(body.next);

  if (!identifier || !password) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const credsCol = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
  const usersCol = await coreCol<CoreUserAuthSnapshot & { passwordHash?: string }>("users");

  const credentials = await credsCol.findOne({ email: identifier });
  const user =
    (credentials
      ? await usersCol.findOne({ _id: credentials.coreUserId })
      : await usersCol.findOne({
          $or: [
            { email: identifier },
            { name: body.identifier },
            { "profile.displayName": body.identifier },
          ],
        })) || null;

  if (!user || !(credentials?.passwordHash || user.passwordHash)) {
    await logAuthEvent("auth.login.failed", {
      meta: { reason: "not_found", ipHash: sha256(ip) },
    });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const perUser = await rateLimit(`login:user:${String(user._id)}`, 8, LOGIN_WINDOW_MS, {
    salt: "auth-user",
  });
  if (!perUser.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const passwordHash = credentials?.passwordHash || user.passwordHash;
  const passwordOk = passwordHash ? await verifyPassword(password, String(passwordHash)) : false;
  if (!passwordOk) {
    await logAuthEvent("auth.login.failed", {
      userId: String(user._id),
      meta: { reason: "invalid_password", ipHash: sha256(ip) },
    });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  maybeBackfillCredentials(user, credentials ?? null, identifier);

  const twoFactorMethod = resolveTwoFactorMethod(credentials, user);
  const twoFactorEnabled = credentials?.twoFactorEnabled || user.verification?.twoFA?.enabled;

  if (!twoFactorEnabled || !twoFactorMethod) {
    applySessionCookies(user);
    await logAuthEvent("auth.login.success", { userId: String(user._id), meta: { ipHash: sha256(ip) } });
    return NextResponse.json({ ok: true, require2fa: false, redirectUrl });
  }

  const { expiresAt } = await issueTwoFactorChallenge(
    user._id,
    twoFactorMethod,
    credentials?.email || user.email,
  );

  return NextResponse.json({
    ok: true,
    require2fa: true,
    method: twoFactorMethod,
    expiresAt: expiresAt.toISOString(),
    redirectUrl,
  });
}
