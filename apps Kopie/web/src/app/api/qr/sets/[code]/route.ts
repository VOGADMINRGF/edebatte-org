export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";

export async function GET(
  _req: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const col = await coreCol("qr_question_sets");
  const doc = await col.findOne({ code, status: "active" });
  if (!doc) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    set: {
      code: doc.code,
      title: doc.title ?? null,
      questions: doc.questions ?? [],
    },
  });
}
