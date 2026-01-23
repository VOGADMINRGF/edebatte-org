import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountOverview, updateAccountProfile } from "@features/account/service";
import { TOPIC_CHOICES, type TopicKey } from "@features/interests/topics";
import type { AccountProfileUpdate } from "@features/account/types";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const topicKeys = TOPIC_CHOICES.map((topic) => topic.key) as [TopicKey, ...TopicKey[]];

const textField = (min: number, max: number) =>
  z
    .union([
      z
        .string()
        .trim()
        .min(min, "too_short")
        .max(max, "too_long"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional();

const locationField = (max: number) =>
  z
    .union([
      z.string().trim().min(2, "too_short").max(max, "too_long"),
      z.literal("").transform(() => null),
      z.null(),
    ])
    .optional();

const statementField = z
  .union([
    z.string().trim().max(140, "too_long"),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

const schema = z.object({
  headline: textField(3, 140),
  bio: textField(10, 800),
  tagline: textField(2, 140),
  avatarStyle: z.enum(["initials", "abstract", "emoji"]).nullish(),
  city: locationField(120),
  region: locationField(120),
  countryCode: locationField(8),
  topTopics: z
    .array(
      z
        .object({
          key: z.enum(topicKeys),
          statement: statementField,
        })
        .strict(),
    )
    .max(3)
    .nullable()
    .optional(),
  publicFlags: z
    .object({
      showRealName: z.boolean().optional(),
      showCity: z.boolean().optional(),
      showJoinDate: z.boolean().optional(),
      showEngagementLevel: z.boolean().optional(),
      showStats: z.boolean().optional(),
      showMembership: z.boolean().optional(),
    })
    .optional(),
  showRealName: z.boolean().optional(),
  showCity: z.boolean().optional(),
  showJoinDate: z.boolean().optional(),
  showEngagementLevel: z.boolean().optional(),
  showStats: z.boolean().optional(),
  showMembership: z.boolean().optional(),
});

export async function GET() {
  const session = await readSession();
  const userId = session?.uid ?? null;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile: overview.profile ?? null, overview });
}

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

  const payload: AccountProfileUpdate = {
    headline: parsed.data.headline !== undefined ? parsed.data.headline : undefined,
    bio: parsed.data.bio !== undefined ? parsed.data.bio : undefined,
    tagline: parsed.data.tagline !== undefined ? parsed.data.tagline : undefined,
    avatarStyle: parsed.data.avatarStyle !== undefined ? parsed.data.avatarStyle ?? null : undefined,
    topTopics:
      parsed.data.topTopics === undefined
        ? undefined
        : parsed.data.topTopics === null
          ? null
          : parsed.data.topTopics.map((topic) => ({
              key: topic.key,
              statement: topic.statement ?? null,
            })),
  };
  const hasLocationUpdate = ["city", "region", "countryCode"].some(
    (key) => (parsed.data as Record<string, unknown>)[key] !== undefined,
  );
  if (hasLocationUpdate) {
    payload.publicLocation = {
      city: parsed.data.city ?? null,
      region: parsed.data.region ?? null,
      countryCode: parsed.data.countryCode ?? null,
    };
  }

  const mergedFlags = {
    showRealName: parsed.data.showRealName ?? parsed.data.publicFlags?.showRealName,
    showCity: parsed.data.showCity ?? parsed.data.publicFlags?.showCity,
    showJoinDate: parsed.data.showJoinDate ?? parsed.data.publicFlags?.showJoinDate,
    showEngagementLevel: parsed.data.showEngagementLevel ?? parsed.data.publicFlags?.showEngagementLevel,
    showStats: parsed.data.showStats ?? parsed.data.publicFlags?.showStats,
    showMembership: parsed.data.showMembership ?? parsed.data.publicFlags?.showMembership,
  };
  const hasFlagsUpdate = Object.values(mergedFlags).some((value) => value !== undefined);
  if (hasFlagsUpdate) {
    payload.publicFlags = mergedFlags;
  }

  const overview = await updateAccountProfile(userId, payload);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, overview });
}
