import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateAccountSettings } from "@features/account/service";
import { isSupportedLocale } from "@core/locale/locales";

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
  preferredLocale: z
    .string()
    .refine((val) => isSupportedLocale(val), { message: "locale_invalid" })
    .optional(),
  newsletterOptIn: z.boolean().optional(),
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

  const overview = await updateAccountSettings(userId, parsed.data);
  if (!overview) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, overview });
}
