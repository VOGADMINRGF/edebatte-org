import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import {
  createStripeB2cCheckoutSession,
  isStripeB2cPlanId,
} from "@/lib/server/billing/stripeB2c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ planId: z.enum(["start", "pro"]) });

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || !user.sessionValid) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isStripeB2cPlanId(parsed.data.planId)) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "checkout_unavailable" }, { status: 503 });
  }

  try {
    const session = await createStripeB2cCheckoutSession({
      planId: parsed.data.planId,
      userId: user._id.toHexString(),
      email: user.email,
      requestOrigin: request.nextUrl.origin,
      secret,
    });
    if (!session.id || !session.url?.startsWith("https://checkout.stripe.com/")) {
      throw new Error("invalid_checkout_session");
    }
    return NextResponse.json({ ok: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("[stripe-b2c-checkout] failed", {
      planId: parsed.data.planId,
      userId: user._id.toHexString(),
      error: String(error),
    });
    return NextResponse.json({ ok: false, error: "checkout_unavailable" }, { status: 502 });
  }
}
