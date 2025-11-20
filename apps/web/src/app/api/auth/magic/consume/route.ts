import { ObjectId } from "@core/db/triMongo";
import { NextRequest, NextResponse } from "next/server";

import { getCol } from "@core/db/db/triMongo";
import { piiCol } from "@core/db/db/triMongo";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const email = url.searchParams.get("email") || "";
  const token = url.searchParams.get("token") || "";
  const next = url.searchParams.get("next") || "/";

  if (!email || !token)
    return NextResponse.json({ error: "bad_input" }, { status: 400 });

  const Tokens = await piiCol("tokens");
  const t = await Tokens.findOne({ type: "magic_login", email, token });
  if (!t || (t.expiresAt && new Date(t.expiresAt).getTime() < Date.now())) {
    return NextResponse.redirect(
      new URL(`/login?error=magic_expired`, url.origin),
    );
  }

  const Users = await getCol("users");
  const u = await Users.findOne({ _id: new ObjectId(String(t.userId)) });
  if (!u)
    return NextResponse.redirect(
      new URL(`/login?error=user_not_found`, url.origin),
    );

  // Token verbrauchen (one-shot)
  await Tokens.deleteOne({ _id: t._id });

  const res = NextResponse.redirect(new URL(next, url.origin));
  // Cookies setzen (kompatibel mit bestehendem Code)
  const opts = { path: "/", sameSite: "lax" as const }; // bewusst nicht httpOnly, damit Middleware/Client sie lesen kann
  res.cookies.set("u_id", String(u._id), opts);
  res.cookies.set("u_role", String(u.role || "user"), opts);
  res.cookies.set("u_verified", u.verifiedEmail ? "1" : "0", opts);
  if (u.name) res.cookies.set("u_name", String(u.name), opts);
  return res;
}
