import { NextResponse } from "next/server";
import crypto from "crypto";
import StreamEvent from "@/models/core/StreamEvent";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);

  const counts = {
    last10m: await StreamEvent.countDocuments({ ts: { $gte: tenMinAgo } }),
    total: await StreamEvent.estimatedDocumentCount(),
  };

  const idemKey = crypto
    .createHash("sha1")
    .update("HEALTH_SMOKE")
    .digest("hex");
  const res = await StreamEvent.updateOne(
    { idempotencyKey: idemKey },
    {
      $setOnInsert: {
        kind: "LOG",
        type: "HealthSmokeTest",
        ts: now,
        idempotencyKey: idemKey,
        status: "ACCEPTED",
        payload: { ok: true, at: now.toISOString() },
      },
    },
    { upsert: true },
  );

  return NextResponse.json({
    ok: true,
    created: Boolean((res as any).upsertedCount),
    idempotencyKey: idemKey,
    counts,
    ts: now.toISOString(),
  });
}
