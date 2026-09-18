import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export type StripeB2cPlanId = "start" | "pro";
export type StripeB2cAccessTier = "citizenPremium" | "citizenPro";

export const STRIPE_B2C_PLANS: Record<
  StripeB2cPlanId,
  { lookupKey: string; accessTier: StripeB2cAccessTier; label: string; minimumCredits: number }
> = {
  start: {
    lookupKey: "edebatte_plus_monthly",
    accessTier: "citizenPremium",
    label: "eDebatte Plus",
    minimumCredits: 15,
  },
  pro: {
    lookupKey: "edebatte_pro_monthly",
    accessTier: "citizenPro",
    label: "eDebatte Pro",
    minimumCredits: 38,
  },
};

const STRIPE_API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

export function isStripeB2cPlanId(value: unknown): value is StripeB2cPlanId {
  return value === "start" || value === "pro";
}

export function resolveStripeB2cPlan(planId: StripeB2cPlanId) {
  return STRIPE_B2C_PLANS[planId];
}

type StripeErrorBody = { error?: { message?: string; type?: string } };

async function stripeRequest<T>(path: string, secret: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as (T & StripeErrorBody) | null;
  if (!response.ok || !body) {
    throw new Error(`stripe_request_failed:${response.status}:${body?.error?.type ?? "unknown"}`);
  }
  return body;
}

export async function resolveStripePriceByLookupKey(lookupKey: string, secret: string) {
  const query = new URLSearchParams({ active: "true", limit: "1" });
  query.append("lookup_keys[]", lookupKey);
  const result = await stripeRequest<{ data?: Array<{ id?: string; active?: boolean; recurring?: unknown }> }>(
    `/prices?${query.toString()}`,
    secret,
  );
  const price = result.data?.[0];
  if (!price?.id || price.active === false || !price.recurring) {
    throw new Error(`stripe_price_unavailable:${lookupKey}`);
  }
  return price.id;
}

function normalizedBaseUrl(configured: string | undefined, requestOrigin: string) {
  const candidate = configured?.trim() || requestOrigin;
  const url = new URL(candidate);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("invalid_public_base_url");
  }
  return url.origin;
}

export async function createStripeB2cCheckoutSession(input: {
  planId: StripeB2cPlanId;
  userId: string;
  email?: string | null;
  requestOrigin: string;
  secret: string;
}) {
  const plan = resolveStripeB2cPlan(input.planId);
  const priceId = await resolveStripePriceByLookupKey(plan.lookupKey, input.secret);
  const baseUrl = normalizedBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL,
    input.requestOrigin,
  );
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", `${baseUrl}/account?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${baseUrl}/pricing?billing=cancelled`);
  body.set("client_reference_id", input.userId);
  body.set("metadata[source]", "edebatte_b2c");
  body.set("metadata[user_id]", input.userId);
  body.set("metadata[package_id]", input.planId);
  body.set("metadata[access_tier]", plan.accessTier);
  body.set("subscription_data[metadata][source]", "edebatte_b2c");
  body.set("subscription_data[metadata][user_id]", input.userId);
  body.set("subscription_data[metadata][package_id]", input.planId);
  body.set("subscription_data[metadata][access_tier]", plan.accessTier);
  body.set("billing_address_collection", "auto");
  body.set("locale", "auto");
  if (input.email) body.set("customer_email", input.email);

  return stripeRequest<{ id?: string; url?: string; customer?: string | null; subscription?: string | null }>(
    "/checkout/sessions",
    input.secret,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `edebatte_b2c_${input.userId}_${input.planId}_${Date.now().toString(36)}`,
      },
      body,
    },
  );
}

export async function createStripeB2cPortalSession(input: {
  customerId: string;
  requestOrigin: string;
  secret: string;
}) {
  const baseUrl = normalizedBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL,
    input.requestOrigin,
  );
  const body = new URLSearchParams({ customer: input.customerId, return_url: `${baseUrl}/account` });
  return stripeRequest<{ id?: string; url?: string }>("/billing_portal/sessions", input.secret, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

function safeEqualHex(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function verifyStripeB2cWebhookSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS || signatures.length === 0) {
    return false;
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return signatures.some((signature) => safeEqualHex(expected, signature));
}

export type StripeB2cEvent = {
  id: string;
  type: string;
  created?: number;
  data: { object: Record<string, unknown> };
};

export function parseStripeB2cEvent(payload: string): StripeB2cEvent | null {
  try {
    const value = JSON.parse(payload) as Record<string, unknown>;
    const data = value.data as Record<string, unknown> | undefined;
    if (typeof value.id !== "string" || !value.id.startsWith("evt_") || typeof value.type !== "string") return null;
    if (!data?.object || typeof data.object !== "object") return null;
    return {
      id: value.id,
      type: value.type,
      created: typeof value.created === "number" ? value.created : undefined,
      data: { object: data.object as Record<string, unknown> },
    };
  } catch {
    return null;
  }
}

export function stripeObjectMetadata(object: Record<string, unknown>) {
  const direct = object.metadata;
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;
  const parent = object.parent as Record<string, unknown> | undefined;
  const subscriptionDetails = parent?.subscription_details as Record<string, unknown> | undefined;
  if (subscriptionDetails?.metadata && typeof subscriptionDetails.metadata === "object") {
    return subscriptionDetails.metadata as Record<string, unknown>;
  }
  return {};
}

export function parseEdebateB2cMetadata(object: Record<string, unknown>) {
  const metadata = stripeObjectMetadata(object);
  if (metadata.source !== "edebatte_b2c") return null;
  const userId = typeof metadata.user_id === "string" ? metadata.user_id : null;
  const packageId = isStripeB2cPlanId(metadata.package_id) ? metadata.package_id : null;
  if (!userId || !packageId) return null;
  const plan = resolveStripeB2cPlan(packageId);
  if (metadata.access_tier && metadata.access_tier !== plan.accessTier) return null;
  return { userId, packageId, ...plan };
}

export function stripeObjectId(value: unknown, prefix: string) {
  const candidate = typeof value === "string" ? value : value && typeof value === "object" ? (value as Record<string, unknown>).id : null;
  return typeof candidate === "string" && candidate.startsWith(`${prefix}_`) ? candidate : null;
}
