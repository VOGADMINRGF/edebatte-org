// apps/web/src/app/api/auth/totp/initiate/route.ts
export const runtime = "nodejs";

import { ObjectId } from "@core/triMongo";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol } from "@core/db/triMongo";

import { authenticator } from "otplib";
import { publicHost } from "@/utils/publicOrigin";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(_req: NextRequest) {
  try {
    const uid = await readCookie("u_id");
    if (!uid || !ObjectId.isValid(uid)) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const Users = await coreCol("users");
    const user = await Users.findOne(
      { _id: new ObjectId(uid) },
      { projection: { email: 1 } },
    );
    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const secret = authenticator.generateSecret();
    const issuer = encodeURIComponent("VoiceOpenGov");
    const label = encodeURIComponent(`${publicHost()}:${user.email}`);
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    await Users.updateOne(
      { _id: new ObjectId(uid) },
      { $set: { "verification.twoFA.temp": secret, updatedAt: new Date() } },
    );

    return NextResponse.json({
      ok: true,
      otpauth, // für QR
      secret, // optional falls Client QR generiert
      issuer: "VoiceOpenGov",
      label: `${publicHost()}:${user.email}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "TOTP_INIT_FAILED" },
      { status: 500 },
    );
  }
}
