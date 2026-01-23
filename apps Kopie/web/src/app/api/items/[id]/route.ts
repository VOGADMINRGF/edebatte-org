export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Params) {
  try {
    const { id } = await context.params;
    const item = await prisma.contentItem.findUnique({
      where: { id },
      include: {
        answerOptions: { orderBy: { sortOrder: "asc" } },
        regionEffective: true,
        regionManual: true,
        topic: { select: { id: true, slug: true, title: true } },
      },
    });
    if (!item)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Internal error" },
      { status: 500 },
    );
  }
}
