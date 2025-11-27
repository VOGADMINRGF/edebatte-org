import { NextResponse } from "next/server";
export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const c of ["session", "session_token", "pending_2fa", "u_id", "u_role", "u_verified", "u_loc", "u_tier", "u_groups"]) {
    res.cookies.set(c, "", { path: "/", maxAge: 0 });
  }
  return res;
}
