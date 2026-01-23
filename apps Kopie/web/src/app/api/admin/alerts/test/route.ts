type SettingsDoc = { _id: "global"; alerts?: any; [k:string]: any }
// apps/web/src/app/api/admin/alerts/test/route.ts
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getCol } from "@core/db/triMongo";
import { z } from "zod";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

const EnvSchema = z.object({
  CORE_DB_NAME: z.string().min(1),
  CORE_MONGODB_URI: z.string().min(1),
});

async function loadEmailModule() {
  try {
    const mod = await import("@/utils/email");
    return mod.sendAlertEmail;
  } catch (err) {
    console.error("[admin/alerts/test] email module unavailable", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const envCheck = EnvSchema.safeParse(process.env);
  if (!envCheck.success) {
    return NextResponse.json(
      { error: "env_missing", details: envCheck.error.flatten() },
      { status: 503 },
    );
  }

  const settingsCol = await getCol<SettingsDoc>("core", "settings").catch((err) => {
    console.error("[admin/alerts/test] failed to connect to tri-mongo", err);
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

  if (!cfg.enabled)
    return NextResponse.json({ skipped: true, reason: "alerts disabled" });
  if (!cfg.recipients?.length) {
    return NextResponse.json({ error: "no recipients" }, { status: 400 });
  }

  const sendAlertEmail = await loadEmailModule();
  if (!sendAlertEmail) {
    return NextResponse.json(
      { error: "email_disabled", details: "env invalid or SMTP missing" },
      { status: 503 },
    );
  }

  const res = await sendAlertEmail({
    to: cfg.recipients,
    title: "Monitoring – Test",
    severity: "info",
    items: [{ name: "system-matrix" }],
    linkHref: "/admin/system",
    linkLabel: "System öffnen",
    note: "Dies ist eine Testbenachrichtigung.",
  });

  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
