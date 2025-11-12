import { NextRequest } from "next/server";
import SubmissionArchiveModel from "@/models/votes/SubmissionArchive";

export async function POST(req: NextRequest) {
  try {
    const { text, locale = "de", submissionId } = await req.json();
    if (!text?.trim()) return new Response(JSON.stringify({ ok: false, error: "EMPTY" }), { status: 400 });
    const Model = await SubmissionArchiveModel();
    await Model.create({
      submissionId: String(submissionId || Math.random().toString(36).slice(2)),
      originalText: String(text),
      locale: String(locale),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), { status: 500 });
  }
}
