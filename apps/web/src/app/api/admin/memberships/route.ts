import { NextRequest, NextResponse } from "next/server";
import { coreCol, ObjectId } from "@core/db/triMongo";
import type { MembershipApplication, MembershipStatus } from "@core/memberships/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MembershipRow = {
  id: string;
  userId: string;
  amountPerPeriod: number;
  rhythm: string;
  householdSize: number;
  status: MembershipStatus;
  createdAt: string | null;
};

export async function GET(_req: NextRequest) {
  const col = await coreCol<MembershipApplication>("membership_applications");
  const items = await col
    .find(
      {},
      {
        projection: {
          coreUserId: 1,
          amountPerPeriod: 1,
          rhythm: 1,
          householdSize: 1,
          status: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();

  const data: MembershipRow[] = items.map((m) => {
    const status = (m as any).status as MembershipStatus | undefined;
    return {
      id: String(m._id),
      userId: String(m.coreUserId),
      amountPerPeriod: m.amountPerPeriod,
      rhythm: m.rhythm,
      householdSize: m.householdSize,
      status: status ?? "pending",
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : null,
    };
  });

  return NextResponse.json({ ok: true, items: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const status = body?.status as string | undefined;
  if (!id || !ObjectId.isValid(id) || !status) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const col = await coreCol<MembershipApplication>("membership_applications");
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: status as MembershipStatus, updatedAt: new Date() } },
  );
  return NextResponse.json({ ok: true });
}
