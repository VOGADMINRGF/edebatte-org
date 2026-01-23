// apps/web/src/app/api/topics/route.ts
import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/dbWeb";
import { isCoreLocale } from "@/config/locales";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const localeParam = searchParams.get("locale");
    const locale = localeParam && isCoreLocale(localeParam) ? localeParam : undefined;

    const now = new Date();

    const rawTopics = await db.topic.findMany({
      where: locale ? { locale } : undefined,
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          where: {
            status: "published",
            OR: [{ publishAt: null }, { publishAt: { lte: now } }],
            AND: [{ OR: [{ expireAt: null }, { expireAt: { gt: now } }] }],
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            answerOptions: { orderBy: { sortOrder: "asc" } },
            regionEffective: true,
          },
        },
      },
    });

    const topics = rawTopics.map((topic) => {
      const { items, ...rest } = topic as any;
      return { ...rest, statements: items ?? [] };
    });

    return NextResponse.json({
      topics,
      locale: locale ?? null,
      asOf: now.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/topics error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
