// apps/web/src/app/api/editor/statements/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@db/web";
import { requireEditorAuth } from "../_utils/auth";

export async function POST(req: Request) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  try {
    const body = await req.json();
    const data = StatementCreate.parse(body);

    const created = await prisma.statement.create({
      data: {
        topicId: data.topicId,
        text: data.text,
        order: data.order ?? 0,
        status: (data.status as any) ?? "published",
        authorName: data.authorName,
      },
    });

    return NextResponse.json({ statement: created }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: err.issues },
        { status: 400 },
      );
    }
    if (err?.code === "P2003") {
      return NextResponse.json({ error: "TOPIC_NOT_FOUND" }, { status: 400 });
    }
    console.error("POST /api/editor/statements error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
