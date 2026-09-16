import { NextRequest, NextResponse } from "next/server";
import { ObjectId, getCol } from "@core/db/triMongo";
import {
  parseEdebateB2cMetadata,
  parseStripeB2cEvent,
  stripeObjectId,
  verifyStripeB2cWebhookSignature,
} from "@/lib/server/billing/stripeB2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_EVENTS_COLLECTION = "stripe_b2c_webhook_events";

type WebhookEventDoc = {
  _id: string;
  type: string;
  status: "processing" | "processed" | "failed";
  createdAt: Date;
  processedAt?: Date;
  lastError?: string;
};

async function claimEvent(id: string, type: string) {
  const events = await getCol<WebhookEventDoc>(WEBHOOK_EVENTS_COLLECTION);
  try {
    await events.insertOne({ _id: id, type, status: "processing", createdAt: new Date() });
    return { events, claimed: true } as const;
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) return { events, claimed: false } as const;
    throw error;
  }
}

async function setEventStatus(
  events: Awaited<ReturnType<typeof getCol<WebhookEventDoc>>>,
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

function subscriptionStatus(object: Record<string, unknown>, eventType: string) {
  if (eventType === "customer.subscription.deleted") return "canceled";
  return typeof object.status === "string" ? object.status : "unknown";
}

async function updateUserFromEvent(eventType: string, object: Record<string, unknown>) {
  const meta = parseEdebateB2cMetadata(object);
  if (!meta || !ObjectId.isValid(meta.userId)) return;

  const users = await getCol<any>("users");
  const userId = new ObjectId(meta.userId);
  const customerId = stripeObjectId(object.customer, "cus");
  const directSubscriptionId = stripeObjectId(object.subscription, "sub");
  const parent = object.parent as Record<string, unknown> | undefined;
  const subscriptionDetails = parent?.subscription_details as Record<string, unknown> | undefined;
  const parentSubscriptionId = stripeObjectId(subscriptionDetails?.subscription, "sub");
  const subscriptionId =
    eventType.startsWith("customer.subscription.")
      ? stripeObjectId(object.id, "sub")
      : directSubscriptionId || parentSubscriptionId;

  const baseSet: Record<string, unknown> = {
    "billing.provider": "stripe",
    "billing.updatedAt": new Date(),
    ...(customerId ? { "billing.stripeCustomerId": customerId } : {}),
    ...(subscriptionId ? { "billing.stripeSubscriptionId": subscriptionId } : {}),
  };

  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    const paymentStatus = typeof object.payment_status === "string" ? object.payment_status : "unknown";
    if (paymentStatus === "paid" || paymentStatus === "no_payment_required") {
      await users.updateOne(
        { _id: userId },
        {
          $set: {
            ...baseSet,
            accessTier: meta.accessTier,
            tier: meta.accessTier,
            b2cPlanId: meta.packageId,
            "billing.status": "active",
            "billing.planId": meta.packageId,
          },
          $max: { "usage.contributionCredits": meta.minimumCredits },
        },
      );
    }
    return;
  }

  if (eventType === "invoice.paid") {
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          ...baseSet,
          accessTier: meta.accessTier,
          tier: meta.accessTier,
          b2cPlanId: meta.packageId,
          "billing.status": "active",
          "billing.planId": meta.packageId,
        },
        $max: { "usage.contributionCredits": meta.minimumCredits },
      },
    );
    return;
  }

  if (eventType === "invoice.payment_failed") {
    await users.updateOne(
      { _id: userId },
      { $set: { ...baseSet, "billing.status": "past_due", "billing.planId": meta.packageId } },
    );
    return;
  }

  if (eventType === "customer.subscription.updated" || eventType === "customer.subscription.deleted") {
    const status = subscriptionStatus(object, eventType);
    if (status === "active" || status === "trialing") {
      await users.updateOne(
        { _id: userId },
        {
          $set: {
            ...baseSet,
            accessTier: meta.accessTier,
            tier: meta.accessTier,
            b2cPlanId: meta.packageId,
            "billing.status": status,
            "billing.planId": meta.packageId,
          },
          $max: { "usage.contributionCredits": meta.minimumCredits },
        },
      );
      return;
    }

    if (status === "past_due") {
      await users.updateOne(
        { _id: userId },
        { $set: { ...baseSet, "billing.status": "past_due", "billing.planId": meta.packageId } },
      );
      return;
    }

    if (["canceled", "unpaid", "incomplete_expired"].includes(status)) {
      await users.updateOne(
        { _id: userId },
        {
          $set: {
            ...baseSet,
            accessTier: "citizenBasic",
            tier: "citizenBasic",
            b2cPlanId: "basis",
            "billing.status": status,
            "billing.planId": "basis",
          },
        },
      );
    }
  }
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
