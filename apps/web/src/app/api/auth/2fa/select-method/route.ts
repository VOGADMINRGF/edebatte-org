import { NextResponse, type NextRequest } from "next/server";
import { coreCol, piiCol, ObjectId } from "@core/db/triMongo";
import { rateLimitOrThrow } from "@/utils/rateLimitHelpers";
import {
  CREDENTIAL_COLLECTION,
  CoreUserAuthSnapshot,
  issueTwoFactorChallenge,
  PiiUserCredentials,
  sanitizeRedirect,
  TWO_FA_COLLECTION,
  TWO_FA_WINDOW_MS,
  TwoFactorChallengeDoc,
  TwoFactorMethod,
} from "../../sharedAuth";
import { mailLocaleFromUser } from "@/utils/mailRenderer";

export const runtime = "nodejs";

type SelectMethodBody = {
  method?: TwoFactorMethod;
  next?: string;
};

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
    const ipLimit = await rateLimitOrThrow(`2fa:select:ip:${ip}`, 10, TWO_FA_WINDOW_MS, {
      salt: "auth",
    });
    if (!ipLimit.ok) {
      return errorResponse("rate_limited", 429);
    }

    const body = (await req.json().catch(() => ({}))) as SelectMethodBody;
    const method = body.method === "totp" ? "otp" : body.method;
    const requestedRedirect = body.next ? sanitizeRedirect(body.next) : null;
    if (method !== "email" && method !== "otp") {
      return errorResponse("method_required", 400);
    }

    const pendingId = req.cookies.get("pending_2fa")?.value;
    if (!pendingId || !ObjectId.isValid(pendingId)) {
      return errorResponse("challenge_missing", 400);
    }

    const challenges = await piiCol<TwoFactorChallengeDoc>(TWO_FA_COLLECTION);
    const existing = await challenges.findOne({ _id: new ObjectId(pendingId) });
    if (!existing) {
      return errorResponse("challenge_missing", 400);
    }
    if (existing.expiresAt < new Date()) {
      return errorResponse("challenge_expired", 400);
    }

    const users = await coreCol<CoreUserAuthSnapshot>("users");
    const creds = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
    const user = await users.findOne({ _id: existing.userId });
    const credentials = await creds.findOne({ coreUserId: existing.userId });
    if (!user) {
      return errorResponse("user_not_found", 404);
    }

    if (method === "email" && !(credentials?.email || user.email)) {
      return errorResponse("email_missing", 400);
    }
    if (
      method === "otp" &&
      !(credentials?.otpSecret || credentials?.otpTempSecret || user.verification?.twoFA?.secret)
    ) {
      return errorResponse("totp_not_setup", 400);
    }

    const challengeResult = await issueTwoFactorChallenge({
      userId: existing.userId,
      method,
      emailForCode: credentials?.email || user.email,
      purpose: existing.purpose ?? "login_verify",
      redirectTo: requestedRedirect ?? existing.redirectTo ?? null,
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

    await challenges.updateOne(
      { _id: existing._id },
      { $set: { supersededAt: new Date(), status: "superseded" } },
    );

    return NextResponse.json({
      ok: true,
      method,
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    console.error("[2fa.select-method] failed");
    return errorResponse("server_error", 500);
  }
}
