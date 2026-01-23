import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(){
  const jobId = `AP-${Date.now().toString(36)}`;
  return NextResponse.json({ ok:true, jobId });
}
