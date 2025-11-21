import { env } from "@/utils/env";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getCol } from "@core/db/triMongo";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import { verifyPassword } from "@/utils/password"; // <— korrekt
import { rateLimit } from "@/utils/rateLimit";

const DAYS = Number(env.SESSION_TTL_DAYS ?? 7);

export async function POST(req: Request) {
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
    const rl = await rateLimit(`login:${ip}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    // Body enthält NUR Userdaten – ENV NIE aus dem Body lesen
    const { email, password } = await req.json().catch(() => ({} as any));
    if (!email || !password) {
      return NextResponse.json({ error: "email & password required" }, { status: 400 });
    }

    if (!env.JWT_SECRET) {
      return NextResponse.json({ error: "server misconfigured (JWT_SECRET)" }, { status: 500 });
    }

    const Users = await getCol("users");
    const u = await Users.findOne({ email: String(email).toLowerCase() });
    if (!u?.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(String(password), String(u.passwordHash));
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign({ t: "session", sub: String(u._id) }, env.JWT_SECRET, {
      expiresIn: `${DAYS}d`,
    });

    const verification = ensureVerificationDefaults(u.verification);
    const legacyTwoFA = u.verification?.twoFA?.enabled === true;
    const isVerified = verification.level !== "none" || legacyTwoFA;
    const role: string =
      (u.role as string) || (isVerified ? "verified" : "user");
    const hasLocation = !!(u.profile?.location || u.city || u.region);

    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DAYS * 24 * 3600,
    });
    res.cookies.set("u_id", String(u._id), { path: "/", sameSite: "lax" });
    res.cookies.set("u_role", role, { path: "/", sameSite: "lax" });
    res.cookies.set("u_verified", isVerified ? "1" : "0", { path: "/", sameSite: "lax" });
    res.cookies.set("u_loc", hasLocation ? "1" : "0", { path: "/", sameSite: "lax" });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
