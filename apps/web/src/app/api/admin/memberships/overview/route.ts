import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { coreCol } from "@core/db/triMongo";
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

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  const Applications = await coreCol<MembershipApplication>("membership_applications");

  const [activeCount, waitingPaymentCount, cancelledLast30] = await Promise.all([
    Applications.countDocuments({ status: "active" }),
    Applications.countDocuments({ status: "waiting_payment" }),
    Applications.countDocuments({
      status: "cancelled",
      cancelledAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  const activeVolumeAgg = await Applications
    .aggregate([
      { $match: { status: "active", membershipAmountPerMonth: { $exists: true } } },
      {
        $group: {
          _id: null,
          total: { $sum: "$membershipAmountPerMonth" },
        },
      },
    ])
    .toArray();
  const totalMonthlyVolumeActive = activeVolumeAgg[0]?.total ?? 0;

  const waiting = await Applications
    .find(
      { status: "waiting_payment" },
      {
        projection: {
          coreUserId: 1,
          householdSize: 1,
          amountPerPeriod: 1,
          membershipAmountPerMonth: 1,
          rhythm: 1,
          paymentReference: 1,
          firstDueAt: 1,
          dunningLevel: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const recentRaw = await Applications.find(
    {},
    { projection: { _id: 1, status: 1, membershipAmountPerMonth: 1, updatedAt: 1 } },
  )
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();
  const recentEvents = recentRaw.map((doc) => ({
    membershipId: String(doc._id),
    type:
      doc.status === "active"
        ? "activated"
        : doc.status === "cancelled"
          ? "cancelled"
          : "created",
    amountPerMonth: doc.membershipAmountPerMonth ?? 0,
    timestamp: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  }));

  return NextResponse.json({
    ok: true,
    overview: {
      activeCount,
      waitingPaymentCount,
      cancelledLast30,
      totalMonthlyVolumeActive,
      waiting,
      recentEvents,
    },
  });
}
