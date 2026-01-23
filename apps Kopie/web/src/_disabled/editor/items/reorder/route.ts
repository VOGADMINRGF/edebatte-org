// apps/web/src/app/api/editor/items/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@core/observability/logger";
import { formatError } from "@core/errors/formatError";
import { hasPermission, PERMISSIONS, type Role } from "@core/auth/rbac";
import { z, ZodError } from "zod";

// --- Schema-Definition ---

export async function PATCH(req: NextRequest) {
  const traceStart = Date.now();
  try {
    const body = await req.json();
    let orders: { id: string; order: number }[];

    // --- Body validieren ---
    try {
      ({ orders } = ReorderSchema.parse(body));
    } catch (err) {
      if (err instanceof ZodError) {
        const fe = formatError(
          "VALIDATION_FAILED",
          "Invalid reorder request",
          err.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        );
        logger.warn({ fe }, "ANSWEROPTION_REORDER_VALIDATION_FAIL");
        return NextResponse.json(fe, { status: 400 });
      }
      throw err;
    }

    // --- RBAC: Session aus Cookies ---
    const role = (req.cookies.get("u_role")?.value as Role) ?? "guest";
    if (!hasPermission(role, PERMISSIONS.EDITOR_ITEM_REORDER)) {
      const fe = formatError("FORBIDDEN", "Permission denied", { role });
      logger.warn({ fe }, "ANSWEROPTION_REORDER_FORBIDDEN");
      return NextResponse.json(fe, { status: 403 });
    }

    // --- Existenz-Check für IDs ---
    const foundIds = await prisma.answerOption.findMany({
      where: { id: { in: orders.map((o) => o.id) } },
      select: { id: true },
    });
    const missingIds = orders
      .map((o) => o.id)
      .filter((id) => !foundIds.some((f) => f.id === id));
    if (missingIds.length > 0) {
      const fe = formatError("NOT_FOUND", "Some IDs not found", { missingIds });
      logger.warn({ fe }, "ANSWEROPTION_REORDER_NOTFOUND");
      return NextResponse.json(fe, { status: 404 });
    }

    // --- Rate-Limit (optional, später via Middleware) ---
    // if (isRateLimited(req)) {
    //   const fe = formatError("TOO_MANY_REQUESTS", "Rate limit exceeded");
    //   return NextResponse.json(fe, { status: 429 });
    // }

    // --- Transaktion: Reihenfolge setzen ---
    await prisma.$transaction(
      orders.map((o) =>
        prisma.answerOption.update({
          where: { id: o.id },
          data: { order: o.order },
        }),
      ),
    );

    // --- Audit-Trail (optional) ---
    // await prisma.auditLog.create({
    //   data: {
    //     action: "ANSWEROPTION_REORDER",
    //     userRole: role,
    //     details: orders,
    //     createdAt: new Date(),
    //   },
    // });

    logger.info(
      { count: orders.length, tookMs: Date.now() - traceStart, role },
      "ANSWEROPTION_REORDER_OK",
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    const fe = formatError(
      "INTERNAL_ERROR",
      "Unexpected failure",
      e?.message ?? e,
    );
    logger.error({ fe, e }, "ANSWEROPTION_REORDER_FAIL");
    return NextResponse.json(fe, { status: 500 });
  }
}
