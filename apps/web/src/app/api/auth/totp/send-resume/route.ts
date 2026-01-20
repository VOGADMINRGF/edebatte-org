import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { sendMail } from "@/utils/mailer";
import { buildIdentityResumeMail } from "@/utils/emailTemplates";
import { publicOrigin } from "@/utils/publicOrigin";
import { incrementRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_MAX = 4;
const RATE_LIMIT_WINDOW = 15 * 60;

function sanitizeNext(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  return trimmed;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const attempts = await incrementRateLimit(`totp_resume:${String(user._id)}`, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const next = sanitizeNext(body?.next) ?? "/account?welcome=1";
  const origin = publicOrigin().replace(/\/$/, "");
  const resumeUrl = `${origin}/register/identity?next=${encodeURIComponent(next)}`;

  const mail = buildIdentityResumeMail({
    resumeUrl,
    displayName: user.name ?? null,
  });

  await sendMail({
    to: user.email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json({ ok: true });
}
