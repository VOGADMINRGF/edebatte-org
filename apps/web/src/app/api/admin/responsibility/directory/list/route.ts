import { NextResponse, type NextRequest } from "next/server";
import { getActors } from "@core/responsibility";
import { isStaffRequest } from "../../feeds/utils";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const items = await getActors();
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    logger.error({ msg: "responsibility.list.failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
