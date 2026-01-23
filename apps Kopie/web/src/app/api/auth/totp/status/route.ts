import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { getCookie } from "@/lib/http/typedCookies";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { CREDENTIAL_COLLECTION, type PiiUserCredentials } from "../../sharedAuth";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";

export const runtime = "nodejs";

async function readCookie(name: string): Promise<string | undefined> {
  const raw = await getCookie(name);
  return typeof raw === "string" ? raw : (raw as any)?.value;
}

export async function GET(_req: NextRequest) {
  try {
    const uid = await readCookie("u_id");
    if (!uid || !ObjectId.isValid(uid)) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const Users = await coreCol("users");
    const user = await Users.findOne(
      { _id: new ObjectId(uid) },
      { projection: { verification: 1, updatedAt: 1 } },
    );
    const credentialsCol = await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION);
    const credentials = await credentialsCol.findOne({ coreUserId: new ObjectId(uid) });

    const verification = ensureVerificationDefaults((user as any)?.verification);
    const twoFA = verification.twoFA ?? {};
    const enabled = Boolean(twoFA.enabled || credentials?.otpSecret);
    const method = (twoFA as any).method ?? (credentials?.twoFactorMethod ?? (enabled ? "totp" : null));
    const updatedAt = (twoFA as any).updatedAt ?? credentials?.updatedAt ?? user?.updatedAt ?? null;

    return NextResponse.json({
      ok: true,
      enabled,
      method,
      updatedAt,
      hasPending: Boolean(credentials?.otpTempSecret),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "STATUS_FAILED" }, { status: 500 });
  }
}
