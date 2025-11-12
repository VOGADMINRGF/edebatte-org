// apps/web/src/app/api/auth/totp/verify/route.ts
export const runtime = "nodejs";

import { ObjectId } from "@core/triMongo";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol } from "@core/db/triMongo";

import { authenticator } from "otplib";

// Helper: getCookie kann string oder { value } liefern
async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await readCookie("u_id");
    if (!uid || !ObjectId.isValid(uid)) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { code } = (await req.json().catch(() => ({}))) as {
      code?: string | number;
    };
    if (!code && code !== 0) {
      return NextResponse.json(
        { ok: false, error: "CODE_REQUIRED" },
        { status: 400 },
      );
    }

    const Users = await coreCol("users");
    const user = await Users.findOne(
      { _id: new ObjectId(uid) },
      { projection: { verification: 1, role: 1, email: 1 } },
    );

    const secret = user?.verification?.twoFA?.temp;
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "NO_PENDING_2FA" },
        { status: 400 },
      );
    }

    const isValid = authenticator.check(String(code), String(secret));
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CODE" },
        { status: 400 },
      );
    }

    // Erfolgreich: 2FA aktivieren, secret final speichern und temp entfernen
    await Users.updateOne(
      { _id: new ObjectId(uid) },
      {
        $set: {
          "verification.twoFA.enabled": true,
          "verification.twoFA.method": "totp",
          "verification.twoFA.secret": secret, // final übernehmen
          role: "verified",
          updatedAt: new Date(),
        },
        $unset: { "verification.twoFA.temp": "" },
      },
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set("u_role", "verified", { path: "/", sameSite: "lax" });
    res.cookies.set("u_verified", "1", { path: "/", sameSite: "lax" });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "TOTP_VERIFY_FAILED" },
      { status: 500 },
    );
  }
}
