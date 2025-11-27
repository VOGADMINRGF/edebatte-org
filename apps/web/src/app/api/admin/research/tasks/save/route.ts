import { NextResponse, type NextRequest } from "next/server";
import { saveTask } from "@core/research";
import { logger } from "@/utils/logger";
import { isStaffRequest } from "../../feeds/utils";

export async function POST(req: NextRequest) {
  if (!isStaffRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, title, description, level, tags, kind, source, status, hints, dueAt } = body ?? {};

  if (!title) {
    return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  }

  try {
    const task = await saveTask({
      id,
      title,
      description,
      level,
      tags,
      kind,
      source,
      status,
      hints,
      dueAt: dueAt ? new Date(dueAt) : null,
    });
    logger.info({ msg: "admin.research.task.saved", id: task.id, kind: task.kind });
    return NextResponse.json({ ok: true, task });
  } catch (err: any) {
    logger.error({ msg: "admin.research.tasks.save_failed", id, err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
