export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import { VoteModel } from "@/models/votes/Vote";
import { createHash } from "crypto";
import { z } from "zod";

const VoteSchema = z.object({
  questionId: z.string().min(1),
  choice: z.string().min(1),
});

function hashSession(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 40);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const parsed = VoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const col = await coreCol("qr_question_sets");
  const set = await col.findOne({ code, status: "active" });
  if (!set) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const question = (set.questions ?? []).find((q: any) => q.id === parsed.data.questionId);
  if (!question) {
    return NextResponse.json({ ok: false, error: "question_not_found" }, { status: 404 });
  }
  if (!Array.isArray(question.options) || !question.options.includes(parsed.data.choice)) {
    return NextResponse.json({ ok: false, error: "invalid_option" }, { status: 400 });
  }

  const userId = req.cookies.get("u_id")?.value ?? null;
  const verified = req.cookies.get("u_verified")?.value === "1";
  if (question.publicAttribution === "public") {
    if (!userId) {
      return NextResponse.json({ ok: false, error: "login_required" }, { status: 401 });
    }
    if (!verified) {
      return NextResponse.json({ ok: false, error: "verification_required" }, { status: 403 });
    }
  }

  const ip = (req.headers.get("x-forwarded-for") || "0.0.0.0").split(",")[0].trim();
  const ua = req.headers.get("user-agent") ?? "unknown";
  const sessionHash = question.allowAnonymousVoting
    ? hashSession(`${ip}|${ua}|${code}|${parsed.data.questionId}`)
    : hashSession(userId ?? `${ip}|${ua}`);

  const Vote = await VoteModel();
  await Vote.updateOne(
    {
      qrSetId: code,
      qrQuestionId: parsed.data.questionId,
      sessionId: sessionHash,
    },
    {
      $set: {
        qrSetId: code,
        qrQuestionId: parsed.data.questionId,
        choice: parsed.data.choice,
        sessionId: sessionHash,
        userHash: userId ? hashSession(userId) : undefined,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
