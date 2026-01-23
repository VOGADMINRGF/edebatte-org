import { NextRequest, NextResponse } from "next/server";
import { analyzeContribution } from "@features/analyze/analyzeContribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  const result = await analyzeContribution({ text: String(text ?? "") });
  return NextResponse.json(result);
}
