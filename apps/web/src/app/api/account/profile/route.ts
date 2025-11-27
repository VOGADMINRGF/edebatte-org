import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateAccountProfile } from "@features/account/service";
import type { AccountProfileUpdate } from "@features/account/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const schema = z.object({
  headline: textField(3, 140),
  bio: textField(10, 800),
  topTopics: z.array(z.string().trim().min(2).max(60)).max(3).optional(),
  publicFlags: z
    .object({
      profile: z.boolean().optional(),
      headline: z.boolean().optional(),
      bio: z.boolean().optional(),
      topTopics: z.boolean().optional(),
    })
    .optional(),
});

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
    topTopics: parsed.data.topTopics?.map((topic) => topic.trim()).filter(Boolean),
    publicFlags: parsed.data.publicFlags,
  };

  const overview = await updateAccountProfile(userId, payload);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, overview });
}
