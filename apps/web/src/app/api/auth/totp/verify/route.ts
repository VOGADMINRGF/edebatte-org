// apps/web/src/app/api/auth/totp/verify/route.ts
export const runtime = "nodejs";

import { ObjectId } from "@core/db/triMongo";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol, piiCol } from "@core/db/db/triMongo";

import { ensureVerificationDefaults, upgradeVerificationLevel } from "@core/auth/verificationTypes";
import { logIdentityEvent } from "@core/telemetry/identityEvents";
import {
  applySessionCookies,
  CREDENTIAL_COLLECTION,
  type CoreUserAuthSnapshot,
  type PiiUserCredentials,
} from "../../sharedAuth";
import { verifyTotpToken } from "../totpHelpers";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await readCookie("u_id");
    console.log("[totp/verify] session", { userId: uid });
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

    const Users =
      await coreCol<CoreUserAuthSnapshot & { email?: string | null }>("users");
    const user = await Users.findOne(
      { _id: new ObjectId(uid) },
      {
        projection: {
          verification: 1,
          role: 1,
          roles: 1,
          groups: 1,
          accessTier: 1,
          profile: 1,
          email: 1,
        },
      },
    );

    const credentialsCol =
      await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
    const credentials = await credentialsCol.findOne({
      coreUserId: new ObjectId(uid),
    });
    const secret = credentials?.otpTempSecret;
    if (!secret || !user) {
      return NextResponse.json(
        { ok: false, error: "NO_PENDING_2FA" },
        { status: 400 },
      );
    }

    const isValid = verifyTotpToken(String(code), String(secret));
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "INVALID_CODE" },
        { status: 400 },
      );
    }

    // Erfolgreich: 2FA aktivieren, Secret final speichern und temp entfernen
    const verification = ensureVerificationDefaults(user.verification as any);
    const now = new Date();
    const methods = new Set<string>(verification.methods ?? []);
    methods.add("otp_app");
    const nextVerification: any = {
      ...verification,
      level: upgradeVerificationLevel(verification.level, "soft"),
      methods: Array.from(methods),
      lastVerifiedAt: now,
      twoFA: {
        ...(verification as any).twoFA,
        enabled: true,
        method: "totp",
      },
    };

    await Users.updateOne(
      { _id: new ObjectId(uid) },
      {
        $set: {
          verification: nextVerification,
          role: "verified",
          updatedAt: now,
        },
      },
    );

    await credentialsCol.updateOne(
      { _id: credentials._id },
      {
        $set: {
          otpSecret: secret,
          otpTempSecret: null,
          twoFactorEnabled: true,
          twoFactorMethod: "otp",
          updatedAt: now,
        },
      },
    );

    await logIdentityEvent("identity_totp_confirmed", { userId: uid });

    const sessionUser: CoreUserAuthSnapshot = {
      ...user,
      _id: new ObjectId(uid),
      verification: nextVerification,
      role: user.role ?? "verified",
    };
    applySessionCookies(sessionUser);

    return NextResponse.json({ ok: true, next: "/account" });
  } catch (e: any) {
    console.error("TOTP verify failed", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "TOTP_VERIFY_FAILED" },
      { status: 500 },
    );
  }
}
