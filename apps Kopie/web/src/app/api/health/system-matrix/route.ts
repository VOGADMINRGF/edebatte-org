export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { runSystemMatrix } from "@/server/health";

export async function GET() {
  const services = await runSystemMatrix();
  return NextResponse.json({ ts: new Date().toISOString(), services });
}
