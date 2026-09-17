import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";

import { coreCol } from "@core/db/triMongo";
import { verifyNewsletterUnsubscribeToken } from "@features/notifications/newsletterUnsubscribeToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriberDoc = {
  email: string;
  status?: "pending" | "active" | "unsubscribed" | "suppressed";
  unsubscribedAt?: Date | null;
  updatedAt?: Date | null;
};

function unsubscribeSecret() {
  return process.env.NEWSLETTER_UNSUBSCRIBE_SECRET?.trim() ?? "";
}

function verify(token: string) {
  return verifyNewsletterUnsubscribeToken({
    token,
    secret: unsubscribeSecret(),
  });
}

/**
 * GET is intentionally read-only. Mail scanners and link preview bots must not
 * be able to unsubscribe recipients merely by following a URL.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verify(token);

  if (!unsubscribeSecret()) {
    return NextResponse.json(
      { ok: false, error: "unsubscribe_not_configured" },
      { status: 503 },
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired_unsubscribe_token" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    actionRequired: "confirm_unsubscribe",
    emailHint: result.payload.email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2"),
  });
}

/**
 * POST performs the actual canonical unsubscribe. It is idempotent and does
 * not expose whether an address exists in the subscriber collection.
 */
export async function POST(req: NextRequest) {
  if (!unsubscribeSecret()) {
    return NextResponse.json(
      { ok: false, error: "unsubscribe_not_configured" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { token?: unknown };
  const token = typeof body.token === "string" ? body.token : "";
  const result = verify(token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired_unsubscribe_token" },
      { status: 400 },
    );
  }

  const now = new Date();
  const subscriptions = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;

  await subscriptions.updateOne(
    {
      email: result.payload.email,
      status: { $ne: "suppressed" },
    },
    {
      $set: {
        status: "unsubscribed",
        unsubscribedAt: now,
        updatedAt: now,
      },
    },
  );

  return NextResponse.json({ ok: true, status: "unsubscribed" });
}
