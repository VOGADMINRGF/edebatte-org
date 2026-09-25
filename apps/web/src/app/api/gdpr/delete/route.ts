import { NextResponse } from "next/server";
import { readSession } from "@/utils/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy endpoint retained only to fail closed.
 * Account deletion must go through /api/account/self-service where the user
 * re-authenticates with their password and a durable deletion request is recorded.
 */
export async function POST() {
  const session = await readSession();
  if (!session?.uid) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: false,
      error: "legacy_endpoint_retired",
      action: "delete_account",
      use: "/api/account/self-service",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
