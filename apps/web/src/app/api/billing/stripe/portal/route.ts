import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { createStripeB2cPortalSession } from "@/lib/server/billing/stripeB2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || !user.sessionValid) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const users = await getCol<any>("users");
  const current = await users.findOne(
    { _id: user._id },
    { projection: { "billing.stripeCustomerId": 1 } },
  );
  const customerId = current?.billing?.stripeCustomerId;
  if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
    return NextResponse.json({ ok: false, error: "no_billing_profile" }, { status: 404 });
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "portal_unavailable" }, { status: 503 });
  }

  try {
    const portal = await createStripeB2cPortalSession({
      customerId,
      requestOrigin: request.nextUrl.origin,
      secret,
    });
    if (!portal.url?.startsWith("https://billing.stripe.com/")) {
      throw new Error("invalid_portal_url");
    }
    return NextResponse.json({ ok: true, url: portal.url });
  } catch (error) {
    console.error("[stripe-b2c-portal] failed", { userId: user._id.toHexString(), error: String(error) });
    return NextResponse.json({ ok: false, error: "portal_unavailable" }, { status: 502 });
  }
}
