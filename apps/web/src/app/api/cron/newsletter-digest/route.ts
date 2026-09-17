import { NextRequest, NextResponse } from "next/server";

import { runNewsletterProductionBatch } from "@/features/newsletter/newsletterProductionRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest) {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  return secret.length >= 16 && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await runNewsletterProductionBatch();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
