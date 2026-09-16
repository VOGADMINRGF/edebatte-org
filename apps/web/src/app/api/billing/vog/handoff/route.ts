import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { createVogHandoff } from "@/lib/server/billing/vogBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ planId: z.enum(["start", "pro"]) });

function vogBaseUrl() {
  const candidate = process.env.VOG_PUBLIC_BASE_URL?.trim() || "https://voiceopengov.org";
  const url = new URL(candidate);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new Error("invalid_vog_base_url");
  }
  return url.origin;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || !user.sessionValid) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_plan" }, { status: 400 });
  }

  try {
    const handoff = await createVogHandoff(user._id, parsed.data.planId);
    const url = new URL("/unterstuetzen", vogBaseUrl());
    url.searchParams.set("edebatte_handoff", handoff.token);
    return NextResponse.json(
      { ok: true, url: url.toString(), expiresAt: handoff.expiresAt, planId: handoff.planId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[vog-handoff] create failed", { userId: user._id.toHexString(), error: String(error) });
    return NextResponse.json({ ok: false, error: "handoff_unavailable" }, { status: 503 });
  }
}
