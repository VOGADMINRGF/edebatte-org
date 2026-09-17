import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCol, ObjectId } from "@core/db/triMongo";
import {
  createEmailVerificationToken,
  recordEmailVerificationDelivery,
} from "@core/auth/emailVerificationService";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { sendMail } from "@/utils/mailer";
import { publicOrigin } from "@/utils/publicOrigin";
import { buildVerificationMail } from "@/utils/emailTemplates";
import { mailLocaleFromUser } from "@/utils/mailRenderer";
import {
  beginPublicAuthMailControl,
  finishPublicAuthMailControl,
} from "@/utils/publicAuthMailControl";
import { normalizeInternalRedirectPath } from "@/features/create/finalizeRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  next: z.string().max(2048).optional(),
});

const PUBLIC_VERIFY_RESPONSE = { ok: true } as const;

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const continuationTarget = normalizeInternalRedirectPath(parsed.data.next) ?? null;
  const control = await beginPublicAuthMailControl(req, "verify", email);

  try {
    if (control.allowed) {
      const Users = await getCol("users");
      const user = await Users.findOne(
        { email },
        {
          projection: {
            _id: 1,
            emailVerified: 1,
            verifiedEmail: 1,
            name: 1,
            profile: 1,
            settings: 1,
          },
        },
      );

      if (user?._id instanceof ObjectId) {
        const { rawToken } = await createEmailVerificationToken(
          user._id,
          email,
          continuationTarget,
        );
        await logIdentityEvent("identity_email_verify_start", {
          userId: String(user._id),
          meta: { email },
        });
        const origin = publicOrigin();
        const verifyUrl = `${origin.replace(/\/$/, "")}/register/verify-email?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
        const mail = buildVerificationMail({
          verifyUrl,
          displayName: (user.profile?.displayName || user.name) ?? null,
          locale: mailLocaleFromUser(user),
        });
        const mailResult = await sendMail({
          to: email,
          mail,
          delivery: "required_delivery",
          tag: "verification_start",
        });
        await recordEmailVerificationDelivery(user._id, rawToken, mailResult);
      }
    }
  } catch (error) {
    console.error("[auth.email.start-verify] controlled_pipeline_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }

  await finishPublicAuthMailControl(control);
  return NextResponse.json(PUBLIC_VERIFY_RESPONSE);
}
