import "server-only";

import { ObjectId, getCol } from "@core/db/triMongo";
import { resolveStripeB2cPlan, type StripeB2cPlanId } from "@/lib/server/billing/stripeB2c";

export type B2cEntitlementSource = "direct" | "vog";

type SourceState = {
  planId?: StripeB2cPlanId;
  status?: string;
  customerId?: string;
  subscriptionId?: string;
  updatedAt?: Date;
};

type UserBillingShape = {
  provider?: string;
  status?: string;
  planId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  entitlements?: {
    direct?: SourceState;
    vog?: SourceState;
  };
};

type UserShape = {
  _id: ObjectId;
  accessTier?: string;
  tier?: string;
  b2cPlanId?: string;
  billing?: UserBillingShape;
};

const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

function planRank(planId: string | undefined) {
  if (planId === "pro") return 2;
  if (planId === "start") return 1;
  return 0;
}

function normalizedSourceState(value: SourceState | undefined) {
  if (!value || (value.planId !== "start" && value.planId !== "pro") || !value.status) return null;
  return value as Required<Pick<SourceState, "planId" | "status">> & SourceState;
}

function effectiveSource(user: UserShape) {
  const direct = normalizedSourceState(user.billing?.entitlements?.direct);
  const vog = normalizedSourceState(user.billing?.entitlements?.vog);
  const candidates = [
    direct && ENTITLED_STATUSES.has(direct.status) ? { source: "direct" as const, state: direct } : null,
    vog && ENTITLED_STATUSES.has(vog.status) ? { source: "vog" as const, state: vog } : null,
  ].filter(Boolean) as Array<{ source: B2cEntitlementSource; state: Required<Pick<SourceState, "planId" | "status">> & SourceState }>;

  candidates.sort((left, right) => {
    const rankDiff = planRank(right.state.planId) - planRank(left.state.planId);
    if (rankDiff !== 0) return rankDiff;
    return left.source === "direct" ? -1 : 1;
  });
  return candidates[0] ?? null;
}

function legacyDirectState(user: UserShape): SourceState | null {
  if (user.billing?.entitlements) return null;
  if (user.billing?.provider !== "stripe") return null;
  if (user.b2cPlanId !== "start" && user.b2cPlanId !== "pro") return null;
  return {
    planId: user.b2cPlanId,
    status: user.billing.status || "active",
    customerId: user.billing.stripeCustomerId,
    subscriptionId: user.billing.stripeSubscriptionId,
    updatedAt: new Date(),
  };
}

export async function setB2cEntitlementSource(input: {
  userId: ObjectId;
  source: B2cEntitlementSource;
  planId: StripeB2cPlanId;
  status: string;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const users = await getCol<UserShape>("users");
  const before = await users.findOne({ _id: input.userId });
  if (!before) return null;

  const now = new Date();
  const sourcePrefix = `billing.entitlements.${input.source}`;
  const set: Record<string, unknown> = {
    "billing.provider": "stripe",
    "billing.updatedAt": now,
    [`${sourcePrefix}.planId`]: input.planId,
    [`${sourcePrefix}.status`]: input.status,
    [`${sourcePrefix}.updatedAt`]: now,
  };
  if (input.customerId) set[`${sourcePrefix}.customerId`] = input.customerId;
  if (input.subscriptionId) set[`${sourcePrefix}.subscriptionId`] = input.subscriptionId;

  const legacy = input.source === "vog" ? legacyDirectState(before) : null;
  if (legacy?.planId && legacy.status) {
    set["billing.entitlements.direct.planId"] = legacy.planId;
    set["billing.entitlements.direct.status"] = legacy.status;
    set["billing.entitlements.direct.updatedAt"] = legacy.updatedAt || now;
    if (legacy.customerId) set["billing.entitlements.direct.customerId"] = legacy.customerId;
    if (legacy.subscriptionId) set["billing.entitlements.direct.subscriptionId"] = legacy.subscriptionId;
  }

  if (input.source === "direct") {
    if (input.customerId) set["billing.stripeCustomerId"] = input.customerId;
    if (input.subscriptionId) set["billing.stripeSubscriptionId"] = input.subscriptionId;
  } else {
    if (input.customerId) set["billing.vogStripeCustomerId"] = input.customerId;
    if (input.subscriptionId) set["billing.vogStripeSubscriptionId"] = input.subscriptionId;
  }

  await users.updateOne({ _id: input.userId }, { $set: set });
  const after = await users.findOne({ _id: input.userId });
  if (!after) return null;

  const effective = effectiveSource(after);
  if (!effective) {
    await users.updateOne(
      { _id: input.userId },
      {
        $set: {
          accessTier: "citizenBasic",
          tier: "citizenBasic",
          b2cPlanId: "basis",
          "billing.status": input.status,
          "billing.planId": "basis",
          "billing.entitlementSource": "none",
          "billing.updatedAt": now,
        },
      },
    );
    return { planId: "basis" as const, source: "none" as const };
  }

  const plan = resolveStripeB2cPlan(effective.state.planId);
  await users.updateOne(
    { _id: input.userId },
    {
      $set: {
        accessTier: plan.accessTier,
        tier: plan.accessTier,
        b2cPlanId: effective.state.planId,
        "billing.status": effective.state.status,
        "billing.planId": effective.state.planId,
        "billing.entitlementSource": effective.source,
        "billing.updatedAt": now,
      },
      $max: { "usage.contributionCredits": plan.minimumCredits },
    },
  );
  return { planId: effective.state.planId, source: effective.source };
}
