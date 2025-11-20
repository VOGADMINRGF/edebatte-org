// apps/web/src/app/api/admin/alerts/notify/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
// ⬇️ statt getDb bitte getCol benutzen
import { getCol } from "@core/db/triMongo";
import { sendAlertEmail } from "@/utils/email";

const TOKEN = process.env.INTERNAL_HEALTH_TOKEN || "";

// shape der settings-collection
type SettingsDoc = {
  _id: string; // <— wichtig: string statt ObjectId
  alerts?: {
    enabled: boolean;
    recipients: string[];
  };
};

export async function POST(req: Request) {
  const auth = req.headers.get("x-internal-token") || "";
  if (!TOKEN || auth !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = await req.json(); // { subject, html, text, ... }

  // typisierte Collection holen
  const settingsCol = await getCol<SettingsDoc>("core", "settings");
  const doc = await settingsCol.findOne({ _id: "global" });

  const cfg = doc?.alerts ?? { enabled: true, recipients: [] };
  if (!cfg.enabled || !cfg.recipients?.length) {
    return NextResponse.json({ skipped: true });
  }

  await sendAlertEmail(payload as any);
  return NextResponse.json({ ok: true });
}
