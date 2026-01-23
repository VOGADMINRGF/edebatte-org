// apps/web/src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const fd = await req.formData();
  const files = fd.getAll("files") as File[];
  // -> hier zu S3/GCS o.ä. speichern (lokales fs ist in serverless nicht tragfähig)
  return NextResponse.json({
    ok: true,
    files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
  });
}
