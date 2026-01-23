export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PublishStatus, ContentKind } from "@db/web";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const kindParam = searchParams.get("kind") as (keyof typeof ContentKind) | null;
    const locale = searchParams.get("locale") ?? undefined;
    const regionCode = searchParams.get("region") ?? undefined;
    const latest = searchParams.get("latest") === "true";
    const take = Math.min(parseInt(searchParams.get("take") || "50", 10), 200);

    const now = new Date();

    const where: any = {
      status: PublishStatus.published,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      AND: [{ OR: [{ expireAt: null }, { expireAt: { gt: now } }] }],
    };

    if (kindParam) where.kind = kindParam;
    if (locale) where.locale = locale;
    if (regionCode) where.regionEffective = { code: regionCode };

    const items = await prisma.contentItem.findMany({
      where,
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
      take: Math.max(1, take),
      include: {
        answerOptions: { orderBy: { sortOrder: "asc" } },
        regionEffective: true,
        topic: { select: { id: true, slug: true, title: true } },
      },
    });

    if (latest) {
      // "neueste pro (topicId, kind)"
      const seen = new Set<string>();
      const filtered: typeof items = [];
      for (const it of items) {
        const key = `${it.topicId}:${it.kind}`;
        if (!seen.has(key)) {
          seen.add(key);
          filtered.push(it);
        }
      }
      return NextResponse.json({ ok: true, items: filtered });
    }

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load items" },
      { status: 500 },
    );
  }
}
