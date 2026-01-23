// apps/web/src/app/api/editor/statements/[id]/route.ts
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
    const data = StatementUpdate.parse(body);

    const updated = await prisma.statement.update({
      where: { id: params.id },
      data: {
        text: data.text,
        order: data.order,
        status: (data.status as any) || undefined,
        authorName: data.authorName ?? undefined,
      },
    });

    return NextResponse.json({ statement: updated }, { status: 200 });
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
    console.error("PATCH /api/editor/statements/[id] error:", err);
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
    await prisma.statement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error("DELETE /api/editor/statements/[id] error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
