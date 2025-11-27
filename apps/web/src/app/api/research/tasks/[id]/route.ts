import { NextResponse, type NextRequest } from "next/server";
import { getTaskById } from "@core/research";
import { logger } from "@/utils/logger";

export async function GET(_req: NextRequest, context: any) {
  const params = (context as { params?: { id?: string } })?.params ?? {};
  const taskId = typeof params.id === "string" ? params.id : "";
  try {
    const task = taskId ? await getTaskById(taskId) : null;
    if (!task) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    logger.error({ msg: "research.tasks.detail_failed", id: taskId, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
