// apps/web/src/app/api/editor/items/[id]/publish/route.ts
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@db/web";
import { logger } from "@core/observability/logger";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { formatError } from "@core/errors/formatError";
import { ContentKind, PublishStatus, RegionMode } from "@db/web";

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // --- Permission check ---
    const role = (req.cookies.get("u_role")?.value as Role) ?? "guest";
    if (!hasPermission(role, PERMISSIONS.EDITOR_ITEM_PUBLISH)) {
      return NextResponse.json(
        formatError("FORBIDDEN", "Permission denied", { role }),
        { status: 403 },
      );
    }

    // --- Load item (inkl. Optionen) ---
    const item = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: { answerOptions: true },
    });

    if (!item) {
      return NextResponse.json(
        formatError("NOT_FOUND", "Item not found", { id: params.id }),
        { status: 404 },
      );
    }

    // --- Validation ---
    const errors: string[] = [];

    if (!item.text || item.text.trim().length < 8) {
      errors.push("Text zu kurz.");
    }

    if (
      item.kind === ContentKind.EVENT ||
      item.kind === ContentKind.SUNDAY_POLL
    ) {
      if (item.answerOptions.length < 2) {
        errors.push("Mind. 2 Antwortoptionen erforderlich.");
      }
      if (
        item.kind === ContentKind.EVENT &&
        !item.answerOptions.some((o) => o.exclusive)
      ) {
        errors.push("EVENT: Mind. eine exklusive Option erforderlich.");
      }
    }

    if (item.publishAt && item.expireAt && item.expireAt <= item.publishAt) {
      errors.push("expireAt muss nach publishAt liegen.");
    }

    // --- Region ableiten ---
    let regionEffectiveId: string | null = item.regionEffectiveId ?? null;

    if (item.regionMode === RegionMode.MANUAL) {
      if (!item.regionManualId) {
        errors.push("RegionMode=MANUAL benötigt regionManualId.");
      } else {
        regionEffectiveId = item.regionManualId;
      }
    } else {
      const decided = (item.regionAuto as any)?.decidedRegionId as
        | string
        | undefined;
      if (decided) regionEffectiveId = decided;
      if (!regionEffectiveId)
        errors.push("AUTO-Region konnte nicht bestimmt werden.");
    }

    // --- Fehlermeldungen zurückspielen & Status auf REVIEW setzen ---
    if (errors.length > 0) {
      await prisma.contentItem.update({
        where: { id: item.id },
        data: {
          status: PublishStatus.review,
          validation: { ...(item.validation ?? {}), errors },
        },
      });
      return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    // --- Publish ---
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.contentItem.update({
        where: { id: item.id },
        data: {
          status: PublishStatus.published,
          publishAt: item.publishAt ?? now,
          regionEffectiveId,
          validation: { ...(item.validation ?? {}), errors: [] },
        },
      });

      return tx.contentItem.findUnique({
        where: { id: item.id },
        include: {
          topic: { select: { id: true, slug: true, title: true } },
          answerOptions: { orderBy: { sortOrder: "asc" } },
          regionEffective: true,
          regionManual: true,
        },
      });
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ err: msg }, "ITEM_PUBLISH_FAIL");
    return NextResponse.json(
      formatError("INTERNAL_ERROR", "Publish failed", msg),
      { status: 500 },
    );
  }
}
