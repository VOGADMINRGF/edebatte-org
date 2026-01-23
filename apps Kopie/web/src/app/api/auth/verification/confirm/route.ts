import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { completeIdentityVerification } from "@core/auth/identityVerificationService";
import { logIdentityEvent } from "@core/telemetry/identityEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await completeIdentityVerification(parsed.data.sessionId);
    if (String(result.session.userId) !== userId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const response = NextResponse.json({
      ok: true,
      level: result.verification.level,
      methods: result.verification.methods,
    });
    await logIdentityEvent("identity_otb_confirm", {
      userId,
      meta: { level: result.verification.level },
    });
    return response;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "failed" }, { status: 400 });
  }
}
