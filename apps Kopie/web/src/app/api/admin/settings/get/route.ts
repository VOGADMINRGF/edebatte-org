// apps/web/src/app/api/admin/settings/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@core/db/triMongo"; // <— vereinheitlicht
import { adminConfig, type AdminConfig } from "@config/admin";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

type SettingsDoc = {
  _id: "global";
  admin?: Partial<AdminConfig>;      // gespeicherte Admin-Settings
  [k: string]: any;
};

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const db = await getDb();
  const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "global" });

  // Fallback auf Build-Defaults (env-gesteuert)
  const settings: AdminConfig = { ...adminConfig, ...(doc?.admin ?? {}) };

  return NextResponse.json({ settings });
}
