import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getNewsletterPreferenceStateForUser,
  updateNewsletterPreferenceStateForUser,
} from "@/features/newsletter/newsletterRuntime";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const preferencePatchSchema = z.object({
  preferences: z
    .object({
      frequency: z.enum(["important_only", "daily", "weekly"]).optional(),
      productUpdates: z.boolean().optional(),
      topicUpdates: z.boolean().optional(),
      regionUpdates: z.boolean().optional(),
      watchlistUpdates: z.boolean().optional(),
      ownWorkUpdates: z.boolean().optional(),
      importantAlerts: z.boolean().optional(),
      topicKeys: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
      regionKeys: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    })
    .partial()
    .optional(),
  personalizationSources: z
    .object({
      profileTopics: z.boolean().optional(),
      profileRegion: z.boolean().optional(),
      watchlistActivity: z.boolean().optional(),
      ownWorkActivity: z.boolean().optional(),
    })
    .partial()
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      timezone: z.string().trim().min(1).max(80).optional(),
      startHourLocal: z.number().int().min(0).max(23).optional(),
      endHourLocal: z.number().int().min(0).max(23).optional(),
    })
    .partial()
    .optional(),
  showRelevanceExplanation: z.boolean().optional(),
});

async function userId() {
  const session = await readSession();
  return session?.uid ?? null;
}

export async function GET() {
  const uid = await userId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }
  const state = await getNewsletterPreferenceStateForUser(uid);
  if (!state) {
    return NextResponse.json({ ok: false, error: "user_or_email_not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, state });
}

export async function PATCH(req: NextRequest) {
  const uid = await userId();
  if (!uid) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }
  const parsed = preferencePatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const result = await updateNewsletterPreferenceStateForUser(uid, parsed.data);
  if (!result.ok) {
    const status = result.error === "subscription_required" ? 409 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
