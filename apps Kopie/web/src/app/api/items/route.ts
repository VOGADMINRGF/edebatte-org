export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublishStatus, ContentKind } from "@db/web";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const data: any = {
      kind: body.kind as keyof typeof ContentKind,
      text: String(body.text ?? ""),
      status: PublishStatus.draft,
    };

    if (typeof body.topicId === "string" && body.topicId) {
      data.topic = { connect: { id: body.topicId } }; // relation-safe
    }

    const created = await prisma.contentItem.create({
      data,
      include: { answerOptions: true, topic: true },
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Create failed" },
      { status: 500 },
    );
  }
}
