import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCol } from "@core/db/triMongo";
import { piiCol } from "@core/db/triMongo";
import { sendMail } from "@/utils/mailer";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email)
    return NextResponse.json({ error: "email_required" }, { status: 400 });

  const Users = await getCol("users");
  const user = await Users.findOne(
    { email: String(email).toLowerCase() },
    { projection: { _id: 1, email: 1 } },
  );

  // Privacy: immer OK antworten
  if (!user) return NextResponse.json({ ok: true });

  const Tokens = await piiCol("tokens");
  const token = crypto.randomBytes(24).toString("base64url");
  const now = new Date();
  const exp = new Date(now.getTime() + 1000 * 60 * 60 * 48); // 48h

  await Tokens.insertOne({
    type: "verify_email",
    userId: user._id,
    email: user.email,
    token,
    createdAt: now,
    expiresAt: exp,
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  const verifyUrl = new URL(
    `/verify?email=${encodeURIComponent(user.email)}&token=${token}`,
    base,
  ).toString();

  await sendMail({
    to: user.email,
    subject: "Bitte E-Mail verifizieren",
    html: `<p>Hallo,</p><p>bitte bestätige deine E-Mail:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Gültig bis: ${exp.toLocaleString()}</p>`,
  });

  return NextResponse.json({ ok: true, verifyUrl });
}
