import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(req: NextRequest){
  const body = await req.json().catch(()=>({}));
  const tier = String(body?.tier||"std");
  const coins = tier==="mini" ? 3 : tier==="pro" ? 15 : 7;
  const jobId = `QJ-${Date.now().toString(36)}`;
  return NextResponse.json({ ok:true, jobId, escrow:{ coins } });
}
