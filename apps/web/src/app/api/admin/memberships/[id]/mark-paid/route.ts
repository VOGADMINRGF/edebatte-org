import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId, coreCol } from "@core/db/triMongo";
import type { MembershipApplication } from "@core/memberships/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<Response | null> {
  const jar = await cookies();
  if (jar.get("u_role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const membershipId = params?.id;
  if (!membershipId || !ObjectId.isValid(membershipId)) {
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
      },
    },
  );

  await Users.updateOne(
    { _id: application.coreUserId },
    {
      $set: {
        "membership.status": "active",
        "membership.activatedAt": now,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ ok: true });
}
