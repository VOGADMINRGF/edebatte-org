import { NextRequest, NextResponse } from "next/server";
import { ObjectId, getCol } from "@core/db/triMongo";
import { setB2cEntitlementSource } from "@/lib/server/billing/b2cEntitlements";
import {
  parseEdebateB2cMetadata,
  parseStripeB2cEvent,
  parseVogSupportMetadata,
  stripeObjectId,
  verifyStripeB2cWebhookSignature,
} from "@/lib/server/billing/stripeB2c";
import { getVogHandoffByHash, markVogHandoff } from "@/lib/server/billing/vogBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_EVENTS_COLLECTION = "stripe_b2c_webhook_events";
const PROCESSING_STALE_AFTER_MS = 10 * 60_000;

type WebhookEventDoc = {
  _id: string;
  type: string;
  status: "processing" | "processed" | "failed";
  createdAt: Date;
  claimedAt: Date;
  processedAt?: Date;
  lastError?: string;
};

async function claimEvent(id: string, type: string) {
  const events = await getCol<WebhookEventDoc>(WEBHOOK_EVENTS_COLLECTION);
  const now = new Date();
  try {
    await events.insertOne({
      _id: id,
      type,
      status: "processing",
      createdAt: now,
      claimedAt: now,
    });
    return { events, claimed: true } as const;
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
  }

  const staleBefore = new Date(now.getTime() - PROCESSING_STALE_AFTER_MS);
  const reclaimed = await events.findOneAndUpdate(
    {
      _id: id,
      $or: [
        { status: "failed" },
        { status: "processing", claimedAt: { $lt: staleBefore } },
      ],
    },
    {
      $set: {
        status: "processing",
        type,
        claimedAt: now,
      },
      $unset: { processedAt: "", lastError: "" },
    },
    { returnDocument: "after" },
  );

  return { events, claimed: Boolean(reclaimed) } as const;
}

async function setEventStatus(
  events: any,
  id: string,
  status: "processed" | "failed",
  lastError?: string,
) {
  await events.updateOne(
    { _id: id },
    {
      $set: {
        status,
        processedAt: new Date(),
        ...(lastError ? { lastError: lastError.slice(0, 1000) } : {}),
      },
    },
  );
}

function eventEntitlementStatus(eventType: string, object: Record<string, unknown>) {
  if (eventType === "checkout.session.async_payment_failed") return "failed";
  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    const paymentStatus = typeof object.payment_status === "string" ? object.payment_status : "unknown";
    return paymentStatus === "paid" || paymentStatus === "no_payment_required" ? "active" : "pending";
  }
  if (eventType === "invoice.paid") return "active";
  if (eventType === "invoice.payment_failed") return "past_due";
  if (eventType === "customer.subscription.deleted") return "canceled";
  if (eventType === "customer.subscription.updated") {
    return typeof object.status === "string" ? object.status : "unknown";
  }
  return null;
}

function stripeRelationshipIds(eventType: string, object: Record<string, unknown>) {
  const customerId = stripeObjectId(object.customer, "cus");
  const directSubscriptionId = stripeObjectId(object.subscription, "sub");
  const parent = object.parent as Record<string, unknown> | undefined;
  const subscriptionDetails = parent?.subscription_details as Record<string, unknown> | undefined;
  const parentSubscriptionId = stripeObjectId(subscriptionDetails?.subscription, "sub");
  const subscriptionId = eventType.startsWith("customer.subscription.")
    ? stripeObjectId(object.id, "sub")
    : directSubscriptionId || parentSubscriptionId;
  return { customerId, subscriptionId };
}

function planRank(planId: "start" | "pro") {
  return planId === "pro" ? 2 : 1;
}

async function updateDirectEntitlement(eventType: string, object: Record<string, unknown>) {
  const meta = parseEdebateB2cMetadata(object);
  if (!meta || !ObjectId.isValid(meta.userId)) return false;

  const status = eventEntitlementStatus(eventType, object);
  if (!status) return true;

  // A redirect/Checkout event is not proof of an asynchronous payment. Do not disturb an existing entitlement until Stripe confirms it.
  if (status === "pending" || status === "failed") return true;

  const { customerId, subscriptionId } = stripeRelationshipIds(eventType, object);
  await setB2cEntitlementSource({
    userId: new ObjectId(meta.userId),
    source: "direct",
    planId: meta.packageId,
    status,
    customerId,
    subscriptionId,
  });
  return true;
}

async function updateVogEntitlement(eventType: string, object: Record<string, unknown>) {
  const meta = parseVogSupportMetadata(object);
  if (!meta) return false;

  const handoff = await getVogHandoffByHash(meta.handoffHash);
  if (!handoff) {
    // Capability is unknown or has been deliberately removed: never infer an account from email/customer data.
    return true;
  }
  if (planRank(meta.packageId) < planRank(handoff.requestedPlanId)) {
    throw new Error("vog_entitlement_below_requested_plan");
  }

  const status = eventEntitlementStatus(eventType, object);
  if (!status) return true;

  if (status === "pending") return true;
  if (status === "failed") {
    await markVogHandoff({ handoffHash: meta.handoffHash, status: "failed", actualPlanId: meta.packageId });
    return true;
  }

  const { customerId, subscriptionId } = stripeRelationshipIds(eventType, object);
  await setB2cEntitlementSource({
    userId: handoff.userId,
    source: "vog",
    planId: meta.packageId,
    status,
    customerId,
    subscriptionId,
  });

  const handoffStatus = status === "active" || status === "trialing"
    ? "active"
    : status === "past_due"
      ? "past_due"
      : ["canceled", "unpaid", "incomplete_expired"].includes(status)
        ? "canceled"
        : "claimed";
  await markVogHandoff({
    handoffHash: meta.handoffHash,
    status: handoffStatus,
    actualPlanId: meta.packageId,
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: subscriptionId || undefined,
  });
  return true;
}

async function updateUserFromEvent(eventType: string, object: Record<string, unknown>) {
  if (await updateDirectEntitlement(eventType, object)) return;
  await updateVogEntitlement(eventType, object);
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "webhook_unconfigured" }, { status: 503 });
  }

  const payload = await request.text();
  if (!verifyStripeB2cWebhookSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  const event = parseStripeB2cEvent(payload);
  if (!event) return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });

  let claim: Awaited<ReturnType<typeof claimEvent>>;
  try {
    claim = await claimEvent(event.id, event.type);
  } catch (error) {
    console.error("[stripe-b2c-webhook] storage unavailable", { eventId: event.id, error: String(error) });
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  if (!claim.claimed) return NextResponse.json({ ok: true, duplicate: true });

  try {
    await updateUserFromEvent(event.type, event.data.object);
    await setEventStatus(claim.events, event.id, "processed");
    return NextResponse.json({ ok: true });
  } catch (error) {
    await setEventStatus(claim.events, event.id, "failed", String(error)).catch(() => {});
    console.error("[stripe-b2c-webhook] processing failed", { eventId: event.id, error: String(error) });
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}
