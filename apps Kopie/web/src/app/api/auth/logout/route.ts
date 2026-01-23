import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const url = new URL("/", req.url);
  const res = NextResponse.redirect(url);
  const base = { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
  for (const c of ["session", "session_token", "pending_2fa", "u_id", "u_role", "u_verified", "u_loc", "u_tier", "u_groups", "u_2fa"]) {
    res.cookies.set(c, "", base);
  }
  return res;
}
