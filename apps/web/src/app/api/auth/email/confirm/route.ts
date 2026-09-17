import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCol, ObjectId } from "@core/db/triMongo";
import { consumeEmailVerificationToken } from "@core/auth/emailVerificationService";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { applySessionCookies, ensureVerificationDefaults, type CoreUserAuthSnapshot } from "../../sharedAuth";
import { sendMail } from "@/utils/mailer";
import { buildAccountWelcomeMail } from "@/utils/emailTemplates";
import { publicOrigin } from "@/utils/publicOrigin";
import { mailLocaleFromUser } from "@/utils/mailRenderer";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(16),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const consumption = await consumeEmailVerificationToken(parsed.data.token);
  if (!consumption) {
    return NextResponse.json({ ok: false, error: "invalid_or_expired" }, { status: 410 });
  }

  const Users = await getCol("users");
  const user = await Users.findOne(
    { _id: new ObjectId(consumption.userId) },
    {
      projection: {
        role: 1,
        verification: 1,
        email: 1,
        name: 1,
        profile: 1,
        settings: 1,
      },
    },
  );
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const verification = ensureVerificationDefaults(consumption.verification ?? user.verification);
  const snapshot: CoreUserAuthSnapshot = {
    _id: user._id as ObjectId,
    role: user.role,
    roles: (user as any).roles,
    groups: (user as any).groups,
    accessTier: (user as any).accessTier,
    profile: (user as any).profile,
    verification: ensureVerificationDefaults(verification) as any,
  };
  await applySessionCookies(snapshot);

  await logIdentityEvent("identity_email_verify_confirm", {
    userId: String(consumption.userId),
  });

  if (user.email) {
    const origin = publicOrigin().replace(/\/$/, "");
    const displayName = (user as any)?.profile?.displayName || (user as any)?.name || null;
    const mail = buildAccountWelcomeMail({
      accountUrl: `${origin}/account`,
      identityUrl: `${origin}/register/identity`,
      displayName,
      locale: mailLocaleFromUser(user),
    });
    await sendMail({
      to: String(user.email),
      mail,
      delivery: "best_effort_delivery",
      tag: "account_welcome",
    });
  }

  const continuationTarget = normalizeInternalRedirectPath(consumption.continuationTarget);
  const next = continuationTarget
    ? `/register/identity?next=${encodeURIComponent(continuationTarget)}`
    : "/register/identity";

  return NextResponse.json({ ok: true, next });
}
