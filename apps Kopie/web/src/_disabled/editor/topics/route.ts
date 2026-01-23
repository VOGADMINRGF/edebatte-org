import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
// Falls vorhanden wie in V1:
import { requireEditorAuth } from "../_utils/auth";

export async function POST(req: Request) {
  // Auth-Guard wie in V1 beibehalten (falls genutzt)
  const guard =
    typeof requireEditorAuth === "function" ? requireEditorAuth(req) : null;
  if (guard) return guard;

  try {
    const body = await req.json();
    const data = TopicCreate.parse(body);

    const created = await prisma.topic.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description ?? undefined,
        locale: data.locale,
      },
    });

    return NextResponse.json({ topic: created }, { status: 201 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: err.issues },
        { status: 400 },
      );
    }
    // Prisma unique constraint (Mongo/Prisma: weiterhin P2002)
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "SLUG_EXISTS" }, { status: 409 });
    }
    console.error("POST /api/editor/topics error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
