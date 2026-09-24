import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { setNewsletterOperatorSuppression } from "@/features/newsletter/newsletterProductionRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().email(),
  suppressed: z.boolean(),
  reason: z.string().trim().min(2).max(200).optional(),
});

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "validation_error" }, { status: 400 });
  }

  const result = await setNewsletterOperatorSuppression(parsed.data);
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "subscriber_not_found" ? 404 : 400 });
  }
  return NextResponse.json(result);
}
