import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET() {
  const jar = await cookies();
  let token = jar.get("csrf-token")?.value;
  if (!token) token = randomBytes(24).toString("hex");

  const res = NextResponse.json({ ok: true, token });
  res.cookies.set("csrf-token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,   // in dev ok; prod -> true mit HTTPS
    path: "/",
    maxAge: 60 * 60
  });
  res.headers.set("x-csrf-token", token);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
