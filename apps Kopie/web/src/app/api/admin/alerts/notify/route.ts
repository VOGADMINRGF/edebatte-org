// apps/web/src/app/api/admin/alerts/notify/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
// ⬇️ statt getDb bitte getCol benutzen
import { getCol } from "@core/db/triMongo";
import { z } from "zod";

const TOKEN = process.env.INTERNAL_HEALTH_TOKEN || "";

// shape der settings-collection
type SettingsDoc = {
  _id: string; // <— wichtig: string statt ObjectId
  alerts?: {
    enabled: boolean;
    recipients: string[];
  };
};

// Nur die minimal notwendigen Env-Variablen für diese Route prüfen –
// bewusst lazy, damit fehlende ARANGO/OPENAI etc. den Build nicht blockieren.
const EnvSchema = z.object({
  CORE_DB_NAME: z.string().min(1),
  CORE_MONGODB_URI: z.string().min(1),
});

async function loadEmailModule() {
  try {
    const mod = await import("@/utils/email");
    return mod.sendAlertEmail;
  } catch (err) {
    console.error("[admin/alerts] email module unavailable", err);
    return null;
  }
}

export async function POST(req: Request) {
  const auth = req.headers.get("x-internal-token") || "";
  if (!TOKEN || auth !== TOKEN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const envCheck = EnvSchema.safeParse(process.env);
  if (!envCheck.success) {
    return NextResponse.json(
      { error: "env_missing", details: envCheck.error.flatten() },
      { status: 503 },
    );
  }

  const payload = await req.json(); // { subject, html, text, ... }

  // typisierte Collection holen
  const settingsCol = await getCol<SettingsDoc>("core", "settings").catch((err) => {
    console.error("[admin/alerts] failed to connect to tri-mongo", err);
    return null;
  });

  if (!settingsCol) {
    return NextResponse.json(
      { error: "db_unavailable", details: "tri-mongo not configured" },
      { status: 503 },
    );
  }

  const doc = await settingsCol.findOne({ _id: "global" });

  const cfg = doc?.alerts ?? { enabled: true, recipients: [] };
  if (!cfg.enabled || !cfg.recipients?.length) {
    return NextResponse.json({ skipped: true });
  }

  const sendAlertEmail = await loadEmailModule();
  if (!sendAlertEmail) {
    return NextResponse.json(
      { error: "email_disabled", details: "env invalid or SMTP missing" },
      { status: 503 },
    );
  }

  await sendAlertEmail(payload as any);
  return NextResponse.json({ ok: true });
}
