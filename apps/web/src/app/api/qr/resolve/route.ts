export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qrId = searchParams.get("qrId")?.trim();
  if (!qrId) {
    return NextResponse.json({ success: false, error: "missing_qr" }, { status: 400 });
  }

  const setsCol = await coreCol("qr_question_sets");
  const set = await setsCol.findOne({ code: qrId, status: "active" });
  if (set) {
    return NextResponse.json({
      success: true,
      data: {
        targetType: "set",
        targetIds: [set.code],
        title: set.title ?? null,
      },
    });
  }

  return NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
}
