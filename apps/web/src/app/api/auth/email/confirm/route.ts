import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { env } from "@/utils/env";
import { getCol, ObjectId } from "@core/db/triMongo";
import { consumeEmailVerificationToken } from "@core/auth/emailVerificationService";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import { logIdentityEvent } from "@core/telemetry/identityEvents";

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
    { projection: { role: 1, verification: 1 } },
  );
  if (!user) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  if (!env.JWT_SECRET) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const verification = ensureVerificationDefaults(user.verification);
  const sessionToken = jwt.sign({ t: "session", sub: String(consumption.userId) }, env.JWT_SECRET, {
    expiresIn: `${Number(env.SESSION_TTL_DAYS ?? 7)}d`,
  });

  const res = NextResponse.json({ ok: true, next: "/register/identity" });
  res.cookies.set("session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Number(env.SESSION_TTL_DAYS ?? 7) * 24 * 3600,
  });
  res.cookies.set("u_id", String(consumption.userId), { path: "/", sameSite: "lax" });
  res.cookies.set("u_role", (user.role as string) || "verified", { path: "/", sameSite: "lax" });
  res.cookies.set("u_verified", verification.level !== "none" ? "1" : "0", {
    path: "/",
    sameSite: "lax",
  });
  await logIdentityEvent("identity_email_verify_confirm", {
    userId: String(consumption.userId),
  });

  return res;
}
