import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import crypto from "node:crypto";
import { ObjectId, coreCol, piiCol } from "@core/db/triMongo";
import { getUserPaymentProfile } from "@core/db/pii/userPaymentProfiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(4).max(12),
});

const MAX_MICRO_TRANSFER_ATTEMPTS = 5;

function normalizeCode(value: string) {
  return value.replace(/\s+/g, "");
}

function hashCode(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const userId = jar.get("u_id")?.value;
  if (!userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const code = normalizeCode(parsed.data.code);
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  const Users = await coreCol("users");
  const userDoc = await Users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { membership: 1 } },
  );
  const membership = (userDoc as any)?.membership ?? null;
  const applicationId = membership?.applicationId ? String(membership.applicationId) : null;

  if (!applicationId || !ObjectId.isValid(applicationId)) {
    return NextResponse.json({ ok: false, error: "no_membership" }, { status: 404 });
  }

  if (membership?.status === "active") {
    return NextResponse.json({ ok: true, status: "already_active" });
  }

  const mandateStatus = membership?.paymentInfo?.mandateStatus ?? null;
  if (membership?.status !== "waiting_payment" || mandateStatus !== "pending_microtransfer") {
    return NextResponse.json({ ok: false, error: "not_pending" }, { status: 409 });
  }

  const paymentProfile = await getUserPaymentProfile(new ObjectId(userId));
  if (!paymentProfile?.microTransferHash || !paymentProfile.microTransferExpiresAt) {
    return NextResponse.json({ ok: false, error: "verification_unavailable" }, { status: 409 });
  }

  const attempts = paymentProfile.microTransferAttempts ?? 0;
  if (attempts >= MAX_MICRO_TRANSFER_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

  const expiresAt =
    paymentProfile.microTransferExpiresAt instanceof Date
      ? paymentProfile.microTransferExpiresAt
      : new Date(paymentProfile.microTransferExpiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }

  const hashed = hashCode(code);
  if (hashed !== paymentProfile.microTransferHash) {
    const Profiles = await piiCol("user_payment_profiles");
    await Profiles.updateOne(
      { userId: new ObjectId(userId) },
      { $set: { microTransferAttempts: attempts + 1 } },
    );
    return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
  }

  const now = new Date();
  const Applications = await coreCol("membership_applications");
  await Applications.updateOne(
    { _id: new ObjectId(applicationId), coreUserId: new ObjectId(userId) },
    {
      $set: {
        status: "active",
        firstPaidAt: now,
        updatedAt: now,
        "paymentInfo.firstPaidAt": now,
        "paymentInfo.mandateStatus": "active",
      },
    },
  );

  await Users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        "membership.status": "active",
        "membership.activatedAt": now,
        "membership.paymentInfo.mandateStatus": "active",
        "membership.paymentInfo.firstPaidAt": now,
        updatedAt: now,
      },
    },
  );

  const Profiles = await piiCol("user_payment_profiles");
  await Profiles.updateOne(
    { userId: new ObjectId(userId) },
    {
      $set: {
        microTransferVerifiedAt: now,
        microTransferHash: null,
        microTransferExpiresAt: null,
        microTransferAttempts: null,
      },
    },
  );

  return NextResponse.json({ ok: true });
}
