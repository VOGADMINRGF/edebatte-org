import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = process.cwd().replace(/\\/g, "/").endsWith("/apps/web")
  ? process.cwd()
  : resolve(process.cwd(), "apps/web");
const REPO_ROOT = resolve(WEB_ROOT, "../..");

function source(path: string) {
  return readFileSync(resolve(WEB_ROOT, "src", path), "utf8");
}

describe("Stripe B2C billing contract", () => {
  it("never trusts a client supplied price and resolves approved Stripe lookup keys server-side", () => {
    const helper = source("lib/server/billing/stripeB2c.ts");
    const route = source("app/api/billing/stripe/checkout/route.ts");
    expect(helper).toContain('lookupKey: "edebatte_plus_monthly"');
    expect(helper).toContain('lookupKey: "edebatte_pro_monthly"');
    expect(helper).toContain('body.set("line_items[0][price]", priceId)');
    expect(route).toContain('z.enum(["start", "pro"])');
    expect(route).not.toContain("amountCents");
  });

  it("provisions paid access only from signed, idempotent Stripe webhook events", () => {
    const webhook = source("app/api/billing/stripe/webhook/route.ts");
    expect(webhook).toContain("verifyStripeB2cWebhookSignature");
    expect(webhook).toContain("stripe_b2c_webhook_events");
    expect(webhook).toContain('eventType === "checkout.session.completed"');
    expect(webhook).toContain('eventType === "invoice.paid"');
    expect(webhook).toContain('"billing.status": "past_due"');
    expect(webhook).toContain('accessTier: "citizenBasic"');
  });

  it("blocks direct self-assignment of paid or privileged tiers", () => {
    const planRoute = source("app/api/account/plan/route.ts");
    expect(planRoute).toContain('parsed.data.planId !== "citizenBasic"');
    expect(planRoute).toContain('error: "checkout_required"');
  });

  it("keeps current public consumer prices aligned with Stripe", () => {
    const pricing = readFileSync(resolve(REPO_ROOT, "features/pricing/domain/helpers.ts"), "utf8");
    expect(pricing).toContain('titel: "eDebatte Free"');
    expect(pricing).toContain("preisMonat: 7.99");
    expect(pricing).toContain("preisMonat: 19.99");
  });
});
