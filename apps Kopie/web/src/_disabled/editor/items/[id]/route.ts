// apps/web/src/app/api/editor/items/[id]/route.ts
// Secure: /api/editor/items/[id]
export const runtime = "nodejs";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
import {
  prisma,
  ContentKind,
  PublishStatus,
  RegionMode,
  type Prisma,
} from "@db/web";
import { validateItemDraft } from "@lib/validation/contentValidation";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { formatError } from "@core/errors/formatError";
import { logger } from "@core/observability/logger";

type Params = { params: { id: string } };

// ---------- Helpers ----------
function enumGuard<E extends Record<string, string | number>>(
  e: E,
  v: unknown,
): E[keyof E] | null {
  return (Object.values(e) as Array<E[keyof E]>).includes(v as any)
    ? (v as any)
    : null;
}

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIntOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

// ---------- PATCH ----------
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const role = (req.cookies.get("u_role")?.value as Role) ?? "guest";
    if (!hasPermission(role, PERMISSIONS.EDITOR_ITEM_WRITE)) {
      const fe = formatError("FORBIDDEN", "Permission denied", { role });
      logger.warn({ fe }, "ITEM_PATCH_FORBIDDEN");
      return NextResponse.json(fe, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, any>;

    const current = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: { answerOptions: true },
    });
    if (!current) {
      const fe = formatError("NOT_FOUND", "Item not found", { id: params.id });
      logger.warn({ fe }, "ITEM_PATCH_NOTFOUND");
      return NextResponse.json(fe, { status: 404 });
    }

    const nextKind = enumGuard(ContentKind, body.kind) ?? current.kind;
    const nextStatus = enumGuard(PublishStatus, body.status) ?? current.status;
    const nextRegionMode =
      enumGuard(RegionMode, body.regionMode) ?? current.regionMode;

    const publishAt = toDate(body.publishAt) ?? current.publishAt;
    const expireAt = toDate(body.expireAt) ?? current.expireAt;

    const cleanText = typeof body.text === "string" ? body.text : current.text;
    const cleanRichText =
      body.richText !== undefined
        ? sanitizeHtml(String(body.richText))
        : current.richText;

    const answerOptions = Array.isArray(body.answerOptions)
      ? body.answerOptions
      : null;

    const validation = await validateItemDraft({
      kind: nextKind,
      text: cleanText,
      topicId: body.topicId ?? current.topicId,
      regionMode: nextRegionMode,
      regionManualId: body.regionManualId ?? current.regionManualId,
      publishAt,
      expireAt,
      locale: body.locale ?? current.locale,
      answerOptions: answerOptions ?? current.answerOptions,
    });

    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.contentItem.update({
          where: { id: params.id },
          data: {
            kind: nextKind,
            text: cleanText,
            topicId: body.topicId ?? current.topicId,
            locale: body.locale ?? current.locale,
            regionMode: nextRegionMode,
            regionManualId: body.regionManualId ?? current.regionManualId,
            publishAt,
            expireAt,
            title: body.title ?? current.title,
            richText: cleanRichText,
            authorName: body.authorName ?? current.authorName,
            status: nextStatus,
            validation,
            regionAuto: validation?.regionAuto ?? undefined,
          },
        });

        if (answerOptions) {
          type Opt = {
            id?: string;
            label?: string;
            value?: string;
            exclusive?: boolean;
            order?: number;
          };
          const keepIds = new Set(
            answerOptions
              .map((o: Opt) => (o?.id ? String(o.id) : null))
              .filter(Boolean) as string[],
          );

          const toDelete = current.answerOptions
            .filter((e) => !keepIds.has(e.id))
            .map((e) => e.id);
          if (toDelete.length) {
            await tx.answerOption.deleteMany({
              where: { id: { in: toDelete } },
            });
          }

          for (let idx = 0; idx < answerOptions.length; idx++) {
            const o = (answerOptions[idx] ?? {}) as Opt;
            const order = toIntOr(o.order, idx);
            const payload = {
              label: String(o.label ?? ""),
              value: String(o.value ?? ""),
              exclusive: !!o.exclusive,
              order,
            };

            if (o.id) {
              await tx.answerOption.update({
                where: { id: String(o.id) },
                data: payload,
              });
            } else {
              await tx.answerOption.create({
                data: { itemId: params.id, ...payload },
              });
            }
          }
        }

        return tx.contentItem.findUnique({
          where: { id: params.id },
          include: {
            answerOptions: { orderBy: { sortOrder: "asc" } },
            regionEffective: true,
            regionManual: true,
            topic: { select: { id: true, slug: true, title: true } },
          },
        });
      },
    );

    return NextResponse.json({ ok: true, item: updated }, { status: 200 });
  } catch (e: unknown) {
    const fe = formatError(
      "INTERNAL_ERROR",
      "Update failed",
      e instanceof Error ? e.message : String(e),
    );
    logger.error({ fe, e }, "ITEM_PATCH_FAIL");
    return NextResponse.json(fe, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const role = (req.cookies.get("u_role")?.value as Role) ?? "guest";
    if (!hasPermission(role, PERMISSIONS.EDITOR_ITEM_WRITE)) {
      const fe = formatError("FORBIDDEN", "Permission denied", { role });
      logger.warn({ fe }, "ITEM_DELETE_FORBIDDEN");
      return NextResponse.json(fe, { status: 403 });
    }

    // Optional: Wenn kein ON DELETE CASCADE:
    // await prisma.answerOption.deleteMany({ where: { itemId: params.id } });

    await prisma.contentItem.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const fe = formatError(
      "INTERNAL_ERROR",
      "Delete failed",
      e instanceof Error ? e.message : String(e),
    );
    logger.error({ fe, e }, "ITEM_DELETE_FAIL");
    return NextResponse.json(fe, { status: 500 });
  }
}
