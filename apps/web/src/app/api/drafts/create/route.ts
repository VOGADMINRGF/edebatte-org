import { NextRequest } from "next/server";
import { getSubmissionArchiveCollection } from "@/models/votes/SubmissionArchive";

export async function POST(req: NextRequest) {
  try {
    const { text, locale = "de", submissionId } = await req.json();
    if (!text?.trim()) return new Response(JSON.stringify({ ok: false, error: "EMPTY" }), { status: 400 });
    const collection = await getSubmissionArchiveCollection();
    await collection.insertOne({
      submissionId: String(submissionId || Math.random().toString(36).slice(2)),
      originalText: String(text),
      locale: String(locale || "de"),
      archivedAt: new Date(),
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR" }), { status: 500 });
  }
}
