// apps/web/src/app/api/auth/totp/initiate/route.ts
export const runtime = "nodejs";

import { ObjectId } from "@core/db/triMongo";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol, piiCol } from "@core/db/db/triMongo";

import { publicHost } from "@/utils/publicOrigin";
import {
  CREDENTIAL_COLLECTION,
  type PiiUserCredentials,
} from "../../sharedAuth";
import { generateTotpSecret } from "../totpHelpers";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(_req: NextRequest) {
  try {
    const uid = await readCookie("u_id");
    console.log("[totp/initiate] session", { userId: uid });
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

    // Statt otplib: eigenes, sauberes Base32-Secret
    const secret = generateTotpSecret(); // ~160 Bit
    const issuer = encodeURIComponent("eDebatte");
    const label = encodeURIComponent(`${publicHost()}:${user.email}`);
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    const credentialsCol =
      await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
    const credentials = await credentialsCol.findOne({
      coreUserId: new ObjectId(uid),
    });
    if (!credentials) {
      return NextResponse.json(
        { ok: false, error: "CREDENTIALS_NOT_FOUND" },
        { status: 409 },
      );
    }

    if (credentials.otpSecret) {
      return NextResponse.json(
        { ok: false, error: "ALREADY_ENABLED" },
        { status: 409 },
      );
    }

    await credentialsCol.updateOne(
      { _id: credentials._id },
      {
        $set: {
          otpTempSecret: secret,
          updatedAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      ok: true,
      otpauth, // für QR
      secret, // optional falls Client QR generiert
      issuer: "eDebatte",
      label: `${publicHost()}:${user.email}`,
    });
  } catch (e: any) {
    console.error("TOTP initiate failed", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "TOTP_INIT_FAILED" },
      { status: 500 },
    );
  }
}
