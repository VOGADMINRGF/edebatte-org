import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coreCol } from "@core/db/triMongo";
import { updateAccountSettings } from "@features/account/service";
import type { AccountSettingsUpdate } from "@features/account/types";
import { ACCOUNT_FEATURE_INTEREST_KEYS } from "@features/account/types";
import { isSupportedLocale } from "@core/locale/locales";
import { getNewsletterPreferenceStateForUser } from "@/features/newsletter/newsletterRuntime";
import { acquireNewsletterSubscriberCoordination } from "@/features/newsletter/newsletterSubscriberCoordination";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  displayName: z
    .union([
      z
        .string()
        .min(2, "Name zu kurz")
        .max(80, "Name zu lang"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional(),
  uiLocale: z
    .string()
    .refine((val) => isSupportedLocale(val), { message: "locale_invalid" })
    .optional(),
  readingLocale: z
    .string()
    .refine((val) => isSupportedLocale(val), { message: "locale_invalid" })
    .optional(),
  preferredOutputLocales: z
    .array(z.string().refine((val) => isSupportedLocale(val), { message: "locale_invalid" }))
    .max(5)
    .optional(),
  showOriginalByDefault: z.boolean().optional(),
  preferredLocale: z
    .string()
    .refine((val) => isSupportedLocale(val), { message: "locale_invalid" })
    .optional(),
  newsletterOptIn: z.boolean().optional(),
  featureInterests: z
    .array(z.enum(ACCOUNT_FEATURE_INTEREST_KEYS))
    .max(ACCOUNT_FEATURE_INTEREST_KEYS.length)
    .optional(),
});

type CanonicalSubscriberDoc = {
  email: string;
  userId?: string | null;
  status?: "pending" | "active" | "unsubscribed" | "suppressed" | null;
  unsubscribedAt?: Date | null;
  updatedAt?: Date | null;
};

export async function PATCH(req: NextRequest) {
  const session = await readSession();
  const userId = session?.uid ?? null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "validation_error" },
      { status: 400 },
    );
  }

  let canonicalNewsletterState: Awaited<ReturnType<typeof getNewsletterPreferenceStateForUser>> | null = null;
  if (typeof parsed.data.newsletterOptIn === "boolean") {
    canonicalNewsletterState = await getNewsletterPreferenceStateForUser(userId);
    if (!canonicalNewsletterState) {
      return NextResponse.json({ ok: false, error: "user_or_email_not_found" }, { status: 404 });
    }

    if (parsed.data.newsletterOptIn) {
      if (canonicalNewsletterState.status !== "active") {
        return NextResponse.json(
          { ok: false, error: "newsletter_double_opt_in_required" },
          { status: 409 },
        );
      }
    } else if (canonicalNewsletterState.status !== "not_subscribed") {
      const coordination = await acquireNewsletterSubscriberCoordination({
        email: canonicalNewsletterState.email,
        userId,
        purpose: "mutation",
      });
      if (!coordination.acquired) {
        return NextResponse.json(
          { ok: false, error: "newsletter_delivery_in_progress" },
          { status: 409 },
        );
      }
      try {
        const subscribers = await coreCol<CanonicalSubscriberDoc>("public_updates_subscribers");
        const now = new Date();
        await subscribers.updateOne(
          {
            $or: [{ userId }, { email: canonicalNewsletterState.email }],
            status: { $ne: "suppressed" },
          } as never,
          {
            $set: {
              status: "unsubscribed",
              unsubscribedAt: now,
              updatedAt: now,
            },
          } as never,
        );
      } finally {
        await coordination.release();
      }
      canonicalNewsletterState = await getNewsletterPreferenceStateForUser(userId);
    }
  }

  const payload: AccountSettingsUpdate = {
    displayName:
      parsed.data.displayName !== undefined ? parsed.data.displayName : undefined,
    uiLocale:
      parsed.data.uiLocale !== undefined
        ? (parsed.data.uiLocale as AccountSettingsUpdate["uiLocale"])
        : undefined,
    readingLocale:
      parsed.data.readingLocale !== undefined
        ? (parsed.data.readingLocale as AccountSettingsUpdate["readingLocale"])
        : undefined,
    preferredOutputLocales:
      parsed.data.preferredOutputLocales !== undefined
        ? (parsed.data.preferredOutputLocales as AccountSettingsUpdate["preferredOutputLocales"])
        : undefined,
    showOriginalByDefault: parsed.data.showOriginalByDefault,
    preferredLocale:
      parsed.data.preferredLocale !== undefined
        ? (parsed.data.preferredLocale as AccountSettingsUpdate["preferredLocale"])
        : undefined,
    newsletterOptIn: parsed.data.newsletterOptIn,
    featureInterests: parsed.data.featureInterests,
  };

  const overview = await updateAccountSettings(userId, payload);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  const latestNewsletterState =
    canonicalNewsletterState ?? (await getNewsletterPreferenceStateForUser(userId));
  const canonicalOverview = {
    ...overview,
    newsletterOptIn: latestNewsletterState?.status === "active",
  };

  return NextResponse.json({ ok: true, overview: canonicalOverview });
}
