import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Report from "src/models/core/Report";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await dbConnect();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 20), 100);
  const skip = Math.max(Number(url.searchParams.get("skip") || 0), 0);
  const sort = (url.searchParams.get("sort") || "-updatedAt") as string;

  const items = await Report.find({}).sort(sort).skip(skip).limit(limit).lean();

  const data = items.map((d: any) => ({ id: String(d._id), ...d }));
  return NextResponse.json(data);
}
