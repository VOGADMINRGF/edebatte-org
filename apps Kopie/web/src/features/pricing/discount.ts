import type { BillingInterval } from "@/config/pricing";
import { MEMBER_DISCOUNT } from "@/config/pricing";

export type VogMembershipSnapshot = {
  status: "active" | "cancelled" | "paused";
  monthlyAmountEUR: number;
  minTermMonths: number;
  startedAt: Date | string;
  discountUsed: boolean;
};

export type VogDiscountContext = {
  membership?: VogMembershipSnapshot | null;
  billingInterval: BillingInterval;
  monthsSinceStart?: number;
  preview?: boolean;
};

export function canApplyVogDiscount(context: VogDiscountContext): boolean {
  const { membership, billingInterval, monthsSinceStart = 0, preview } = context;
  if (preview) {
    return billingInterval === "month";
  }
  if (!membership || billingInterval !== "month") return false;
  if (membership.status !== "active") return false;
  if (membership.discountUsed) return false;
  if (!Number.isFinite(membership.monthlyAmountEUR)) return false;
  if (!Number.isFinite(membership.minTermMonths)) return false;
  if (membership.monthlyAmountEUR < 5.63) return false;
  if (membership.minTermMonths < 24) return false;
  if (monthsSinceStart >= 6) return false;
  return true;
}

// E150 Part03 – Mitgliedsrabatt für eDebatte-Produkte
// Preise werden auf Cents gerundet, um Brüche in Zahlungsflüssen zu vermeiden.
export function applyVogMembershipDiscount(
  priceCents: number,
  context: VogDiscountContext | boolean,
): number {
  const normalized = Number.isFinite(priceCents) ? priceCents : 0;
  if (normalized <= 0) return normalized;

  const resolvedContext:
    | VogDiscountContext
    | { membership?: VogMembershipSnapshot | null; billingInterval: BillingInterval } =
    typeof context === "boolean"
      ? { billingInterval: "month", preview: context }
      : context;

  if (!canApplyVogDiscount(resolvedContext)) return normalized;
  const factor = 1 - MEMBER_DISCOUNT.percent / 100;
  return Math.round(normalized * factor);
}

export type PricingContext = {
  hasVogMembership: boolean;
};
