import { NextRequest, NextResponse } from "next/server";
import { ObjectId, coreCol, piiCol } from "@core/db/triMongo";
import type { MembershipApplication } from "@core/memberships/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const { id: membershipId } = await params;
  if (typeof membershipId !== "string" || !ObjectId.isValid(membershipId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const Applications = await coreCol<MembershipApplication>("membership_applications");
  const Users = await coreCol("users");

  const application = await Applications.findOne({ _id: new ObjectId(membershipId) });
  if (!application) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (application.status !== "waiting_payment") {
    return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 409 });
  }

  const now = new Date();
  await Applications.updateOne(
    { _id: application._id },
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
    { _id: application.coreUserId },
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
    { userId: application.coreUserId },
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
