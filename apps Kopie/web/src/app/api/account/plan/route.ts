import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "@core/db/triMongo";
import { coreCol } from "@core/db/db/triMongo";
import { getPlanConfig } from "@/config/plans";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.string().min(1, "plan_required"),
});

export async function POST(req: NextRequest) {
  const session = await readSession();
  const uid = session?.uid ?? null;
  if (!uid || !ObjectId.isValid(uid)) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const plan = getPlanConfig(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  const Users = await coreCol("users");
  const oid = new ObjectId(uid);
  const startingCredits = (plan.includedPerMonth?.level1 ?? 0) + (plan.includedPerMonth?.level2 ?? 0);

  const updateOps: Record<string, any> = {
    $set: {
      accessTier: plan.id,
      tier: plan.id,
      b2cPlanId: plan.id,
      updatedAt: new Date(),
    },
  };
  if (startingCredits > 0) {
    updateOps.$max = { "usage.contributionCredits": startingCredits };
  }

  const { modifiedCount } = await Users.updateOne({ _id: oid }, updateOps);

  if (!modifiedCount) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, planId: plan.id });
}
