import { NextRequest, NextResponse } from "next/server";
import { ObjectId, coreCol } from "@core/db/triMongo";
import type { MembershipApplication } from "@core/memberships/types";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const gate = await requireAdminOrResponse(request);
  if (gate instanceof Response) return gate;

  const { id: membershipId } = await params;
  if (typeof membershipId !== "string" || !ObjectId.isValid(membershipId)) {
    return NextResponse.json({ ok: false, error: "invalid_id" }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const reason = typeof payload?.reason === "string" ? payload.reason.slice(0, 240) : "admin_cancelled";

  const Applications = await coreCol<MembershipApplication>("membership_applications");
  const Users = await coreCol("users");

  const application = await Applications.findOne({ _id: new ObjectId(membershipId) });
  if (!application) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const now = new Date();
  await Applications.updateOne(
    { _id: application._id },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        cancelledReason: reason,
        updatedAt: now,
      },
    },
  );

  await Users.updateOne(
    { _id: application.coreUserId },
    {
      $set: {
        "membership.status": "household_locked",
        "membership.cancelledAt": now,
        "membership.cancelledReason": reason,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ ok: true });
}
