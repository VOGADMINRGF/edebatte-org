type SettingsDoc = { _id: "global"; alerts?: any; [k:string]: any }
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@core/db/triMongo";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const db = await getDb();
  const doc = await db.collection<SettingsDoc>("settings").findOne({ _id: "global" });
  const alerts = doc?.alerts ?? { enabled: true, recipients: [] };
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;
  const body = await req.json();
  const alerts = {
    enabled: !!body.enabled,
    recipients: Array.isArray(body.recipients)
      ? body.recipients.filter(
          (x: any) => typeof x === "string" && x.includes("@"),
        )
      : [],
  };
  const db = await getDb();
  await db
    .collection("settings")
    .updateOne({ _id: "global" } as any, { $set: { alerts } } as any, { upsert: true });
  return NextResponse.json({ ok: true });
}
