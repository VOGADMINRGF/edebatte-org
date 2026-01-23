import { BodySchema } from "@/lib/validation/body";
// apps/web/src/app/api/unit/[id]/interest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { shouldWatchlist } from "@/core/factcheck/triage";
import { formatError } from "@core/errors/formatError";
import { logger } from "@core/observability/logger";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = BodySchema.parse(await req.json());
    const extractedUnit = (prisma as any).extractedUnit;
    if (!extractedUnit) {
      return NextResponse.json(
        formatError("not_implemented", "extractedUnit model missing", {}),
        { status: 501 },
      );
    }
    const unit = await extractedUnit.findUniqueOrThrow({
      where: { id },
    });

    const triage =
      body.interest === "ignored" && shouldWatchlist(unit)
        ? "watchlist"
        : "none";

    const updated = await extractedUnit.update({
      where: { id },
      data: { interest: body.interest as any, triage },
    });

    return NextResponse.json({
      id: updated.id,
      interest: updated.interest,
      triage: updated.triage,
    });
  } catch (err: any) {
    logger.warn({ err }, "unit_interest_PATCH_failed");
    return NextResponse.json(formatError("bad_request", String((err as any)?.message ?? err), err), { status: 400 });
  }
}
