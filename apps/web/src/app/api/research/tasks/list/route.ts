import { NextResponse, type NextRequest } from "next/server";
import { listTasks } from "@core/research";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  const level = req.nextUrl.searchParams.get("level") || undefined;

  try {
    const items = await listTasks({ status: "open", level: level as any });
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    logger.error({ msg: "research.tasks.list_failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
