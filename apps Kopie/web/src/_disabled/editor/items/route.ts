//apps/web/src/app/api/editor/items/route,ts
import { NextResponse } from "next/server";
import { prisma } from "@db/web";
import { ContentKind, PublishStatus, RegionMode } from "@db/web";
import { validateItemDraft } from "./../server/validation/contentValidation";

/**
 * GET /api/editor/items
 * - Listet Items, optional gefiltert nach Kind, Status, Locale
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const qKind = searchParams.get("kind") as ContentKind | null;
    const qStatus = searchParams.get("status") as PublishStatus | null;
    const qLocale = searchParams.get("locale") ?? undefined;
    const take = Math.min(parseInt(searchParams.get("take") || "100", 10), 500);

    const where: any = {};
    if (qKind) where.kind = qKind;
    if (qStatus) where.status = qStatus;
    if (qLocale) where.locale = qLocale;

    const items = await prisma.contentItem.findMany({
      where,
      include: {
        answerOptions: { orderBy: { sortOrder: "asc" } },
        regionEffective: true,
        regionManual: true,
        topic: { select: { id: true, slug: true, title: true } },
      },
      orderBy: [{ createdAt: "desc" }],
      take,
    });

    return NextResponse.json(items, { status: 200 });
  } catch (e) {
    console.error("GET /items failed:", e);
    return NextResponse.json(
      { error: "Failed to list items" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/editor/items
 * - Erstellt ein neues Draft-Item
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const kind = body.kind as ContentKind;
    const text = String(body.text ?? "");
    const topicId = String(body.topicId ?? "");
    const locale = body.locale ?? "de";
    const regionMode = (body.regionMode as RegionMode) ?? "AUTO";
    const regionManualId = body.regionManualId ?? null;
    const publishAt = body.publishAt ? new Date(body.publishAt) : null;
    const expireAt = body.expireAt ? new Date(body.expireAt) : null;
    const title = body.title ?? null;
    const richText = body.richText ?? null;
    const authorName = body.authorName ?? null;

    const answerOptions = (body.answerOptions ?? []) as Array<{
      label: string;
      value: string;
      exclusive?: boolean;
      order?: number;
    }>;

    // Validierung (z. B. AUTO-Region, Pflichtfelder)
    const validation = await validateItemDraft({
      kind,
      text,
      topicId,
      regionMode,
      regionManualId,
      publishAt,
      expireAt,
      locale,
      answerOptions,
    });

    const created = await prisma.contentItem.create({
      data: {
        kind,
        text,
        topicId,
        locale,
        regionMode,
        regionManualId,
        publishAt: publishAt ?? undefined,
        expireAt: expireAt ?? undefined,
        title,
        richText,
        authorName,
        status: PublishStatus.draft,
        validation,
        regionAuto: validation.regionAuto ?? undefined,
        answerOptions: answerOptions.length
          ? {
              create: answerOptions.map((o, idx) => ({
                label: o.label,
                value: o.value,
                exclusive: !!o.exclusive,
                order: Number.isFinite(o.order) ? o.order! : idx,
              })),
            }
          : undefined,
      },
      include: {
        answerOptions: true,
        topic: { select: { id: true, slug: true, title: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /items failed:", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
