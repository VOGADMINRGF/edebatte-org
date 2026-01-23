// apps/web/src/app/api/claims/pipeline/route.ts
import { NextResponse } from "next/server";
import { orchestrateClaimsV2 } from "@features/ai/orchestrator_claims"; // <— angepasst

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { texts = [] } = await req.json().catch(() => ({}));
  const items = await orchestrateClaimsV2(texts);
  return NextResponse.json({ ok: true, items });
}
