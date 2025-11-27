import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAccountOverview, updateAccountProfile } from "@features/account/service";
import { TOPIC_CHOICES, type TopicKey } from "@features/interests/topics";
import type { AccountProfileUpdate } from "@features/account/types";

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
  avatarStyle: z.enum(["initials", "abstract", "emoji"]).nullish(),
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
    })
    .optional(),
});

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
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
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
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
    publicFlags: parsed.data.publicFlags !== undefined ? parsed.data.publicFlags : undefined,
  };

  const overview = await updateAccountProfile(userId, payload);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, overview });
}
