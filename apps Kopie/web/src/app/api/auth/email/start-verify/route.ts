import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCol, ObjectId } from "@core/db/triMongo";
import { createEmailVerificationToken } from "@core/auth/emailVerificationService";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import { sendMail } from "@/utils/mailer";
import { publicOrigin } from "@/utils/publicOrigin";
import { buildVerificationMail } from "@/utils/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const Users = await getCol("users");
  const user = await Users.findOne(
    { email },
    { projection: { _id: 1, emailVerified: 1, verifiedEmail: 1, name: 1, "profile.displayName": 1 } },
  );

  if (user?._id instanceof ObjectId) {
    const { rawToken } = await createEmailVerificationToken(user._id, email);
    await logIdentityEvent("identity_email_verify_start", {
      userId: String(user._id),
      meta: { email },
    });
    const origin = publicOrigin();
    const verifyUrl = `${origin.replace(/\/$/, "")}/register/verify-email?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
    const mail = buildVerificationMail({
      verifyUrl,
      displayName: (user.profile?.displayName || user.name) ?? null,
    });
    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }

  return NextResponse.json({ ok: true });
}
