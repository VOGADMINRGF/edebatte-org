// apps/web/src/app/api/admin/settings/get/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@core/triMongo"; // <— vereinheitlicht
import { adminConfig, type AdminConfig } from "@config/admin";

type SettingsDoc = {
  _id: "global";
  admin?: Partial<AdminConfig>;      // gespeicherte Admin-Settings
  [k: string]: any;
};

export const runtime = "nodejs";

async function isAdmin() {
  const c = await cookies();
  return c.get("u_role")?.value === "admin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "global" });

  // Fallback auf Build-Defaults (env-gesteuert)
  const settings: AdminConfig = { ...adminConfig, ...(doc?.admin ?? {}) };

  return NextResponse.json({ settings });
}
