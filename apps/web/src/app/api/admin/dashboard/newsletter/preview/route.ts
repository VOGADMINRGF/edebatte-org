import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";

import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { buildNewsletterDigestPreviewForSubscriber } from "@/features/newsletter/newsletterRuntime";
import { normalizeNewsletterEmail } from "@features/notifications/newsletterSubscriptionContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriberDoc = Parameters<typeof buildNewsletterDigestPreviewForSubscriber>[0];

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const email = normalizeNewsletterEmail(req.nextUrl.searchParams.get("email") ?? "");
  if (!email) {
    return NextResponse.json({ ok: false, error: "valid_email_required" }, { status: 400 });
  }

  const subscriptions = (await coreCol("public_updates_subscribers")) as Collection<SubscriberDoc>;
  const subscriber = await subscriptions.findOne({ email });
  if (!subscriber) {
    return NextResponse.json({ ok: false, error: "subscriber_not_found" }, { status: 404 });
  }

  const preview = await buildNewsletterDigestPreviewForSubscriber(subscriber, {
    ignoreDeliveryPolicy: true,
  });

  return NextResponse.json({ ok: true, preview, mutates: false, sends: false });
}
