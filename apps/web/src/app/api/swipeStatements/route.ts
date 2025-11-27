import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Statement from "@/models/core/Statement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const items = await Statement.find({ status: "active" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const data = items.map((d: any) => ({
    id: d.id || String(d._id),
    title: d.title,
    text: d.text,
    createdAt: d.createdAt,
  }));
  return NextResponse.json(data);
}
