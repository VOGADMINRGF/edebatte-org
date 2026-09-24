import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

/**
 * N2 migration guard.
 *
 * This legacy endpoint used to mutate `users.newsletterOptIn`, which is no
 * longer an authoritative subscription source. Keeping the route fail-closed
 * prevents a second write truth while the canonical DOI/profile write paths
 * are connected to `public_updates_subscribers`.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  return NextResponse.json(
    {
      ok: false,
      error: "legacy_newsletter_write_disabled",
      sourceOfTruth: "public_updates_subscribers",
      requiredAction: "double_opt_in_or_profile_subscription_flow",
    },
    { status: 409 },
  );
}
