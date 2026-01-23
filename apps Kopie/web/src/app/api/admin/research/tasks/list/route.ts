import { NextResponse, type NextRequest } from "next/server";
import { listTasks, getContributionsByTaskId } from "@core/research";
import { logger } from "@/utils/logger";
import { requireAdminOrResponse } from "@/lib/server/auth/admin";

export async function GET(req: NextRequest) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  const taskId = req.nextUrl.searchParams.get("taskId");
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const level = req.nextUrl.searchParams.get("level") || undefined;
  const tag = req.nextUrl.searchParams.get("tag") || undefined;

  try {
    const items = await listTasks({
      status: status as any,
      level: level as any,
      tag: tag || undefined,
    });
    const contributions = taskId ? await getContributionsByTaskId(taskId) : [];
    return NextResponse.json({ ok: true, items, contributions });
  } catch (err: any) {
    logger.error({ msg: "admin.research.tasks.list_failed", err: err?.message });
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
