import { NextRequest, NextResponse } from "next/server";
import type { Collection } from "mongodb";
import { coreCol } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import {
  mergeNewsletterPreferences,
  resolveNewsletterEligibility,
  type NewsletterAudienceTier,
  type NewsletterPreferences,
  type NewsletterSubscriptionStatus,
} from "@features/notifications/newsletterSubscriptionContract";

const REQUIRED_CONSENT_VERSION = process.env.UPDATES_CONSENT_VERSION || "updates_v1";

type NewsletterDoc = {
  email: string;
  name?: string | null;
  status: NewsletterSubscriptionStatus;
  consentVersion: string;
  audienceTier?: NewsletterAudienceTier | null;
  preferences?: Partial<NewsletterPreferences> | null;
  locale?: string | null;
  confirmedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const subscriptions = (await coreCol("public_updates_subscribers")) as Collection<NewsletterDoc>;
  const docs = await subscriptions
    .find(
      { status: "active" },
      {
        projection: {
          email: 1,
          name: 1,
          status: 1,
          consentVersion: 1,
          audienceTier: 1,
          preferences: 1,
          locale: 1,
          confirmedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ confirmedAt: -1, createdAt: -1 })
    .toArray();

  const items = docs
    .filter((doc) =>
      resolveNewsletterEligibility({
        email: doc.email,
        status: doc.status,
        consentVersion: doc.consentVersion,
        requiredConsentVersion: REQUIRED_CONSENT_VERSION,
        channel: "email",
      }).eligible,
    )
    .map((doc) => ({
      email: doc.email,
      name: doc.name ?? null,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
      confirmedAt: doc.confirmedAt ? doc.confirmedAt.toISOString() : null,
      locale: doc.locale ?? "de",
      audienceTier: doc.audienceTier ?? "public",
      frequency: mergeNewsletterPreferences(doc.preferences).frequency,
    }));

  const format = req.nextUrl.searchParams.get("format");
  if (format === "csv") {
    const rows = [
      ["email", "name", "createdAt", "confirmedAt", "locale", "audienceTier", "frequency"],
      ...items.map((item) => [
        item.email,
        item.name ?? "",
        item.createdAt ?? "",
        item.confirmedAt ?? "",
        item.locale,
        item.audienceTier,
        item.frequency,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=newsletter.csv",
      },
    });
  }

  return NextResponse.json({
    items,
    sourceOfTruth: "public_updates_subscribers",
    requiredConsentVersion: REQUIRED_CONSENT_VERSION,
  });
}
