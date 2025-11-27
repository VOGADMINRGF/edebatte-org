import { prisma } from "@/lib/db";

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
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  return sub?.plan ?? null;
}

export async function upgradePlan(userId: string, targetPlanId: string): Promise<Subscription> {
  const subscription = await prisma.subscription.upsert({
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

  // TODO: Payment provider checkout hook
  return subscription;
}

export async function downgradePlan(userId: string, targetPlanId: string): Promise<Subscription> {
  const subscription = await prisma.subscription.upsert({
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

  // TODO: sync with billing + prorations
  return subscription;
}
