import { NextResponse, type NextRequest } from "next/server";
import { getActors } from "@core/responsibility";
import { logger } from "@/utils/logger";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const items = await getActors();
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    logger.error({ msg: "responsibility.list.failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
