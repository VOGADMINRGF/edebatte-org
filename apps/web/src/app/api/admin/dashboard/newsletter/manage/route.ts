import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  normalizeNewsletterEmail,
  setAdminNewsletterSubscription,
} from "@features/notifications/newsletterSubscriptions";

type Body = {
  email?: string;
  name?: string | null;
  subscribe?: boolean;
};

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const body = (await req.json().catch(() => ({}))) as Body;
  const email = normalizeNewsletterEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const result = await setAdminNewsletterSubscription({
    email,
    name: body.name?.trim() || null,
    subscribe: body.subscribe !== false,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        message: "Eine explizite Abmeldung darf nicht still durch einen Admin überschrieben werden.",
      },
      { status: 409 },
    );
  }

  const entry = result.entry
    ? {
        email: result.entry.email,
        name: result.entry.name,
        createdAt: result.entry.createdAt ? result.entry.createdAt.toISOString() : null,
        locale: result.entry.locale,
        briefingLevel: result.entry.briefingLevel,
        sources: result.entry.sources,
      }
    : null;

  return NextResponse.json({ ok: true, entry });
}
