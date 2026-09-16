import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { claimVogHandoff, resolveVogHandoff } from "@/lib/server/billing/vogBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(40).max(100) });

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const parsed = bodySchema.safeParse({ token });
  if (!parsed.success) return response({ ok: false, error: "invalid_handoff" }, 404);

  const handoff = await resolveVogHandoff(parsed.data.token).catch(() => null);
  if (!handoff) return response({ ok: false, error: "invalid_handoff" }, 404);
  return response({ ok: true, ...handoff });
}

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ ok: false, error: "invalid_handoff" }, 404);

  const handoff = await claimVogHandoff(parsed.data.token).catch(() => null);
  if (!handoff) return response({ ok: false, error: "handoff_unavailable" }, 409);
  return response({ ok: true, ...handoff });
}
