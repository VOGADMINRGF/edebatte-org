import { BodySchema } from "@/lib/validation/body";
// apps/web/src/app/api/admin/settings/save/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@core/db/triMongo";
import { formatError } from "@core/errors/formatError";
import { logger } from "@core/observability/logger";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";
// Hinweis: Wenn du bereits ein RBAC-Permission-Setup nutzt, kannst du die Cookie-Admin-Logik unten
// leicht auf hasPermission(...) umstellen.

type OnboardingFlags = {
  requireLocation?: boolean;
  requireEmailVerified?: boolean;
  require2FAForReports?: boolean;
};

type SettingsDoc = {
  _id: string; // z.B. "global"
  onboardingFlags?: OnboardingFlags;
  updatedAt?: Date;
};

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const gate = await requireAdminOrResponse(req);
    if (gate instanceof Response) return gate;

    // --- Body validieren & koerzieren
    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      const fe = formatError("BAD_REQUEST", "Invalid body", {
        issues: (parsed as any).error?.flatten?.(),
      });
      logger.info({ fe }, "ADMIN_SETTINGS_SAVE_BAD_REQUEST");
      return NextResponse.json(fe, { status: 400 });
    }
    const patch: OnboardingFlags = parsed.data;

    // --- DB: settings-Collection mit String-_id
    const db = await getDb();
    const col = db.collection("settings") as any;

    const current = await col.findOne({ _id: "global" });
    const nextFlags: OnboardingFlags = {
      ...(current?.onboardingFlags ?? {}),
      ...patch,
    };

    await col.updateOne(
      { _id: "global" },
      { $set: { onboardingFlags: nextFlags, updatedAt: new Date() } },
      { upsert: true },
    );

    logger.info(
      {
        msg: "Admin settings saved",
        keys: Object.keys(patch),
        latencyMs: Date.now() - startedAt,
      },
      "ADMIN_SETTINGS_SAVE_OK",
    );

    return NextResponse.json({ ok: true, settings: nextFlags });
  } catch (err: any) {
    const fe = formatError("INTERNAL", err?.message ?? "SAVE_FAILED");
    logger.error({ fe, err }, "ADMIN_SETTINGS_SAVE_ERROR");
    return NextResponse.json(fe, { status: 500 });
  }
}
