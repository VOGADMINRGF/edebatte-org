// apps/web/src/app/api/editor/topics/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@db/web";
import { requireEditorAuth } from "../../_utils/auth";

interface Params {
  params: { id: string };
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  try {
    const body = await req.json();
    const data = TopicUpdate.parse(body);
    const updated = await prisma.topic.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description ?? undefined,
        locale: data.locale,
      },
    });
    return NextResponse.json({ topic: updated }, { status: 200 });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json(
        { error: "INVALID_INPUT", details: err.issues },
        { status: 400 },
      );
    }
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error("PATCH /api/editor/topics/[id] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = requireEditorAuth(req);
  if (auth) return auth;

  try {
    await prisma.topic.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error("DELETE /api/editor/topics/[id] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
