export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@db/web";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { formatError } from "@core/errors/formatError";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const role = (req.cookies.get("u_role")?.value as Role) ?? "guest";
    if (!hasPermission(role, PERMISSIONS.EDITOR_ITEM_WRITE)) {
      return NextResponse.json(
        formatError("FORBIDDEN", "Permission denied", { role }),
        { status: 403 },
      );
    }

    const body = await req.json();
    const tagIds = Array.isArray(body.tagIds) ? (body.tagIds as string[]) : [];

    const exists = await prisma.contentItem.findUnique({
      where: { id: params.id },
    });
    if (!exists)
      return NextResponse.json(formatError("NOT_FOUND", "Item not found"), {
        status: 404,
      });

    await prisma.itemTag.deleteMany({ where: { itemId: params.id } });
    if (tagIds.length > 0) {
      await prisma.itemTag.createMany({
        data: tagIds.map((tagId) => ({ itemId: params.id, tagId })),
        skipDuplicates: true,
      });
    }

    const withTags = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: { tags: { include: { tag: true } } },
    });

    return NextResponse.json({ ok: true, item: withTags });
  } catch (e: any) {
    return NextResponse.json(
      formatError("INTERNAL_ERROR", "Tag update failed", e?.message ?? e),
      { status: 500 },
    );
  }
}
