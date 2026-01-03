import { NextResponse } from "next/server";
import { ResetRequestSchema } from "@/utils/authSchemas";
import { coreCol } from "@core/db/triMongo";
import { rateLimit } from "@/utils/rateLimit";
import { createToken } from "@/utils/tokens";
import { sendMail, resetEmailLink } from "@/utils/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { email } = ResetRequestSchema.parse(body);
  const email_lc = email.trim().toLowerCase();

  const rl = await rateLimit(`reset:${email_lc}`, 3, 10 * 60_000);
  if (!rl.ok)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const users = await coreCol("users");
  const user = await users.findOne({ $or: [{ email: email_lc }, { email_lc }] });
  // immer 200 zurückgeben, um User-Enumeration zu vermeiden
  if (!user) return NextResponse.json({ ok: true });

  const token = await createToken(String(user._id), "reset", 60); // 60 Minuten
  const link = resetEmailLink(token);

  await sendMail({
    to: email_lc,
    subject: "Passwort zurücksetzen",
    html: `<p>Passwort zurücksetzen: <a href="${link}">${link}</a></p>`,
    text: `Passwort zurücksetzen: ${link}`,
  });

  return NextResponse.json({ ok: true });
}
