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

  it("differentiates B2C tiers by convenience and intelligence instead of visible quantity quotas", () => {
    const pricing = readFileSync(resolve(REPO_ROOT, "features/pricing/domain/helpers.ts"), "utf8");
    const formatter = readFileSync(resolve(REPO_ROOT, "features/pricing/domain/formatters.ts"), "utf8");

    expect(pricing).toContain("Persönlicher Update-Feed");
    expect(pricing).toContain("Watchlists");
    expect(pricing).toContain("Voice-Briefings");
    expect(pricing).toContain("Vertiefte Vergleiche");
    expect(pricing).toContain("Arbeitsmappen");
    expect(pricing).toContain("beleggebundene Dossier-Ausarbeitung");
    expect(pricing).toContain('sekundarCtaHref: "https://voiceopengov.org/unterstuetzen"');
    expect(pricing).not.toContain('"3 Beiträge pro Monat"');
    expect(pricing).not.toContain('"10 Beiträge pro Monat"');
    expect(pricing).not.toContain('"1 Anlassraum inklusive"');
    expect(formatter).not.toContain("jährliche Zahlung bevorzugt");
    expect(formatter).not.toContain("annual billing preferred");
  });
});
