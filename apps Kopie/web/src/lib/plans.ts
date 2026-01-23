import prisma from "@/lib/db";

type Plan = {
  id: string;
  slug: string;
  name: string;
  type: string;
  monthlyPriceCents: number;
  features: Record<string, unknown>;
};

type Subscription = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  billingCycle: string;
  discountType: string;
  discountUntil: Date | null;
  plan?: Plan;
};

export async function getPlanForUser(userId: string): Promise<Plan | null> {
  const client = prisma as any;
  const sub = await client.subscription?.findFirst?.({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  return sub?.plan ?? null;
}

export async function upgradePlan(userId: string, targetPlanId: string): Promise<Subscription> {
  const client = prisma as any;
  const subscription = await client.subscription?.upsert?.({
    where: { userId },
    update: {
      planId: targetPlanId,
      status: "active",
      discountType: "NONE",
      discountUntil: null,
    },
    create: {
      userId,
      planId: targetPlanId,
      status: "active",
      billingCycle: "monthly",
      discountType: "NONE",
    },
    include: { plan: true },
  });

  if (!subscription) throw new Error("Subscription model not available on Prisma client");
  return subscription;
}

export async function downgradePlan(userId: string, targetPlanId: string): Promise<Subscription> {
  const client = prisma as any;
  const subscription = await client.subscription?.upsert?.({
    where: { userId },
    update: {
      planId: targetPlanId,
      status: "active",
    },
    create: {
      userId,
      planId: targetPlanId,
      status: "active",
      billingCycle: "monthly",
      discountType: "NONE",
    },
    include: { plan: true },
  });

  if (!subscription) throw new Error("Subscription model not available on Prisma client");
  return subscription;
}
