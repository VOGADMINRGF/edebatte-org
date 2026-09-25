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

  // Paid access is provisioned only after a verified billing-provider event.
  // This endpoint intentionally cannot self-assign premium, pro, staff or institutional tiers.
  if (parsed.data.planId !== "citizenBasic") {
    return NextResponse.json(
      { ok: false, error: "checkout_required", checkoutPath: "/pricing" },
      { status: 409 },
    );
  }

  const plan = getPlanConfig(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  const Users = await coreCol("users");
  const oid = new ObjectId(uid);
  const current = await Users.findOne(
    { _id: oid },
    { projection: { "billing.status": 1, "billing.stripeSubscriptionId": 1 } },
  );
  if (!current) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const stripeStatus = (current as any)?.billing?.status;
  const stripeSubscriptionId = (current as any)?.billing?.stripeSubscriptionId;
  if (
    typeof stripeSubscriptionId === "string" &&
    stripeSubscriptionId.startsWith("sub_") &&
    ["active", "trialing", "past_due"].includes(String(stripeStatus))
  ) {
    return NextResponse.json(
      { ok: false, error: "manage_subscription_in_stripe", portalPath: "/account/payment" },
      { status: 409 },
    );
  }

  const startingCredits = (plan.includedPerMonth?.level1 ?? 0) + (plan.includedPerMonth?.level2 ?? 0);
  const updateOps: Record<string, any> = {
    $set: {
      accessTier: plan.id,
      tier: plan.id,
      b2cPlanId: "basis",
      updatedAt: new Date(),
    },
  };
  if (startingCredits > 0) {
    updateOps.$max = { "usage.contributionCredits": startingCredits };
  }

  await Users.updateOne({ _id: oid }, updateOps);
  return NextResponse.json({ ok: true, planId: plan.id });
}
