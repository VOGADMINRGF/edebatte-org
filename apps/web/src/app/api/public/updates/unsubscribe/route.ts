import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";

import { coreCol } from "@core/db/triMongo";
import { verifyNewsletterUnsubscribeToken } from "@features/notifications/newsletterUnsubscribeToken";
import { acquireNewsletterSubscriberCoordination } from "@/features/newsletter/newsletterSubscriberCoordination";

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

async function tokenFromPost(req: NextRequest) {
  const queryToken = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    return typeof body.token === "string" ? body.token : "";
  }

  const raw = await req.text().catch(() => "");
  const params = new URLSearchParams(raw);
  const oneClick = params.get("List-Unsubscribe") === "One-Click";
  if (queryToken && oneClick) return queryToken;

  return "";
}

/**
 * POST performs the actual canonical unsubscribe. It is idempotent and does
 * not expose whether an address exists in the subscriber collection.
 *
 * Two explicit mutation modes are supported:
 * - JSON `{ token }` from the human confirmation surface.
 * - RFC 8058 one-click POST with the signed token in the URL and
 *   `List-Unsubscribe=One-Click` form body from supporting mail clients.
 *
 * The mutation shares the subscriber coordination lock with the final send
 * boundary. A successful response therefore cannot race a simultaneously
 * in-flight external handoff and falsely claim that the opt-out already won.
 */
export async function POST(req: NextRequest) {
  if (!unsubscribeSecret()) {
    return NextResponse.json(
      { ok: false, error: "unsubscribe_not_configured" },
      { status: 503 },
    );
  }

  const token = await tokenFromPost(req);
  const result = verify(token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired_unsubscribe_token" },
      { status: 400 },
    );
  }

  const email = result.payload.email.trim().toLowerCase();
  const coordination = await acquireNewsletterSubscriberCoordination({
    email,
    purpose: "mutation",
  });
  if (!coordination.acquired) {
    if (coordination.reason === "subscriber_not_found") {
      return NextResponse.json({ ok: true, status: "unsubscribed" });
    }
    return NextResponse.json(
      { ok: false, error: "newsletter_delivery_in_progress" },
      { status: 503, headers: { "Retry-After": "1" } },
    );
  }

  try {
    const now = new Date();
    const subscriptions = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;

    await subscriptions.updateOne(
      {
        email,
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
  } finally {
    await coordination.release();
  }
}
